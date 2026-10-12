import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InterventionSuiviComponent } from '../../interventions/intervention-suivi/intervention-suivi.component';
import { InterventionActionsComponent } from '../../interventions/intervention-actions/intervention-actions.component';
import { Router } from '@angular/router';
import { DemandeIntervention } from '../../../core/models';
import { InterventionService } from '../../interventions/services/intervention.service';
import { NotificationService } from '../../../core/services/notification.service';

const STATUS = { A_TRAITER: 1, EN_COURS: 2, REALISEE: 3, CLOTUREE: 4, ANNULEE: 5 };

interface Step {
  label: string;
  date?: Date | string | null;
  done: boolean;
  current: boolean;
}

/**
 * Side panel of the planning: what has to be done next on a work order,
 * for the current user, followed by the work order details.
 */
@Component({
  selector: 'app-intervention-detail-modal',
  standalone: true,
  imports: [CommonModule, InterventionSuiviComponent, InterventionActionsComponent],
  template: `
    <div class="overlay" (click)="close()">
      <aside class="panel" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">

        <!-- Header -->
        <header class="panel-header">
          <div class="header-main">
            <span class="ref">{{ reference }}</span>
            <h2>{{ intervention?.titre }}</h2>
          </div>
          <button class="icon-btn" (click)="close()" aria-label="Fermer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </header>

        <div class="panel-body" *ngIf="intervention">
          <!-- Status + stepper -->
          <div class="status-row">
            <span class="status-pill" [attr.data-status]="status">{{ intervention.status?.statut }}</span>
            <span class="urgence-pill" [attr.data-level]="urgenceLevel">{{ intervention.urgence?.libelle }}</span>
            <span class="stop-pill" *ngIf="intervention.machineArretee">Machine à l'arrêt</span>
          </div>

          <ol class="stepper" *ngIf="status !== STATUS.ANNULEE">
            <li *ngFor="let step of steps" [class.done]="step.done" [class.current]="step.current">
              <span class="dot"></span>
              <span class="step-label">{{ step.label }}</span>
              <span class="step-date" *ngIf="step.date">{{ step.date | date:'dd/MM HH:mm' }}</span>
            </li>
          </ol>

          <app-intervention-actions [intervention]="intervention" (updated)="onActionDone()" (released)="onReleased()"></app-intervention-actions>

          <!-- Technician's report, right under the actions so the supervisor reads it before closing -->
          <section class="block" *ngIf="intervention.compteRendu">
            <h3>Compte rendu du technicien</h3>
            <p class="text report">{{ intervention.compteRendu }}</p>
          </section>

          <!-- Work record, where the technician already is -->
          <section class="block suivi-wrap" *ngIf="status !== STATUS.A_TRAITER && status !== STATUS.ANNULEE">
            <app-intervention-suivi [compact]="true" [interventionId]="intervention.idDemandeIntervention" [version]="status"></app-intervention-suivi>
          </section>

          <section class="block">
            <h3>Détails</h3>
            <dl class="details">
              <div><dt>Type</dt><dd>{{ intervention.typeIntervention?.libelle || '—' }}</dd></div>
              <div><dt>Type de panne</dt><dd>{{ intervention.machineArretee ? (intervention.panne?.libelle || '—') : 'Sans objet (préventif)' }}</dd></div>
              <div><dt>Chaîne</dt><dd>{{ intervention.chaineProduction?.libelle || '—' }}</dd></div>
              <div><dt>Machine</dt><dd>{{ intervention.equipement ? intervention.equipement.codeEquipement + ' — ' + intervention.equipement.designation : 'Non précisée' }}</dd></div>
              <div><dt>Demandeur</dt><dd>{{ requesterName }}</dd></div>
              <div><dt>Technicien</dt><dd>{{ technicianName || 'Non affecté' }}</dd></div>
              <div><dt>Déclarée le</dt><dd>{{ intervention.dateCreation | date:'dd/MM/yyyy à HH:mm' }}</dd></div>
              <div *ngIf="repairDuration"><dt>Durée de réparation</dt><dd>{{ repairDuration }}</dd></div>
            </dl>
          </section>

          <section class="block" *ngIf="intervention.description">
            <h3>Description</h3>
            <p class="text">{{ intervention.description }}</p>
          </section>

          <section class="block" *ngIf="intervention.raisonAnnulation">
            <h3>{{ status === STATUS.ANNULEE ? "Motif d'annulation" : 'Dernier refus' }}</h3>
            <p class="text warn">{{ intervention.raisonAnnulation }}</p>
          </section>

          <section class="block" *ngIf="intervention.fileName">
            <h3>Pièce jointe</h3>
            <button class="file" (click)="downloadFile()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
              {{ intervention.fileName }}
            </button>
          </section>
        </div>

        <div class="panel-body loading" *ngIf="!intervention">
          <span class="spinner"></span>
        </div>

        <footer class="panel-footer">
          <button class="btn btn-secondary" (click)="close()">Fermer</button>
          <button class="btn btn-primary" (click)="openFullView()" *ngIf="intervention">Ouvrir la fiche</button>
        </footer>
      </aside>
    </div>
  `,
  styles: [`
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1100;
      display: flex;
      justify-content: flex-end;
      background: rgba(21, 26, 34, 0.35);
      animation: fade 0.15s ease;
    }

    .panel {
      width: min(520px, 100vw);
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      box-shadow: -12px 0 32px rgba(21, 26, 34, 0.14);
      animation: slide 0.2s ease;
    }

    @keyframes fade { from { opacity: 0; } }
    @keyframes slide { from { transform: translateX(24px); opacity: 0; } }

    .panel-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
    }

    .header-main { flex: 1; min-width: 0; }

    .ref {
      font-variant-numeric: tabular-nums;
      font-size: 12.5px;
      color: var(--text-muted);
    }

    .panel-header h2 {
      margin: 4px 0 0;
      font-size: 18px;
      font-weight: 600;
      line-height: 1.3;
    }

    .icon-btn {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--gray-600);
      cursor: pointer;
    }

    .icon-btn:hover { background: var(--gray-100); color: var(--text); }

    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 18px 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .panel-body.loading { align-items: center; justify-content: center; }

    .status-row { display: flex; flex-wrap: wrap; gap: 8px; }

    .status-pill, .urgence-pill, .stop-pill {
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 12.5px;
      font-weight: 600;
      background: var(--gray-100);
      color: var(--gray-700);
    }

    .status-pill[data-status="1"] { background: var(--primary-50); color: var(--primary-700); }
    .status-pill[data-status="2"] { background: var(--warning-light); color: var(--warning-text); }
    .status-pill[data-status="3"] { background: var(--accent-50); color: var(--accent-700); }
    .status-pill[data-status="4"] { background: var(--success-light); color: var(--success-text); }
    .urgence-pill[data-level="high"], .stop-pill { background: var(--error-light); color: var(--error-text); }
    .urgence-pill[data-level="medium"] { background: var(--warning-light); color: var(--warning-text); }

    /* Stepper */
    .stepper {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .stepper li {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      text-align: center;
    }

    .stepper li::before {
      content: '';
      position: absolute;
      top: 6px;
      left: calc(-50% + 8px);
      right: calc(50% + 8px);
      height: 2px;
      background: var(--gray-200);
    }

    .stepper li:first-child::before { display: none; }
    .stepper li.done::before, .stepper li.current::before { background: var(--primary-500); }

    .dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid var(--gray-300);
      background: var(--surface);
      z-index: 1;
    }

    .stepper li.done .dot { background: var(--primary-600); border-color: var(--primary-600); }
    .stepper li.current .dot { border-color: var(--primary-600); box-shadow: 0 0 0 4px var(--primary-100); }

    .step-label { font-size: 12px; font-weight: 600; color: var(--gray-500); }
    .stepper li.done .step-label, .stepper li.current .step-label { color: var(--text); }
    .step-date { font-variant-numeric: tabular-nums; font-size: 11px; color: var(--text-muted); }

    .block h3 {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--gray-500);
    }

    .btn { height: 38px; padding: 0 14px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid transparent; white-space: nowrap; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-primary { background: var(--primary-600); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--primary-700); }
    .btn-secondary { background: var(--surface); border-color: var(--border-strong); color: var(--gray-800); }
    .btn-secondary:hover:not(:disabled) { background: var(--gray-50); }
    .btn-success { background: var(--success); color: #fff; }
    .btn-success:hover:not(:disabled) { background: var(--success-dark); }
    .btn-danger { background: var(--error); color: #fff; }

    /* Details */
    .block { display: flex; flex-direction: column; gap: 8px; }

    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 16px;
      margin: 0;
    }

    .details dt { font-size: 12px; color: var(--text-muted); }
    .details dd { margin: 2px 0 0; font-size: 14px; font-weight: 500; color: var(--text); }

    .text {
      margin: 0;
      padding: 12px 14px;
      border-radius: 10px;
      background: var(--gray-50);
      border: 1px solid var(--border);
      white-space: pre-wrap;
      line-height: 1.55;
      font-size: 14px;
    }

    .text.report { background: var(--success-light); border-color: transparent; color: var(--success-text); }
    .text.warn { background: var(--warning-light); border-color: transparent; color: var(--warning-text); }

    .file {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      align-self: flex-start;
      padding: 8px 12px;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      background: var(--surface);
      color: var(--primary-700);
      font-size: 14px;
      cursor: pointer;
    }

    .file:hover { border-color: var(--primary-400); background: var(--primary-50); }

    .panel-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 14px 24px;
      border-top: 1px solid var(--border);
      background: var(--gray-50);
    }

    @media (max-width: 560px) {
      .details { grid-template-columns: 1fr; }
      .step-date { display: none; }
    }
  `]
})
export class InterventionDetailModalComponent implements OnInit {
  @Input() intervention: DemandeIntervention | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  readonly STATUS = STATUS;

