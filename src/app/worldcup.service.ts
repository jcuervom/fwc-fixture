import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  EspnScoreboard,
  EspnStandings,
  Match,
  RankedTeam,
  RoundSlug,
  byMerit,
  dayKey,
  dayTitle,
  espnDateParam,
  normalize,
  projectKnockouts,
  parseStandings,
  projectLiveStandings,
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
  private readonly liveGroups = computed(() =>
    projectLiveStandings(this.groups(), [...this.raw().values()]),
  );

  /** Partidos ordenados, con las eliminatorias proyectadas según la clasificación en vivo. */
  readonly all = computed(() => {
    const list = [...this.raw().values()].sort((a, b) =>
      a.dateUTC.localeCompare(b.dateUTC),
    );
    return projectKnockouts(list, this.liveGroups());
  });
  readonly liveCount = computed(() => this.all().filter((m) => m.live).length);
  readonly hasGroups = computed(
    () => Object.keys(this.liveGroups()).length > 0,
  );
  private readonly bestThirdKeys = computed(
    () =>
      new Set(
        Object.values(this.liveGroups())
          .map((g) => g.find((t) => t.rank === 3))
          .filter((t): t is RankedTeam => !!t)
          .sort(byMerit)
          .slice(0, 8)
          .map((t) => `${t.group}:${t.abbr}`),
      ),
  );
  readonly groupTables = computed(() => {
    const bestThirdKeys = this.bestThirdKeys();
    return Object.entries(this.liveGroups())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([letter, teams]) => ({
        letter,
        teams: teams.map((team) => ({
          ...team,
          bestThird:
            team.rank === 3 && bestThirdKeys.has(`${team.group}:${team.abbr}`),
        })),
      }));
  });

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
