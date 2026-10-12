import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeIntervention } from '../../../core/models';
import { InterventionService } from '../services/intervention.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface Technician {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
}

const STATUS = { A_TRAITER: 1, EN_COURS: 2, REALISEE: 3, CLOTUREE: 4, ANNULEE: 5 };

/**
 * "À faire" card of a work order: the next workflow step for the current user
 * (assign, accept or refuse, complete, validate, send back, cancel).
 * Shared by the planning panel and the work-order page.
 */
@Component({
  selector: 'app-intervention-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Next action for the current user -->
    <section class="action-card" *ngIf="hasAction">
      <h3>À faire</h3>

      <!-- Supervisor: assign / reassign -->
      <div class="action" *ngIf="canAssign">
        <label for="technicien">{{ intervention?.destinataire ? 'Réaffecter à un autre technicien' : 'Affecter un technicien' }}</label>
        <div class="inline">
          <select id="technicien" [(ngModel)]="selectedTechnicianId">
            <option value="">Choisir un technicien</option>
            <option *ngFor="let tech of technicians" [value]="tech.id">{{ tech.firstName }} {{ tech.lastName }}</option>
          </select>
          <button class="btn btn-primary" (click)="assignTechnician()" [disabled]="!selectedTechnicianId || busy">
            {{ intervention?.destinataire ? 'Réaffecter' : 'Affecter' }}
          </button>
        </div>
        <p class="hint" *ngIf="intervention?.destinataire && status === STATUS.A_TRAITER">
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
  `,
  styles: [`
    :host { display: block; }

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

    .action-card h3 {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
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
  `]
})
export class InterventionActionsComponent implements OnChanges {
  @Input() intervention: DemandeIntervention | null = null;
  @Output() updated = new EventEmitter<void>();
  /** The current user no longer has access to the work order (technician refused it). */
  @Output() released = new EventEmitter<void>();

  readonly STATUS = STATUS;

  technicians: Technician[] = [];
  selectedTechnicianId = '';
  busy = false;

  showCancelForm = false;
  cancelReason = '';
  showRejectForm = false;
  rejectReason = '';
  compteRendu = '';

  private readonly currentUserId: number;
  private readonly currentUserRole: string;

  constructor(
    private interventionService: InterventionService,
    authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.currentUserId = authService.currentUser?.internalId || 0;
    this.currentUserRole = authService.currentUser?.role || '';
  }

  ngOnChanges(): void {
    if (this.isSupervisor && !this.technicians.length) {
      this.interventionService.getTechnicians().subscribe({
        next: techs => this.technicians = techs,
        error: () => this.technicians = []
      });
    }
  }

  private get isSupervisor(): boolean { return this.currentUserRole === 'Superviseur'; }

  get status(): number { return this.intervention?.statusId ?? this.intervention?.status?.id ?? STATUS.A_TRAITER; }

  get technicianName(): string {
    const d = this.intervention?.destinataire;
    return d ? `${d.prenom ?? ''} ${d.nom ?? ''}`.trim() : '';
  }

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

  /** Runs a workflow call, then lets the host reload the work order. */
  private run(call: ReturnType<InterventionService['assignTechnician']>, success: string, released = false): void {
    if (!this.intervention) return;
    this.busy = true;
    call.subscribe({
      next: () => {
        this.notificationService.success('Succès', success);
        this.busy = false;
        this.showCancelForm = this.showRejectForm = false;
        this.cancelReason = this.rejectReason = this.compteRendu = '';
        this.selectedTechnicianId = '';
        (released ? this.released : this.updated).emit();
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
      'Intervention refusée : le superviseur est prévenu.', true);
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
}
