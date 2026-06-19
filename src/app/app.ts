import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FixturesService } from './fixtures.service';
import { TeamBadge } from './team-badge';
import {
  DIA,
  MES,
  MES_LARGO,
  MatchEvent,
  hasScore,
  isFinal,
  isLive,
  kickoffLocal,
  shortDate,
  stadiumShort,
  stateLabel,
} from './models';

@Component({
  selector: 'app-root',
  imports: [TeamBadge],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  readonly svc = inject(FixturesService);

  readonly currentDay = signal(this.svc.defaultDay);
  readonly autoOn = signal(true);
  readonly flashIds = signal<Set<string>>(new Set());

  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly prev = new Map<string, string>();

  // helpers expuestos al template
  readonly isLive = isLive;
  readonly isFinal = isFinal;
  readonly hasScore = hasScore;
  readonly stateLabel = stateLabel;
  readonly kickoffLocal = kickoffLocal;
  readonly shortDate = shortDate;
  readonly stadiumShort = stadiumShort;

  /** Fechas con partidos ya cargados, más el día activo. */
  readonly visibleDates = computed(() => {
    const map = this.svc.byDate();
    const loaded = this.svc.loadedDays();
    return this.svc.dates.filter(
      (d) =>
        (loaded.has(d) && (map[d]?.length ?? 0) > 0) || d === this.currentDay(),
    );
  });

  /** Tarjetas del hero: lo que está en juego o, si no hay nada, lo próximo. */
  readonly heroEvents = computed(() => {
    const live = this.svc.liveEvents();
    return live.length ? live : this.svc.upcoming().slice(0, 4);
  });

  constructor() {
    // Destello del marcador cuando cambia un resultado en vivo.
    effect(() => {
      const map = this.svc.byDate();
      const changed: string[] = [];
      for (const d of Object.keys(map)) {
        for (const e of map[d]) {
          if (!hasScore(e)) continue;
          const val = `${e.intHomeScore}-${e.intAwayScore}`;
          const before = this.prev.get(e.idEvent);
          if (before && before !== val) changed.push(e.idEvent);
          this.prev.set(e.idEvent, val);
        }
      }
      if (changed.length) {
        this.flashIds.update((s) => new Set([...s, ...changed]));
        setTimeout(
          () =>
            this.flashIds.update((s) => {
              const n = new Set(s);
              changed.forEach((c) => n.delete(c));
              return n;
            }),
          1200,
        );
      }
    });
  }

  ngOnInit(): void {
    void this.init();
    document.addEventListener('visibilitychange', this.onVisible);
  }

  private async init(): Promise<void> {
    await this.svc.loadAll(this.currentDay());
    if (this.svc.usingDemo()) this.currentDay.set('2026-06-19');
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.stopTimer();
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  private readonly onVisible = () => {
    if (!document.hidden && this.autoOn()) this.svc.refreshLive();
  };

  private startTimer(): void {
    this.stopTimer();
    if (this.autoOn())
      this.timer = setInterval(() => this.svc.refreshLive(), 30000);
  }
  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  toggleAuto(): void {
    this.autoOn.update((v) => !v);
    if (this.autoOn()) {
      this.svc.refreshLive();
      this.startTimer();
    } else this.stopTimer();
  }

  selectDay(d: string): void {
    this.currentDay.set(d);
    requestAnimationFrame(() => {
      document
        .getElementById('day-' + d)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // --- accesos para el template ---
  matchesFor(d: string): MatchEvent[] {
    return this.svc.byDate()[d] || [];
  }
  isLoaded(d: string): boolean {
    return this.svc.loadedDays().has(d);
  }
  liveCountFor(d: string): number {
    return this.matchesFor(d).filter(isLive).length;
  }
  dayHasLive(d: string): boolean {
    return this.matchesFor(d).some(isLive);
  }
  isFlashing(id: string): boolean {
    return this.flashIds().has(id);
  }

  dayNumber(d: string): number {
    return new Date(d + 'T00:00:00').getDate();
  }
  dayMonthShort(d: string): string {
    return MES[new Date(d + 'T00:00:00').getMonth()];
  }
  dayTitle(d: string): string {
    const dt = new Date(d + 'T00:00:00');
    return `${DIA[dt.getDay()]} ${dt.getDate()} ${MES_LARGO[dt.getMonth()]}`;
  }

  updatedLabel(): string {
    const t = this.svc.lastUpdated();
    return t
      ? t.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : '';
  }
}
