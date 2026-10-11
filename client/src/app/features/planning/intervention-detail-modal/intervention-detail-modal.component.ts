import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DemandeIntervention } from '../../../core/models';
import { InterventionService } from '../../interventions/services/intervention.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface Technician {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
}

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
  imports: [CommonModule, FormsModule],
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

          <!-- Next action for the current user -->
          <section class="action-card" *ngIf="hasAction">
            <h3>À faire</h3>

            <!-- Supervisor: assign / reassign -->
            <div class="action" *ngIf="canAssign">
              <label for="technicien">{{ intervention.destinataire ? 'Réaffecter à un autre technicien' : 'Affecter un technicien' }}</label>
              <div class="inline">
                <select id="technicien" [(ngModel)]="selectedTechnicianId">
                  <option value="">Choisir un technicien</option>
                  <option *ngFor="let tech of technicians" [value]="tech.id">{{ tech.firstName }} {{ tech.lastName }}</option>
                </select>
                <button class="btn btn-primary" (click)="assignTechnician()" [disabled]="!selectedTechnicianId || busy">
                  {{ intervention.destinataire ? 'Réaffecter' : 'Affecter' }}
                </button>
              </div>
              <p class="hint" *ngIf="intervention.destinataire && status === STATUS.A_TRAITER">
                En attente d'acceptation par {{ technicianName }}.
              </p>
            </div>

            <!-- Technician: accept or refuse the assignment -->
            <div class="action" *ngIf="canAccept">
              <p class="hint">Cette intervention vous a été affectée. Acceptez-la pour la démarrer.</p>
              <div class="inline" *ngIf="!showRejectForm">
                <button class="btn btn-primary" (click)="acceptIntervention()" [disabled]="busy">Accepter et démarrer</button>
                <button class="btn btn-secondary" (click)="showRejectForm = true" [disabled]="busy">Refuser</button>
              </div>
              <div class="stacked" *ngIf="showRejectForm">
                <textarea [(ngModel)]="rejectReason" rows="2" placeholder="Motif du refus (indisponible, compétence, pièce manquante…)"></textarea>
                <div class="inline end">
                  <button class="btn btn-secondary" (click)="showRejectForm = false">Retour</button>
                  <button class="btn btn-danger" (click)="rejectIntervention()" [disabled]="!rejectReason.trim() || busy">Confirmer le refus</button>
                </div>
              </div>
            </div>

            <!-- Technician: complete with a work report -->
            <div class="action" *ngIf="canComplete">
              <label for="compteRendu">Compte rendu d'intervention <span class="required">*</span></label>
              <textarea id="compteRendu" [(ngModel)]="compteRendu" rows="4" maxlength="2000"
                        placeholder="Travaux réalisés, cause identifiée, pièces remplacées, essais effectués…"></textarea>
              <div class="inline between">
                <small class="counter" [class.ok]="compteRendu.trim().length >= 10">{{ compteRendu.trim().length }} / 10 caractères minimum</small>
                <button class="btn btn-success" (click)="completeIntervention()" [disabled]="compteRendu.trim().length < 10 || busy">Marquer comme réalisée</button>
              </div>
            </div>

            <!-- Supervisor: validate the work -->
            <div class="action" *ngIf="canClose">
              <p class="hint">Le technicien a terminé. Vérifiez le compte rendu ci-dessous avant de clôturer.</p>
              <div class="inline">
                <button class="btn btn-success" (click)="closeIntervention()" [disabled]="busy">Valider et clôturer</button>
                <button class="btn btn-secondary" (click)="reopenIntervention()" [disabled]="busy">Renvoyer au technicien</button>
              </div>
            </div>

            <!-- Cancel -->
            <div class="cancel-zone" *ngIf="canCancel">
              <button class="link-danger" *ngIf="!showCancelForm" (click)="showCancelForm = true">Annuler cette intervention</button>
              <div class="stacked" *ngIf="showCancelForm">
                <textarea [(ngModel)]="cancelReason" rows="2" placeholder="Motif de l'annulation (doublon, erreur de saisie, panne résolue…)"></textarea>
                <div class="inline end">
                  <button class="btn btn-secondary" (click)="showCancelForm = false">Retour</button>
                  <button class="btn btn-danger" (click)="cancelIntervention()" [disabled]="!cancelReason.trim() || busy">Confirmer l'annulation</button>
                </div>
              </div>
            </div>
          </section>

          <!-- Details -->
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

          <section class="block" *ngIf="intervention.compteRendu">
            <h3>Compte rendu du technicien</h3>
            <p class="text report">{{ intervention.compteRendu }}</p>
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
      font-family: var(--font-mono);
      font-size: 12.5px;
      color: var(--text-muted);
    }

    .panel-header h2 {
      margin: 4px 0 0;
      font-size: 18px;
      font-weight: 700;
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
    .step-date { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }

    /* Action card */
    .action-card {
      padding: 16px;
      border: 1px solid var(--primary-200);
      border-radius: 12px;
      background: var(--primary-50);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .action-card h3, .block h3 {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--gray-500);
    }

    .action-card h3 { color: var(--primary-700); }

    .action { display: flex; flex-direction: column; gap: 8px; }
    .action label { margin: 0; font-size: 13.5px; font-weight: 600; color: var(--text); }
    .required { color: var(--error); }

    .inline { display: flex; gap: 8px; align-items: center; }
    .inline.end { justify-content: flex-end; }
    .inline.between { justify-content: space-between; }
    .inline select { flex: 1; }
    .stacked { display: flex; flex-direction: column; gap: 8px; }

    select, textarea {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      background: var(--surface);
      font: inherit;
      font-size: 14px;
      color: var(--text);
    }

    textarea { resize: vertical; min-height: 0; }
    select:focus, textarea:focus { outline: none; border-color: var(--primary-500); box-shadow: var(--focus-ring); }

    .hint { margin: 0; font-size: 13.5px; color: var(--text-secondary); }
    .counter { font-size: 12px; color: var(--text-muted); }
    .counter.ok { color: var(--success); }

    .cancel-zone { padding-top: 10px; border-top: 1px dashed var(--primary-200); }

    .link-danger {
      padding: 0;
      border: 0;
      background: none;
      color: var(--error);
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
    }

    .link-danger:hover { text-decoration: underline; }

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

  technicians: Technician[] = [];
  selectedTechnicianId = '';
  busy = false;

  showCancelForm = false;
  cancelReason = '';
  showRejectForm = false;
  rejectReason = '';
  compteRendu = '';

  private currentUserId = 0;
  private currentUserRole = '';

  constructor(
    private interventionService: InterventionService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.currentUser?.internalId || 0;
    this.currentUserRole = this.authService.currentUser?.role || '';

    // The planning list carries a summary: reload the full work order
    if (this.intervention) this.reload(this.intervention.idDemandeIntervention);
    if (this.isSupervisor) {
      this.interventionService.getTechnicians().subscribe({
        next: techs => this.technicians = techs,
        error: () => this.technicians = []
      });
    }
  }

  // ------------------------------------------------------------------ state

  private get isSupervisor(): boolean { return this.currentUserRole === 'Superviseur'; }

  get status(): number { return this.intervention?.statusId ?? this.intervention?.status?.id ?? STATUS.A_TRAITER; }

  private get assignedToMe(): boolean {
    const id = this.intervention?.destinatairesID ?? this.intervention?.destinatairesId ?? this.intervention?.destinataire?.id;
    return !!id && id === this.currentUserId;
  }

  get canAssign(): boolean {
    return this.isSupervisor && (this.status === STATUS.A_TRAITER || this.status === STATUS.EN_COURS);
  }

  get canAccept(): boolean {
    return this.assignedToMe && this.status === STATUS.A_TRAITER && !this.intervention?.datePriseEnCharge;
  }

  get canComplete(): boolean {
    return this.assignedToMe && this.status === STATUS.EN_COURS;
  }

  get canClose(): boolean {
    return this.isSupervisor && this.status === STATUS.REALISEE;
  }

  get canCancel(): boolean {
    if (this.status === STATUS.CLOTUREE || this.status === STATUS.ANNULEE) return false;
    if (this.isSupervisor) return true;
    return this.intervention?.demandeursID === this.currentUserId
      && this.status === STATUS.A_TRAITER && !this.intervention?.datePriseEnCharge;
  }

  get hasAction(): boolean {
    return this.canAssign || this.canAccept || this.canComplete || this.canClose || this.canCancel;
  }

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

  /** Runs a workflow call, then refreshes the panel and the planning. */
  private run(call: ReturnType<InterventionService['assignTechnician']>, success: string): void {
    if (!this.intervention) return;
    const id = this.intervention.idDemandeIntervention;
    this.busy = true;
    call.subscribe({
      next: () => {
        this.notificationService.success('Succès', success);
        this.busy = false;
        this.showCancelForm = this.showRejectForm = false;
        this.cancelReason = this.rejectReason = this.compteRendu = '';
        this.selectedTechnicianId = '';
        this.reload(id);
        this.updated.emit();
      },
      error: (err) => {
        this.notificationService.error('Action impossible', err?.error?.message || 'Veuillez réessayer.');
        this.busy = false;
      }
    });
  }

  assignTechnician(): void {
    if (!this.intervention || !this.selectedTechnicianId) return;
    this.run(this.interventionService.assignTechnician(this.intervention.idDemandeIntervention, this.selectedTechnicianId),
      'Technicien affecté : il doit maintenant accepter l\'intervention.');
  }

  acceptIntervention(): void {
    if (!this.intervention) return;
    this.run(this.interventionService.acceptIntervention(this.intervention.idDemandeIntervention), 'Intervention démarrée.');
  }

  rejectIntervention(): void {
    if (!this.intervention || !this.rejectReason.trim()) return;
    this.run(this.interventionService.rejectIntervention(this.intervention.idDemandeIntervention, this.rejectReason.trim()),
      'Intervention refusée : le superviseur est prévenu.');
  }

  completeIntervention(): void {
    if (!this.intervention || this.compteRendu.trim().length < 10) return;
    this.run(this.interventionService.updateStatus(this.intervention.idDemandeIntervention, STATUS.REALISEE, this.compteRendu.trim()),
      'Intervention réalisée : en attente de validation.');
  }

  closeIntervention(): void {
    if (!this.intervention) return;
    this.run(this.interventionService.updateStatus(this.intervention.idDemandeIntervention, STATUS.CLOTUREE), 'Intervention clôturée.');
  }

  reopenIntervention(): void {
    if (!this.intervention) return;
    this.run(this.interventionService.updateStatus(this.intervention.idDemandeIntervention, STATUS.EN_COURS),
      'Intervention renvoyée au technicien.');
  }

  cancelIntervention(): void {
    if (!this.intervention || !this.cancelReason.trim()) return;
    this.run(this.interventionService.cancelIntervention(this.intervention.idDemandeIntervention, this.cancelReason.trim()), 'Intervention annulée.');
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
