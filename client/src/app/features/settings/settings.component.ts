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
  label: string;
  description: string;
  tone: 'blue' | 'amber' | 'green';
  count: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, AppIconComponent],
  template: `
    <div class="gm-page">
      <app-page-header icon="settings" title="Paramètres"
                       subtitle="Comptes et droits d'accès, réglages des modules et listes de choix utilisées dans l'application.">
      </app-page-header>

      <div class="hub-top">
        <!-- Users & access -->
        <section class="gm-card users">
          <div class="sec-head">
            <span class="bubble"><app-icon name="users"></app-icon></span>
            <div class="sec-titles">
              <span class="eyebrow">Accès</span>
              <h2>Utilisateurs et rôles</h2>
              <p>Créez les comptes, attribuez un rôle à chacun et désactivez les accès qui ne servent plus.</p>
            </div>
            <a routerLink="/settings/users" class="btn btn-primary btn-sm">Gérer les utilisateurs</a>
          </div>
          <div class="role-strip">
            <div class="role total">
              <span class="k">Comptes</span>
              <b>{{ usersLoading ? '–' : totalUsers }}</b>
              <small>Tous rôles confondus</small>
            </div>
            <div class="role" *ngFor="let r of roleCounts">
              <span class="k"><i [ngClass]="'dot-' + r.tone"></i>{{ r.label }}</span>
              <b>{{ usersLoading ? '–' : r.count }}</b>
              <small>{{ r.description }}</small>
            </div>
          </div>
        </section>

        <!-- Signed-in account -->
        <section class="gm-card account" *ngIf="currentUser">
          <div class="acc-top">
            <span class="acc-avatar">{{ currentUser.firstName.charAt(0) }}{{ currentUser.lastName.charAt(0) }}</span>
            <div class="acc-id">
              <b>{{ currentUser.firstName }} {{ currentUser.lastName }}</b>
              <small>{{ currentUser.email }}</small>
            </div>
          </div>
          <dl class="facts">
            <div><dt>Rôle</dt><dd><span class="role-pill">{{ currentUser.role }}</span></dd></div>
            <div><dt>Application</dt><dd>SIMOTEX · GMAO</dd></div>
            <div><dt>Version</dt><dd>2.0</dd></div>
          </dl>
        </section>
      </div>

      <!-- Module administration -->
      <section class="hub-section">
        <div class="hub-title">
          <span class="eyebrow">Modules</span>
          <h2>Administration des modules</h2>
          <p>Les réglages de chaque module : lieux de stockage, fournisseurs, équipe, plans d'entretien, budgets, rapports et journal.</p>
        </div>
        <div class="admin-grid">
          <a class="admin-tile" *ngFor="let t of adminTiles" [routerLink]="t.route" [queryParams]="t.query">
            <span class="bubble"><app-icon [name]="t.icon"></app-icon></span>
            <span class="admin-text"><b>{{ t.label }}</b><small>{{ t.description }}</small></span>
            <app-icon name="chevron-right" class="chev"></app-icon>
          </a>
        </div>
      </section>

      <!-- Reference data -->
      <section class="hub-section">
        <div class="hub-title with-action">
          <div>
            <span class="eyebrow">Listes</span>
            <h2>Données de référence</h2>
            <p>Les listes de choix proposées dans les formulaires : types, états, familles, urgences… Cliquez une liste pour la modifier.</p>
          </div>
          <a routerLink="/settings/references" class="btn btn-secondary btn-sm">Ouvrir toutes les listes</a>
        </div>

        <div class="module-grid">
          <div class="gm-card module" *ngFor="let m of referenceModules">
            <div class="module-head">
              <span class="bubble"><app-icon [name]="m.icon"></app-icon></span>
              <div class="module-titles"><b>{{ m.label }}</b><small>{{ m.description }}</small></div>
              <span class="module-count">{{ m.categories.length }} listes</span>
            </div>
            <nav class="module-links">
              <a *ngFor="let c of m.categories" [routerLink]="['/settings/references']" [queryParams]="{ category: c.key }" class="ref-link">
                <span>{{ sentenceCase(c.label) }}</span>
                <app-icon name="chevron-right"></app-icon>
              </a>
            </nav>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host { --burgundy: #8c1c2b; --navy: #13254b; }

    .eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 0.68rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--burgundy);
    }
    .eyebrow::before { content: ''; width: 14px; height: 2px; border-radius: 2px; background: var(--burgundy); }

    .bubble {
      width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%;
      display: grid; place-items: center;
      background: #e3ecfb; color: var(--navy); font-size: 19px;
      box-shadow: 0 2px 8px -3px rgba(30, 70, 140, 0.18);
    }

    /* ---- Top row */
    .hub-top { display: grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); gap: 16px; }
    @media (max-width: 1100px) { .hub-top { grid-template-columns: 1fr; } }

    .users { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }
    .sec-head { display: flex; align-items: flex-start; gap: 14px; }
    .sec-titles { flex: 1; min-width: 0; }
    .sec-titles h2, .hub-title h2 { margin: 4px 0 0; font-size: 1.125rem; font-weight: 700; color: var(--navy); letter-spacing: -0.01em; }
    .sec-titles p, .hub-title p { margin: 4px 0 0; font-size: 0.84rem; color: var(--text-secondary); max-width: 640px; }

    .role-strip {
      display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
      border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
      background: linear-gradient(180deg, #f8fbff, var(--surface));
    }
    .role { padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; border-left: 1px solid var(--border); }
    .role:first-child { border-left: 0; }
    .role .k { display: inline-flex; align-items: center; gap: 7px; font-size: 0.76rem; font-weight: 600; color: var(--text-secondary); }
    .role b { font-size: 1.75rem; font-weight: 700; color: var(--navy); line-height: 1.1; font-variant-numeric: tabular-nums; }
    .role small { font-size: 0.74rem; color: var(--text-muted); line-height: 1.35; }
    .role.total { position: relative; }
    .role.total::before { content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; background: var(--burgundy); }
    .role i { width: 8px; height: 8px; border-radius: 50%; }
    .dot-blue { background: var(--primary-600); }
    .dot-amber { background: var(--warning); }
    .dot-green { background: var(--success); }
    @media (max-width: 720px) {
      .role-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .role:nth-child(3) { border-left: 0; }
      .role:nth-child(n+3) { border-top: 1px solid var(--border); }
      .sec-head { flex-wrap: wrap; }
    }

    .account { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
    .acc-top {
      display: flex; align-items: center; gap: 14px; padding: 22px;
      background:
        radial-gradient(80% 90% at 100% 0%, rgba(120, 170, 240, 0.28) 0%, transparent 70%),
        linear-gradient(165deg, #dbe9fb 0%, #eaf2fd 100%);
      border-bottom: 1px solid var(--border);
    }
    .acc-avatar {
      width: 52px; height: 52px; flex-shrink: 0; border-radius: 50%;
      display: grid; place-items: center;
      background: var(--navy); color: #fff; font-weight: 600; font-size: 1.05rem; letter-spacing: 0.02em;
      box-shadow: 0 0 0 3px #fff, 0 6px 14px -6px rgba(19, 37, 75, 0.5);
    }
    .acc-id { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .acc-id b { font-size: 1rem; font-weight: 700; color: var(--navy); }
    .acc-id small { font-size: 0.8rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; }
    .facts { margin: 0; padding: 6px 22px 10px; }
    .facts div { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 0.84rem; }
    .facts div:last-child { border-bottom: 0; }
    .facts dt { color: var(--text-secondary); }
    .facts dd { margin: 0; font-weight: 600; color: var(--navy); }
    .role-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; background: #f6e9eb; color: var(--burgundy); font-size: 0.75rem; font-weight: 600; }

    /* ---- Sections */
    .hub-section { margin-top: 8px; display: flex; flex-direction: column; gap: 14px; }
    .hub-title.with-action { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }

    .admin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .admin-tile {
      display: flex; align-items: center; gap: 14px; padding: 14px 16px;
      background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
      text-decoration: none; color: inherit;
      transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
    }
    .admin-tile:hover { border-color: var(--primary-300); box-shadow: 0 8px 20px -12px rgba(30, 70, 140, 0.35); transform: translateY(-1px); }
    .admin-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .admin-text b { font-size: 0.88rem; font-weight: 600; color: var(--navy); }
    .admin-text small { font-size: 0.76rem; color: var(--text-muted); }
    .chev { color: var(--gray-400); font-size: 16px; transition: transform 0.15s, color 0.15s; }
    .admin-tile:hover .chev { color: var(--burgundy); transform: translateX(2px); }

    .module-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .module { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
    .module-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg, #f6f9fe, var(--surface)); }
    .module-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .module-titles b { font-size: 0.95rem; font-weight: 700; color: var(--navy); }
    .module-titles small { font-size: 0.76rem; color: var(--text-muted); }
    .module-count { padding: 3px 9px; border-radius: 999px; background: var(--gray-100); color: var(--gray-600); font-size: 0.72rem; font-weight: 600; white-space: nowrap; }
    .module-links { display: flex; flex-direction: column; padding: 6px; }
    .ref-link {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 9px 12px; border-radius: 8px; text-decoration: none;
      font-size: 0.86rem; color: var(--gray-800);
    }
    .ref-link app-icon { color: var(--gray-300); font-size: 15px; transition: color 0.15s, transform 0.15s; }
    .ref-link:hover { background: #eef3fd; color: var(--navy); }
    .ref-link:hover app-icon { color: var(--burgundy); transform: translateX(2px); }
  `]
})
export class SettingsComponent implements OnInit {
  readonly adminTiles = [
    { icon: 'warehouse', label: 'Magasins et emplacements', description: 'Lieux de stockage des articles', route: '/magasin', query: { vue: 'magasins' } },
    { icon: 'truck', label: 'Fournisseurs', description: 'Coordonnées, délais et ponctualité', route: '/achats', query: { vue: 'fournisseurs' } },
    { icon: 'team', label: 'Techniciens et taux horaires', description: "Spécialités et coût de la main-d'œuvre", route: '/techniciens', query: null },
    { icon: 'preventive', label: 'Plans de maintenance préventive', description: 'Gammes, fréquences et affectations', route: '/preventif', query: null },
    { icon: 'budget', label: 'Budgets annuels', description: 'Enveloppes par catégorie de dépense', route: '/budgets', query: null },
    { icon: 'reports', label: 'Rapports Power BI', description: 'Liens des tableaux de bord publiés', route: '/rapports', query: null },
    { icon: 'journal', label: "Journal d'activité", description: 'Qui a fait quoi, et quand', route: '/settings/journal', query: null }
  ];

  currentUser: UserInfo | null = null;
  referenceModules: ReferenceModule[] = [];
  roleCounts: RoleCount[] = [
    { role: 'Superviseur', label: 'Superviseurs', description: 'Affectent, valident et administrent', tone: 'blue', count: 0 },
    { role: 'Utilisateur', label: 'Techniciens', description: 'Réalisent les interventions (rôle Utilisateur)', tone: 'amber', count: 0 },
    { role: 'Demandeur', label: 'Demandeurs', description: 'Chefs de chaîne, déclarent les pannes', tone: 'green', count: 0 }
  ];
  totalUsers = 0;
  usersLoading = true;

  private readonly moduleInfo: Omit<ReferenceModule, 'categories'>[] = [
    { key: 'equipment', label: 'Équipements', description: 'Criticité, état, familles, marques, modèles', icon: 'equipment', tone: 'blue' },
    { key: 'interventions', label: 'Interventions', description: 'Types, urgences, pannes, chaînes', icon: 'interventions', tone: 'amber' },
    // The old "Stock" lists were replaced by Magasin > Magasins and Achats > Fournisseurs
    { key: 'resources', label: 'Magasin', description: 'Familles, constructeurs, criticité des articles', icon: 'stock', tone: 'violet' }
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
