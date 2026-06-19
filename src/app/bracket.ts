import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { WorldCupService } from './worldcup.service';
import { Match, ROUND_LABEL, RoundSlug } from './models';
import { TieCard } from './tie-card';

interface Col {
  slug: RoundSlug;
  count: number;
}

@Component({
  selector: 'app-bracket',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TieCard],
  templateUrl: './bracket.html',
  styleUrl: './bracket.css',
})
export class Bracket {
  private svc = inject(WorldCupService);

  // de fuera hacia la final (lado izquierdo)
  readonly leftCols: Col[] = [
    { slug: 'round-of-32', count: 16 },
    { slug: 'round-of-16', count: 8 },
    { slug: 'quarterfinals', count: 4 },
    { slug: 'semifinals', count: 2 },
  ];
  // lado derecho: de la final hacia fuera
  readonly rightCols: Col[] = [...this.leftCols].reverse();
  readonly mobileRounds: RoundSlug[] = [
    'round-of-32',
    'round-of-16',
    'quarterfinals',
    'semifinals',
    'final',
    '3rd-place-match',
  ];

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
  roundMatches(slug: RoundSlug): Match[] {
    return this.svc.byRound(slug);
  }
}
