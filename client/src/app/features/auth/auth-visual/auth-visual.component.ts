import { Component } from '@angular/core';
import { NgFor, NgSwitch, NgSwitchCase } from '@angular/common';

interface Feature {
  icon: 'calendar' | 'machine' | 'bell' | 'history';
  title: string;
  text: string;
}

/**
 * Left-hand brand panel shared by the login, forgot-password and
 * reset-password screens.
 */
@Component({
  selector: 'app-auth-visual',
  standalone: true,
  imports: [NgFor, NgSwitch, NgSwitchCase],
  template: `
    <aside class="panel">
      <div class="inner">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.8 17a1.9 1.9 0 0 0 2.7 2.7l5.5-5.5a4 4 0 0 0 5.2-5.4l-2.4 2.4-2.1-.6-.6-2.1 2.5-2.2z"/></svg>
          </span>
          <span>
            <span class="brand-name">Gestion Maintenance</span>
            <span class="brand-sub">GMAO industrielle · Alcodex</span>
          </span>
        </div>

        <span class="eyebrow">GMAO · Maintenance industrielle</span>
        <h2 class="headline">Pilotez votre maintenance.</h2>

        <ul class="features">
          <li class="feature" *ngFor="let f of features">
            <span class="feature-icon" [attr.data-icon]="f.icon" [ngSwitch]="f.icon" aria-hidden="true">
              <svg *ngSwitchCase="'calendar'" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M9 15l2 2 4-4"/></svg>
              <svg *ngSwitchCase="'machine'" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="12" rx="1.5"/><path d="M7 7V4h4v3M3 12h18"/><circle cx="8" cy="15.5" r="1"/><circle cx="16" cy="15.5" r="1"/></svg>
              <svg *ngSwitchCase="'bell'" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <svg *ngSwitchCase="'history'" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></svg>
            </span>
            <span>
              <span class="feature-title">{{ f.title }}</span>
              <span class="feature-text">{{ f.text }}</span>
            </span>
          </li>
        </ul>

        <p class="closing">Du signalement de la panne à la remise en service, l'activité de l'atelier se suit en un seul endroit.</p>
        <span class="signature">Alcodex · Solution GMAO</span>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }

    .panel {
      min-height: 100vh;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 56px;
      background: var(--brand-gradient);
      color: #fff;
    }

    .inner {
      width: 100%;
      max-width: 580px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 40px;
    }

    .brand-mark {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.28);
    }

    .brand-mark svg,
    .feature-icon svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .brand-name {
      display: block;
      font-size: 19px;
      font-weight: 600;
      line-height: 1.25;
    }

    .brand-sub {
      display: block;
      font-size: 14.5px;
      color: rgba(255, 255, 255, 0.78);
    }

    .eyebrow {
      display: block;
      margin-bottom: 12px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.62);
    }

    .headline {
      margin: 0 0 30px;
      font-size: 38px;
      font-weight: 700;
      line-height: 1.18;
      letter-spacing: -0.02em;
      color: #fff;
    }

    .features {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin: 0 0 30px;
      padding: 0;
      list-style: none;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 18px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
    }

    .feature-icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #dbe5ff;
    }

    .feature-icon svg {
      width: 20px;
      height: 20px;
    }

    .feature-icon[data-icon="machine"] { color: #8ee6d6; }
    .feature-icon[data-icon="bell"] { color: #ffd27a; }
    .feature-icon[data-icon="history"] { color: #d6c8ff; }

    .feature-title {
      display: block;
      font-size: 16px;
      font-weight: 600;
      line-height: 1.35;
    }

    .feature-text {
      display: block;
      margin-top: 2px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.78);
    }

    .closing {
      margin: 0 0 18px;
      padding-top: 26px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 17px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.9);
    }

    .signature {
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.55);
    }

    @media (max-width: 1280px) {
      .panel {
        padding: 40px;
      }

      .headline {
        font-size: 32px;
      }
    }
  `]
})
export class AuthVisualComponent {
  features: Feature[] = [
    { icon: 'calendar', title: 'Planification des interventions', text: 'Affectation par technicien, par équipement et par priorité.' },
    { icon: 'machine', title: 'Suivi du parc machines', text: 'État, criticité et historique de chaque équipement.' },
    { icon: 'bell', title: 'Alertes en temps réel', text: 'Le superviseur est prévenu dès qu\'une intervention change d\'état.' },
    { icon: 'history', title: 'Traçabilité complète', text: 'Chaque demande, affectation et clôture reste consultable.' }
  ];
}
