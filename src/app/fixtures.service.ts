import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiResponse, MatchEvent, dateRange, isFinal, isLive } from './models';

const API = 'https://www.thesportsdb.com/api/v1/json/3';
const START = '2026-06-11'; // primer día del torneo
const END = '2026-07-19'; // final

@Injectable({ providedIn: 'root' })
export class FixturesService {
  private http = inject(HttpClient);

  readonly dates = dateRange(START, END);
  readonly todayISO = new Date().toISOString().slice(0, 10);
  /** Día activo por defecto: hoy si cae en el torneo; si no, el extremo más cercano. */
  readonly defaultDay = this.dates.includes(this.todayISO)
    ? this.todayISO
    : this.todayISO < START
      ? START
      : END;

  readonly byDate = signal<Record<string, MatchEvent[]>>({});
  readonly loadedDays = signal<Set<string>>(new Set());
  readonly lastUpdated = signal<Date | null>(null);
  readonly usingDemo = signal(false);
  readonly notice = signal<string | null>(null);

  /** Todos los partidos en juego, en cualquier fecha. */
  readonly liveEvents = computed(() => {
    const all: MatchEvent[] = [];
    const map = this.byDate();
    for (const d of this.dates)
      for (const e of map[d] || []) if (isLive(e)) all.push(e);
    return all.sort((a, b) =>
      (a.strTimestamp || '').localeCompare(b.strTimestamp || ''),
    );
  });

  /** Próximos partidos cuando no hay nada en directo. */
  readonly upcoming = computed(() => {
    const all: MatchEvent[] = [];
    const map = this.byDate();
    for (const d of this.dates)
      for (const e of map[d] || []) if (!isFinal(e) && !isLive(e)) all.push(e);
    return all.sort((a, b) =>
      (a.strTimestamp || '').localeCompare(b.strTimestamp || ''),
    );
  });

  async fetchDay(date: string): Promise<MatchEvent[]> {
    const url = `${API}/eventsday.php?d=${date}&s=Soccer`;
    const resp = await firstValueFrom(this.http.get<ApiResponse>(url));
    const evs = (resp.events || [])
      .filter(
        (e) =>
          (e.strLeague || '').includes('World Cup') &&
          (e.strSeason || '2026').includes('2026'),
      )
      .sort((a, b) =>
        (a.strTimestamp || a.strTime || '').localeCompare(
          b.strTimestamp || b.strTime || '',
        ),
      );
    this.byDate.update((m) => ({ ...m, [date]: evs }));
    this.loadedDays.update((s) => new Set(s).add(date));
    this.lastUpdated.set(new Date());
    return evs;
  }

  /** Carga concurrente con límite de peticiones simultáneas. */
  private async pool(items: string[], size: number): Promise<void> {
    let i = 0;
    const run = async () => {
      while (i < items.length) {
        const idx = i++;
        try {
          await this.fetchDay(items[idx]);
        } catch {
          /* día fallido: se ignora */
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(size, items.length) }, run),
    );
  }

  /** Carga inicial: primero el día activo (pintado rápido), luego el resto. */
  async loadAll(activeDay: string): Promise<void> {
    let ok = false;
    try {
      await this.fetchDay(activeDay);
      ok = true;
    } catch {
      /* reintentamos con el resto */
    }

    const rest = this.dates.filter((d) => d !== activeDay);
    const before = this.loadedDays().size;
    await this.pool(rest, 4);
    if (this.loadedDays().size > before) ok = true;

    const map = this.byDate();
    const anyMatch = Object.values(map).some((v) => v.length);
    if (!ok) {
      this.loadDemo(
        'No se pudo conectar con el proveedor de datos en vivo. Mostrando un ejemplo del calendario.',
      );
    } else if (!anyMatch) {
      this.loadDemo(
        'El proveedor aún no publica partidos para estas fechas. Mostrando un ejemplo.',
      );
    }
  }

  /** Refresco en vivo: solo el día de hoy y el anterior (partidos que acaban tarde). */
  async refreshLive(): Promise<void> {
    if (this.usingDemo()) return;
    const idx = this.dates.indexOf(this.todayISO);
    const targets = [this.todayISO];
    if (idx > 0) targets.push(this.dates[idx - 1]);
    await this.pool(
      targets.filter((d) => this.dates.includes(d)),
      2,
    );
  }

  // ---------------- demo / fallback ----------------
  private loadDemo(notice: string): void {
    this.usingDemo.set(true);
    this.notice.set(notice);
    const ev = (
      h: string,
      a: string,
      sh: string | null,
      sa: string | null,
      st: string,
      g: string,
      v: string,
      ts: string,
    ): MatchEvent => ({
      idEvent: h + a,
      strHomeTeam: h,
      strAwayTeam: a,
      intHomeScore: sh,
      intAwayScore: sa,
      strStatus: st,
      strGroup: g,
      strVenue: v,
      strTimestamp: ts,
      strTime: ts.slice(11, 19),
      dateEvent: ts.slice(0, 10),
      strHomeTeamBadge: null,
      strAwayTeamBadge: null,
      strLeague: 'FIFA World Cup',
      strSeason: '2026',
    });
    const demo: Record<string, MatchEvent[]> = {
      '2026-06-19': [
        ev(
          'Mexico',
          'South Korea',
          '1',
          '0',
          'FT',
          'Grupo A',
          'Estadio Akron, Zapopan',
          '2026-06-19T01:00:00',
        ),
        ev(
          'USA',
          'Australia',
          '2',
          '0',
          '2H',
          'Grupo D',
          'Lumen Field, Seattle',
          '2026-06-19T19:00:00',
        ),
        ev(
          'Scotland',
          'Morocco',
          null,
          null,
          'NS',
          'Grupo C',
          'Gillette Stadium, Foxborough',
          '2026-06-19T22:00:00',
        ),
      ],
      '2026-06-20': [
        ev(
          'Brazil',
          'Japan',
          null,
          null,
          'NS',
          'Grupo F',
          'SoFi Stadium, Los Angeles',
          '2026-06-20T20:00:00',
        ),
        ev(
          'Argentina',
          'Norway',
          null,
          null,
          'NS',
          'Grupo E',
          'MetLife Stadium, East Rutherford',
          '2026-06-20T23:00:00',
        ),
      ],
    };
    this.byDate.set(demo);
    this.loadedDays.set(new Set(Object.keys(demo)));
    this.lastUpdated.set(new Date());
  }
}
