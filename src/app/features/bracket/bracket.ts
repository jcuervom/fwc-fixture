import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from '@angular/core';
import { Match, ROUND_LABEL, RoundSlug, Side } from '../../core/models';
import { WorldCupService } from '../../core/worldcup.service';
import { TieCard } from '../../shared/tie-card/tie-card';
import { TeamBadge } from '../../shared/team-badge/team-badge';

interface Col {
  slug: RoundSlug;
  count: number;
}

@Component({
  selector: 'app-bracket',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TieCard, TeamBadge],
  templateUrl: './bracket.html',
  styleUrl: './bracket.css',
})
export class Bracket implements AfterViewInit {
  private svc = inject(WorldCupService);
  @ViewChild('bracketScroll')
  private bracketScroll?: ElementRef<HTMLDivElement>;

  // de fuera hacia la final (lado izquierdo)
  readonly leftCols: Col[] = [
    { slug: 'round-of-32', count: 16 },
    { slug: 'round-of-16', count: 8 },
    { slug: 'quarterfinals', count: 4 },
    { slug: 'semifinals', count: 2 },
  ];
  // lado derecho: de la final hacia fuera
  readonly rightCols: Col[] = [...this.leftCols].reverse();

  ngAfterViewInit(): void {
    this.centerMobileMap();
  }

  label(slug: RoundSlug): string {
    return ROUND_LABEL[slug];
  }
  slots(count: number): number {
    return count / 2;
  }
  isSingle(count: number): boolean {
    return count / 2 === 1;
  }

  /** Ties de un lado, rellenando con null hasta completar el cuadro. */
  sideTies(
    slug: RoundSlug,
    count: number,
    side: 'left' | 'right',
  ): (Match | null)[] {
    const full = this.svc.byRound(slug);
    const padded: (Match | null)[] = full.slice(0, count);
    while (padded.length < count) padded.push(null);
    const half = count / 2;
    return side === 'left' ? padded.slice(0, half) : padded.slice(half);
  }

  finalMatch(): Match | null {
    return this.svc.byRound('final')[0] ?? null;
  }
  thirdMatch(): Match | null {
    return this.svc.byRound('3rd-place-match')[0] ?? null;
  }

  /** Campeón: el lado ganador de la final ya disputada (si lo hay). */
  champion(): Side | null {
    const m = this.finalMatch();
    if (!m || m.state !== 'post' || m.home.score == null || m.away.score == null)
      return null;
    if (m.home.score > m.away.score) return m.home;
    if (m.away.score > m.home.score) return m.away;
    return null;
  }

  /**
   * En pantallas estrechas el cuadro se desplaza en horizontal. En vez de
   * aterrizar en el centro geométrico (la final, a menudo aún sin equipos),
   * llevamos al usuario a algo informativo: un partido en vivo si lo hay; si
   * no, el primer cruce real del borde izquierdo.
   */
  private centerMobileMap(): void {
    requestAnimationFrame(() => {
      const el = this.bracketScroll?.nativeElement;
      if (!el || !globalThis.matchMedia('(max-width: 1200px)').matches) return;
      const target =
        el.querySelector<HTMLElement>('.card.live') ??
        el.querySelector<HTMLElement>('.round.left .card:not(.empty)');
      if (target) {
        const cardRect = target.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const left =
          el.scrollLeft +
          (cardRect.left - elRect.left) -
          el.clientWidth / 2 +
          cardRect.width / 2;
        el.scrollTo({ left: Math.max(0, left), top: 0 });
      } else {
        el.scrollTo({ left: 0, top: 0 });
      }
    });
  }
}
