import { Component } from '@angular/core';
import { NgFor, NgSwitch, NgSwitchCase } from '@angular/common';

/**
 * Brand panel of the sign-in pages: royal-blue gradient with quiet concentric rings,
 * a two-tone headline and three short statements with round icon chips.
 */
@Component({
  selector: 'app-auth-visual',
  standalone: true,
  imports: [NgFor, NgSwitch, NgSwitchCase],
  template: `
    <aside class="panel" aria-hidden="true">
      <div class="inner">
        <div class="brand">
          <span class="mark">
            <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </span>
          <span class="brand-text"><b>SIMOTEX</b><small>Gestion de maintenance</small></span>
        </div>

        <div class="pitch">
          <h2>Pilotez votre <span>maintenance.</span></h2>
          <p>Toute l'activité de l'atelier, de la demande d'intervention à la clôture.</p>
          <ul>
            <li *ngFor="let p of points">
              <span class="chip" [ngSwitch]="p.icon" [style.--c]="p.color">
                <svg *ngSwitchCase="'clock'" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>
                <svg *ngSwitchCase="'calendar'" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/></svg>
                <svg *ngSwitchCase="'chart'" viewBox="0 0 24 24"><path d="M4 20h16M7 20v-6M12 20V9M17 20v-9"/></svg>
              </span>
              <span class="txt"><b>{{ p.text }}</b><small>{{ p.sub }}</small></span>
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
      background:
        radial-gradient(70% 55% at 100% 0%, rgba(255, 255, 255, 0.14) 0%, transparent 60%),
        linear-gradient(160deg, #3a62e0 0%, #2a4fd0 48%, #1f3a9e 100%);
      color: #fff;
    }

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

    .brand { display: flex; align-items: center; gap: 14px; }
    .mark {
      width: 50px; height: 50px; flex-shrink: 0; border-radius: 13px;
      display: grid; place-items: center;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.08));
      border: 1px solid rgba(255, 255, 255, 0.32);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 24px -8px rgba(10, 25, 80, 0.6);
    }
    .mark svg { width: 24px; height: 24px; fill: none; stroke: #fff; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .brand-text { display: flex; flex-direction: column; gap: 3px; padding-left: 14px; border-left: 1px solid rgba(255, 255, 255, 0.28); }
    .brand-text b { font-size: 17px; line-height: 1.1; font-weight: 700; letter-spacing: 0.16em; color: #fff; }
    .brand-text small { font-size: 12px; line-height: 1.2; letter-spacing: 0.02em; color: #c9d7ff; }

    .pitch { margin: auto 0; padding: 32px 0; }
    .pitch h2 { margin: 0; font-size: 44px; line-height: 1.12; font-weight: 600; letter-spacing: -0.02em; color: #fff; }
    .pitch h2 span { display: block; color: #c9d7ff; }
    .pitch p { margin: 18px 0 0; font-size: 16px; line-height: 1.55; color: rgba(255, 255, 255, 0.8); max-width: 420px; }

    ul { list-style: none; margin: 34px 0 0; padding: 0; display: flex; flex-direction: column; gap: 18px; }
    li { display: flex; align-items: center; gap: 14px; max-width: 400px; }
    .chip {
      width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
      display: grid; place-items: center;
      background: color-mix(in srgb, var(--c) 18%, transparent);
      border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
    }
    .chip svg { width: 20px; height: 20px; fill: none; stroke: var(--c); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .txt { display: flex; flex-direction: column; gap: 2px; }
    .txt b { font-size: 14.5px; font-weight: 600; color: #fff; }
    .txt small { font-size: 12.5px; color: rgba(255, 255, 255, 0.68); }

    .foot { display: flex; align-items: center; gap: 12px; font-size: 12.5px; color: rgba(255, 255, 255, 0.7); }
    .foot i { width: 28px; height: 1px; background: rgba(255, 255, 255, 0.5); }

    @media (max-width: 960px) { .panel { display: none; } }
  `]
})
export class AuthVisualComponent {
  readonly points = [
    { icon: 'clock', color: '#fbbf24', text: 'Interventions suivies de bout en bout', sub: 'De la déclaration de panne à la clôture validée' },
    { icon: 'calendar', color: '#34d399', text: 'Maintenance préventive automatique', sub: 'Plans récurrents et ordres de travail générés à temps' },
    { icon: 'chart', color: '#7dd3fc', text: 'Stock, achats et coûts sous contrôle', sub: 'Réapprovisionnement, commandes et suivi budgétaire' }
  ];
}
