import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { STATUTS_OT, debouncer } from '../../shared/utils/gm-format';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { FormsModule } from '@angular/forms';
import { InterventionService } from './services/intervention.service';
import { DemandeIntervention, PagedResult, UserInfo } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DashboardService } from '../dashboard/dashboard.service';

@Component({
  selector: 'app-interventions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, AppIconComponent],
  template: `
    <div class="gm-page">
      <app-page-header icon="interventions" title="Interventions"
                       subtitle="Toutes les demandes de travaux : pannes déclarées, entretiens planifiés et leur avancement.">
        <button class="btn btn-primary" routerLink="/interventions/new"><app-icon name="plus"></app-icon> Nouvelle intervention</button>
      </app-page-header>

      <!-- Indicators, each with a plain-language explanation -->
      <div class="gm-kpis">
        <div class="gm-kpi">
          <div class="kpi-top"><span class="kpi-label">À traiter</span><span class="kpi-icon t-info"><app-icon name="clock"></app-icon></span></div>
          <div class="kpi-value">{{ stats.nouveau }}</div>
          <div class="kpi-foot"><span class="kpi-hint">Déclarées, le travail n'a pas encore commencé</span></div>
        </div>
        <div class="gm-kpi">
          <div class="kpi-top"><span class="kpi-label">En cours</span><span class="kpi-icon t-warn"><app-icon name="interventions"></app-icon></span></div>
          <div class="kpi-value">{{ stats.enCours }}</div>
          <div class="kpi-foot"><span class="kpi-hint">Un technicien y travaille en ce moment</span></div>
        </div>
        <div class="gm-kpi">
          <div class="kpi-top"><span class="kpi-label">Réalisées / clôturées</span><span class="kpi-icon t-ok"><app-icon name="check"></app-icon></span></div>
          <div class="kpi-value">{{ stats.termine }}</div>
          <div class="kpi-foot"><span class="kpi-hint">Travaux terminés, validés ou en attente de validation</span></div>
        </div>
        <div class="gm-kpi">
          <div class="kpi-top"><span class="kpi-label">Urgentes en attente</span><span class="kpi-icon" [ngClass]="stats.urgent ? 't-bad' : 't-ok'"><app-icon name="alert"></app-icon></span></div>
          <div class="kpi-value">{{ stats.urgent }}</div>
          <div class="kpi-foot"><span class="kpi-hint">Urgence haute, pas encore terminées : à traiter en premier</span></div>
        </div>
        <div class="gm-kpi">
          <div class="kpi-top"><span class="kpi-label">Total</span><span class="kpi-icon t-neutral"><app-icon name="list"></app-icon></span></div>
          <div class="kpi-value">{{ stats.total }}</div>
          <div class="kpi-foot"><span class="kpi-hint">Toutes les demandes enregistrées, annulées comprises</span></div>
        </div>
      </div>

      <div class="gm-filters">
        <span class="gm-search"><app-icon name="search"></app-icon>
          <input type="search" placeholder="Titre, référence, machine…" [(ngModel)]="searchTerm" (ngModelChange)="search()">
        </span>
        <button type="button" class="filter-chip" *ngIf="vue" (click)="clearVue()" title="Retirer le filtre">
          {{ vueLabels[vue] || vue }} <app-icon name="close"></app-icon>
        </button>
        <span class="spacer"></span>
        <span class="count" *ngIf="!loading">{{ totalCount }} intervention{{ totalCount > 1 ? 's' : '' }}</span>
      </div>

      <div class="gm-card">
        <div class="gm-loading" *ngIf="loading"><span class="spinner"></span> Chargement des interventions…</div>

        <div class="gm-empty" *ngIf="!loading && !interventions.length">
          <app-icon name="interventions"></app-icon>
          <strong>Aucune intervention</strong>
          <span>{{ searchTerm || vue ? 'Aucun résultat pour cette recherche.' : 'Déclarez une panne ou une demande de maintenance pour commencer.' }}</span>
          <button class="btn btn-primary btn-sm mt-1" *ngIf="!searchTerm && !vue" routerLink="/interventions/new"><app-icon name="plus"></app-icon> Nouvelle intervention</button>
        </div>

        <div class="gm-table-wrap" *ngIf="!loading && interventions.length">
          <table class="gm-table responsive">
            <thead>
              <tr>
                <th>Intervention</th><th>Déclarée le</th><th>Type</th><th>Machine</th><th>Urgence</th><th>Statut</th><th>Demandeur</th><th class="right"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let intervention of interventions" class="clickable" [routerLink]="['/interventions/view', intervention.idDemandeIntervention]">
                <td class="primary" data-label="Intervention">
                  <span class="title clamp">{{ intervention.titre }}</span>
                  <span class="sub gm-code">{{ getInterventionCode(intervention) }}</span>
                </td>
                <td data-label="Déclarée le" class="nowrap">
                  <span class="title">{{ intervention.dateCreation | date:'dd/MM/yyyy' }}</span>
                  <span class="sub">{{ intervention.dateCreation | date:'HH:mm' }}</span>
                </td>
                <td data-label="Type">{{ intervention.typeIntervention?.libelle || intervention.type?.libelle || '—' }}</td>
                <td data-label="Machine">
                  <span class="title">{{ intervention.equipement?.codeEquipement || 'Non précisée' }}</span>
                  <span class="sub">{{ intervention.chaineProduction?.libelle || '—' }}</span>
                </td>
                <td data-label="Urgence"><span class="gm-tag" [ngClass]="urgenceTone(intervention)">{{ intervention.urgence?.libelle || 'Normale' }}</span></td>
                <td data-label="Statut"><span class="gm-dot" [ngClass]="statutDot(intervention)">{{ intervention.status?.statut || '—' }}</span></td>
                <td data-label="Demandeur">{{ getDemandeurName(intervention) }}</td>
                <td class="right" data-label="">
                  <div class="row-actions" (click)="$event.stopPropagation()">
                    <button class="gm-icon-btn" title="Consulter la fiche" [routerLink]="['/interventions/view', intervention.idDemandeIntervention]"><app-icon name="eye"></app-icon></button>
                    <button class="gm-icon-btn" title="Modifier" *ngIf="canEdit(intervention)" [routerLink]="['/interventions/edit', intervention.idDemandeIntervention]"><app-icon name="edit"></app-icon></button>
                    <button class="gm-icon-btn danger" title="Supprimer" *ngIf="canDelete()" (click)="deleteIntervention(intervention.idDemandeIntervention)"><app-icon name="trash"></app-icon></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="gm-pager" *ngIf="!loading && totalCount > pageSize">
          <span>{{ (currentPage - 1) * pageSize + 1 }}–{{ currentPage * pageSize > totalCount ? totalCount : currentPage * pageSize }} sur {{ totalCount }}</span>
          <div class="pages">
            <button class="gm-icon-btn" [disabled]="currentPage === 1" (click)="previousPage()" aria-label="Page précédente"><app-icon name="chevron-left"></app-icon></button>
            <button class="gm-icon-btn" [disabled]="currentPage >= totalPages" (click)="nextPage()" aria-label="Page suivante"><app-icon name="chevron-right"></app-icon></button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / edit side panel -->
    <router-outlet (deactivate)="onFormClosed()"></router-outlet>
  `,
  styles: [`
    .filter-chip {
      display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px 0 12px;
      border: 1px solid var(--primary-200); border-radius: 999px; background: var(--primary-50);
      color: var(--primary-800); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
    }
    .filter-chip:hover { background: var(--primary-100); }
    .filter-chip app-icon { font-size: 13px; }
    .count { font-size: 0.8125rem; color: var(--text-muted); }
    .row-actions { display: inline-flex; gap: 2px; justify-content: flex-end; }
    .clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `]
})
export class InterventionsComponent implements OnInit, OnDestroy {
  interventions: DemandeIntervention[] = [];
  loading = true;
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  viewMode: 'list' | 'grid' = 'list';
  currentUser: UserInfo | null = null;

