import { Component, Input } from '@angular/core';
import { NgSwitch, NgSwitchCase } from '@angular/common';

export type AppIconName =
  | 'app' | 'factory' | 'dashboard' | 'calendar' | 'reports' | 'interventions' | 'equipment'
  | 'resources' | 'stock' | 'chat' | 'settings' | 'users' | 'references'
  | 'preventive' | 'purchase' | 'budget' | 'explorer' | 'team' | 'search' | 'plus' | 'download'
  | 'filter' | 'alert' | 'clock' | 'check' | 'close' | 'edit' | 'trash' | 'eye' | 'refresh'
  | 'arrow-right' | 'external' | 'file' | 'upload' | 'history' | 'play' | 'chevron-left'
  | 'chevron-right' | 'maximize' | 'link' | 'offline' | 'info' | 'truck' | 'coins' | 'gauge'
  | 'list' | 'table' | 'chart' | 'hash' | 'pause' | 'journal' | 'warehouse' | 'move';

/**
 * Line icons shared by the sidebar, the page headers and the screens, so a page's
 * header always shows the same icon as its menu entry. Drawn on a 24px grid with a
 * 1.7 stroke (bundled with the app: no icon font, no network).
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
      <svg *ngSwitchCase="'chart'" viewBox="0 0 24 24"><path d="M4 20V4M4 20h16"/><path d="m7 15 4-4 3 3 5-6"/></svg>
      <svg *ngSwitchCase="'interventions'" viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.8 17a1.9 1.9 0 0 0 2.7 2.7l5.5-5.5a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.1-.6-.6-2.1 2.5-2.2z"/></svg>
      <svg *ngSwitchCase="'equipment'" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      <svg *ngSwitchCase="'resources'" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><circle cx="12" cy="12" r="4"/></svg>
      <svg *ngSwitchCase="'stock'" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>
      <svg *ngSwitchCase="'warehouse'" viewBox="0 0 24 24"><path d="M3 21V8l9-5 9 5v13"/><path d="M7 21v-8h10v8M7 17h10"/></svg>
      <svg *ngSwitchCase="'chat'" viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9.5h8M8 12.5h5"/></svg>
      <svg *ngSwitchCase="'settings'" viewBox="0 0 24 24"><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/></svg>
      <svg *ngSwitchCase="'users'" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.6 3 5.2"/></svg>
      <svg *ngSwitchCase="'team'" viewBox="0 0 24 24"><circle cx="12" cy="7" r="3"/><path d="M6.5 20c.4-3 2.7-5 5.5-5s5.1 2 5.5 5"/><circle cx="5" cy="10" r="2"/><circle cx="19" cy="10" r="2"/><path d="M1.5 17.5c.3-1.8 1.6-3 3.3-3M22.5 17.5c-.3-1.8-1.6-3-3.3-3"/></svg>
      <svg *ngSwitchCase="'references'" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M9 9v11"/></svg>
      <svg *ngSwitchCase="'preventive'" viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>
      <svg *ngSwitchCase="'purchase'" viewBox="0 0 24 24"><circle cx="8" cy="20.5" r="1.2"/><circle cx="18" cy="20.5" r="1.2"/><path d="M2 2.5h2.2l2.6 12.3a2 2 0 0 0 2 1.6h9.3a2 2 0 0 0 2-1.6L21.6 7H5.2"/></svg>
      <svg *ngSwitchCase="'budget'" viewBox="0 0 24 24"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3"/><path d="M3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 12h-4a2 2 0 0 0 0 4h4a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1z"/></svg>
      <svg *ngSwitchCase="'coins'" viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>
      <svg *ngSwitchCase="'explorer'" viewBox="0 0 24 24"><ellipse cx="10" cy="5" rx="7" ry="2.5"/><path d="M3 5v6c0 1.4 3.1 2.5 7 2.5M17 5v4"/><path d="M3 11v6c0 1.4 3.1 2.5 7 2.5"/><circle cx="17" cy="16" r="3.2"/><path d="m19.4 18.4 2.1 2.1"/></svg>
      <svg *ngSwitchCase="'search'" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <svg *ngSwitchCase="'plus'" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      <svg *ngSwitchCase="'download'" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
      <svg *ngSwitchCase="'upload'" viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></svg>
      <svg *ngSwitchCase="'filter'" viewBox="0 0 24 24"><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/></svg>
      <svg *ngSwitchCase="'alert'" viewBox="0 0 24 24"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      <svg *ngSwitchCase="'info'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
      <svg *ngSwitchCase="'clock'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
      <svg *ngSwitchCase="'history'" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>
      <svg *ngSwitchCase="'check'" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
      <svg *ngSwitchCase="'close'" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>
      <svg *ngSwitchCase="'edit'" viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>
      <svg *ngSwitchCase="'trash'" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>
      <svg *ngSwitchCase="'eye'" viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
      <svg *ngSwitchCase="'refresh'" viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.9-3.9L3 9"/><path d="M3 4v5h5M4 13a8 8 0 0 0 14.9 3.9L21 15"/><path d="M21 20v-5h-5"/></svg>
      <svg *ngSwitchCase="'arrow-right'" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      <svg *ngSwitchCase="'chevron-left'" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>
      <svg *ngSwitchCase="'chevron-right'" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>
      <svg *ngSwitchCase="'external'" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>
      <svg *ngSwitchCase="'maximize'" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
      <svg *ngSwitchCase="'file'" viewBox="0 0 24 24"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>
      <svg *ngSwitchCase="'link'" viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>
      <svg *ngSwitchCase="'offline'" viewBox="0 0 24 24"><path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2.4-1.8M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5M12 20h.01"/></svg>
      <svg *ngSwitchCase="'play'" viewBox="0 0 24 24"><path d="M7 4v16l13-8L7 4z"/></svg>
      <svg *ngSwitchCase="'pause'" viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>
      <svg *ngSwitchCase="'truck'" viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
      <svg *ngSwitchCase="'gauge'" viewBox="0 0 24 24"><path d="M3.5 17a9 9 0 1 1 17 0"/><path d="m12 13 4-5"/><circle cx="12" cy="13" r="1.4"/></svg>
      <svg *ngSwitchCase="'list'" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>
      <svg *ngSwitchCase="'table'" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 10h18M3 15h18M9 10v10"/></svg>
      <svg *ngSwitchCase="'hash'" viewBox="0 0 24 24"><path d="M5 9h15M4 15h15M10 3 8 21M16 3l-2 18"/></svg>
      <svg *ngSwitchCase="'journal'" viewBox="0 0 24 24"><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4z"/><path d="M5 18a2 2 0 0 1 2-2h12M9 8h6M9 11h4"/></svg>
      <svg *ngSwitchCase="'move'" viewBox="0 0 24 24"><path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4"/></svg>
    </ng-container>
  `,
  styles: [`
    :host {
      display: inline-grid;
      place-items: center;
      width: 1em;
      height: 1em;
      line-height: 0;
      flex-shrink: 0;
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
