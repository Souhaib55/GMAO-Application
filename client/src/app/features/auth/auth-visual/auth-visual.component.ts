import { Component } from '@angular/core';
import { NgFor } from '@angular/common';

/**
 * Brand panel of the sign-in pages: royal-blue gradient, the brand, one short
 * headline and three plain statements of what the application does.
 */
@Component({
  selector: 'app-auth-visual',
  standalone: true,
  imports: [NgFor],
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
          <h2>Pilotez votre maintenance.</h2>
          <p>Toute l'activité de l'atelier, de la demande d'intervention à la clôture.</p>
          <ul>
            <li *ngFor="let p of points">
              <svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
              <span>{{ p }}</span>
            </li>
          </ul>
        </div>

        <footer class="foot">SIMOTEX · Service maintenance</footer>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }

    .panel {
      background: linear-gradient(160deg, #3a62e0 0%, #2a4fd0 45%, #1f3a9e 100%);
      color: #fff;
      display: flex;
    }

    .inner {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      padding: 52px 52px 40px;
    }

    .brand { display: flex; align-items: center; gap: 12px; }
    .mark {
      width: 40px; height: 40px; border-radius: 10px;
      display: grid; place-items: center;
      background: rgba(255, 255, 255, 0.14);
    }
    .mark svg { width: 21px; height: 21px; fill: none; stroke: #fff; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
    .brand-text { display: flex; flex-direction: column; line-height: 1.25; }
    .brand-text b { font-size: 15px; font-weight: 600; letter-spacing: 0.1em; }
    .brand-text small { font-size: 12.5px; color: rgba(255, 255, 255, 0.72); }

    .pitch { margin: auto 0; padding: 40px 0; }
    .pitch h2 { margin: 0; font-size: 36px; line-height: 1.15; font-weight: 600; letter-spacing: -0.02em; color: #fff; }
    .pitch p { margin: 14px 0 0; font-size: 16px; line-height: 1.55; color: rgba(255, 255, 255, 0.8); max-width: 400px; }

    ul { list-style: none; margin: 32px 0 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
    li { display: flex; align-items: center; gap: 12px; font-size: 15px; color: rgba(255, 255, 255, 0.92); }
    li svg {
      width: 22px; height: 22px; padding: 4px; flex-shrink: 0;
      border-radius: 50%; background: rgba(255, 255, 255, 0.16);
      fill: none; stroke: #fff; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
    }

    .foot { font-size: 12.5px; color: rgba(255, 255, 255, 0.6); }

    @media (max-width: 960px) { .panel { display: none; } }
  `]
})
export class AuthVisualComponent {
  readonly points = [
    'Demandes et interventions suivies de bout en bout',
    'Maintenance préventive planifiée automatiquement',
    'Stock, achats et coûts sous contrôle'
  ];
}
