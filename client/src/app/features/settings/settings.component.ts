import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models';
import { UserManagementService } from './services/user-management.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

interface Reglage {
  label: string;
  description: string;
  route: string;
  query?: Record<string, string> | null;
}

interface Groupe {
  key: string;
  titre: string;
  description: string;
  icon: string;
  /** What most people come here for. */
  courants: Reglage[];
  /** Changed rarely: folded under "Autres réglages". */
  rares: Reglage[];
}

/** A list of choices of the "Listes de choix" page, by its key. */
function liste(key: string, label: string, description: string): Reglage {
  return { label, description, route: '/settings/references', query: { category: key } };
}

/**
 * Settings, arranged by what the person wants to do rather than by database table:
 * four groups, each with its usual settings first and the rare ones folded away.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent, AppIconComponent],
  template: `
    <div class="gm-page">
      <app-page-header icon="settings" title="Paramètres"
                       subtitle="Les réglages de l'application, rangés selon ce que vous voulez faire.">
      </app-page-header>

      <div class="groups">
        <section class="gm-card group" *ngFor="let g of groupes" [attr.aria-labelledby]="'g-' + g.key">
          <header class="group-head">
            <span class="kpi-icon t-info chip"><app-icon [name]="g.icon"></app-icon></span>
            <div>
              <h2 [id]="'g-' + g.key">{{ g.titre }}</h2>
              <p>{{ g.description }}</p>
              <p class="summary" *ngIf="g.key === 'acces' && !usersLoading">{{ resumeComptes }}</p>
            </div>
          </header>

          <nav class="links" [attr.aria-label]="g.titre">
            <a *ngFor="let r of g.courants" class="link" [routerLink]="r.route" [queryParams]="r.query ?? null">
              <span class="link-text"><b>{{ r.label }}</b><small>{{ r.description }}</small></span>
              <app-icon name="chevron-right"></app-icon>
            </a>
          </nav>

          <details class="rare" *ngIf="g.rares.length">
            <summary><app-icon name="chevron-right" class="chev"></app-icon> Autres réglages ({{ g.rares.length }})</summary>
            <nav class="links" [attr.aria-label]="'Autres réglages : ' + g.titre">
              <a *ngFor="let r of g.rares" class="link" [routerLink]="r.route" [queryParams]="r.query ?? null">
                <span class="link-text"><b>{{ r.label }}</b><small>{{ r.description }}</small></span>
                <app-icon name="chevron-right"></app-icon>
              </a>
            </nav>
          </details>
        </section>
      </div>

      <p class="about" *ngIf="currentUser">
        GMAO SIMOTEX · version 3.0 · connecté en tant que {{ currentUser.firstName }} {{ currentUser.lastName }} ({{ roleLabel(currentUser.role) }})
      </p>
    </div>
  `,
  styles: [`
    .groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
    @media (max-width: 900px) { .groups { grid-template-columns: 1fr; } }

    .group { padding: 18px 20px 12px; }
    .group-head { display: flex; gap: 14px; align-items: flex-start; padding-bottom: 12px; }
    .chip { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; font-size: 19px; flex-shrink: 0; }
    .group-head h2 { margin: 0; font-size: 1.0625rem; font-weight: 600; color: var(--text); }
    .group-head p { margin: 3px 0 0; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.45; }
    .group-head p.summary { margin-top: 6px; font-size: 0.8125rem; color: var(--text); font-weight: 500; }

    .links { display: flex; flex-direction: column; }
    .link {
      display: flex; align-items: center; gap: 12px; padding: 11px 8px; min-height: 48px;
      border-top: 1px solid var(--gray-100); color: inherit; text-decoration: none; border-radius: 8px;
    }
    .link:hover { background: var(--gray-50); }
    .link-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .link-text b { font-size: 0.9rem; font-weight: 600; color: var(--text); }
    .link-text small { font-size: 0.8rem; color: var(--text-secondary); }
    .link app-icon { color: var(--gray-400); font-size: 16px; flex-shrink: 0; }

    .rare { margin-top: 4px; border-top: 1px solid var(--gray-100); }
    .rare summary {
      cursor: pointer; padding: 12px 8px; min-height: 44px; display: flex; align-items: center;
      font-size: 0.8125rem; font-weight: 500; color: var(--primary-700); list-style-position: inside;
    }
    .rare summary:hover { background: var(--gray-50); border-radius: 8px; }
    .rare[open] summary { color: var(--text-secondary); }
    .rare summary { list-style: none; gap: 6px; }
    .rare summary::-webkit-details-marker { display: none; }
    .rare .chev { font-size: 14px; transition: transform 0.15s; }
    .rare[open] .chev { transform: rotate(90deg); }

    .about { margin: 20px 0 0; font-size: 0.8125rem; color: var(--text-muted); }
  `]
})
export class SettingsComponent implements OnInit {
  currentUser: UserInfo | null = null;
  usersLoading = true;
  private comptes = { total: 0, superviseurs: 0, techniciens: 0, demandeurs: 0 };

  readonly groupes: Groupe[] = [
    {
      key: 'acces', titre: 'Utilisateurs et accès', icon: 'users',
      description: 'Qui peut se connecter, et ce que chacun peut faire.',
      courants: [
        { label: 'Utilisateurs', description: 'Créer un compte, changer un rôle, désactiver un accès', route: '/settings/users' },
        { label: 'Techniciens et taux horaires', description: "Spécialités et coût de l'heure, utilisés pour le coût des interventions", route: '/techniciens' }
      ],
      rares: [
        { label: "Journal d'activité", description: 'Qui a fait quoi, et quand', route: '/settings/journal' }
      ]
    },
    {
      key: 'machines', titre: 'Machines et chaînes', icon: 'equipment',
      description: "Les lignes de l'atelier et la façon de classer les machines.",
      courants: [
        liste('chaineProduction', 'Chaînes de production', "Coupe, Couture A… : chaque machine et chaque demande appartient à une chaîne"),
        liste('familleEquipement', 'Familles de machines', 'Machines à coudre, de coupe, de repassage…'),
        liste('marque', 'Marques et modèles', 'Fabricants des machines et leurs modèles'),
        { label: 'Étiquettes QR des machines', description: 'À coller sur chaque machine pour déclarer une panne en deux gestes', route: '/equipment/etiquettes' }
      ],
      rares: [
        liste('modeleEquipement', 'Modèles de machines', 'Modèle précis, rattaché à une marque'),
        liste('equipmentCriticite', 'Importance des machines', 'Critique, important, standard'),
        liste('etatEquipement', 'États des machines', 'En service, en panne, en maintenance'),
        liste('groupeEquipement', 'Groupes de machines', 'Regroupement libre, facultatif')
      ]
    },
    {
      key: 'magasin', titre: 'Magasin et achats', icon: 'stock',
      description: 'Où sont rangées les pièces, qui les fournit, combien on peut dépenser.',
      courants: [
        { label: 'Magasins et emplacements', description: 'Lieux de stockage des articles', route: '/magasin', query: { vue: 'magasins' } },
        { label: 'Fournisseurs', description: 'Coordonnées et délais de livraison', route: '/achats', query: { vue: 'fournisseurs' } },
        { label: 'Budgets annuels', description: "Montant prévu par année pour la main-d'œuvre, les pièces et la sous-traitance", route: '/budgets' }
      ],
      rares: [
        liste('famillePiece', "Familles d'articles", 'Pour ranger les articles du magasin'),
        liste('constructeur', 'Fabricants des articles', 'Marques des pièces de rechange'),
        liste('criticitePiece', 'Importance des articles', 'Pour repérer les pièces qui ne doivent jamais manquer')
      ]
    },
    {
      key: 'interventions', titre: 'Interventions', icon: 'interventions',
      description: 'Les choix proposés quand on déclare ou planifie une intervention.',
      courants: [
        liste('panne', 'Types de pannes', 'Proposés au chef de chaîne quand il déclare une panne'),
        liste('typeIntervention', "Types d'intervention", 'Corrective, préventive, dépannage…'),
        { label: 'Plans de maintenance préventive', description: 'Les entretiens qui reviennent, machine par machine', route: '/preventif' }
      ],
      rares: [
        liste('urgence', "Niveaux d'urgence", 'Haute, normale, basse'),
        liste('etatIntervention', "États d'intervention (liste technique)", 'Reliés aux statuts : ne pas renommer'),
        { label: 'Rapports Power BI', description: 'Liens des tableaux de bord publiés (Internet nécessaire)', route: '/rapports' }
      ]
    }
  ];

  constructor(
    private authService: AuthService,
    private userService: UserManagementService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.userService.getUsers().subscribe({
      next: users => {
        const n = (role: string) => users.filter(u => u.role?.libelle === role).length;
        this.comptes = { total: users.length, superviseurs: n('Superviseur'), techniciens: n('Utilisateur'), demandeurs: n('Demandeur') };
        this.usersLoading = false;
      },
      error: () => this.usersLoading = false
    });
  }

  /** "9 comptes : 1 superviseur, 4 techniciens, 4 demandeurs". */
  get resumeComptes(): string {
    const c = this.comptes;
    const p = (n: number, s: string) => `${n} ${s}${n > 1 ? 's' : ''}`;
    return `${p(c.total, 'compte')} : ${p(c.superviseurs, 'superviseur')}, ${p(c.techniciens, 'technicien')}, ${p(c.demandeurs, 'demandeur')}`;
  }

  roleLabel(role: string): string { return role === 'Utilisateur' ? 'Technicien' : role; }
}
