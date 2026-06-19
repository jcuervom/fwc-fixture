import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { WorldCupService } from './core/worldcup.service';
import { Bracket } from './features/bracket/bracket';
import { TeamBadge } from './shared/team-badge/team-badge';
import { TieCard } from './shared/tie-card/tie-card';

@Component({
  selector: 'app-root',
  imports: [Bracket, TeamBadge, TieCard],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class App implements OnInit, OnDestroy {
  readonly svc = inject(WorldCupService);
  readonly autoOn = signal(true);
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.svc.loadAll();
    this.startTimer();
    document.addEventListener('visibilitychange', this.onVisible);
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
