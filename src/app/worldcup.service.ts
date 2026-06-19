import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  EspnScoreboard,
  EspnStandings,
  Match,
  RankedTeam,
  RoundSlug,
  Side,
  byMerit,
  dayKey,
  dayTitle,
  espnDateParam,
  normalize,
  parseStandings,
  rankedToSide,
} from './models';

const BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const SCORES = `${BASE}/scoreboard`;
const STANDINGS =
  'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';
const RANGE = '20260611-20260719'; // todo el torneo en una sola petición

@Injectable({ providedIn: 'root' })
export class WorldCupService {
  private readonly http = inject(HttpClient);

  private readonly raw = signal<Map<string, Match>>(new Map());
  private readonly groups = signal<Record<string, RankedTeam[]>>({});
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly lastUpdated = signal<Date | null>(null);

  /** Partidos ordenados, con las eliminatorias proyectadas según la clasificación en vivo. */
  readonly all = computed(() => {
    const list = [...this.raw().values()].sort((a, b) =>
      a.dateUTC.localeCompare(b.dateUTC),
    );
    return this.projectKnockouts(list, this.groups());
  });
  readonly liveCount = computed(() => this.all().filter((m) => m.live).length);
  readonly hasGroups = computed(() => Object.keys(this.groups()).length > 0);

  byRound(round: RoundSlug): Match[] {
    return this.all().filter((m) => m.round === round);
  }

  readonly days = computed(() => {
    const seen = new Map<string, { key: string; title: string }>();
    for (const m of this.all()) {
      const k = dayKey(m.dateUTC);
      if (k && !seen.has(k))
        seen.set(k, { key: k, title: dayTitle(m.dateUTC) });
    }
    return [...seen.values()];
  });
  matchesOnDay(key: string): Match[] {
    return this.all().filter((m) => dayKey(m.dateUTC) === key);
  }

  // ---------------- proyección de clasificados ----------------
  private projectKnockouts(
    list: Match[],
    groups: Record<string, RankedTeam[]>,
  ): Match[] {
    if (!Object.keys(groups).length) return list;

    // 8 mejores terceros (por puntos, dif. y goles a favor)
    const thirds = Object.values(groups)
      .map((g) => g.find((t) => t.rank === 3))
      .filter((t): t is RankedTeam => !!t)
      .sort(byMerit)
      .slice(0, 8);

    // asignación voraz de terceros a las plazas "3RD", respetando los grupos elegibles
    const thirdSlot = new Map<string, RankedTeam>();
    const used = new Set<string>();
    const slots: { key: string; eligible: string[] }[] = [];
    for (const m of list) {
      if (m.round === 'group-stage') continue;
      for (const ha of ['home', 'away'] as const) {
        const s = m[ha];
        if (s.thirdGroups)
          slots.push({ key: `${m.id}:${ha}`, eligible: s.thirdGroups });
      }
    }
    for (const slot of slots) {
      const pick =
        thirds.find(
          (t) => !used.has(t.group) && slot.eligible.includes(t.group),
        ) || thirds.find((t) => !used.has(t.group));
      if (pick) {
        used.add(pick.group);
        thirdSlot.set(slot.key, pick);
      }
    }

    const resolve = (s: Side, key: string): Side => {
      if (!s.tbd) return s;
      const gp = /^([12])([A-L])$/.exec(s.abbr);
      if (gp) {
        const team = (groups[gp[2]] || []).find(
          (t) => t.rank === Number(gp[1]),
        );
        return team ? rankedToSide(team) : s;
      }
      if (s.thirdGroups) {
        const team = thirdSlot.get(key);
        return team ? rankedToSide(team) : s;
      }
      return s; // ganadores de rondas eliminatorias: no se predicen
    };

    return list.map((m) =>
      m.round === 'group-stage'
        ? m
        : {
            ...m,
            home: resolve(m.home, `${m.id}:home`),
            away: resolve(m.away, `${m.id}:away`),
          },
    );
  }

  // ---------------- carga ----------------
  private merge(events: EspnScoreboard['events']): number {
    if (!events?.length) return 0;
    const next = new Map(this.raw());
    for (const e of events) {
      try {
        const m = normalize(e);
        next.set(m.id, m);
      } catch {
        /* evento inválido */
      }
    }
    this.raw.set(next);
    this.lastUpdated.set(new Date());
    return events.length;
  }

  private async fetchStandings(): Promise<void> {
    try {
      const d = await firstValueFrom(this.http.get<EspnStandings>(STANDINGS));
      const g = parseStandings(d);
      if (Object.keys(g).length) this.groups.set(g);
    } catch {
      /* la proyección queda en "por definir" */
    }
  }

  async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const [scores] = await Promise.all([
        firstValueFrom(
          this.http.get<EspnScoreboard>(`${SCORES}?dates=${RANGE}&limit=400`),
        ),
        this.fetchStandings(),
      ]);
      const n = this.merge(scores.events);
      this.error.set(n ? null : 'No se recibieron partidos.');
    } catch {
      this.error.set('No se pudo conectar con el proveedor de datos.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Refresco en vivo: marcadores de hoy + clasificaciones (mueven la proyección). */
  async refreshLive(): Promise<void> {
    const today = espnDateParam(new Date());
    await Promise.all([
      firstValueFrom(
        this.http.get<EspnScoreboard>(`${SCORES}?dates=${today}&limit=60`),
      )
        .then((r) => this.merge(r.events))
        .catch(() => 0),
      this.fetchStandings(),
    ]);
  }
}