  /** Preset filter opened from a dashboard alert (?vue=…). */
  vue: string | null = null;
  readonly vueLabels: Record<string, string> = {
    'ouvertes': 'Interventions ouvertes',
    'non-affectees': 'Demandes sans technicien',
    'arret': "Machines à l'arrêt"
  };
  private listSub?: Subscription;
  private routeSub?: Subscription;
  private readonly debounce = debouncer();

  stats = {
    total: 0,
    nouveau: 0,
    enCours: 0,
    termine: 0,
    urgent: 0
  };

  constructor(
    private interventionService: InterventionService,
    private dashboardService: DashboardService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.routeSub = this.route.queryParamMap.subscribe(q => {
      this.vue = q.get('vue');
      this.currentPage = 1;
      this.loadInterventions();
    });
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.listSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  clearVue(): void {
    this.router.navigate([], { queryParams: { vue: null }, queryParamsHandling: 'merge' });
  }

  /** Same rule as the server: supervisor until closed, requester until someone takes it on. */
  canEdit(intervention: DemandeIntervention): boolean {
    const status = intervention.statusId ?? intervention.status?.id ?? 1;
    if (status === 4 || status === 5) return false;
    if (this.currentUser?.role === 'Superviseur') return true;
    return intervention.demandeursID === this.currentUser?.internalId && status === 1 && !intervention.datePriseEnCharge;
  }

  canDelete(): boolean {
    // Only Superviseur can delete
    return this.currentUser?.role === 'Superviseur';
  }

  loadInterventions(): void {
    this.loading = true;
    // Only the latest request counts: an older, slower answer must not overwrite the list
    this.listSub?.unsubscribe();
    this.listSub = this.interventionService.getInterventions(this.currentPage, this.pageSize, this.searchTerm, this.vue).subscribe({
      next: (result: PagedResult<DemandeIntervention>) => {
        this.interventions = result.data;
        this.totalCount = result.totalCount;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  /** Counts over every request visible to the user, not just the current page. */
  loadStats(): void {
    this.dashboardService.getDashboardStats().subscribe({
      next: data => {
        const s = data.interventionStats;
        this.stats = {
          total: s.enAttente + s.enCours + s.terminee + s.annulee,
          nouveau: s.enAttente,
          enCours: s.enCours,
          termine: s.terminee,
          urgent: data.urgenceData
            .filter(u => /haut|urgent|crit/i.test(u.libelle))
            .reduce((sum, u) => sum + u.count, 0)
        };
      }
    });
  }

  search(): void {
    this.debounce(() => {
      this.currentPage = 1;
      this.loadInterventions();
    });
  }

  getInterventionCode(intervention: DemandeIntervention): string {
    return `INT-${String(intervention.idDemandeIntervention).padStart(4, '0')}`;
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  }

  /** The list and its counters are refreshed when the side panel closes (after a save or not). */
  onFormClosed(): void {
    this.loadInterventions();
    this.loadStats();
  }

  urgenceTone(intervention: DemandeIntervention): string {
    const l = (intervention.urgence?.libelle || '').toLowerCase();
    if (l.includes('haut') || l.includes('urgent') || l.includes('crit')) return 't-bad';
    if (l.includes('moy') || l.includes('norm')) return 't-info';
    return 't-neutral';
  }

  statutDot(intervention: DemandeIntervention): string {
    return STATUTS_OT[intervention.statusId ?? intervention.status?.id ?? 1]?.dot || 'd-info';
  }

  isUrgent(intervention: DemandeIntervention): boolean {
    const urgence = intervention.urgence?.libelle?.toLowerCase() || '';
    return urgence.includes('haute') || urgence.includes('urgent');
  }

  /** Badge colour from the workflow status. */
  getEtatClass(intervention: DemandeIntervention): string {
    switch (intervention.statusId ?? intervention.status?.id) {
      case 2: return 'etat-en-cours';
      case 3: return 'etat-realisee';
      case 4: return 'etat-termine';
      case 5: return 'etat-annulee';
      default: return 'etat-nouveau';
    }
  }

  getDemandeurName(intervention: DemandeIntervention): string {
    const demandeur = intervention.demandeur || intervention.demandeurs;
    if (!demandeur) return 'Superviseur Admin';
    return `${demandeur.prenom || ''} ${demandeur.nom || ''}`.trim() || demandeur.email || 'Utilisateur';
  }

  getInitials(intervention: DemandeIntervention): string {
    const demandeur = intervention.demandeur || intervention.demandeurs;
    if (!demandeur) return 'SA';
    
    const prenom = demandeur.prenom || '';
    const nom = demandeur.nom || '';
    
    if (prenom && nom) {
      return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
    }
    
    if (demandeur.email) {
      return demandeur.email.substring(0, 2).toUpperCase();
    }
    
    return 'SA';
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadInterventions();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadInterventions();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  deleteIntervention(id: number): void {
    if (confirm('Voulez-vous vraiment supprimer cette intervention ?')) {
      this.interventionService.deleteIntervention(id).subscribe({
        next: () => {
          this.notificationService.success('Succès', 'Intervention supprimée avec succès');
          this.loadInterventions();
        },
        error: (err) => {
          this.notificationService.error('Erreur', 'Impossible de supprimer l\'intervention');
          console.error('Error deleting intervention:', err);
        }
      });
    }
  }
}
