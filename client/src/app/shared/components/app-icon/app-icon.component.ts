import { Component, Input } from '@angular/core';
import { NgSwitch, NgSwitchCase } from '@angular/common';

export type AppIconName =
  | 'app' | 'factory' | 'dashboard' | 'calendar' | 'reports' | 'interventions' | 'equipment'
  | 'resources' | 'stock' | 'chat' | 'settings' | 'users' | 'references';

/**
 * Line icons shared by the sidebar and the page headers, so a page's
 * header always shows the same icon as its menu entry.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [NgSwitch, NgSwitchCase],
  template: `
    <ng-container [ngSwitch]="name">
      <svg *ngSwitchCase="'app'" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/></svg>
      <svg *ngSwitchCase="'factory'" viewBox="0 0 24 24"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1M12 18h1M7 18h1"/></svg>
      <svg *ngSwitchCase="'dashboard'" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
      <svg *ngSwitchCase="'calendar'" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M7.5 17h3M13.5 13.5h3"/></svg>
      <svg *ngSwitchCase="'reports'" viewBox="0 0 24 24"><path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6M20 16V6"/></svg>
      <svg *ngSwitchCase="'interventions'" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.8 17a1.9 1.9 0 0 0 2.7 2.7l5.5-5.5a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.1-.6-.6-2.1 2.5-2.2z"/></svg>
      <svg *ngSwitchCase="'equipment'" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      <svg *ngSwitchCase="'resources'" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><circle cx="12" cy="12" r="4"/></svg>
      <svg *ngSwitchCase="'stock'" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
      <svg *ngSwitchCase="'chat'" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9.5h8M8 12.5h5"/></svg>
      <svg *ngSwitchCase="'settings'" viewBox="0 0 24 24"><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>
      <svg *ngSwitchCase="'users'" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.6 3 5.2"/></svg>
      <svg *ngSwitchCase="'references'" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M9 9v11"/></svg>
    </ng-container>
  `,
  styles: [`
    :host {
      display: inline-grid;
      place-items: center;
      width: 1em;
      height: 1em;
      line-height: 0;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `]
})
export class AppIconComponent {
  @Input() name: AppIconName | string = 'dashboard';
}
