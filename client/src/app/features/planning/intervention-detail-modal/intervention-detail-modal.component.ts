import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeIntervention } from '../../../core/models';
import { InterventionService } from '../../interventions/services/intervention.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

@Component({
  selector: 'app-intervention-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="side-panel-overlay" (click)="close()">
      <div class="side-panel" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="panel-header">
          <div class="header-left">
            <svg class="header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <div class="header-text">
              <h2>Détails de l'intervention</h2>
              <span class="intervention-code" *ngIf="intervention">#{{ getInterventionCode() }}</span>
            </div>
          </div>
          <button class="close-btn" (click)="close()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="panel-body" *ngIf="intervention">
          
          <!-- Informations Générales -->
          <div class="section-collapse">
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <h3>INFORMATIONS GÉNÉRALES</h3>
            </div>
            <div class="section-content">
              <div class="info-row">
                <svg class="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <div class="info-content">
                  <label>TITRE</label>
                  <span class="info-value">{{ intervention.titre }}</span>
                </div>
              </div>

              <div class="info-row split">
                <div class="info-col">
                  <label>TYPE</label>
                  <span class="info-value">{{ intervention.type?.libelle || 'N/A' }}</span>
                </div>
                <div class="info-col">
                  <svg class="info-icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  <div>
                    <label>URGENCE</label>
                    <span class="badge badge-urgence">{{ intervention.urgence?.libelle || 'Basse' }}</span>
                  </div>
                </div>
              </div>

              <div class="info-row split">
                <div class="info-col">
                  <svg class="info-icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01"/>
                  </svg>
                  <div>
                    <label>STATUT</label>
                    <span class="badge" [ngClass]="'badge-' + getStatusBadgeClass()">{{ intervention.status?.statut || intervention.etat?.libelle || 'N/A' }}</span>
                  </div>
                </div>
                <div class="info-col">
                  <svg class="info-icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  <div>
                    <label>DATE DE CRÉATION</label>
                    <span class="info-value">{{ formatDate(intervention.dateCreation) }}</span>
                  </div>
                </div>
              </div>

              <div class="info-row">
                <svg class="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <div class="info-content">
                  <label>DEMANDEUR</label>
                  <span class="info-value">{{ intervention.demandeurs?.email || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Détails Techniques -->
          <div class="section-collapse">
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
              </svg>
              <h3>DÉTAILS TECHNIQUES</h3>
            </div>
            <div class="section-content">
              <div class="info-row" *ngIf="intervention.chaineProduction">
                <svg class="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6"/>
                </svg>
                <div class="info-content">
                  <label>CHAÎNE DE PRODUCTION</label>
                  <span class="info-value">{{ intervention.chaineProduction.libelle }}</span>
                </div>
              </div>

              <div class="info-row" *ngIf="intervention.panne">
                <svg class="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  <path d="M12 9v4m0 4h.01"/>
                </svg>
                <div class="info-content">
                  <label>TYPE DE PANNE</label>
                  <span class="info-value">{{ intervention.panne.libelle }}</span>
                </div>
              </div>

              <div class="info-row">
                <svg class="info-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                  <path d="M12 17h.01"/>
                </svg>
                <div class="info-content">
                  <label>MACHINE ARRÊTÉE</label>
                  <span class="badge" [ngClass]="intervention.machineArrete ? 'badge-oui' : 'badge-non'">
                    {{ intervention.machineArrete ? 'Oui' : 'Non' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Assignation du Technicien -->
          <div class="section-collapse">
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h3>ASSIGNATION DU TECHNICIEN</h3>
            </div>
            <div class="section-content assignment-content">
              <div class="no-tech" *ngIf="!intervention.destinataire && !intervention.destinatairesId">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <p>Aucun technicien assigné</p>
              </div>

              <div class="assigned-tech-box" *ngIf="intervention.destinataire || intervention.destinatairesId">
                <span class="tech-name">{{ getTechnicianName() }}</span>
              </div>

              <div class="assignment-select" *ngIf="canAssignTechnician() && !isCancelled() && !isClosed()">
                <label for="technicien">
                  {{ intervention.destinataire ? 'Réassigner à' : 'Assigner à' }}
                </label>
                <select 
                  id="technicien" 
                  [(ngModel)]="selectedTechnicianId"
                  class="form-control"
                >
                  <option value="">-- Sélectionner un technicien --</option>
                  <option *ngFor="let tech of technicians" [value]="tech.id">
                    {{ tech.firstName }} {{ tech.lastName }} ({{ tech.email }})
                  </option>
                </select>
                <button 
                  class="btn btn-primary btn-assign"
                  (click)="assignTechnician()"
                  [disabled]="!selectedTechnicianId || assigning"
                >
                  <span *ngIf="!assigning">Assigner</span>
                  <span *ngIf="assigning">Assignation...</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Actions du Workflow -->
          <div class="section-collapse" *ngIf="showWorkflowActions()">
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              <h3>ACTIONS</h3>
            </div>
            <div class="section-content">
              <!-- Utilisateur actions -->
              <div class="workflow-actions" *ngIf="isUtilisateur() && isAssignedToMe()">
                
                <!-- Complete intervention (when status is "En cours") -->
                <button 
                  class="btn btn-success btn-block"
                  (click)="completeIntervention()"
                  [disabled]="updating"
                  *ngIf="canComplete()"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22,4 12,14.01 9,11.01"/>
                  </svg>
                  Marquer comme réalisée
                </button>
              </div>

              <!-- Superviseur actions -->
              <div class="workflow-actions" *ngIf="isSuperviseur()">
                <!-- Close intervention (when status is "Réalisée") -->
                <button 
                  class="btn btn-success btn-block"
                  (click)="closeIntervention()"
                  [disabled]="updating"
                  *ngIf="canClose()"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 8v13H3V8M1 3h22v5H1z"/>
                    <path d="M10 12h4"/>
                  </svg>
                  Clôturer l'intervention
                </button>
              </div>

              <!-- Cancel button (for Superviseur and Utilisateur when not already cancelled/closed) -->
              <div class="workflow-actions cancel-section" *ngIf="canCancel()">
                <hr class="action-divider" *ngIf="canStart() || canComplete() || canClose()">
                <div class="cancel-form" *ngIf="showCancelForm">
                  <label for="cancelReason">Raison de l'annulation</label>
                  <textarea 
                    id="cancelReason" 
                    [(ngModel)]="cancelReason"
                    class="form-control"
                    rows="3"
                    placeholder="Expliquez pourquoi cette intervention est annulée..."
                  ></textarea>
                  <div class="cancel-buttons">
                    <button class="btn btn-secondary" (click)="showCancelForm = false">Annuler</button>
                    <button 
                      class="btn btn-danger" 
                      (click)="cancelIntervention()"
                      [disabled]="!cancelReason.trim() || updating"
                    >
                      Confirmer l'annulation
                    </button>
                  </div>
                </div>
                <button 
                  class="btn btn-outline-danger btn-block"
                  (click)="showCancelForm = true"
                  *ngIf="!showCancelForm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M15 9l-6 6M9 9l6 6"/>
                  </svg>
                  Annuler l'intervention
                </button>
              </div>
            </div>
          </div>

          <!-- Raison d'annulation (if cancelled) -->
          <div class="section-collapse" *ngIf="isCancelled() && intervention.raisonAnnulation">
            <div class="section-header section-header-danger">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
              <h3>RAISON DE L'ANNULATION</h3>
            </div>
            <div class="section-content">
              <p class="cancel-reason-text">{{ intervention.raisonAnnulation }}</p>
            </div>
          </div>

          <div class="section-collapse" *ngIf="intervention.fichierJoint">
            <div class="section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
              <h3>FICHIER JOINT</h3>
            </div>
            <div class="section-content">
              <a [href]="getFileUrl()" target="_blank" class="file-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
                {{ intervention.fichierJoint }}
              </a>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="panel-footer">
          <button class="btn btn-secondary" (click)="close()">Fermer</button>
          <button class="btn btn-primary" (click)="close()">Modifier</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Overlay */
    .side-panel-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 2000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Side Panel */
    .side-panel {
      position: fixed;
      top: 0;
      right: 0;
      height: 100vh;
      width: 557px;
      background: white;
      box-shadow: -8px 0 24px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 2001;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    /* Header */
    .panel-header {
      background: #3b5998;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-icon {
      flex-shrink: 0;
    }

    .header-text h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 410;
      line-height: 1.3;
      color: white;
    }

    .intervention-code {
      font-size: 11px;
      opacity: 0.9;
      margin: 0;
      font-weight: 400;
    }

    .close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.9;
      transition: opacity 0.2s;
    }

    .close-btn:hover {
      opacity: 1;
    }

    /* Body */
    .panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background: #f5f6fa;
    }

    .panel-body::-webkit-scrollbar {
      width: 6px;
    }

    .panel-body::-webkit-scrollbar-track {
      background: transparent;
    }

    .panel-body::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 10px;
    }

    /* Section Collapse */
    .section-collapse {
      border-bottom: 1px solid #e2e8f0;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      background: white;
      cursor: pointer;
      user-select: none;
    }

    .section-header svg {
      color: #3b5998;
      flex-shrink: 0;
    }

    .section-header h3 {
      margin: 0;
      font-size: 11px;
      font-weight: 600;
      color: #3b5998;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .section-content {
      padding: 1.25rem 1.5rem;
      background: white;
    }

    /* Info Row */
    .info-row {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f1f3f5;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-row.split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .info-col {
      display: flex;
      gap: 0.5rem;
    }

    .info-icon {
      color: #64748b;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .info-icon-inline {
      color: #64748b;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .info-content {
      flex: 1;
      min-width: 0;
    }

    .info-row label,
    .info-col label {
      display: block;
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.375rem;
    }

    .info-value {
      display: block;
      font-size: 13px;
      color: #1e293b;
      font-weight: 400;
      line-height: 1.4;
      word-break: break-word;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      line-height: 1.3;
    }

    .badge-urgence,
    .badge-nouveau {
      background: #e0f2fe;
      color: #0369a1;
    }

    .badge-en-cours {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-termine {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-oui {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-non {
      background: #e5e7eb;
      color: #4b5563;
    }

    /* Assignment Content */
    .assignment-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .no-tech {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      text-align: center;
    }

    .no-tech svg {
      color: #cbd5e1;
      margin-bottom: 0.75rem;
    }

    .no-tech p {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }

    .assigned-tech-box {
      width: 100%;
      text-align: center;
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }

    .tech-name {
      font-size: 13px;
      color: #1e293b;
      font-weight: 400;
    }

    .assignment-select {
      width: 100%;
    }

    .assignment-select label {
      display: block;
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .form-control {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 13px;
      color: #1e293b;
      background: white;
      margin-bottom: 0.75rem;
    }

    .form-control:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .btn-assign {
      width: 100%;
    }

    .assignment-actions {
      display: flex;
      gap: 0.5rem;
      width: 100%;
    }

    /* File Link */
    .file-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      color: #3b5998;
      text-decoration: none;
      font-size: 13px;
      transition: background 0.2s;
    }

    .file-link:hover {
      background: #f1f5f9;
    }

    .file-link svg {
      flex-shrink: 0;
    }

    /* Workflow Actions */
    .workflow-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
    }

    .btn-block {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .action-divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 1rem 0;
    }

    .cancel-section {
      margin-top: 0.5rem;
    }

    .cancel-form {
      width: 100%;
    }

    .cancel-form label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .cancel-form textarea {
      resize: none;
    }

    .cancel-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
      justify-content: flex-end;
    }

    .btn-outline-danger {
      background: transparent;
      color: #dc2626;
      border: 1px solid #dc2626;
    }

    .btn-outline-danger:hover {
      background: #fef2f2;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
    }

    .section-header-danger {
      background: #fef2f2 !important;
    }

    .section-header-danger svg {
      color: #dc2626 !important;
    }

    .section-header-danger h3 {
      color: #dc2626 !important;
    }

    .cancel-reason-text {
      margin: 0;
      font-size: 13px;
      color: #991b1b;
      line-height: 1.5;
      background: #fef2f2;
      padding: 0.75rem;
      border-radius: 4px;
      border-left: 3px solid #dc2626;
    }

    /* Badge colors for status */
    .badge-a-traiter,
    .badge-nouveau {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge-en-cours {
      background: #fef3c7;
      color: #92400e;
    }

    .badge-realisee,
    .badge-réalisée {
      background: #ffedd5;
      color: #c2410c;
    }

    .badge-cloturee,
    .badge-clôturée {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-annulee,
    .badge-annulée {
      background: #fee2e2;
      color: #991b1b;
    }

    /* Footer */
    .panel-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: white;
      flex-shrink: 0;
    }

    /* Buttons */
    .btn {
      padding: 0.625rem 1.25rem;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
      white-space: nowrap;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #4a90e2;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #357abd;
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #475569;
    }

    .btn-secondary:hover {
      background: #cbd5e1;
    }

    .btn-warning {
      background: #fbbf24;
      color: #78350f;
    }

    .btn-warning:hover:not(:disabled) {
      background: #f59e0b;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #059669;
    }

    /* Accept/Reject Section */
    .accept-reject-section {
      width: 100%;
    }

    .pending-message {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .pending-message svg {
      flex-shrink: 0;
      color: #ea580c;
    }

    .pending-message span {
      font-size: 13px;
      color: #9a3412;
    }

    .accept-reject-buttons {
      display: flex;
      gap: 0.75rem;
      width: 100%;
    }

    .accept-reject-buttons .btn {
      flex: 1;
    }

    .reject-form {
      margin-top: 1rem;
      padding: 1rem;
      background: #fef2f2;
      border-radius: 8px;
      border: 1px solid #fecaca;
    }

    .reject-form label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #991b1b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .reject-form textarea {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid #fca5a5;
      border-radius: 4px;
      font-size: 13px;
      resize: none;
      background: white;
    }

    .reject-form textarea:focus {
      outline: none;
      border-color: #dc2626;
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
    }

    .reject-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
      justify-content: flex-end;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .side-panel {
        width: 100%;
        max-width: 100%;
      }

      .info-row.split {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
    }
  `]
})
export class InterventionDetailModalComponent implements OnInit {
  @Input() intervention: DemandeIntervention | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  technicians: User[] = [];
  selectedTechnicianId: string = '';
  assigning = false;
  updating = false;
  currentUserId: number = 0;
  currentUserRole: string = '';
  
  // Cancel form
  showCancelForm = false;
  cancelReason = '';
  
  // Reject form
  showRejectForm = false;
  rejectReason = '';

  constructor(
    private interventionService: InterventionService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadTechnicians();
    this.currentUserId = this.authService.currentUser?.internalId || 0;
    this.currentUserRole = this.authService.currentUser?.role || '';
  }

  close(): void {
    this.closed.emit();
  }

  loadTechnicians(): void {
    this.interventionService.getTechnicians().subscribe({
      next: (techs) => {
        this.technicians = techs;
      },
      error: (err) => {
        console.error('Error loading technicians:', err);
      }
    });
  }

  canAssignTechnician(): boolean {
    return this.isSuperviseur();
  }

  isSuperviseur(): boolean {
    return this.currentUserRole === 'Superviseur';
  }

  isUtilisateur(): boolean {
    return this.currentUserRole === 'Utilisateur';
  }

  isAssignedToMe(): boolean {
    // Check destinatairesId/destinatairesID first
    const destId = this.intervention?.destinatairesId || this.intervention?.destinatairesID;
    if (destId) {
      return destId === this.currentUserId;
    }
    // Fallback: check destinataire object's ID
    const destObjId = this.intervention?.destinataire?.id || this.intervention?.destinataire?.ID;
    return destObjId === this.currentUserId;
  }

  getTechnicianName(): string {
    if (this.intervention?.destinataire) {
      const d = this.intervention.destinataire;
      return `${d.prenom || ''} ${d.nom || ''}`.trim() || 'Assigné';
    }
    const destId = this.intervention?.destinatairesId || this.intervention?.destinatairesID;
    const tech = this.technicians.find(t => t.id === String(destId));
    return tech ? `${tech.firstName} ${tech.lastName}` : 'Assigné';
  }

  getInterventionCode(): string {
    if (!this.intervention) return '';
    return `INTF-${this.intervention.idDemandeIntervention.toString().padStart(4, '0')}`;
  }

  // Status helpers
  getStatusName(): string {
    return (this.intervention?.status?.statut || this.intervention?.etat?.libelle || '').toLowerCase();
  }

  getStatusBadgeClass(): string {
    const status = this.getStatusName();
    if (status.includes('traiter') || status.includes('nouveau')) return 'a-traiter';
    if (status.includes('cours')) return 'en-cours';
    if (status.includes('réalisée') || status.includes('realisee')) return 'realisee';
    if (status.includes('clôturée') || status.includes('cloturee')) return 'cloturee';
    if (status.includes('annulée') || status.includes('annulee')) return 'annulee';
    return 'nouveau';
  }

  isCancelled(): boolean {
    const status = this.getStatusName();
    return status.includes('annul');
  }

  isClosed(): boolean {
    const status = this.getStatusName();
    return status.includes('clôtur') || status.includes('clotur');
  }

  // Workflow checks
  showWorkflowActions(): boolean {
    if (this.isCancelled() || this.isClosed()) return false;
    
    if (this.isSuperviseur()) {
      return this.canClose() || this.canCancel();
    }
    
    if (this.isUtilisateur() && this.isAssignedToMe()) {
      return this.canComplete() || this.canCancel();
    }
    
    return false;
  }

  // Check if intervention is assigned but not yet accepted by the technician
  isPendingAcceptance(): boolean {
    if (!this.intervention) return false;
    // Assigned to me, status is "A traiter", and not yet taken (datePriseEnCharge is null)
    return this.isAssignedToMe() && 
           this.canStart() && 
           !this.intervention.datePriseEnCharge;
  }

  canStart(): boolean {
    const status = this.getStatusName();
    return status.includes('traiter') || status.includes('nouveau') || status.includes('attente');
  }

  canComplete(): boolean {
    const status = this.getStatusName();
    return status.includes('cours');
  }

  canClose(): boolean {
    const status = this.getStatusName();
    return (status.includes('réalisée') || status.includes('realisee')) && this.isSuperviseur();
  }

  canCancel(): boolean {
    if (this.isCancelled() || this.isClosed()) return false;
    return this.isSuperviseur() || (this.isUtilisateur() && this.isAssignedToMe());
  }

  assignTechnician(): void {
    if (!this.selectedTechnicianId || !this.intervention) return;

    this.assigning = true;
    this.interventionService.assignTechnician(
      this.intervention.idDemandeIntervention,
      this.selectedTechnicianId
    ).subscribe({
      next: () => {
        this.notificationService.success(
          'Succès',
          'Technicien assigné avec succès'
        );
        this.assigning = false;
        this.updated.emit();
      },
      error: (err) => {
        this.notificationService.error(
          'Erreur',
          'Erreur lors de l\'assignation du technicien'
        );
        this.assigning = false;
      }
    });
  }

  acceptIntervention(): void {
    if (!this.intervention) return;

    this.updating = true;
    this.interventionService.acceptIntervention(
      this.intervention.idDemandeIntervention
    ).subscribe({
      next: () => {
        this.notificationService.success(
          'Succès',
          'Intervention acceptée'
        );
        this.updating = false;
        this.updated.emit();
      },
      error: () => {
        this.notificationService.error(
          'Erreur',
          'Erreur lors de l\'acceptation de l\'intervention'
        );
        this.updating = false;
      }
    });
  }

  rejectIntervention(): void {
    if (!this.intervention || !this.rejectReason.trim()) return;

    this.updating = true;
    this.interventionService.rejectIntervention(
      this.intervention.idDemandeIntervention,
      this.rejectReason
    ).subscribe({
      next: () => {
        this.notificationService.success(
          'Succès',
          'Intervention refusée'
        );
        this.updating = false;
        this.showRejectForm = false;
        this.rejectReason = '';
        this.updated.emit();
      },
      error: () => {
        this.notificationService.error(
          'Erreur',
          'Erreur lors du refus de l\'intervention'
        );
        this.updating = false;
      }
    });
  }

  startIntervention(): void {
    if (!this.intervention) return;

    this.updating = true;
    this.interventionService.updateStatus(
      this.intervention.idDemandeIntervention,
      2 // En cours
    ).subscribe({
      next: () => {
        this.notificationService.success(
          'Succès',
          'Intervention démarrée'
        );
        this.updating = false;
        this.updated.emit();
      },
      error: () => {
        this.notificationService.error(
          'Erreur',
          'Erreur lors du démarrage de l\'intervention'
        );
        this.updating = false;
      }
    });
  }

  completeIntervention(): void {
    if (!this.intervention) return;

    this.updating = true;
    this.interventionService.updateStatus(
      this.intervention.idDemandeIntervention,
      3 // Réalisée
    ).subscribe({
      next: () => {
        this.notificationService.success(
          'Succès',
          'Intervention marquée comme réalisée'
        );
        this.updating = false;
        this.updated.emit();
      },
      error: () => {
        this.notificationService.error(
          'Erreur',
          'Erreur lors de la finalisation de l\'intervention'
        );
        this.updating = false;
      }
    });
  }

  closeIntervention(): void {
    if (!this.intervention) return;

    this.updating = true;
    this.interventionService.updateStatus(
      this.intervention.idDemandeIntervention,
      4 // Cloturée
    ).subscribe({
      next: () => {
        this.notificationService.success(
          'Succès',
          'Intervention clôturée avec succès'
        );
        this.updating = false;
        this.updated.emit();
      },
      error: () => {
        this.notificationService.error(
          'Erreur',
          'Erreur lors de la clôture de l\'intervention'
        );
        this.updating = false;
      }
    });
  }

  cancelIntervention(): void {
    if (!this.intervention || !this.cancelReason.trim()) return;

    this.updating = true;
    this.interventionService.cancelIntervention(
      this.intervention.idDemandeIntervention,
      this.cancelReason
    ).subscribe({
      next: () => {
        this.notificationService.success(
          'Succès',
          'Intervention annulée'
        );
        this.updating = false;
        this.showCancelForm = false;
        this.cancelReason = '';
        this.updated.emit();
      },
      error: () => {
        this.notificationService.error(
          'Erreur',
          'Erreur lors de l\'annulation de l\'intervention'
        );
        this.updating = false;
      }
    });
  }

  getStatusClass(): string {
    return this.getStatusBadgeClass();
  }

  isUrgent(): boolean {
    return this.intervention?.urgence?.libelle?.toLowerCase().includes('urgent') || false;
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFileUrl(): string {
    return `/api/files/${this.intervention?.fichierJoint}`;
  }
}