  constructor(
    private interventionService: InterventionService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // The planning list carries a summary: reload the full work order
    if (this.intervention) this.reload(this.intervention.idDemandeIntervention);
  }

  // ------------------------------------------------------------------ state

  get status(): number { return this.intervention?.statusId ?? this.intervention?.status?.id ?? STATUS.A_TRAITER; }

  get reference(): string {
    return this.intervention ? `INT-${String(this.intervention.idDemandeIntervention).padStart(4, '0')}` : '';
  }

  get urgenceLevel(): string {
    const l = (this.intervention?.urgence?.libelle || '').toLowerCase();
    if (l.includes('haut') || l.includes('urgent') || l.includes('crit')) return 'high';
    if (l.includes('moy') || l.includes('norm')) return 'medium';
    return 'low';
  }

  get requesterName(): string {
    const d = this.intervention?.demandeur;
    return d ? `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() : '—';
  }

  get technicianName(): string {
    const d = this.intervention?.destinataire;
    return d ? `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() : '';
  }

  get repairDuration(): string | null {
    const start = this.intervention?.datePriseEnCharge;
    const end = this.intervention?.dateRealisation;
    if (!start || !end) return null;
    const minutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
  }

  get steps(): Step[] {
    const i = this.intervention;
    if (!i) return [];
    const s = this.status;
    return [
      { label: 'Déclarée', date: i.dateCreation, done: true, current: false },
      { label: 'Affectée', date: i.dateAssignation, done: !!i.destinataire || s > STATUS.A_TRAITER, current: s === STATUS.A_TRAITER && !!i.destinataire },
      { label: 'En cours', date: i.datePriseEnCharge, done: s > STATUS.EN_COURS, current: s === STATUS.EN_COURS },
      { label: 'Réalisée', date: i.dateRealisation, done: s > STATUS.REALISEE, current: s === STATUS.REALISEE },
      { label: 'Clôturée', date: i.dateCloture, done: s === STATUS.CLOTUREE, current: false }
    ];
  }

  // ---------------------------------------------------------------- actions

  close(): void {
    this.closed.emit();
  }

  openFullView(): void {
    if (!this.intervention) return;
    this.router.navigate(['/interventions/view', this.intervention.idDemandeIntervention]);
  }

  private reload(id: number): void {
    this.interventionService.getIntervention(id).subscribe({
      next: full => this.intervention = full,
      error: () => this.notificationService.error('Erreur', "Impossible de charger l'intervention")
    });
  }

  /** A workflow action succeeded: refresh the panel and the planning. */
  onActionDone(): void {
    if (this.intervention) this.reload(this.intervention.idDemandeIntervention);
    this.updated.emit();
  }

  /** The technician refused the work order: it leaves their planning. */
  onReleased(): void {
    this.updated.emit();
    this.close();
  }

  downloadFile(): void {
    if (!this.intervention) return;
    const name = this.intervention.fileName || 'piece-jointe';
    this.interventionService.downloadFile(this.intervention.idDemandeIntervention).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notificationService.error('Erreur', 'Impossible de télécharger la pièce jointe')
    });
  }
}
