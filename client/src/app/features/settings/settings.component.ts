import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models';
import { ReferenceManagementService, ReferenceCategory } from './services/reference-management.service';
import { UserManagementService } from './services/user-management.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

interface ReferenceModule {
  key: string;
  label: string;
  description: string;
  icon: string;
  tone: 'blue' | 'amber' | 'violet' | 'green';
  categories: ReferenceCategory[];
}

interface RoleCount {
  role: string;
  description: string;
  tone: 'blue' | 'amber' | 'green';
  count: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, AppIconComponent],
  template: `
    <div class="settings-page">
      <app-page-header
        icon="settings"
        title="Paramètres"
        subtitle="Comptes, droits d'accès et listes de référence utilisées dans l'application">
      </app-page-header>

      <div class="top-grid">
        <!-- Users & access -->
        <section class="panel users">
          <div class="panel-head">
            <span class="chip tone-blue"><app-icon name="users"></app-icon></span>
            <div class="panel-titles">
              <h2>Utilisateurs et accès</h2>
              <p>Créez les comptes, attribuez les rôles et désactivez les accès.</p>
            </div>
            <a routerLink="/settings/users" class="btn btn-primary btn-sm">Gérer les utilisateurs</a>
          </div>

          <div class="role-grid">
            <div class="role-tile total">
              <span class="role-name">Comptes actifs</span>
              <span class="role-count">{{ usersLoading ? '–' : totalUsers }}</span>
              <span class="role-desc">Tous rôles confondus</span>
            </div>
            <div class="role-tile" *ngFor="let r of roleCounts" [ngClass]="'tone-' + r.tone">
              <span class="role-name">{{ r.role }}</span>
              <span class="role-count">{{ usersLoading ? '–' : r.count }}</span>
              <span class="role-desc">{{ r.description }}</span>
            </div>
          </div>
        </section>

        <!-- Signed-in account -->
        <section class="panel account" *ngIf="currentUser">
          <div class="account-banner"></div>
          <div class="account-body">
            <span class="account-avatar">{{ currentUser.firstName.charAt(0) }}{{ currentUser.lastName.charAt(0) }}</span>
            <div class="account-name">{{ currentUser.firstName }} {{ currentUser.lastName }}</div>
            <div class="account-email">{{ currentUser.email }}</div>
            <span class="role-pill">{{ currentUser.role }}</span>
          </div>
          <dl class="facts">
            <div><dt>Application</dt><dd>SIMOTEX · GMAO</dd></div>
            <div><dt>Version</dt><dd class="mono">v2.0</dd></div>
          </dl>
        </section>
      </div>

      <!-- Reference data -->
      <section class="panel references">
        <div class="panel-head">
          <span class="chip tone-blue"><app-icon name="references"></app-icon></span>
          <div class="panel-titles">
            <h2>Données de référence</h2>
            <p>Les listes proposées dans les formulaires. Choisissez une liste pour la modifier.</p>
          </div>
          <a routerLink="/settings/references" class="btn btn-secondary btn-sm">Tout afficher</a>
        </div>

        <div class="module-grid">
          <div class="module" *ngFor="let m of referenceModules" [ngClass]="'tone-' + m.tone">
            <div class="module-head">
              <span class="module-icon"><app-icon [name]="m.icon"></app-icon></span>
              <div class="module-titles">
                <span class="module-name">{{ m.label }}</span>
                <span class="module-desc">{{ m.description }}</span>
              </div>
              <span class="module-count">{{ m.categories.length }}</span>
            </div>
            <nav class="module-links">
              <a *ngFor="let c of m.categories"
                 [routerLink]="['/settings/references']"
                 [queryParams]="{ category: c.key }"
                 class="ref-link">
                <span class="ref-dot"></span>
                <span class="ref-label">{{ sentenceCase(c.label) }}</span>
                <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>
              </a>
            </nav>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .settings-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .settings-page > app-page-header {
      margin-bottom: 0;
    }

    /* Colour identities */
    .tone-blue   { --tone: var(--primary-600); --tone-bg: var(--primary-50);    --tone-line: var(--primary-100); }
    .tone-amber  { --tone: #b86e00;            --tone-bg: #fdf4e3;              --tone-line: #f6dfb3; }
    .tone-violet { --tone: #6a4fc9;            --tone-bg: #f3f0fd;              --tone-line: #e0d9fa; }
    .tone-green  { --tone: #23784a;            --tone-bg: #e9f6ef;              --tone-line: #c9e8d6; }

    .top-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
      gap: 16px;
      align-items: stretch;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      box-shadow: var(--card-shadow);
    }

    .panel-head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
    }

    .panel-head h2 {
      margin: 0;
      font-size: 15.5px;
      font-weight: 600;
    }

    .panel-titles {
      flex: 1;
      min-width: 0;
    }

    .panel-titles p {
      margin: 2px 0 0;
      font-size: 13.5px;
      color: var(--text-secondary);
    }

    .chip {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--tone-bg);
      color: var(--tone);
      font-size: 20px;
    }

    /* ---- Users ---- */
    .role-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .role-tile {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px 16px;
      border-radius: 10px;
      background: var(--tone-bg, var(--gray-50));
      border: 1px solid var(--tone-line, var(--border));
    }

    .role-tile.total {
      background: var(--brand-gradient);
      border-color: transparent;
      color: #fff;
    }

    .role-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--tone, var(--text));
    }

    .role-tile.total .role-name,
    .role-tile.total .role-count {
      color: #fff;
    }

    .role-count {
      font-family: var(--font-mono);
      font-size: 28px;
      font-weight: 500;
      line-height: 1;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }

    .role-desc {
      font-size: 12px;
      line-height: 1.4;
      color: var(--text-secondary);
    }

    .role-tile.total .role-desc {
      color: rgba(255, 255, 255, 0.8);
    }

    /* ---- Account ---- */
    .account {
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .account-banner {
      height: 64px;
      background: var(--brand-gradient);
    }

    .account-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 0 20px 14px;
      margin-top: -32px;
    }

    .account-avatar {
      width: 64px;
      height: 64px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      border: 4px solid var(--surface);
      background: var(--primary-600);
      color: #fff;
      font-size: 20px;
      font-weight: 600;
      text-transform: uppercase;
      box-shadow: var(--card-shadow);
    }

    .account-name {
      margin-top: 10px;
      font-size: 15.5px;
      font-weight: 600;
    }

    .account-email {
      font-size: 13px;
      color: var(--text-muted);
      word-break: break-all;
    }

    .role-pill {
      margin-top: 8px;
      padding: 3px 10px;
      border-radius: 999px;
      background: var(--primary-50);
      color: var(--primary-700);
      font-size: 12px;
      font-weight: 600;
    }

    .facts {
      margin: auto 0 0;
      padding: 4px 20px 14px;
      border-top: 1px solid var(--border);
    }

    .facts > div {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--gray-100);
      font-size: 13.5px;
    }

    .facts > div:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .facts dt {
      color: var(--text-secondary);
    }

    .facts dd {
      margin: 0;
      font-weight: 500;
    }

    .facts dd.mono {
      font-family: var(--font-mono);
      font-size: 12.5px;
    }

    /* ---- Reference data ---- */
    .module-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
    }

    .module {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--tone-line);
      border-radius: 12px;
      overflow: hidden;
      background: var(--surface);
    }

    .module-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: var(--tone-bg);
      border-bottom: 1px solid var(--tone-line);
    }

    .module-icon {
      width: 38px;
      height: 38px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--tone);
      color: #fff;
      font-size: 19px;
    }

    .module-titles {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    .module-name {
      font-size: 14.5px;
      font-weight: 600;
      color: var(--text);
    }

    .module-desc {
      font-size: 12px;
      line-height: 1.35;
      color: var(--text-secondary);
    }

    .module-count {
      min-width: 26px;
      height: 24px;
      padding: 0 8px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: var(--surface);
      color: var(--tone);
      font-size: 12px;
      font-weight: 600;
    }

    .module-links {
      display: flex;
      flex-direction: column;
      padding: 6px;
    }

    .ref-link {
      display: flex;
      align-items: center;
      gap: 10px;
      height: 36px;
      padding: 0 10px;
      border-radius: 8px;
      font-size: 13.5px;
      color: var(--text);
      transition: background-color 0.12s ease, color 0.12s ease;
    }

    .ref-dot {
      width: 6px;
      height: 6px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--tone);
      opacity: 0.55;
    }

    .ref-label {
      flex: 1;
      min-width: 0;
    }

    .ref-link svg {
      width: 15px;
      height: 15px;
      fill: none;
      stroke: var(--gray-400);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .ref-link:hover {
      background: var(--tone-bg);
      color: var(--tone);
    }

    .ref-link:hover .ref-dot {
      opacity: 1;
    }

    .ref-link:hover svg {
      stroke: var(--tone);
    }

    @media (max-width: 1280px) {
      .module-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .role-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 900px) {
      .top-grid {
        grid-template-columns: 1fr;
      }

      .panel-head {
        flex-wrap: wrap;
      }
    }

    @media (max-width: 600px) {
      .module-grid,
      .role-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  currentUser: UserInfo | null = null;
  referenceModules: ReferenceModule[] = [];
  roleCounts: RoleCount[] = [
    { role: 'Superviseur', description: 'Planifie et administre', tone: 'blue', count: 0 },
    { role: 'Utilisateur', description: 'Technicien, traite les interventions', tone: 'amber', count: 0 },
    { role: 'Demandeur', description: 'Déclare les pannes', tone: 'green', count: 0 }
  ];
  totalUsers = 0;
  usersLoading = true;

  private readonly moduleInfo: Omit<ReferenceModule, 'categories'>[] = [
    { key: 'equipment', label: 'Équipements', description: 'Criticité, état, familles, marques', icon: 'equipment', tone: 'blue' },
    { key: 'interventions', label: 'Interventions', description: 'Types, urgences, pannes, lignes', icon: 'interventions', tone: 'amber' },
    { key: 'resources', label: 'Pièces de rechange', description: 'Familles, constructeurs, criticité', icon: 'resources', tone: 'violet' },
    { key: 'stock', label: 'Stock', description: 'Entités, statuts, fournisseurs', icon: 'stock', tone: 'green' }
  ];

  constructor(
    private authService: AuthService,
    private referenceService: ReferenceManagementService,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);

    const categories = this.referenceService.getCategories();
    this.referenceModules = this.moduleInfo.map(m => ({
      ...m,
      categories: categories.filter(c => c.module === m.key)
    }));

    this.userService.getUsers().subscribe({
      next: users => {
        this.totalUsers = users.length;
        this.roleCounts = this.roleCounts.map(r => ({
          ...r,
          count: users.filter(u => u.role?.libelle === r.role).length
        }));
        this.usersLoading = false;
      },
      error: () => this.usersLoading = false
    });
  }

  sentenceCase(label: string): string {
    return label.charAt(0) + label.slice(1).toLowerCase();
  }
}
