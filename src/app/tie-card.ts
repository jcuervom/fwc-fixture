import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Match } from './models';
import { TeamBadge } from './team-badge';

@Component({
  selector: 'app-tie',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TeamBadge],
  template: `
    @let m = match();
    <div
      class="card"
      [class.live]="m?.live"
      [class.empty]="!m"
      [class.big]="big()"
    >
      @if (m) {
        <div class="row" [class.win]="homeWins()">
          <app-team-badge [logo]="m.home.logo" [abbr]="m.home.abbr" />
          <span class="nm" [class.tbd]="m.home.tbd">{{ m.home.name }}</span>
          <span class="sc">{{ showScore() ? (m.home.score ?? '') : '' }}</span>
        </div>
        <div class="row" [class.win]="awayWins()">
          <app-team-badge [logo]="m.away.logo" [abbr]="m.away.abbr" />
          <span class="nm" [class.tbd]="m.away.tbd">{{ m.away.name }}</span>
          <span class="sc">{{ showScore() ? (m.away.score ?? '') : '' }}</span>
        </div>
        <div
          class="st"
          [class.live]="m.live"
          [class.final]="m.state === 'post'"
        >
          @if (m.live) {
            <span class="dot"></span>
          }
          {{ m.detail }}
        </div>
      } @else {
        <div class="row tbd-row"><span class="nm tbd">Por definir</span></div>
        <div class="row tbd-row"><span class="nm tbd">Por definir</span></div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .card {
        background: var(--ground-2);
        border: 1px solid var(--line);
        border-radius: 9px;
        padding: 6px 9px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        position: relative;
        overflow: hidden;
      }
      .card.live {
        border-color: rgba(255, 45, 120, 0.55);
        background: linear-gradient(
          180deg,
          rgba(255, 45, 120, 0.07),
          var(--ground-2)
        );
      }
      .card.empty {
        border-style: dashed;
        opacity: 0.6;
      }
      .card.big {
        padding: 12px 14px;
        gap: 5px;
      }
      .row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        --sz: 20px;
      }
      .card.big .row {
        --sz: 30px;
      }
      .nm {
        flex: 1;
        min-width: 0;
        font-weight: 600;
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .card.big .nm {
        font-size: 17px;
        font-weight: 700;
      }
      .nm.tbd {
        color: var(--muted);
        font-weight: 500;
        font-style: italic;
      }
      .row.win .nm {
        color: var(--text);
      }
      .row:not(.win) .nm:not(.tbd) {
        color: var(--text);
      }
      .sc {
        font-family: var(--mono);
        font-weight: 700;
        font-size: 14px;
        color: var(--text);
        min-width: 12px;
        text-align: right;
      }
      .card.big .sc {
        font-size: 20px;
      }
      .row.win .sc {
        color: var(--accent-2);
      }
      .st {
        margin-top: 2px;
        font-family: var(--mono);
        font-size: 9px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--muted);
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .card.big .st {
        font-size: 11px;
        justify-content: center;
      }
      .st.live {
        color: var(--accent);
      }
      .st.final {
        color: var(--gold);
      }
      .tbd-row {
        --sz: 20px;
        height: 22px;
        align-items: center;
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
        position: relative;
        flex: none;
      }
      .dot::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        border: 2px solid var(--accent);
        opacity: 0.6;
        animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
      @keyframes ping {
        0% {
          transform: scale(0.6);
          opacity: 0.7;
        }
        70%,
        100% {
          transform: scale(2.1);
          opacity: 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .dot::after {
          animation: none;
        }
      }
    `,
  ],
})
export class TieCard {
  readonly match = input<Match | null>(null);
  readonly big = input(false);

  readonly showScore = computed(() => {
    const m = this.match();
    return !!m && m.state !== 'pre';
  });
  readonly homeWins = computed(
    () =>
      this.decided() && this.match()!.home.score! > this.match()!.away.score!,
  );
  readonly awayWins = computed(
    () =>
      this.decided() && this.match()!.away.score! > this.match()!.home.score!,
  );

  private decided(): boolean {
    const m = this.match();
    return (
      !!m && m.state === 'post' && m.home.score != null && m.away.score != null
    );
  }
}
