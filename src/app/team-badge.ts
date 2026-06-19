import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { initialsOf } from './models';

@Component({
  selector: 'app-team-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (url() && !failed()) {
      <img
        class="badge"
        [src]="url()"
        alt=""
        loading="lazy"
        (error)="failed.set(true)"
      />
    } @else {
      <span class="badge ph">{{ initials() }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .badge {
        width: var(--sz, 26px);
        height: var(--sz, 26px);
        object-fit: contain;
        flex: none;
        filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
      }
      .badge.ph {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ground-3);
        border-radius: 6px;
        font-size: 11px;
        font-family: var(--mono);
        color: var(--muted);
      }
    `,
  ],
})
export class TeamBadge {
  readonly url = input<string | null>(null);
  readonly name = input<string | null>(null);
  readonly failed = signal(false);
  readonly initials = computed(() => initialsOf(this.name()));
}
