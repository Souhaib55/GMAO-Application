import { HelpTipComponent } from '../../shared/components/help-tip/help-tip.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GmaoApiService, TechnicienRow } from '../../core/services/gmao-api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { errorMessage, exportCsv } from '../../shared/utils/gm-format';

@Component({
  selector: 'app-techniciens',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent, HelpTipComponent],
  template: `
    <div class="gm-page">
      <app-page-header icon="team" title="Techniciens" subtitle="Charge de travail de l'équipe, temps saisi et taux horaires pour le calcul des coûts.">
        <button class="btn btn-secondary" (click)="export()" [disabled]="!rows.length"><app-icon name="download"></app-icon> Exporter</button>
        <a class="btn btn-secondary" routerLink="/settings/users"><app-icon name="users"></app-icon> Gérer les comptes</a>
      </app-page-header>

      <div class="gm-filters">
        <app-icon name="filter"></app-icon>
        <span class="muted small">Production sur</span>
        <div class="gm-seg">
          <button *ngFor="let p of periods" [class.on]="days === p" (click)="days = p; load()">{{ p === 365 ? '12 mois' : p + ' j' }}</button>
        </div>
      </div>

      <div class="gm-error-box" *ngIf="error"><app-icon name="alert"></app-icon>{{ error }}</div>
      <div class="gm-loading" *ngIf="loading"><span class="spinner"></span></div>

      <div class="team" *ngIf="!loading">
        <div class="gm-empty" *ngIf="!rows.length"><app-icon name="team"></app-icon><strong>Aucun technicien actif</strong><span>Créez des comptes avec le rôle Technicien dans les paramètres.</span></div>
        <div class="tech gm-card" *ngFor="let t of rows">
          <div class="tech-head">
            <span class="av">{{ t.prenom.charAt(0) }}{{ t.nom.charAt(0) }}</span>
            <div class="who"><b>{{ t.prenom }} {{ t.nom }}</b><small>{{ t.specialite || 'Spécialité non renseignée' }}</small></div>
            <button class="gm-icon-btn" title="Modifier le profil" (click)="edit(t)"><app-icon name="edit"></app-icon></button>
          </div>
          <div class="load">
            <div class="load-top"><span>Charge actuelle<app-help text="Interventions ouvertes affectées à ce technicien et la durée estimée de ce travail."></app-help></span><b>{{ t.charge }} OT<ng-container *ngIf="t.heuresPlanifiees"> · {{ t.heuresPlanifiees | number:'1.0-1':'fr' }} h prévues</ng-container></b></div>
            <div class="gm-progress" [ngClass]="t.charge > maxCharge * 0.8 ? 'bad' : t.charge > maxCharge * 0.5 ? 'warn' : 'ok'"><span [style.width.%]="maxCharge ? (t.charge / maxCharge) * 100 : 0"></span></div>
          </div>
          <div class="stats">
            <div><span>En cours</span><b>{{ t.enCours }}</b></div>
            <div><span>À démarrer</span><b>{{ t.aFaire }}</b></div>
            <div><span>En retard<app-help text="Interventions de ce technicien dont la date prévue est dépassée."></app-help></span><b [class.bad]="t.enRetard">{{ t.enRetard }}</b></div>
            <div><span>Réalisées</span><b>{{ t.realisees }}</b></div>
            <div><span>Heures saisies<app-help text="Temps de travail saisi par ce technicien sur la période choisie en haut de la page."></app-help></span><b>{{ t.heuresSaisies | number:'1.0-1':'fr' }}</b></div>
            <div><span>Taux horaire<app-help text="Coût d'une heure de travail de ce technicien, utilisé pour calculer le coût de main-d'œuvre."></app-help></span><b>{{ t.tauxHoraire !== null ? (t.tauxHoraire | number:'1.0-3':'fr') + ' DT/h' : '—' }}</b></div>
          </div>
          <div class="contact muted">{{ t.telephone || 'Téléphone non renseigné' }} · {{ t.email }}</div>
        </div>
      </div>
    </div>

    <ng-container *ngIf="dialog as d">
      <div class="gm-backdrop" (click)="dialog = null"></div>
      <div class="gm-dialog" role="dialog">
        <div class="gm-drawer-head"><h2>{{ d.nom }}</h2></div>
        <div class="gm-drawer-body">
          <div class="gm-error-box" *ngIf="formError"><app-icon name="alert"></app-icon>{{ formError }}</div>
          <div class="gm-field"><label>Spécialité</label><input maxlength="100" [(ngModel)]="d.specialite" placeholder="Ex. Mécanique machines à coudre"></div>
          <div class="gm-field"><label>Taux horaire (DT par heure)</label><input type="number" min="0" step="0.5" [(ngModel)]="d.tauxHoraire"><span class="hint">Sert au calcul du coût de main-d'œuvre des interventions.</span></div>
          <div class="gm-field"><label>Téléphone</label><input maxlength="30" [(ngModel)]="d.telephone"></div>
        </div>
        <div class="gm-drawer-foot">
          <button class="btn btn-secondary" (click)="dialog = null">Annuler</button>
          <button class="btn btn-primary" (click)="save()">Enregistrer</button>
        </div>
      </div>
    </ng-container>
    <div class="gm-toast" *ngIf="toast"><app-icon name="check"></app-icon>{{ toast }}</div>
  `,
  styles: [`
    .small { font-size: 0.8rem; }
    .bad { color: var(--error); }
    .team { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .tech { padding: 16px; gap: 14px; }
    .tech-head { display: flex; align-items: center; gap: 12px; }
    .av { width: 42px; height: 42px; border-radius: 50%; background: var(--brand-gradient); color: #fff; display: grid; place-items: center; font-weight: 600; font-size: 0.875rem; flex-shrink: 0; }
    .who { flex: 1; min-width: 0; display: flex; flex-direction: column; b { font-size: 0.9375rem; } small { font-size: 0.78rem; color: var(--text-muted); } }
    .load { display: flex; flex-direction: column; gap: 6px; }
    .load-top { display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted); b { color: var(--text); font-weight: 600; } }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding-top: 12px; border-top: 1px solid var(--gray-100);
      div { display: flex; flex-direction: column; gap: 2px; } span { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
      b { font-size: 1rem; font-variant-numeric: tabular-nums; } }
    .contact { font-size: 0.75rem; }
  `]
})
export class TechniciensComponent implements OnInit {
  readonly periods = [7, 30, 90, 365];
  days = 30;
  rows: TechnicienRow[] = [];
  loading = true;
  error = '';
  dialog: { id: number; nom: string; specialite: string; tauxHoraire: number | null; telephone: string } | null = null;
  formError = '';
  toast = '';

