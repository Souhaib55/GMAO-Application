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
            <svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/></svg>
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

    .brand { display: flex; align-items: center; gap: 12px; }
    .mark {
      width: 40px; height: 40px; border-radius: 10px;
      display: grid; place-items: center;
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.22);
    }
    .mark svg { width: 21px; height: 21px; fill: none; stroke: #fff; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.25; }
    .brand-text b { font-size: 15px; font-weight: 600; letter-spacing: 0.1em; }
    .brand-text small { font-size: 12.5px; color: rgba(255, 255, 255, 0.72); }

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
