import { HelpTipComponent } from '../../../shared/components/help-tip/help-tip.component';
import { Component, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { EquipementHistorique, GmaoApiService, PieceJointeRow } from '../../../core/services/gmao-api.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { BarItem, GmBarListComponent } from '../../../shared/components/charts/gm-charts';
import { STATUTS_OT, errorMessage, exportCsv, fmtDate, fmtHours, otCode, relativeDays, saveBlob } from '../../../shared/utils/gm-format';

/** 360° view of a machine: reliability, every work order, preventive plans, parts, cost, documents. */
import { NotificationService } from '../../../core/services/notification.service';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-equipement-historique',
  standalone: true,
  imports: [CommonModule, RouterModule, AppIconComponent, GmBarListComponent, HelpTipComponent],
  template: `
    <div class="gm-loading" *ngIf="loading"><span class="spinner"></span> Chargement de l'historique…</div>
    <div class="gm-error-box" *ngIf="error"><app-icon name="alert"></app-icon>{{ error }}</div>

    <ng-container *ngIf="data as d">
      <ng-container *ngIf="mode === 'historique'">
        <div class="gm-kpis">
          <div class="gm-kpi">
            <div class="kpi-top"><span class="kpi-label">Disponibilité (12 mois)<app-help text="Part du temps où cette machine a pu produire sur les 12 derniers mois. 100 % = jamais arrêtée par une panne."></app-help></span><span class="kpi-icon" [ngClass]="d.indicateurs.disponibilite >= 98 ? 't-ok' : d.indicateurs.disponibilite >= 95 ? 't-warn' : 't-bad'"><app-icon name="gauge"></app-icon></span></div>
            <div class="kpi-value">{{ d.indicateurs.disponibilite | number:'1.1-1':'fr' }}<small>%</small></div>
            <div class="kpi-foot"><span class="kpi-hint">{{ fmtHours(d.indicateurs.heuresArret) }} d'arrêt</span></div>
          </div>
          <div class="gm-kpi">
            <div class="kpi-top"><span class="kpi-label">Pannes (12 mois)<app-help text="Nombre de pannes déclarées sur cette machine pendant les 12 derniers mois."></app-help></span><span class="kpi-icon t-bad"><app-icon name="alert"></app-icon></span></div>
            <div class="kpi-value">{{ d.indicateurs.pannes12Mois }}</div>
            <div class="kpi-foot"><span class="kpi-hint">Dernière : {{ d.indicateurs.dernierepanne ? relativeDays(d.indicateurs.dernierepanne) : 'aucune' }}</span></div>
          </div>
          <div class="gm-kpi">
            <div class="kpi-top"><span class="kpi-label">MTBF / MTTR<app-help text="MTBF (le grand chiffre) : temps moyen de bon fonctionnement entre deux pannes, plus il est long mieux c'est. Réparation moyenne (MTTR) : durée moyenne d'une réparation."></app-help></span><span class="kpi-icon t-info"><app-icon name="clock"></app-icon></span></div>
            <div class="kpi-value">{{ d.indicateurs.mtbfHeures !== null ? (d.indicateurs.mtbfHeures | number:'1.0-0':'fr') : '—' }}<small>h</small></div>
            <div class="kpi-foot"><span class="kpi-hint">Réparation moyenne : {{ d.indicateurs.mttrHeures !== null ? fmtHours(d.indicateurs.mttrHeures) : '—' }}</span></div>
          </div>
          <div class="gm-kpi">
            <div class="kpi-top"><span class="kpi-label">Coût de maintenance<app-help text="Main-d'œuvre + pièces + sous-traitance dépensées pour cette machine sur 12 mois."></app-help></span><span class="kpi-icon t-info"><app-icon name="coins"></app-icon></span></div>
            <div class="kpi-value">{{ d.indicateurs.cout12Mois | number:'1.0-0':'fr' }}<small>DT</small></div>
            <div class="kpi-foot"><span class="kpi-hint">12 mois · {{ d.indicateurs.coutTotal | number:'1.0-0':'fr' }} DT depuis l'origine</span></div>
          </div>
        </div>

        <div class="gm-grid">
          <div class="gm-card span-5">
            <div class="gm-card-head"><div><h3>Pannes par type</h3><div class="sub">12 derniers mois</div></div></div>
            <div class="gm-card-body"><gm-bar-list [items]="pannesBars" emptyText="Aucune panne sur 12 mois"></gm-bar-list></div>
          </div>
          <div class="gm-card span-7">
            <div class="gm-card-head">
              <div><h3>Maintenance préventive</h3><div class="sub">{{ d.plans.length ? d.plans.length + ' plan' + (d.plans.length > 1 ? 's' : '') : 'Aucun plan : cette machine n\\'est suivie qu\\'en correctif' }}</div></div>
              <a class="btn btn-secondary btn-sm" routerLink="/preventif" *ngIf="isSuperviseur">Plans</a>
            </div>
            <div class="gm-card-body flush">
              <div class="plan" *ngFor="let p of d.plans">
                <span class="gm-code">{{ p.code }}</span>
                <span class="plan-t">{{ p.titre }}</span>
                <span class="gm-tag" [ngClass]="p.isActif ? 't-info' : 't-neutral'">{{ p.isActif ? 'Prochaine : ' + fmtDate(p.prochaineEcheance) : 'Suspendu' }}</span>
              </div>
              <div class="gm-empty" *ngIf="!d.plans.length"><app-icon name="preventive"></app-icon><span>Ajoutez un plan pour réduire les pannes.</span></div>
            </div>
          </div>

          <div class="gm-card span-12">
            <div class="gm-card-head">
              <div><h3>Historique des interventions</h3><div class="sub">{{ d.interventions.length }} intervention{{ d.interventions.length > 1 ? 's' : '' }}, de la plus récente à la plus ancienne</div></div>
              <div class="actions">
                <div class="gm-seg">
                  <button [class.on]="filtre === 'tout'" (click)="filtre = 'tout'">Toutes</button>
                  <button [class.on]="filtre === 'pannes'" (click)="filtre = 'pannes'">Pannes</button>
                  <button [class.on]="filtre === 'preventif'" (click)="filtre = 'preventif'">Préventif</button>
                </div>
                <button class="btn btn-secondary btn-sm" (click)="export()" [disabled]="!d.interventions.length"><app-icon name="download"></app-icon> Exporter</button>
              </div>
            </div>
            <div class="gm-card-body flush">
              <div class="gm-empty" *ngIf="!d.interventions.length"><app-icon name="interventions"></app-icon><strong>Aucune intervention</strong></div>
              <div class="gm-table-wrap" *ngIf="d.interventions.length">
                <table class="gm-table responsive">
                  <thead><tr><th>Date</th><th>Intervention</th><th>Cause et remède</th><th>Statut</th><th class="right">Arrêt</th><th class="right">Coût</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let i of liste" class="clickable" [routerLink]="['/interventions/view', i.idDemandeIntervention]">
                      <td data-label="Date" class="nowrap">{{ fmtDate(i.dateCreation) }}</td>
                      <td class="primary" data-label="Intervention">
                        <span class="title">{{ i.titre }}</span>
                        <span class="sub">{{ otCode(i.idDemandeIntervention) }} · {{ i.idPlanPreventif ? 'Préventif' : i.panne }}{{ i.technicien ? ' · ' + i.technicien : '' }}</span>
                      </td>
                      <td data-label="Cause / remède"><span class="sub cause">{{ i.cause || '—' }}</span><span class="sub" *ngIf="i.remede">→ {{ i.remede }}</span></td>
                      <td data-label="Statut"><span class="gm-dot" [ngClass]="dot(i.statusId)">{{ i.statut }}</span></td>
                      <td class="right num" data-label="Arrêt">{{ i.dureeArretHeures !== null ? fmtHours(i.dureeArretHeures) : '—' }}</td>
                      <td class="right num" data-label="Coût">{{ i.cout ? (i.cout | number:'1.0-0':'fr') + ' DT' : '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="gm-card span-12" *ngIf="d.piecesConsommees.length">
            <div class="gm-card-head"><div><h3>Pièces consommées par cette machine</h3><div class="sub">Utile pour dimensionner le stock de sécurité</div></div></div>
            <div class="gm-card-body flush">
              <table class="gm-table responsive">
                <thead><tr><th>Article</th><th class="right">Quantité</th><th class="right">Montant</th><th>Dernière sortie</th></tr></thead>
                <tbody>
                  <tr *ngFor="let p of d.piecesConsommees" class="clickable" [routerLink]="['/magasin']" [queryParams]="{ article: p.idPiece }">
                    <td class="primary" data-label="Article"><span class="title">{{ p.designation }}</span><span class="sub gm-code">{{ p.codePiece }}</span></td>
                    <td class="right num" data-label="Quantité">{{ p.quantite }} {{ p.unite }}</td>
                    <td class="right num" data-label="Montant">{{ p.montant | number:'1.0-0':'fr' }} DT</td>
                    <td data-label="Dernière sortie">{{ fmtDate(p.derniere) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="mode === 'documents'">
        <div class="gm-card">
          <div class="gm-card-head">
            <div><h3>Documents de la machine</h3><div class="sub">Notices, schémas, certificats, photos de la plaque signalétique…</div></div>
            <label class="btn btn-primary btn-sm upload" *ngIf="peutAjouter"><app-icon name="upload"></app-icon> {{ uploading ? 'Envoi…' : 'Ajouter' }}
              <input type="file" hidden (change)="upload($event)" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.dwg">
            </label>
          </div>
          <div class="gm-card-body flush">
            <div class="gm-empty" *ngIf="!fichiers.length"><app-icon name="file"></app-icon><strong>Aucun document</strong><span>Centralisez ici la documentation technique de la machine.</span></div>
            <div class="doc" *ngFor="let f of fichiers">
              <app-icon [name]="f.contentType.startsWith('image/') ? 'eye' : 'file'"></app-icon>
              <button class="link" (click)="download(f)">{{ f.nomFichier }}</button>
              <small class="muted">{{ size(f.taille) }} · {{ fmtDate(f.dateAjout) }}</small>
              <button class="gm-icon-btn danger" *ngIf="peutAjouter" (click)="remove(f)" title="Supprimer"><app-icon name="trash"></app-icon></button>
            </div>
          </div>
        </div>
      </ng-container>
    </ng-container>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 16px; }
    .plan { display: grid; grid-template-columns: 74px 1fr auto; gap: 10px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--gray-100); font-size: 0.8125rem; }
    .plan-t { font-weight: 500; }
    .cause { color: var(--text-secondary) !important; }
    .doc { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-top: 1px solid var(--gray-100); font-size: 0.8125rem; app-icon { color: var(--text-muted); } }
    .link { flex: 1; text-align: left; border: 0; background: none; color: var(--primary-700); font: inherit; font-weight: 500; cursor: pointer; padding: 0; }
    .upload { cursor: pointer; margin: 0; }
  `]
})
export class EquipementHistoriqueComponent implements OnChanges {
  private readonly confirmDialog = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  @Input() equipementId!: number;
  @Input() mode: 'historique' | 'documents' = 'historique';
  filtre: 'tout' | 'pannes' | 'preventif' = 'tout';

