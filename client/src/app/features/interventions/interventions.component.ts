import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { STATUTS_OT, debouncer, errorMessage, exportCsv, fmtDate, fmtDateTime, isoDate } from '../../shared/utils/gm-format';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { FormsModule } from '@angular/forms';
import { InterventionFiltres, InterventionService } from './services/intervention.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DemandeIntervention, PagedResult, UserInfo } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { DashboardService } from '../dashboard/dashboard.service';

import { ConfirmService } from '../../core/services/confirm.service';

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

      <!-- Filter coming from the dashboard: says in words what the list shows -->
      <div class="drill-banner" *ngIf="drillLabel" role="status">
        <app-icon name="filter"></app-icon>
        <span><b>{{ drillLabel }}</b><small *ngIf="drillDetail">{{ drillDetail }}</small></span>
        <button type="button" class="btn btn-secondary btn-sm" (click)="clearDrill()">Retirer ce filtre</button>
      </div>

      <div class="gm-filters">
        <span class="gm-search"><app-icon name="search"></app-icon>
          <input type="search" placeholder="Titre, référence, machine…" aria-label="Rechercher" [(ngModel)]="searchTerm" (ngModelChange)="search()">
        </span>
        <select [ngModel]="statusId" (ngModelChange)="setFilter('statusId', $event)" aria-label="Statut">
          <option [ngValue]="null">Tous les statuts</option>
          <option *ngFor="let st of statutOptions" [ngValue]="st.id">{{ st.label }}</option>
        </select>
        <select [ngModel]="type" (ngModelChange)="setFilter('type', $event)" aria-label="Type">
          <option [ngValue]="null">Tous les types</option>
          <option ngValue="panne">Pannes avec arrêt</option>
          <option ngValue="corrective">Correctif (hors préventif)</option>
          <option ngValue="preventif">Préventif</option>
        </select>
        <select *ngIf="!isDemandeur" [ngModel]="chaineId" (ngModelChange)="setFilter('chaineId', $event)" aria-label="Chaîne">
          <option [ngValue]="null">Toutes les chaînes</option>
          <option *ngFor="let c of chaines" [ngValue]="c.id">{{ c.libelle }}</option>
        </select>
        <select *ngIf="!vue" [ngModel]="periode" (ngModelChange)="setPeriode($event)" aria-label="Période de déclaration">
          <option [ngValue]="null">Toutes les dates</option>
          <option ngValue="7">Déclarées ces 7 jours</option>
          <option ngValue="30">Déclarées ces 30 jours</option>
          <option ngValue="90">Déclarées ces 90 jours</option>
          <option ngValue="mois">Déclarées ce mois-ci</option>
        </select>
        <button type="button" class="btn btn-secondary btn-sm" *ngIf="hasFilters" (click)="clearAll()">Effacer les filtres</button>
        <span class="spacer"></span>
        <span class="count" *ngIf="!loading">{{ totalCount }} intervention{{ totalCount > 1 ? 's' : '' }}</span>
        <button type="button" class="btn btn-secondary btn-sm" (click)="exporter()" [disabled]="exporting || !totalCount">
          <app-icon name="download"></app-icon> {{ exporting ? 'Export…' : 'Exporter' }}
        </button>
      </div>

      <div class="gm-card">
        <div class="gm-loading" *ngIf="loading"><span class="spinner"></span> Chargement des interventions…</div>

        <div class="gm-empty" *ngIf="!loading && !interventions.length">
          <app-icon name="interventions"></app-icon>
          <strong>Aucune intervention</strong>
          <span>{{ searchTerm || hasFilters ? 'Aucune intervention ne correspond à ces filtres.' : 'Déclarez une panne ou une demande de maintenance pour commencer.' }}</span>
          <button class="btn btn-secondary btn-sm mt-1" *ngIf="searchTerm || hasFilters" (click)="clearAll()">Effacer les filtres</button>
          <button class="btn btn-primary btn-sm mt-1" *ngIf="!searchTerm && !hasFilters" routerLink="/interventions/new"><app-icon name="plus"></app-icon> Nouvelle intervention</button>
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
                    <button class="gm-icon-btn" title="Consulter la fiche" aria-label="Consulter la fiche" [routerLink]="['/interventions/view', intervention.idDemandeIntervention]"><app-icon name="eye"></app-icon></button>
                    <button class="gm-icon-btn" title="Modifier" aria-label="Modifier" *ngIf="canEdit(intervention)" [routerLink]="['/interventions/edit', intervention.idDemandeIntervention]"><app-icon name="edit"></app-icon></button>
                    <button class="gm-icon-btn danger" title="Supprimer" aria-label="Supprimer" *ngIf="canDelete()" (click)="deleteIntervention(intervention.idDemandeIntervention)"><app-icon name="trash"></app-icon></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="gm-pager" *ngIf="!loading && totalCount > 10">
          <span>{{ (currentPage - 1) * pageSize + 1 }}–{{ currentPage * pageSize > totalCount ? totalCount : currentPage * pageSize }} sur {{ totalCount }}
            <select class="page-size" [ngModel]="pageSize" (ngModelChange)="setPageSize($event)" aria-label="Lignes par page">
              <option [ngValue]="10">10 par page</option><option [ngValue]="25">25 par page</option><option [ngValue]="50">50 par page</option><option [ngValue]="100">100 par page</option>
            </select>
          </span>
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
    .drill-banner {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px; margin-bottom: 12px;
      background: var(--primary-50); border: 1px solid var(--primary-200); border-radius: var(--radius-lg); color: var(--primary-900);
    }
    .drill-banner > app-icon { font-size: 18px; color: var(--primary-600); flex-shrink: 0; }
    .drill-banner > span { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 0.875rem; }
    .drill-banner small { font-size: 0.8125rem; color: var(--primary-800); }
    .page-size { margin-left: 10px; height: 30px; font-size: 0.8125rem; }
    .row-actions { display: inline-flex; gap: 2px; justify-content: flex-end; }
    .clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `]
})
export class InterventionsComponent implements OnInit, OnDestroy {
  private readonly confirmDialog = inject(ConfirmService);
  interventions: DemandeIntervention[] = [];
  loading = true;
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  viewMode: 'list' | 'grid' = 'list';
  currentUser: UserInfo | null = null;

  /** Preset filter opened from a dashboard figure or alert (?vue=…). */
  vue: string | null = null;
  readonly vueLabels: Record<string, string> = {
    'ouvertes': 'Interventions ouvertes en ce moment',
    'en-retard': 'Interventions en retard en ce moment',
    'non-affectees': 'Demandes sans technicien',
    'arret': "Machines à l'arrêt en ce moment",
    'arrets': "Arrêts machine de la période (heures d'arrêt, disponibilité)",
    'pannes': 'Pannes déclarées sur la période',
    'reparees': 'Pannes réparées sur la période (temps moyen de réparation)',
    'preventifs-dus': 'Préventifs prévus sur la période (respect du préventif)',
    'declarees': 'Interventions déclarées sur la période',
    'realisees': 'Interventions terminées sur la période'
  };
  readonly statutOptions = [1, 2, 3, 4, 5].map(id => ({ id, label: STATUTS_OT[id]?.label ?? '' }));

  // Filters, mirrored in the address so the back button and shared links keep them
  statusId: number | null = null;
  type: string | null = null;
  chaineId: number | null = null;
  equipementId: number | null = null;
  panneId: number | null = null;
  du: string | null = null;
  au: string | null = null;
  periode: string | null = null;
  exporting = false;

  chaines: { id: number; libelle: string }[] = [];
  private machines: { id: number; libelle: string }[] = [];
  private pannes: { id: number; libelle: string }[] = [];
  private readonly http = inject(HttpClient);
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
      const num = (k: string) => q.get(k) ? +q.get(k)! : null;
      this.vue = q.get('vue');
      this.statusId = num('statusId');
      this.type = q.get('type');
      this.chaineId = num('chaineId');
      this.equipementId = num('equipementId');
      this.panneId = num('panneId');
      this.du = q.get('du');
      this.au = q.get('au');
      this.periode = q.get('periode');
      this.currentPage = 1;
      this.loadInterventions();
    });
    this.loadStats();
    this.loadLookups();
  }

  get isDemandeur(): boolean { return this.currentUser?.role === 'Demandeur'; }

  get hasFilters(): boolean {
    return !!(this.vue || this.statusId || this.type || this.chaineId || this.equipementId || this.panneId || this.du || this.au || this.periode);
  }

  /** Names of the line, machine and breakdown type, to write the active filter in words. */
  private loadLookups(): void {
    const base = environment.apiUrl;
    this.http.get<any[]>(`${base}/ChaineProduction`).subscribe({ next: l => this.chaines = (l || []).map(c => ({ id: c.idChaineProduction, libelle: c.libelle })), error: () => {} });
    this.http.get<any[]>(`${base}/Panne`).subscribe({ next: l => this.pannes = (l || []).map(p => ({ id: p.idPanne, libelle: p.libelle })), error: () => {} });
    if (!this.isDemandeur) {
      this.http.get<any[]>(`${base}/Equipment/lookup`).subscribe({ next: l => this.machines = (l || []).map(e => ({ id: e.idEquipement, libelle: `${e.codeEquipement} — ${e.designation}` })), error: () => {} });
    }
  }

  /** "Arrêts machine de la période", with the period, line, machine and cause it is narrowed to. */
  get drillLabel(): string {
    if (this.vue) return this.vueLabels[this.vue] || this.vue;
    if (this.equipementId || this.panneId || (this.du && !this.periode)) return 'Liste filtrée';
    return '';
  }

  get drillDetail(): string {
    const parts: string[] = [];
    if (this.du || this.au) {
      const au = this.au ? new Date(this.au) : null;
      parts.push(this.du && au ? `du ${fmtDate(this.du)} au ${fmtDate(au)}` : this.du ? `depuis le ${fmtDate(this.du)}` : `jusqu'au ${fmtDate(au)}`);
    }
    if (this.chaineId) parts.push('chaîne ' + (this.chaines.find(c => c.id === this.chaineId)?.libelle ?? this.chaineId));
    if (this.equipementId) parts.push('machine ' + (this.machines.find(m => m.id === this.equipementId)?.libelle ?? this.equipementId));
    if (this.panneId) parts.push('cause « ' + (this.pannes.find(p => p.id === this.panneId)?.libelle ?? this.panneId) + ' »');
    return parts.join(' · ');
  }

  private navigate(params: Record<string, any>): void {
    this.router.navigate([], { queryParams: params, queryParamsHandling: 'merge', replaceUrl: true });
  }

  setFilter(key: string, value: any): void {
    this.navigate({ [key]: value ?? null });
  }

  setPeriode(value: string | null): void {
    let du: string | null = null;
    if (value === 'mois') { const d = new Date(); du = isoDate(new Date(d.getFullYear(), d.getMonth(), 1)); }
    else if (value) { const d = new Date(); d.setDate(d.getDate() - (+value) + 1); du = isoDate(d); }
    this.navigate({ periode: value, du, au: null });
  }

  setPageSize(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadInterventions();
  }

  clearDrill(): void {
    this.navigate({ vue: null, du: null, au: null, equipementId: null, panneId: null, periode: null });
  }

  clearAll(): void {
    this.searchTerm = '';
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  private get filtres(): InterventionFiltres {
    return { statusId: this.statusId, type: this.type, chaineId: this.chaineId, equipementId: this.equipementId, panneId: this.panneId, du: this.du, au: this.au };
  }

  /** The whole filtered list, not only the current page, as a file Excel opens directly. */
  exporter(): void {
    this.exporting = true;
    this.interventionService.getInterventions(1, 5000, this.searchTerm, this.vue, { ...this.filtres, export: true }).subscribe({
      next: r => {
        const rows = r.data.map((i: any) => [
          this.getInterventionCode(i), i.titre, fmtDateTime(i.dateCreation), i.typeIntervention?.libelle ?? '', i.panne?.libelle ?? '',
          i.chaineProduction?.libelle ?? '', i.equipement ? `${i.equipement.codeEquipement} — ${i.equipement.designation}` : '',
          i.urgence?.libelle ?? '', i.status?.statut ?? '', this.getDemandeurName(i),
          i.destinataire ? `${i.destinataire.prenom ?? ''} ${i.destinataire.nom ?? ''}`.trim() : '',
          i.datePriseEnCharge ? fmtDateTime(i.datePriseEnCharge) : '', i.dateRealisation ? fmtDateTime(i.dateRealisation) : '',
          i.machineArretee ? 'Oui' : 'Non', i.cause ?? '', i.remede ?? ''
        ]);
        exportCsv(`interventions-${isoDate(new Date())}`, ['Référence', 'Titre', 'Déclarée le', 'Type', 'Type de panne', 'Chaîne', 'Machine', 'Urgence', 'Statut',
          'Demandeur', 'Technicien', 'Prise en charge', 'Réalisée le', 'Arrêt machine', 'Cause', 'Remède'], rows);
        this.exporting = false;
        if (r.totalCount > r.data.length) this.notificationService.warning('Export partiel', `Les ${r.data.length} premières lignes sur ${r.totalCount} ont été exportées. Ajoutez un filtre pour réduire la liste.`);
      },
      error: err => { this.exporting = false; this.notificationService.error('Export impossible', errorMessage(err, "La liste n'a pas pu être exportée.")); }
    });
  }

  ngOnDestroy(): void {
    this.listSub?.unsubscribe();
    this.routeSub?.unsubscribe();
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
    this.listSub = this.interventionService.getInterventions(this.currentPage, this.pageSize, this.searchTerm, this.vue, this.filtres).subscribe({
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

  async deleteIntervention(id: number): Promise<void> {
    if (await this.confirmDialog.ask({ title: 'Supprimer cette intervention ?', message: 'Les pièces sorties pour elle seront remises en stock. Pour garder une trace, préférez l\'annulation.' })) {
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
