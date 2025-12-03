import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface SettingsMenuItem {
  icon: string;
  safeIcon?: SafeHtml;
  title: string;
  description: string;
  route: string;
  color: string;
  bgColor: string;
  features: string[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="settings-page">
      <div class="settings-container">
        <!-- Header -->
        <div class="settings-header">
          <div class="header-icon-wrapper">
            <div class="header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
          </div>
          <div class="header-text">
            <h1>Paramètres</h1>
            <p>Gérez et configurez votre application GMAO</p>
          </div>
        </div>

        <!-- Enhanced Menu Cards -->
        <div class="menu-grid">
          <a 
            *ngFor="let item of menuItems" 
            [routerLink]="item.route"
            class="menu-card"
            [style.--accent-color]="item.color"
          >
            <div class="card-header">
              <div class="card-icon" [style.background]="item.bgColor">
                <span [innerHTML]="item.safeIcon"></span>
              </div>
              <div class="card-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
            <div class="card-content">
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
            </div>
            <div class="card-features">
              <div class="feature-tag" *ngFor="let feature of item.features">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
                <span>{{ feature }}</span>
              </div>
            </div>
            <div class="card-action">
              <span>Accéder</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 8l4 4m0 0l-4 4m4-4H3"/>
              </svg>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 2rem;
    }

    .settings-container {
      max-width: 900px;
      margin: 0 auto;
    }

    /* Header */
    .settings-header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      margin-bottom: 2rem;
      padding: 1.5rem 2rem;
      background: white;
      border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 4px 12px rgba(0, 0, 0, 0.03);
    }

    .header-icon-wrapper {
      position: relative;
    }

    .header-icon {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-radius: 14px;
      box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);

      svg {
        width: 28px;
        height: 28px;
        color: white;
      }
    }

    .header-text h1 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.025em;
    }

    .header-text p {
      margin: 0.375rem 0 0 0;
      color: #64748b;
      font-size: 0.9375rem;
    }

    /* Menu Grid - 2 large cards side by side */
    .menu-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .menu-card {
      display: flex;
      flex-direction: column;
      padding: 1.75rem;
      background: white;
      border-radius: 20px;
      border: 1px solid transparent;
      text-decoration: none;
      transition: all 0.3s ease;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02);
      position: relative;
      overflow: hidden;
    }

    .menu-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--accent-color);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .menu-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
      border-color: #e2e8f0;
    }

    .menu-card:hover::before {
      opacity: 1;
    }

    /* Card Header */
    .card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }

    .card-icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      flex-shrink: 0;
      transition: transform 0.3s ease;
    }

    .menu-card:hover .card-icon {
      transform: scale(1.08);
    }

    .card-arrow {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      border-radius: 10px;
      color: #94a3b8;
      transition: all 0.3s ease;
    }

    .menu-card:hover .card-arrow {
      background: var(--accent-color);
      color: white;
      transform: translateX(4px);
    }

    /* Card Content */
    .card-content {
      margin-bottom: 1.25rem;
    }

    .card-content h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }

    .card-content p {
      margin: 0;
      font-size: 0.9rem;
      color: #64748b;
      line-height: 1.6;
    }

    /* Card Features */
    .card-features {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .feature-tag {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      background: #f1f5f9;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 500;
      color: #475569;
      transition: all 0.2s ease;

      svg {
        width: 12px;
        height: 12px;
        color: #10b981;
      }
    }

    .menu-card:hover .feature-tag {
      background: #e2e8f0;
    }

    /* Card Action Button */
    .card-action {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.875rem 1.25rem;
      background: #f8fafc;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #334155;
      transition: all 0.3s ease;
      margin-top: auto;

      svg {
        width: 18px;
        height: 18px;
        transition: transform 0.3s ease;
      }
    }

    .menu-card:hover .card-action {
      background: var(--accent-color);
      color: white;

      svg {
        transform: translateX(4px);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .settings-page {
        padding: 1rem;
      }

      .settings-header {
        padding: 1.25rem;
        gap: 1rem;
      }

      .header-icon {
        width: 48px;
        height: 48px;

        svg {
          width: 24px;
          height: 24px;
        }
      }

      .header-text h1 {
        font-size: 1.25rem;
      }

      .menu-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }

      .menu-card {
        padding: 1.5rem;
      }

      .card-icon {
        width: 56px;
        height: 56px;
      }

      .card-content h3 {
        font-size: 1.125rem;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  menuItems: SettingsMenuItem[] = [
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5" style="width:32px;height:32px"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
      title: 'Gestion des Utilisateurs',
      description: 'Créer, modifier et supprimer les utilisateurs. Gérer les rôles et les permissions de votre équipe.',
      route: '/settings/users',
      color: '#3b82f6',
      bgColor: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      features: ['Création utilisateurs', 'Rôles & Permissions', 'Profils équipe']
    },
    {
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5" style="width:32px;height:32px"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      title: 'Données de Référence',
      description: 'Gérer tous les référentiels : équipements, interventions, ressources et stock de votre organisation.',
      route: '/settings/references',
      color: '#10b981',
      bgColor: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      features: ['Équipements', 'Interventions', 'Ressources', 'Stock']
    }
  ];

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Sanitize SVG icons
    this.menuItems.forEach(item => {
      item.safeIcon = this.sanitizer.bypassSecurityTrustHtml(item.icon);
    });
  }
}