  constructor(private api: GmaoApiService) {}

  ngOnInit(): void { this.load(); }

  get maxCharge(): number { return Math.max(6, ...this.rows.map(r => r.charge)); }

  load(): void {
    this.loading = true;
    this.api.getTechniciens(this.days).subscribe({
      next: r => { this.rows = r.sort((a, b) => b.charge - a.charge); this.loading = false; },
      error: err => { this.error = errorMessage(err); this.loading = false; }
    });
  }

  edit(t: TechnicienRow): void {
    this.formError = '';
    this.dialog = { id: t.id, nom: `${t.prenom} ${t.nom}`, specialite: t.specialite || '', tauxHoraire: t.tauxHoraire, telephone: t.telephone || '' };
  }

  save(): void {
    const d = this.dialog;
    if (!d) return;
    this.api.updateTechnicien(d.id, { tauxHoraire: d.tauxHoraire === null || (d.tauxHoraire as any) === '' ? null : Number(d.tauxHoraire), specialite: d.specialite || null, telephone: d.telephone || null }).subscribe({
      next: () => { this.dialog = null; this.toast = 'Profil mis à jour.'; setTimeout(() => this.toast = '', 3000); this.load(); },
      error: err => this.formError = errorMessage(err)
    });
  }

  export(): void {
    exportCsv(`techniciens-${this.days}j`, ['Technicien', 'Spécialité', 'En cours', 'À démarrer', 'En retard', 'Réalisées', 'Heures saisies', 'Taux horaire (DT/h)'],
      this.rows.map(t => [`${t.prenom} ${t.nom}`, t.specialite, t.enCours, t.aFaire, t.enRetard, t.realisees, t.heuresSaisies, t.tauxHoraire]));
  }
}
