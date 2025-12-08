import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InterventionService } from './services/intervention.service';
import { DemandeIntervention, PagedResult, UserInfo } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-interventions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="interventions-page">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Interventions</h1>
            <p class="page-subtitle">Gestion des demandes d'intervention</p>
          </div>
        </div>
        <button class="btn-new" routerLink="/interventions/new">
          <span class="btn-icon">+</span>
          Nouvelle intervention
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon-total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ totalCount }}</div>
            <div class="stat-label">Total</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon stat-icon-nouveau">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M12 6v6l4 2"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.nouveau }}</div>
            <div class="stat-label">Nouveau</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon stat-icon-encours">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.enCours }}</div>
            <div class="stat-label">En cours</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon stat-icon-termine">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.termine }}</div>
            <div class="stat-label">Terminé</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon stat-icon-urgent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.urgent }}</div>
            <div class="stat-label">Urgentes</div>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="table-controls">
        <div class="search-box">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            [(ngModel)]="searchTerm"
            (ngModelChange)="search()"
            placeholder="Rechercher une intervention..."
            class="search-input"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && interventions.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>Aucune intervention trouvée</h3>
        <p>Créez votre première intervention pour commencer</p>
      </div>

      <!-- Table -->
      <div *ngIf="!loading && interventions.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="th-checkbox">
                <input type="checkbox" />
              </th>
              <th class="th-sortable">
                Titre
                <svg class="sort-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m7 15 5 5 5-5"></path>
                  <path d="m7 9 5-5 5 5"></path>
                </svg>
              </th>
              <th class="th-sortable">
                Date création
                <svg class="sort-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m7 15 5 5 5-5"></path>
                  <path d="m7 9 5-5 5 5"></path>
                </svg>
              </th>
              <th>Type</th>
              <th>Urgence</th>
              <th>État</th>
              <th>Demandeur</th>
              <th *ngIf="canShowActions()">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let intervention of interventions" class="table-row">
              <td class="td-checkbox">
                <input type="checkbox" />
              </td>
              <td class="td-title" data-label="Titre">
                <div class="title-cell">
                  <strong>{{ intervention.titre }}</strong>
                  <span class="code">{{ getInterventionCode(intervention) }}</span>
                </div>
              </td>
              <td class="td-date" data-label="Date">{{ formatDate(intervention.dateCreation) }}</td>
              <td class="td-type" data-label="Type">
                <span class="type-badge">{{ intervention.typeIntervention?.libelle || intervention.type?.libelle || '-' }}</span>
              </td>
              <td class="td-urgence" data-label="Urgence">
                <span class="urgence-badge" [class.urgence-haute]="isUrgent(intervention)" [class.urgence-normale]="!isUrgent(intervention)">
                  <svg *ngIf="isUrgent(intervention)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  </svg>
                  {{ intervention.urgence?.libelle || 'Normale' }}
                </span>
              </td>
              <td class="td-etat" data-label="État">
                <span class="etat-badge" [ngClass]="getEtatClass(intervention)">
                  <span class="badge-dot"></span>
                  {{ intervention.etat?.libelle || intervention.status?.statut || 'Nouveau' }}
                </span>
              </td>
              <td class="td-demandeur" data-label="Demandeur">
                <div class="demandeur-cell">
                  <div class="avatar">{{ getInitials(intervention) }}</div>
                  <span>{{ getDemandeurName(intervention) }}</span>
                </div>
              </td>
              <td class="td-actions" data-label="Actions" *ngIf="canShowActions()">
                <div class="action-buttons">
                  <button class="btn-action btn-view" [routerLink]="['/interventions/view', intervention.idDemandeIntervention]" title="Consulter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button class="btn-action btn-edit" [routerLink]="['/interventions/edit', intervention.idDemandeIntervention]" title="Modifier">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="btn-action btn-action-danger" (click)="deleteIntervention(intervention.idDemandeIntervention)" title="Supprimer" *ngIf="canDelete()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div *ngIf="totalCount > pageSize" class="pagination">
          <button class="pagination-btn" (click)="previousPage()" [disabled]="currentPage === 1">
            Précédent
          </button>
          <span class="pagination-info">Page {{ currentPage }} sur {{ totalPages }}</span>
          <button class="pagination-btn" (click)="nextPage()" [disabled]="currentPage === totalPages">
            Suivant
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .interventions-page {
      padding: 24px;
      background: #f5f6fa;
      min-height: 100vh;
    }

    /* Header - Blue Gradient Bar Style */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding: 24px 32px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #2563eb 100%);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      width: 52px;
      height: 52px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      backdrop-filter: blur(4px);
    }

    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: white;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .page-subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.85);
      margin: 4px 0 0 0;
    }

    .btn-new {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: white;
      color: #3b82f6;
      border: none;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 540;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .btn-new:hover {
      background: #f8fafc;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .btn-icon {
      font-size: 16px;
      font-weight: 400;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon-total {
      background: #f1f5f9;
      color: #475569;
    }

    .stat-icon-nouveau {
      background: #dbeafe;
      color: #3b82f6;
    }

    .stat-icon-encours {
      background: #fef3c7;
      color: #f59e0b;
    }

    .stat-icon-termine {
      background: #d1fae5;
      color: #10b981;
    }

    .stat-icon-urgent {
      background: #fee2e2;
      color: #ef4444;
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1;
    }

    .stat-label {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }

    /* Table Controls */
    .table-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 16px;
    }

    .search-box {
      position: relative;
      flex: 1;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
    }

    .search-input {
      width: 100%;
      padding: 10px 14px 10px 42px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      background: white;
      transition: all 0.2s;
    }

    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .view-controls {
      display: flex;
      gap: 8px;
    }

    .btn-filter {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-filter:hover {
      border-color: #cbd5e1;
      background: #f8fafc;
    }

    .btn-view {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      cursor: pointer;
      color: #64748b;
      transition: all 0.2s;
    }

    .btn-view:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .btn-view.active {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
    }

    /* Loading State */
    .loading-state {
      background: white;
      border-radius: 12px;
      padding: 60px;
      text-align: center;
      color: #64748b;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      background: white;
      border-radius: 12px;
      padding: 60px;
      text-align: center;
    }

    .empty-state svg {
      color: #cbd5e1;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .empty-state p {
      color: #64748b;
      margin: 0;
    }

    /* Table */
    .table-wrapper {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table thead {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .data-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      white-space: nowrap;
    }

    .th-checkbox {
      width: 40px;
    }

    .th-checkbox input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #3b82f6;
    }

    .th-sortable {
      cursor: pointer;
      user-select: none;
    }

    .th-sortable:hover {
      color: #3b82f6;
    }

    .sort-icon {
      display: inline-block;
      vertical-align: middle;
      margin-left: 4px;
      color: #cbd5e1;
    }

    .data-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.2s;
    }

    .data-table tbody tr:hover {
      background: #f8fafc;
    }

    .data-table tbody tr:last-child {
      border-bottom: none;
    }

    .data-table td {
      padding: 16px;
      font-size: 14px;
      color: #334155;
      vertical-align: middle;
    }

    .td-checkbox input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: #3b82f6;
    }

    .title-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .title-cell strong {
      color: #0f172a;
      font-weight: 500;
    }

    .code {
      font-size: 12px;
      color: #64748b;
      font-family: 'Courier New', monospace;
    }

    .td-date {
      color: #64748b;
      font-size: 13px;
    }

    .type-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #f1f5f9;
      color: #475569;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
    }

    .urgence-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
    }

    .urgence-haute {
      background: #fee2e2;
      color: #991b1b;
    }

    .urgence-normale {
      background: #fef3c7;
      color: #92400e;
    }

    .etat-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .etat-basse {
      background: #d1fae5;
      color: #065f46;
    }

    .etat-basse .badge-dot {
      background: #10b981;
    }

    .etat-nouveau {
      background: #dbeafe;
      color: #1e40af;
    }

    .etat-nouveau .badge-dot {
      background: #3b82f6;
    }

    .etat-en-cours {
      background: #fef3c7;
      color: #92400e;
    }

    .etat-en-cours .badge-dot {
      background: #f59e0b;
    }

    .etat-termine {
      background: #d1fae5;
      color: #065f46;
    }

    .etat-termine .badge-dot {
      background: #10b981;
    }

    .demandeur-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
    }

    .btn-action {
      width: 38px;
      height: 38px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn-action svg {
      width: 20px;
      height: 20px;
    }

    .btn-action.btn-view {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .btn-action.btn-view:hover {
      background: #22c55e;
      color: white;
    }

    .btn-action.btn-edit {
      background: rgba(14, 165, 233, 0.1);
      color: #0ea5e9;
    }

    .btn-action.btn-edit:hover {
      background: #0ea5e9;
      color: white;
    }

    .btn-action.btn-action-danger {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .btn-action.btn-action-danger:hover {
      background: #ef4444;
      color: white;
    }

    .td-actions {
      text-align: center;
      width: 100px;
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .interventions-page {
        padding: 16px;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
      }

      .page-title {
        font-size: 22px;
      }

      .page-subtitle {
        font-size: 13px;
      }

      .btn-new {
        width: 100%;
        justify-content: center;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }

      .stat-card {
        padding: 16px;
        gap: 12px;
      }

      .stat-icon {
        width: 40px;
        height: 40px;
      }

      .stat-value {
        font-size: 24px;
      }

      .stat-label {
        font-size: 12px;
      }

      .table-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .search-box {
        max-width: 100%;
      }

      .view-controls {
        justify-content: space-between;
      }

      .btn-filter {
        flex: 1;
        justify-content: center;
      }

      /* Mobile Table - Card View */
      .table-wrapper {
        background: transparent;
        border: none;
        border-radius: 0;
      }

      .data-table {
        display: block;
      }

      .data-table thead {
        display: none;
      }

      .data-table tbody {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .data-table tbody tr {
        display: flex;
        flex-direction: column;
        background: white;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        padding: 16px;
        gap: 12px;
      }

      .data-table tbody tr:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .data-table td {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0;
        font-size: 14px;
        border: none;
      }

      .data-table td::before {
        content: attr(data-label);
        font-weight: 600;
        font-size: 12px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        min-width: 100px;
      }

      .td-checkbox {
        display: none !important;
      }

      .title-cell {
        align-items: flex-end;
        text-align: right;
      }

      .demandeur-cell {
        justify-content: flex-end;
      }

      .action-buttons {
        justify-content: flex-end;
        width: 100%;
        padding-top: 12px;
        border-top: 1px solid #f1f5f9;
        margin-top: 4px;
      }

      .btn-action {
        width: 36px;
        height: 36px;
        background: #f8fafc;
        border-radius: 8px;
      }
    }

    @media (max-width: 480px) {
      .interventions-page {
        padding: 12px;
      }

      .page-title {
        font-size: 20px;
      }

      .header-icon {
        width: 36px;
        height: 36px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .stat-card {
        padding: 14px;
      }

      .stat-value {
        font-size: 22px;
      }

      .data-table tbody tr {
        padding: 14px;
        gap: 10px;
      }

      .data-table td {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }

      .data-table td::before {
        font-size: 11px;
      }

      .title-cell {
        align-items: flex-start;
        text-align: left;
      }

      .demandeur-cell {
        justify-content: flex-start;
      }

      .type-badge,
      .urgence-badge,
      .etat-badge {
        font-size: 12px;
        padding: 4px 8px;
      }

      .action-buttons {
        justify-content: center;
      }
    }
  `]
})
export class InterventionsComponent implements OnInit {
  interventions: DemandeIntervention[] = [];
  loading = true;
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  viewMode: 'list' | 'grid' = 'list';
  currentUser: UserInfo | null = null;

  stats = {
    nouveau: 0,
    enCours: 0,
    termine: 0,
    urgent: 0
  };

  constructor(
    private interventionService: InterventionService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.loadInterventions();
  }

  canShowActions(): boolean {
    // Superviseur and Utilisateur can see actions, Demandeur cannot
    return this.currentUser?.role === 'Superviseur' || this.currentUser?.role === 'Utilisateur';
  }

  canDelete(): boolean {
    // Only Superviseur can delete
    return this.currentUser?.role === 'Superviseur';
  }

  loadInterventions(): void {
    this.loading = true;
    this.interventionService.getInterventions(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (result: PagedResult<DemandeIntervention>) => {
        this.interventions = result.data;
        this.totalCount = result.totalCount;
        this.calculateStats();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats = {
      nouveau: this.interventions.filter(i => this.getEtatClass(i) === 'etat-nouveau').length,
      enCours: this.interventions.filter(i => this.getEtatClass(i) === 'etat-en-cours').length,
      termine: this.interventions.filter(i => this.getEtatClass(i) === 'etat-termine').length,
      urgent: this.interventions.filter(i => this.isUrgent(i)).length
    };
  }

  search(): void {
    this.currentPage = 1;
    this.loadInterventions();
  }

  getInterventionCode(intervention: DemandeIntervention): string {
    return `INT-${String(intervention.idDemandeIntervention).padStart(3, '0')}`;
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

  isUrgent(intervention: DemandeIntervention): boolean {
    const urgence = intervention.urgence?.libelle?.toLowerCase() || '';
    return urgence.includes('haute') || urgence.includes('urgent');
  }

  getEtatClass(intervention: DemandeIntervention): string {
    const etat = intervention.etat?.libelle?.toLowerCase() || intervention.status?.statut?.toLowerCase() || '';
    
    if (etat.includes('nouveau')) return 'etat-nouveau';
    if (etat.includes('en cours') || etat.includes('encours')) return 'etat-en-cours';
    if (etat.includes('terminé') || etat.includes('termine') || etat.includes('clos')) return 'etat-termine';
    if (etat.includes('basse')) return 'etat-basse';
    
    return 'etat-nouveau';
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
