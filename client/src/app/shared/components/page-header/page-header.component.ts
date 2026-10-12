import { Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { AppIconComponent } from '../app-icon/app-icon.component';

/**
 * Page header used at the top of every screen: icon tile (same icon as the
 * sidebar entry), title, subtitle, and page actions projected on the right.
 *
 * <app-page-header icon="calendar" title="Planning" subtitle="...">
 *   <button class="btn btn-primary">...</button>
 * </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [NgIf, AppIconComponent],
  template: `
    <header class="page-header-card">
      <span class="ph-icon" aria-hidden="true">
        <app-icon [name]="icon"></app-icon>
      </span>
      <div class="ph-text">
        <h1 class="ph-title">{{ title }}</h1>
        <p class="ph-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="ph-actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      margin-bottom: 20px;
    }

    /* Calm header: no card, no gradient, no glow — the page content carries the colour */
    .page-header-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 4px 0 14px;
      border-bottom: 1px solid var(--border);
    }

    .ph-icon {
      width: 38px;
      height: 38px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--primary-50);
      color: var(--primary-700);
      font-size: 19px;
      border: 1px solid var(--primary-100);
    }

    .ph-text {
      flex: 1;
      min-width: 0;
    }

    .ph-title {
      margin: 0;
      font-size: 1.3125rem;
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: -0.01em;
      color: var(--text);
    }

    .ph-subtitle {
      margin: 2px 0 0;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .ph-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .ph-actions:empty {
      display: none;
    }

    @media (max-width: 768px) {
      .page-header-card {
        flex-wrap: wrap;
      }

      .ph-actions {
        width: 100%;
      }

      .ph-actions ::ng-deep > * {
        flex: 1;
        justify-content: center;
      }
    }
  `]
})
export class PageHeaderComponent {
  @Input() icon = 'dashboard';
  @Input() title = '';
  @Input() subtitle = '';
}
