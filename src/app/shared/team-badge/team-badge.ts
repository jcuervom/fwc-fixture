import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-team-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (logo() && !failed()) {
      <img
        class="badge"
        [src]="logo()"
        alt=""
        loading="lazy"
        (error)="failed.set(true)"
      />
    } @else {
      <span class="badge ph">{{ abbr() }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .badge {
        width: var(--sz, 24px);
        height: var(--sz, 24px);
        object-fit: contain;
        flex: none;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.55));
      }
      .badge.ph {
        width: var(--sz, 24px);
        height: var(--sz, 24px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ground-3);
        border-radius: 5px;
        font-size: 9px;
        font-weight: 700;
        font-family: var(--mono);
        color: var(--muted);
      }
    `,
  ],
})
export class TeamBadge {
  readonly logo = input<string | null>(null);
  readonly abbr = input<string>('—');
  readonly failed = signal(false);
}
