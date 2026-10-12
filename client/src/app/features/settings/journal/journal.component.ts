import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GmaoApiService, JournalRow } from '../../../core/services/gmao-api.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { errorMessage, exportCsv, fmtDateTime, isoDate, otCode } from '../../../shared/utils/gm-format';

/** Audit trail: every change recorded by the modules, read-only. */
@Component({
  selector: 'app-journal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent],
  template: `
    <div class="gm-page">
      <app-page-header icon="journal" title="Journal d'activité" subtitle="Traçabilité des actions : interventions, stock, achats, plans, paramètres.">
        <a class="btn btn-secondary" routerLink="/settings"><app-icon name="chevron-left"></app-icon> Paramètres</a>
      </app-page-header>

      <div class="gm-filters">
        <span class="gm-search"><app-icon name="search"></app-icon>
          <input type="search" placeholder="Action, détail, utilisateur…" [(ngModel)]="search" (keyup.enter)="load(1)" (search)="load(1)">
        </span>
        <select [(ngModel)]="entite" (ngModelChange)="load(1)" aria-label="Objet">
          <option value="">Tous les objets</option>
          <option *ngFor="let e of entites" [value]="e.key">{{ e.label }}</option>
        </select>
        <input type="date" [(ngModel)]="from" (change)="load(1)" aria-label="Du">
        <input type="date" [(ngModel)]="to" (change)="load(1)" aria-label="Au">
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" (click)="export()" [disabled]="!rows.length"><app-icon name="download"></app-icon> Exporter</button>
      </div>

      <div class="gm-card">
        <div class="gm-error-box" *ngIf="error"><app-icon name="alert"></app-icon>{{ error }}</div>
        <div class="gm-loading" *ngIf="loading"><span class="spinner"></span></div>
        <div class="gm-empty" *ngIf="!loading && !rows.length"><app-icon name="journal"></app-icon><strong>Aucune action enregistrée</strong></div>
        <div class="gm-table-wrap" *ngIf="!loading && rows.length">
          <table class="gm-table responsive">
            <thead><tr><th>Date</th><th>Utilisateur</th><th>Objet</th><th>Action</th><th>Détail</th></tr></thead>
            <tbody>
              <tr *ngFor="let r of rows">
                <td data-label="Date" class="nowrap">{{ fmtDateTime(r.date) }}</td>
                <td data-label="Utilisateur">{{ r.utilisateurNom || '—' }}</td>
                <td data-label="Objet">
                  <a *ngIf="link(r) as l; else plain" [routerLink]="l.route" [queryParams]="l.query">{{ objet(r) }}</a>
                  <ng-template #plain>{{ objet(r) }}</ng-template>
                </td>
                <td class="primary" data-label="Action"><b>{{ r.action }}</b></td>
                <td data-label="Détail" class="muted">{{ r.details }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="gm-pager" *ngIf="total > pageSize">
          <span>{{ (page - 1) * pageSize + 1 }}–{{ page * pageSize > total ? total : page * pageSize }} sur {{ total }}</span>
          <div class="pages">
            <button class="gm-icon-btn" [disabled]="page === 1" (click)="load(page - 1)"><app-icon name="chevron-left"></app-icon></button>
            <button class="gm-icon-btn" [disabled]="page * pageSize >= total" (click)="load(page + 1)"><app-icon name="chevron-right"></app-icon></button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class JournalComponent implements OnInit {
  readonly entites = [
    { key: 'Intervention', label: 'Interventions' }, { key: 'PlanPreventif', label: 'Plans préventifs' }, { key: 'Article', label: 'Articles du magasin' },
    { key: 'BonCommande', label: 'Bons de commande' }, { key: 'DemandeAchat', label: "Demandes d'achat" }, { key: 'Fournisseur', label: 'Fournisseurs' },
    { key: 'Budget', label: 'Budgets' }, { key: 'Utilisateur', label: 'Utilisateurs' }, { key: 'Equipement', label: 'Équipements' }, { key: 'Parametre', label: 'Paramètres' }
  ];
  rows: JournalRow[] = [];
  total = 0;
  page = 1;
  readonly pageSize = 50;
  search = '';
  entite = '';
  from = isoDate(new Date(Date.now() - 30 * 86400000));
  to = isoDate(new Date());
  loading = true;
  error = '';

  constructor(private api: GmaoApiService) {}

  ngOnInit(): void { this.load(1); }

  load(page: number): void {
    this.page = page;
    this.loading = true;
    this.api.getJournal({ search: this.search, entite: this.entite, from: this.from, to: this.to, page, pageSize: this.pageSize }).subscribe({
      next: r => { this.rows = r.data; this.total = r.totalCount; this.loading = false; },
      error: err => { this.error = errorMessage(err); this.loading = false; }
    });
  }

  objet(r: JournalRow): string {
    const label = this.entites.find(e => e.key === r.entite)?.label.replace(/s$/, '') ?? r.entite;
    if (r.entite === 'Intervention' && r.entiteId) return otCode(r.entiteId);
    return r.entiteId ? `${label} n° ${r.entiteId}` : label;
  }

  link(r: JournalRow): { route: any[]; query?: any } | null {
    if (!r.entiteId) return null;
    switch (r.entite) {
      case 'Intervention': return { route: ['/interventions/view', r.entiteId] };
      case 'Article': return { route: ['/magasin'], query: { article: r.entiteId } };
      case 'BonCommande': return { route: ['/achats'], query: { bc: r.entiteId } };
      case 'Equipement': return { route: ['/equipment/view', r.entiteId] };
      default: return null;
    }
  }

  export(): void {
    this.api.getJournal({ search: this.search, entite: this.entite, from: this.from, to: this.to, page: 1, pageSize: 200 }).subscribe(r =>
      exportCsv('journal-activite', ['Date', 'Utilisateur', 'Objet', 'Action', 'Détail'], r.data.map(x => [fmtDateTime(x.date), x.utilisateurNom, this.objet(x), x.action, x.details])));
  }

  fmtDateTime = fmtDateTime;
}