  get liste() {
    const all = this.data?.interventions ?? [];
    return this.filtre === 'pannes' ? all.filter(i => i.machineArretee) : this.filtre === 'preventif' ? all.filter(i => i.idPlanPreventif) : all;
  }

  data: EquipementHistorique | null = null;
  pannesBars: BarItem[] = [];
  loading = false;
  error = '';
  fichiers: PieceJointeRow[] = [];
  peutAjouter = false;
  uploading = false;
  isSuperviseur = false;

  constructor(private api: GmaoApiService, auth: AuthService) {
    this.isSuperviseur = auth.getCurrentUser()?.role === 'Superviseur';
  }

  ngOnChanges(): void {
    if (!this.equipementId) return;
    if (!this.data) this.load();
    if (this.mode === 'documents') this.loadDocs();
  }

  load(): void {
    this.loading = true;
    this.api.getEquipementHistorique(this.equipementId).subscribe({
      next: d => {
        this.data = d;
        this.pannesBars = d.pannesParType.map(p => ({ label: p.panne, value: p.nombre, tone: 'bad' as const }));
        this.loading = false;
      },
      error: err => { this.loading = false; this.error = errorMessage(err, "L'historique est indisponible."); }
    });
  }

  loadDocs(): void {
    this.api.getPiecesJointes('Equipement', this.equipementId).subscribe({
      next: r => { this.fichiers = r.fichiers; this.peutAjouter = r.peutAjouter; },
      error: () => this.fichiers = []
    });
  }

