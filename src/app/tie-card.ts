import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Match, Side } from './models';
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
          <span
            class="nm"
            [class.tbd]="m.home.tbd"
            [class.proj]="m.home.projected"
            [attr.title]="sideTooltip(m.home)"
          >
            @if (m.home.playingNow) {
              <span class="team-live-dot" aria-label="Jugando ahora"></span>
            }
            <span class="name-text">{{ m.home.name }}</span></span
          >
          <span class="sc">{{ showScore() ? (m.home.score ?? '') : '' }}</span>
        </div>
        <div class="row" [class.win]="awayWins()">
          <app-team-badge [logo]="m.away.logo" [abbr]="m.away.abbr" />
          <span
            class="nm"
            [class.tbd]="m.away.tbd"
            [class.proj]="m.away.projected"
            [attr.title]="sideTooltip(m.away)"
          >
            @if (m.away.playingNow) {
              <span class="team-live-dot" aria-label="Jugando ahora"></span>
            }
            <span class="name-text">{{ m.away.name }}</span></span
          >
          <span class="sc">{{ showScore() ? (m.away.score ?? '') : '' }}</span>
        </div>
        @if (projected()) {
          <div
            class="st proj"
            title="Equipos proyectados según la clasificación en vivo"
          >
            ⟿ Proyectado · {{ m.detail }}
          </div>
        } @else {
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
        }
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
        border-radius: var(--tie-radius, 9px);
        padding: var(--tie-pad-y, 6px) var(--tie-pad-x, 9px);
        display: flex;
        flex-direction: column;
        gap: var(--tie-gap, 2px);
        min-height: var(--tie-min-h, auto);
        min-width: 0;
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
        padding: var(--tie-big-pad-y, 12px) var(--tie-big-pad-x, 14px);
        gap: var(--tie-big-gap, 5px);
      }
      .row {
        display: flex;
        align-items: center;
        gap: var(--tie-row-gap, 8px);
        min-width: 0;
        --sz: var(--tie-badge-size, 20px);
      }
      .card.big .row {
        --sz: var(--tie-big-badge-size, 30px);
      }
      .nm {
        flex: 1;
        min-width: 0;
        font-weight: 600;
        font-size: var(--tie-name-size, 13px);
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .card.big .nm {
        font-size: var(--tie-big-name-size, 17px);
        font-weight: 700;
      }
      .nm.tbd {
        color: var(--muted);
        font-weight: 500;
        font-style: italic;
      }
      .nm.proj {
        color: var(--accent-2);
        border-bottom: 1px dashed rgba(31, 214, 197, 0.55);
      }
      .name-text {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .team-live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 0 3px rgba(255, 45, 120, 0.16);
        flex: none;
      }
      .sc {
        font-family: var(--mono);
        font-weight: 700;
        font-size: var(--tie-score-size, 14px);
        color: var(--text);
        min-width: 12px;
        text-align: right;
      }
      .card.big .sc {
        font-size: var(--tie-big-score-size, 20px);
      }
      .row.win .nm {
        color: var(--text);
      }
      .row.win .sc {
        color: var(--accent-2);
      }
      .st {
        margin-top: 2px;
        font-family: var(--mono);
        font-size: var(--tie-status-size, 9px);
        letter-spacing: var(--tie-status-spacing, 0.1em);
        text-transform: uppercase;
        color: var(--muted);
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .card.big .st {
        font-size: var(--tie-big-status-size, 11px);
        justify-content: center;
      }
      .st.live {
        color: var(--accent);
      }
      .st.final {
        color: var(--gold);
      }
      .st.proj {
        color: var(--accent-2);
        text-transform: none;
        letter-spacing: 0.04em;
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
      @media (max-width: 560px) {
        .card {
          border-radius: 8px;
          padding: 7px 8px;
        }
        .card.big {
          padding: 10px 12px;
          gap: 4px;
        }
        .row {
          gap: 6px;
          --sz: 18px;
        }
        .card.big .row {
          --sz: 24px;
        }
        .nm {
          font-size: 12.5px;
        }
        .card.big .nm {
          font-size: 15px;
        }
        .sc {
          font-size: 13px;
        }
        .card.big .sc {
          font-size: 18px;
        }
        .st {
          font-size: 8.5px;
          letter-spacing: 0.07em;
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
  readonly projected = computed(() => {
    const m = this.match();
    return !!m && m.state === 'pre' && (m.home.projected || m.away.projected);
  });
  readonly homeWins = computed(() => this.winner() === 'home');
  readonly awayWins = computed(() => this.winner() === 'away');

  sideTooltip(side: Side): string | null {
    const parts = [];
    if (side.playingNow) parts.push('Jugando ahora');
    if (side.groupSlot) parts.push(`Posición actual: ${side.groupSlot}`);
    return parts.length ? parts.join(' · ') : null;
  }

  private winner(): 'home' | 'away' | null {
    const m = this.match();
    if (
      !m ||
      m.state !== 'post' ||
      m.home.score == null ||
      m.away.score == null
    )
      return null;
    if (m.home.score > m.away.score) return 'home';
    if (m.away.score > m.home.score) return 'away';
    return null;
  }
}
