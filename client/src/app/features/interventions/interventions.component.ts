import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  template: `
    <div class="interventions-page">
      <!-- Header Section -->
      <app-page-header icon="interventions" title="Interventions" subtitle="Demandes, affectations et suivi des travaux de maintenance">
        <button class="btn-new" routerLink="/interventions/new">
          <span class="btn-icon">+</span>
          Nouvelle intervention
        </button>
      </app-page-header>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon-total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
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
            <div class="stat-label">À traiter</div>
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
            <div class="stat-label">Réalisées / clôturées</div>
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
              <th>Localisation</th>
              <th>Urgence</th>
              <th>Statut</th>
              <th>Demandeur</th>
              <th>Actions</th>
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
              <td class="td-location" data-label="Localisation">
                <div class="location-cell">
                  <strong *ngIf="intervention.equipement">{{ intervention.equipement.codeEquipement }}</strong>
                  <span>{{ intervention.chaineProduction?.libelle || '-' }}</span>
                </div>
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
                  {{ intervention.status?.statut || '-' }}
                </span>
              </td>
              <td class="td-demandeur" data-label="Demandeur">
                <div class="demandeur-cell">
                  <div class="avatar">{{ getInitials(intervention) }}</div>
                  <span>{{ getDemandeurName(intervention) }}</span>
                </div>
              </td>
              <td class="td-actions" data-label="Actions">
                <div class="action-buttons">
                  <button class="btn-action btn-view" [routerLink]="['/interventions/view', intervention.idDemandeIntervention]" title="Consulter">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button class="btn-action btn-edit" [routerLink]="['/interventions/edit', intervention.idDemandeIntervention]" title="Modifier" *ngIf="canEdit(intervention)">
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
      width: 100%;
    }

    /* Page header: title on the page, primary action on the right */
    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      display: none;
    }

    .page-title {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.015em;
      color: var(--text);
    }

    .page-subtitle {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .btn-new {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 14px;
      background: var(--primary-600);
      color: #fff;
      border: 1px solid var(--primary-600);
      border-radius: var(--radius);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease;
      text-decoration: none;
      white-space: nowrap;
    }

    .btn-new:hover {
      background: var(--primary-700);
      border-color: var(--primary-700);
      color: #fff;
    }

    .btn-icon {
      font-size: 18px;
      font-weight: 400;
      line-height: 1;
      margin-top: -2px;
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
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid var(--gray-200);
      transition: all 0.2s;
    }

    .stat-card:hover {
      transform: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon-total {
      background: var(--gray-100);
      color: var(--gray-600);
    }

    .stat-icon-nouveau {
      background: var(--primary-100);
      color: var(--primary-600);
    }

    .stat-icon-encours {
      background: var(--warning-light);
      color: var(--warning);
    }

    .stat-icon-termine {
      background: var(--success-light);
      color: var(--success);
    }

    .stat-icon-urgent {
      background: var(--error-light);
      color: var(--error);
    }

    .stat-content {
      flex: 1;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 600;
      color: var(--gray-800);
      line-height: 1;
    }

    .stat-label {
      font-size: 13px;
      color: var(--gray-500);
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
      color: var(--gray-400);
    }

    .search-input {
      width: 100%;
      padding: 10px 14px 10px 42px;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius);
      font-size: 14px;
      background: white;
      transition: all 0.2s;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--primary-600);
      box-shadow: 0 0 0 3px rgba(61, 96, 220, 0.1);
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
      border: 1px solid var(--gray-200);
      border-radius: var(--radius);
      font-size: 14px;
      color: var(--gray-600);
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-filter:hover {
      border-color: var(--gray-300);
      background: var(--gray-50);
    }

    .btn-view {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border: 1px solid var(--gray-200);
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--gray-500);
      transition: all 0.2s;
    }

    .btn-view:hover {
      background: var(--gray-50);
      border-color: var(--gray-300);
    }

    .btn-view.active {
      background: var(--primary-600);
      border-color: var(--primary-600);
      color: white;
    }

    /* Loading State */
    .loading-state {
      background: white;
      border-radius: var(--radius-lg);
      padding: 60px;
      text-align: center;
      color: var(--gray-500);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 2.5px solid var(--primary-100);
      border-top-color: var(--primary-600);
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      will-change: transform;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      background: white;
      border-radius: var(--radius-lg);
      padding: 60px;
      text-align: center;
    }

    .empty-state svg {
      color: var(--gray-300);
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--gray-800);
      margin: 0 0 8px 0;
    }

    .empty-state p {
      color: var(--gray-500);
      margin: 0;
    }

    /* Table */
    .table-wrapper {
      background: white;
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table thead {
      background: var(--gray-50);
      border-bottom: 1px solid var(--gray-200);
    }

    .data-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: var(--gray-600);
      white-space: nowrap;
    }

    .th-checkbox {
      width: 40px;
    }

    .th-checkbox input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--primary-600);
    }

    .th-sortable {
      cursor: pointer;
      user-select: none;
    }

    .th-sortable:hover {
      color: var(--primary-600);
    }

    .sort-icon {
      display: inline-block;
      vertical-align: middle;
      margin-left: 4px;
      color: var(--gray-300);
    }

    .data-table tbody tr {
      border-bottom: 1px solid var(--gray-100);
      transition: background 0.2s;
    }

    .data-table tbody tr:hover {
      background: var(--gray-50);
    }

    .data-table tbody tr:last-child {
      border-bottom: none;
    }

    .data-table td {
      padding: 16px;
      font-size: 14px;
      color: var(--gray-700);
      vertical-align: middle;
    }

    .td-checkbox input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--primary-600);
    }

    .title-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .title-cell strong {
      color: var(--gray-900);
      font-weight: 500;
    }

    .code {
      font-size: 12px;
      color: var(--gray-500);
      font-family: var(--font-mono);
    }

    .td-date {
      color: var(--gray-500);
      font-size: 13px;
    }

    .type-badge {
      display: inline-block;
      padding: 4px 10px;
      background: var(--gray-100);
      color: var(--gray-600);
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
      background: var(--error-light);
      color: var(--error-text);
    }

    .urgence-normale {
      background: var(--warning-light);
      color: var(--warning-text);
    }

    .etat-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      border-radius: var(--radius-lg);
      font-size: 13px;
      font-weight: 500;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .etat-basse {
      background: var(--success-light);
      color: var(--success-text);
    }

    .etat-basse .badge-dot {
      background: var(--success);
    }

    .etat-nouveau {
      background: var(--primary-100);
      color: var(--primary-800);
    }

    .etat-nouveau .badge-dot {
      background: var(--primary-600);
    }

    .etat-en-cours {
      background: var(--warning-light);
      color: var(--warning-text);
    }

    .etat-en-cours .badge-dot {
      background: var(--warning);
    }

    .etat-termine {
      background: var(--success-light);
      color: var(--success-text);
    }

    .etat-termine .badge-dot {
      background: var(--success);
    }

    .demandeur-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: var(--radius);
      background: var(--primary-600);
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
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .btn-action svg {
      width: 20px;
      height: 20px;
    }

    .btn-action.btn-view {
      background: rgba(46, 125, 79, 0.1);
      color: var(--success);
    }

    .btn-action.btn-view:hover {
      background: var(--success);
      color: white;
    }

    .btn-action.btn-edit {
      background: rgba(61, 96, 220, 0.1);
      color: var(--primary-600);
    }

    .btn-action.btn-edit:hover {
      background: var(--primary-600);
      color: white;
    }

    .btn-action.btn-action-danger {
      background: rgba(194, 58, 43, 0.1);
      color: var(--error);
    }

    .btn-action.btn-action-danger:hover {
      background: var(--error);
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
        padding: 0;
      }

      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .header-icon {
        width: 40px;
        height: 40px;
        border-radius: var(--radius);
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
        border-radius: var(--radius-lg);
        border: 1px solid var(--gray-200);
        padding: 16px;
        gap: 12px;
      }

      .data-table tbody tr:hover {
        transform: none;
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
        color: var(--gray-500);
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
        border-top: 1px solid var(--gray-100);
        margin-top: 4px;
      }

      .btn-action {
        width: 36px;
        height: 36px;
        background: var(--gray-50);
        border-radius: var(--radius);
      }
    }

    @media (max-width: 480px) {
      .interventions-page {
        padding: 0;
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

    /* ---- Status-board KPI strip (replaces tinted icon cards) ---- */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0;
      margin-bottom: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .stats-grid .stat-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 14px 18px 16px;
      background: transparent;
      border: 0;
      border-left: 1px solid var(--border);
      border-radius: 0;
      box-shadow: none;
      transform: none;
    }

    .stats-grid .stat-card:first-child {
      border-left: 0;
    }

    .stats-grid .stat-icon {
      width: 8px;
      height: 8px;
      margin-top: 6px;
      border-radius: 2px;
      flex-shrink: 0;
    }


    .stats-grid .stat-content {
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
    }

    .stats-grid .stat-label {
      margin: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .stats-grid .stat-value {
      font-family: var(--font-mono);
      font-size: 26px;
      font-weight: 500;
      line-height: 1;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }

    /* ---- Row actions: neutral until hovered, red only for delete ---- */
    .action-buttons .btn-action,
    .action-buttons .btn-action.btn-view,
    .action-buttons .btn-action.btn-edit,
    .action-buttons .btn-action.btn-action-danger {
      width: 32px;
      height: 32px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius);
      color: var(--gray-500);
    }

    .action-buttons .btn-action svg {
      width: 17px;
      height: 17px;
    }

    .action-buttons .btn-action.btn-view:hover,
    .action-buttons .btn-action.btn-edit:hover {
      background: var(--gray-100);
      color: var(--gray-900);
    }

    .action-buttons .btn-action.btn-action-danger:hover {
      background: var(--error-light);
      color: var(--error);
    }

    .status-badge {
      white-space: nowrap;
    }

    .etat-badge {
      white-space: nowrap;
    }

    /* ---- KPI cards: separate cards, label + figure, tinted icon chip ---- */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
      background: transparent;
      border: 0;
      border-radius: 0;
      overflow: visible;
    }

    .stats-grid .stat-card,
    .stats-grid .stat-card:first-child {
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--card-shadow);
      transform: none;
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .stats-grid .stat-card:hover {
      border-color: var(--gray-300);
      box-shadow: var(--card-shadow-hover);
    }

    .stats-grid .stat-icon,
    .stats-grid .stat-icon-wrapper {
      order: 2;
      width: 40px;
      height: 40px;
      margin: 0;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border-radius: 10px;
    }

    .stats-grid .stat-icon svg,
    .stats-grid .stat-icon-wrapper .stat-icon {
      display: block;
      width: 20px;
      height: 20px;
      background: transparent !important;
    }

    .stats-grid .stat-content {
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      min-width: 0;
    }

    .stats-grid .stat-label {
      margin: 0;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .stats-grid .stat-value,
    .stats-grid .stat-card .stat-number {
      font-family: var(--font-mono);
      font-size: 28px;
      font-weight: 500;
      line-height: 1;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }

    .table-wrapper,
    .table-container {
      border-radius: 12px;
      box-shadow: var(--card-shadow);
    }

    .location-cell { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
    .location-cell strong { font-family: var(--font-mono); font-size: 12.5px; color: var(--text); }
    .location-cell span { color: var(--text-secondary); }
    .etat-badge.etat-realisee { background: var(--accent-50); color: var(--accent-700); }
    .etat-badge.etat-realisee .badge-dot { background: var(--accent-500); }
    .etat-badge.etat-annulee { background: var(--gray-100); color: var(--gray-600); }
    .etat-badge.etat-annulee .badge-dot { background: var(--gray-400); }
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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.loadInterventions();
    this.loadStats();
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
    this.interventionService.getInterventions(this.currentPage, this.pageSize, this.searchTerm).subscribe({
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
    this.currentPage = 1;
    this.loadInterventions();
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