  upload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.uploading = true;
    this.api.uploadPieceJointe('Equipement', this.equipementId, file).subscribe({
      next: () => { this.uploading = false; this.loadDocs(); },
      error: err => { this.uploading = false; this.notifications.error('Envoi impossible', errorMessage(err)); }
    });
  }

  download(f: PieceJointeRow): void {
    this.api.downloadPieceJointe(f.id).subscribe(b => saveBlob(b, f.nomFichier));
  }

  async remove(f: PieceJointeRow): Promise<void> {
    if (!(await this.confirmDialog.ask({ title: `Supprimer « ${f.nomFichier} » ?`, message: 'Le document sera retiré de la fiche de la machine.' }))) return;
    this.api.deletePieceJointe(f.id).subscribe({ next: () => this.loadDocs(), error: err => this.notifications.error('Suppression impossible', errorMessage(err)) });
  }

  size(b: number): string { return b > 1048576 ? `${(b / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`; }
  dot(id: number): string { return STATUTS_OT[id]?.dot ?? 'd-muted'; }

  export(): void {
    if (!this.data) return;
    const d = this.data;
    exportCsv(`historique-${d.equipement.codeEquipement}`, ['Date', 'Référence', 'Intervention', 'Type', 'Panne', 'Statut', 'Technicien', 'Cause', 'Remède', 'Arrêt (h)', 'Coût (DT)'],
      d.interventions.map(i => [fmtDate(i.dateCreation), otCode(i.idDemandeIntervention), i.titre, i.type, i.panne, i.statut, i.technicien, i.cause, i.remede, i.dureeArretHeures, i.cout]));
  }

  fmtDate = fmtDate;
  fmtHours = fmtHours;
  otCode = otCode;
  relativeDays = relativeDays;
}
