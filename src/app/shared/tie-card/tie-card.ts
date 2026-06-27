import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Match, Side } from '../../core/models';
import { TeamBadge } from '../team-badge/team-badge';

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
      [class.final-card]="final()"
      [class.compact]="compact()"
      [class.proj]="projected()"
      [class.done]="!!m && m.state === 'post'"
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
            <span class="name-text" [attr.title]="m.home.name">{{
              nameOf(m.home)
            }}</span></span
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
            <span class="name-text" [attr.title]="m.away.name">{{
              nameOf(m.away)
            }}</span></span
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
        border: 1px solid var(--line-strong);
        border-radius: var(--tie-radius, 9px);
        padding: var(--tie-pad-y, 6px) var(--tie-pad-x, 9px);
        display: flex;
        flex-direction: column;
        gap: var(--tie-gap, 2px);
        min-height: var(--tie-min-h, auto);
        min-width: 0;
        position: relative;
        overflow: hidden;
        box-shadow: var(--elev-1);
        transition:
          border-color 0.15s ease,
          background 0.15s ease,
          box-shadow 0.15s ease,
          transform 0.15s ease;
      }
      .card:not(.empty):hover {
        border-color: var(--accent-2);
        background: var(--ground-3);
      }
      /* partido decidido en el listado: filo dorado de "resuelto" */
      .card.done:not(.big):not(.compact) {
        box-shadow: var(--elev-1), inset 2px 0 0 rgba(233, 196, 106, 0.4);
      }
      /* proyectado: tinte turquesa frío, un escalón por debajo de lo decidido */
      .card.proj:not(.live) {
        background: linear-gradient(
          180deg,
          rgba(31, 214, 197, 0.045),
          var(--ground-2)
        );
      }
      .card.live {
        border-color: rgba(255, 45, 120, 0.65);
        background: linear-gradient(
          180deg,
          rgba(255, 45, 120, 0.09),
          var(--ground-2)
        );
        box-shadow:
          var(--elev-1),
          0 0 0 1px rgba(255, 45, 120, 0.3),
          0 0 22px -6px rgba(255, 45, 120, 0.3);
        animation: liveBreath 2.6s ease-in-out infinite;
      }
      .card.live:hover {
        border-color: rgba(255, 45, 120, 0.85);
        background: linear-gradient(
          180deg,
          rgba(255, 45, 120, 0.12),
          var(--ground-2)
        );
      }
      @keyframes liveBreath {
        0%,
        100% {
          box-shadow:
            var(--elev-1),
            0 0 0 1px rgba(255, 45, 120, 0.28),
            0 0 14px -8px rgba(255, 45, 120, 0.2);
        }
        50% {
          box-shadow:
            var(--elev-1),
            0 0 0 1px rgba(255, 45, 120, 0.48),
            0 0 28px -4px rgba(255, 45, 120, 0.4);
        }
      }
      .card.empty {
        border-style: dashed;
        opacity: 0.55;
        box-shadow: none;
      }
      .card.empty:hover {
        border-color: var(--line-strong);
        background: var(--ground-2);
      }
      .card.big {
        padding: var(--tie-big-pad-y, 12px) var(--tie-big-pad-x, 14px);
        gap: var(--tie-big-gap, 5px);
      }
      /* La FINAL: la tarjeta-destino del cuadro, en oro y con elevación real. */
      .card.final-card {
        background: linear-gradient(
          180deg,
          rgba(233, 196, 106, 0.13),
          var(--ground-3) 58%
        );
        border-color: rgba(233, 196, 106, 0.55);
        box-shadow:
          0 0 0 1px rgba(233, 196, 106, 0.12),
          0 16px 42px -12px rgba(0, 0, 0, 0.72),
          0 0 54px -8px rgba(233, 196, 106, 0.22);
      }
      .card.final-card:hover {
        border-color: rgba(233, 196, 106, 0.78);
        background: linear-gradient(
          180deg,
          rgba(233, 196, 106, 0.17),
          var(--ground-3) 58%
        );
      }
      .card.final-card .sc {
        color: var(--gold);
      }
      .card.final-card .row.win .sc {
        color: var(--gold);
        text-shadow: 0 0 14px rgba(233, 196, 106, 0.5);
      }
      .card.final-card .row.win .nm {
        text-shadow: 0 0 16px rgba(233, 196, 106, 0.28);
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
      /* En el cuadro los nombres son cortos; si aún no caben, 2 líneas en vez
         de recortar con puntos suspensivos (que parece un dato roto). */
      .card.compact .name-text {
        white-space: normal;
        overflow-wrap: anywhere;
        line-height: 1.05;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        text-overflow: clip;
      }
      .team-live-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent);
        box-shadow: 0 0 0 3px rgba(255, 45, 120, 0.16);
        flex: none;
        position: relative;
      }
      .team-live-dot::after {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 50%;
        border: 2px solid var(--accent);
        opacity: 0.6;
        animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
      .sc {
        font-family: var(--mono);
        font-weight: 700;
        font-size: var(--tie-score-size, 14px);
        font-variant-numeric: tabular-nums lining-nums;
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
        letter-spacing: 0.01em;
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
  /** Tarjeta de la final: tratamiento dorado de campeón. */
  readonly final = input(false);
  /** Contexto estrecho (cuadro): usa nombre corto y permite 2 líneas. */
  readonly compact = input(false);

  /** Nombre a mostrar: corto en el cuadro, completo en los listados. */
  nameOf(side: Side): string {
    return this.compact() ? side.short || side.name : side.name;
  }

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
