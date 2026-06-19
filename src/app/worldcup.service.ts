import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  EspnScoreboard,
  Match,
  RoundSlug,
  dayKey,
  dayTitle,
  espnDateParam,
  normalize,
} from './models';

const BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const RANGE = '20260611-20260719'; // todo el torneo en una sola petición

@Injectable({ providedIn: 'root' })
export class WorldCupService {
  private http = inject(HttpClient);

  /** Partidos por id, para poder fusionar refrescos en vivo. */
  private readonly map = signal<Map<string, Match>>(new Map());
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly lastUpdated = signal<Date | null>(null);

  readonly all = computed(() =>
    [...this.map().values()].sort((a, b) => a.dateUTC.localeCompare(b.dateUTC)),
  );
  readonly liveCount = computed(() => this.all().filter((m) => m.live).length);

  byRound(round: RoundSlug): Match[] {
    return this.all().filter((m) => m.round === round);
  }

  /** Días con partidos, en orden, para el listado inferior. */
  readonly days = computed(() => {
    const seen = new Map<
      string,
      { key: string; title: string; dateUTC: string }
    >();
    for (const m of this.all()) {
      const k = dayKey(m.dateUTC);
      if (k && !seen.has(k))
        seen.set(k, { key: k, title: dayTitle(m.dateUTC), dateUTC: m.dateUTC });
    }
    return [...seen.values()];
  });
  matchesOnDay(key: string): Match[] {
    return this.all().filter((m) => dayKey(m.dateUTC) === key);
  }

  private merge(events: EspnScoreboard['events']): number {
    if (!events?.length) return 0;
    const next = new Map(this.map());
    for (const e of events) {
      try {
        const m = normalize(e);
        next.set(m.id, m);
      } catch {
        /* evento inválido */
      }
    }
    this.map.set(next);
    this.lastUpdated.set(new Date());
    return events.length;
  }

  /** Carga inicial: todo el cuadro en una petición. */
  async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const r = await firstValueFrom(
        this.http.get<EspnScoreboard>(`${BASE}?dates=${RANGE}&limit=400`),
      );
      const n = this.merge(r.events);
      this.error.set(n ? null : 'No se recibieron partidos.');
    } catch {
      this.error.set('No se pudo conectar con el proveedor de datos.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Refresco en vivo: solo el día de hoy (los marcadores cambian ahí). */
  async refreshLive(): Promise<void> {
    try {
      const today = espnDateParam(new Date());
      const r = await firstValueFrom(
        this.http.get<EspnScoreboard>(`${BASE}?dates=${today}&limit=60`),
      );
      this.merge(r.events);
    } catch {
      /* se reintenta en el siguiente ciclo */
    }
  }
}
