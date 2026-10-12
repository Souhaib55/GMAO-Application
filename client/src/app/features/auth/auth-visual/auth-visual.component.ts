import { Component } from '@angular/core';
import { NgFor, NgSwitch, NgSwitchCase } from '@angular/common';

/**
 * Brand panel of the sign-in pages: light, airy background with soft blue waves,
 * a two-tone headline and three short statements with round icon chips.
 */
@Component({
  selector: 'app-auth-visual',
  standalone: true,
  imports: [NgFor, NgSwitch, NgSwitchCase],
  template: `
    <aside class="panel" aria-hidden="true">
      <svg class="waves" viewBox="0 0 800 360" preserveAspectRatio="none">
        <path d="M0 150 C 180 60, 380 250, 800 120 L 800 360 L 0 360 Z" fill="#dbe6fd"/>
        <path d="M0 230 C 220 140, 430 330, 800 200 L 800 360 L 0 360 Z" fill="#a9c1f8"/>
        <path d="M0 300 C 260 220, 470 380, 800 270 L 800 360 L 0 360 Z" fill="#5a83ea"/>
      </svg>

      <div class="inner">
        <div class="brand">
          <span class="mark">
            <svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/></svg>
          </span>
          <span class="brand-text"><b>SIMOTEX</b><small>Gestion de maintenance</small></span>
        </div>

        <div class="pitch">
          <h2>Pilotez votre <span>maintenance.</span></h2>
          <p>Toute l'activité de l'atelier, de la demande d'intervention à la clôture.</p>
          <ul>
            <li *ngFor="let p of points">
              <span class="chip" [ngSwitch]="p.icon">
                <svg *ngSwitchCase="'clock'" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>
                <svg *ngSwitchCase="'calendar'" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/></svg>
                <svg *ngSwitchCase="'chart'" viewBox="0 0 24 24"><path d="M4 20h16M7 20v-6M12 20V9M17 20v-9"/></svg>
              </span>
              <span>{{ p.text }}</span>
            </li>
          </ul>
        </div>

        <footer class="foot"><i></i>SIMOTEX · Service maintenance</footer>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }

    .panel {
      position: relative;
      overflow: hidden;
      display: flex;
      background: radial-gradient(90% 70% at 85% 25%, #e8effe 0%, transparent 60%), linear-gradient(180deg, #f8faff 0%, #eef3fe 100%);
      color: var(--text);
    }

    .waves { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 42%; }

    .inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 560px;
      margin: 0 auto;
      padding: 48px 52px 36px;
    }

    .brand { display: flex; align-items: center; gap: 12px; }
    .mark {
      width: 40px; height: 40px; border-radius: 10px;
      display: grid; place-items: center;
      background: linear-gradient(150deg, #5379ea, #3150b8);
    }
    .mark svg { width: 21px; height: 21px; fill: none; stroke: #fff; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.25; }
    .brand-text b { font-size: 15px; font-weight: 600; letter-spacing: 0.1em; color: #14224f; }
    .brand-text small { font-size: 12.5px; color: var(--text-muted); }

    .pitch { margin: 48px 0 auto; }
    .pitch h2 { margin: 0; font-size: 44px; line-height: 1.12; font-weight: 600; letter-spacing: -0.02em; color: #14224f; }
    .pitch h2 span { display: block; color: var(--primary-600); }
    .pitch p { margin: 18px 0 0; font-size: 16px; line-height: 1.55; color: var(--text-secondary); max-width: 420px; }

    ul { list-style: none; margin: 32px 0 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
    li { display: flex; align-items: center; gap: 14px; font-size: 14.5px; color: #1f2b4d; max-width: 360px; }
    .chip {
      width: 44px; height: 44px; flex-shrink: 0; border-radius: 50%;
      display: grid; place-items: center;
      background: #fff; border: 1px solid #dbe5fb;
      box-shadow: 0 2px 6px rgba(61, 96, 220, 0.08);
    }
    .chip svg { width: 20px; height: 20px; fill: none; stroke: var(--primary-600); stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }

    .foot { display: flex; align-items: center; gap: 12px; font-size: 12.5px; color: rgba(255, 255, 255, 0.9); }
    .foot i { width: 28px; height: 1px; background: rgba(255, 255, 255, 0.8); }

    @media (max-width: 960px) { .panel { display: none; } }
  `]
})
export class AuthVisualComponent {
  readonly points = [
    { icon: 'clock', text: 'Demandes et interventions suivies de bout en bout' },
    { icon: 'calendar', text: 'Maintenance préventive planifiée automatiquement' },
    { icon: 'chart', text: 'Stock, achats et coûts sous contrôle' }
  ];
}
