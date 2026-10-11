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

    .page-header-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 22px;
      background: linear-gradient(90deg, var(--surface) 55%, var(--primary-50) 100%);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--card-shadow);
    }

    .ph-icon {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--brand-gradient);
      color: #fff;
      font-size: 24px;
      box-shadow: 0 6px 14px rgba(61, 96, 220, 0.25);
    }

    .ph-text {
      flex: 1;
      min-width: 0;
    }

    .ph-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      line-height: 1.25;
      letter-spacing: -0.015em;
      color: var(--text);
    }

    .ph-subtitle {
      margin: 3px 0 0;
      font-size: 14px;
      color: var(--text-secondary);
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
        padding: 16px;
      }

      .ph-icon {
        width: 42px;
        height: 42px;
        font-size: 21px;
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
