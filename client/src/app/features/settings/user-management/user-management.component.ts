import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserManagementService, User, Role, CreateUserDto, UpdateUserDto } from '../services/user-management.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeaderComponent],
  template: `
    <div class="users-container">
      <!-- Header -->
      <app-page-header icon="users" title="Utilisateurs" subtitle="Comptes, rôles et accès des membres de l'équipe">
        <button class="btn-back" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Retour
          </button>
        <button class="btn-primary" (click)="openCreateModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nouvel utilisateur
        </button>
      </app-page-header>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ users.length }}</span>
            <span class="stat-label">Total Utilisateurs</span>
          </div>
        </div>
        <div class="stat-card superviseur">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M22 11h-6"/>
              <path d="M19 8v6"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ getUsersByRole('Superviseur').length }}</span>
            <span class="stat-label">Superviseurs</span>
          </div>
        </div>
        <div class="stat-card demandeur">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ getUsersByRole('Demandeur').length }}</span>
            <span class="stat-label">Demandeurs</span>
          </div>
        </div>
        <div class="stat-card utilisateur">
          <div class="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="stat-content">
            <span class="stat-number">{{ getUsersByRole('Utilisateur').length }}</span>
            <span class="stat-label">Utilisateurs</span>
          </div>
        </div>
      </div>

      <!-- Search & Filter -->
      <div class="toolbar">
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input 
            type="text" 
            placeholder="Rechercher un utilisateur..." 
            [(ngModel)]="searchTerm"
            (input)="filterUsers()"
          />
        </div>
        <div class="filter-group">
          <select [(ngModel)]="filterRole" (change)="filterUsers()">
            <option value="">Tous les rôles</option>
            <option *ngFor="let role of roles" [value]="role.libelle">{{ role.libelle }}</option>
          </select>
        </div>
      </div>

      <!-- Users Table -->
      <div class="table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Date de création</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of filteredUsers" class="user-row">
              <td>
                <div class="user-info">
                  <div class="user-avatar" [style.background]="getAvatarColor(user.role?.libelle || '')">
                    {{ user.prenom?.charAt(0) }}{{ user.nom?.charAt(0) }}
                  </div>
                  <div class="user-details">
                    <span class="user-name">{{ user.prenom }} {{ user.nom }}</span>
                    <span class="user-id">ID: {{ user.id }}</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="email">{{ user.email }}</span>
              </td>
              <td>
                <span class="role-badge" [class]="'role-' + (user.role?.libelle?.toLowerCase() || 'default')">
                  {{ user.role?.libelle || 'Non assigné' }}
                </span>
              </td>
              <td>
                <span class="date">{{ user.dateCreation | date:'dd/MM/yyyy' }}</span>
              </td>
              <td>
                <span class="status-badge" [class.active]="user.isActif" [class.inactive]="!user.isActif">
                  {{ user.isActif ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td>
                <div class="actions">
                  <button class="action-btn view" (click)="openViewModal(user)" title="Consulter">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button class="action-btn edit" (click)="openEditModal(user)" title="Modifier">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button class="action-btn delete" (click)="confirmDelete(user)" title="Supprimer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredUsers.length === 0">
              <td colspan="6" class="empty-state">
                <div class="empty-content">
                  <p>Aucun utilisateur trouvé</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="loading">
        <div class="spinner"></div>
        <span>Chargement...</span>
      </div>

      <!-- Create/Edit/View Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ isViewMode ? 'Détails Utilisateur' : (isEditMode ? 'Modifier Utilisateur' : 'Créer Utilisateur') }}</h2>
            <button class="close-btn" (click)="closeModal()">×</button>
          </div>
          <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label>Prénom <span class="required">*</span></label>
                  <input type="text" formControlName="firstName" placeholder="Entrez le prénom">
                  <span class="error" *ngIf="userForm.get('firstName')?.invalid && userForm.get('firstName')?.touched">
                    Le prénom est requis
                  </span>
                </div>
                <div class="form-group">
                  <label>Nom <span class="required">*</span></label>
                  <input type="text" formControlName="lastName" placeholder="Entrez le nom">
                  <span class="error" *ngIf="userForm.get('lastName')?.invalid && userForm.get('lastName')?.touched">
                    Le nom est requis
                  </span>
                </div>
              </div>

              <div class="form-group">
                <label>Email <span class="required">*</span></label>
                <input type="email" formControlName="email" placeholder="exemple@email.com">
                <span class="error" *ngIf="userForm.get('email')?.invalid && userForm.get('email')?.touched">
                  Email valide requis
                </span>
              </div>

              <div class="form-group" *ngIf="!isEditMode">
                <label>Mot de passe <span class="required">*</span></label>
                <input type="password" formControlName="password" placeholder="Ex: Password1">
                <span class="error" *ngIf="userForm.get('password')?.invalid && userForm.get('password')?.touched">
                  Min. 10 caractères, 1 majuscule, 1 minuscule, 1 chiffre, sans votre nom
                </span>
              </div>

              <div class="form-group">
                <label>Rôle <span class="required">*</span></label>
                <select formControlName="roleId">
                  <option [ngValue]="''" disabled>Sélectionner un rôle</option>
                  <option *ngFor="let role of roles" [ngValue]="role.idRole">{{ role.libelle }}</option>
                </select>
                <span class="error" *ngIf="userForm.get('roleId')?.invalid && userForm.get('roleId')?.touched">
                  Le rôle est requis
                </span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">{{ isViewMode ? 'Fermer' : 'Annuler' }}</button>
              <button type="submit" class="btn-primary" [disabled]="userForm.invalid || submitting" *ngIf="!isViewMode">
                {{ submitting ? 'En cours...' : (isEditMode ? 'Enregistrer' : 'Créer') }}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* ===== Variables & Base - Modern Industrial Theme (matches References) ===== */
    :host {
      --primary: var(--primary-600);
      --primary-dark: var(--primary-700);
      --primary-light: var(--primary-400);
      --accent: var(--primary-600);
      --danger: var(--error);
      --industrial-dark: var(--gray-900);
      --industrial-mid: var(--gray-800);
      --industrial-light: var(--gray-700);
      --steel-50: var(--gray-50);
      --steel-100: var(--gray-100);
      --steel-200: var(--gray-200);
      --steel-300: var(--gray-300);
      --steel-400: var(--gray-400);
      --steel-500: var(--gray-500);
      --steel-600: var(--gray-600);
      --steel-700: var(--gray-700);
      --text-primary: var(--gray-900);
      --text-secondary: var(--gray-600);
      --text-muted: var(--gray-500);
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .users-container {
      width: 100%;
      position: relative;
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: white;
      border: 1px solid var(--steel-200);
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--steel-600);
      cursor: pointer;
      transition: all 0.2s ease;
      width: fit-content;
    }

    .btn-back:hover {
      border-color: var(--steel-300);
      color: var(--text-primary);
      background: var(--steel-50);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-title h1 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .header-title p {
      color: var(--steel-500);
      margin: 0.25rem 0 0 0;
      font-size: 0.875rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: var(--primary-600);
      color: white;
      border: none;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: none;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--primary-700);
      box-shadow: none;
      transform: none;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Stats Grid - Dashboard Style Cards */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: white;
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02);
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      border-radius: 4px 0 0 4px;
    }

    .stat-card:hover {
      transform: none;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }

    /* Total Card - Blue */
    .stat-card.total::before {
      background: var(--primary-600);
    }
    .stat-card.total .stat-icon {
      background: var(--primary-50);
      color: var(--primary-600);
    }
    .stat-card.total .stat-number {
      color: var(--primary-800);
    }
    .stat-card.total .stat-trend {
      color: var(--success);
    }

    /* Superviseur Card - Purple/Indigo */
    .stat-card.superviseur::before {
      background: var(--violet);
    }
    .stat-card.superviseur .stat-icon {
      background: var(--violet-light);
      color: var(--violet);
    }
    .stat-card.superviseur .stat-number {
      color: #6d28d9;
    }
    .stat-card.superviseur .stat-badge {
      background: var(--violet);
    }

    /* Demandeur Card - Emerald/Green */
    .stat-card.demandeur::before {
      background: var(--success);
    }
    .stat-card.demandeur .stat-icon {
      background: var(--success-light);
      color: var(--success);
    }
    .stat-card.demandeur .stat-number {
      color: var(--success-dark);
    }
    .stat-card.demandeur .stat-badge {
      background: var(--success);
    }

    /* Utilisateur Card - Amber/Orange */
    .stat-card.utilisateur::before {
      background: var(--warning);
    }
    .stat-card.utilisateur .stat-icon {
      background: var(--warning-light);
      color: var(--warning);
    }
    .stat-card.utilisateur .stat-number {
      color: var(--warning-dark);
    }
    .stat-card.utilisateur .stat-badge {
      background: var(--warning);
    }

    .stat-icon {
      width: 52px;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-lg);
      flex-shrink: 0;
    }

    .stat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-number {
      font-size: 1.75rem;
      font-weight: 600;
      line-height: 1;
      letter-spacing: -0.02em;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--gray-500);
      font-weight: 500;
      letter-spacing: 0.01em;
    }

    @media (max-width: 1024px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .search-box {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: white;
      border: 1px solid var(--steel-200);
      border-radius: var(--radius);
      transition: all 0.2s ease;
    }

    .search-box:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(61, 96, 220, 0.1);
    }

    .search-box svg {
      color: var(--steel-400);
    }

    .search-box:focus-within svg {
      color: var(--primary);
    }

    .search-box input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.875rem;
      color: var(--text-primary);
      background: transparent;
    }

    .search-box input::placeholder {
      color: var(--steel-400);
    }

    .filter-group select {
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      background: white;
      border: 1px solid var(--steel-200);
      border-radius: var(--radius);
      font-size: 0.875rem;
      color: var(--text-primary);
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      transition: all 0.2s ease;
    }

    .filter-group select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(61, 96, 220, 0.1);
    }

    /* Table */
    .table-container {
      background: white;
      border-radius: var(--radius-lg);
      border: 1px solid var(--steel-200);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table th {
      padding: 1rem 1.25rem;
      text-align: left;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--steel-500);
      background: var(--steel-50);
      border-bottom: 1px solid var(--steel-200);
    }

    .users-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--steel-100);
    }

    .user-row {
      transition: all 0.2s ease;
    }

    .user-row:hover {
      background: var(--steel-50);
    }

    .user-row:last-child td {
      border-bottom: none;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 0.875rem;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 600;
      color: white;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .user-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .user-id {
      font-size: 0.75rem;
      color: var(--steel-400);
    }

    .email {
      color: var(--steel-600);
      font-size: 0.875rem;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .role-superviseur {
      background: rgba(61, 96, 220, 0.1);
      color: var(--primary-700);
    }

    .role-demandeur {
      background: rgba(46, 125, 79, 0.1);
      color: var(--success-dark);
    }

    .role-utilisateur {
      background: rgba(184, 110, 0, 0.1);
      color: var(--warning-dark);
    }

    .role-default {
      background: var(--steel-100);
      color: var(--steel-600);
    }

    .date {
      color: var(--steel-500);
      font-size: 0.875rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.625rem;
      border-radius: var(--radius-lg);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .status-badge.active {
      background: rgba(46, 125, 79, 0.1);
      color: var(--success-dark);
    }

    .status-badge.active::before {
      background: var(--success);
    }

    .status-badge.inactive {
      background: rgba(194, 58, 43, 0.1);
      color: var(--error-dark);
    }

    .status-badge.inactive::before {
      background: var(--danger);
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: none;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn.view {
      background: rgba(46, 125, 79, 0.1);
      color: var(--success);
    }

    .action-btn.view:hover {
      background: var(--success);
      color: white;
    }

    .action-btn.edit {
      background: rgba(61, 96, 220, 0.1);
      color: var(--primary);
    }

    .action-btn.edit:hover {
      background: var(--primary);
      color: white;
    }

    .action-btn.delete {
      background: rgba(194, 58, 43, 0.1);
      color: var(--danger);
    }

    .action-btn.delete:hover {
      background: var(--danger);
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 2rem !important;
    }

    .empty-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .empty-icon {
      font-size: 4rem;
      opacity: 0.4;
    }

    .empty-content p {
      color: var(--steel-500);
      margin: 0;
      font-size: 1rem;
    }

    /* Loading Overlay */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      z-index: 100;
      border-radius: var(--radius-lg);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 2.5px solid var(--primary-100);
      border-top-color: var(--primary-600);
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      will-change: transform;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ===== Simple Modal Styles ===== */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(21, 26, 34, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: none;
      padding: 1rem;
    }

    .modal {
      background: white;
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 50px rgba(21, 26, 34, 0.12);
      animation: modalIn 0.25s ease-out;
      overflow: hidden;
    }

    @keyframes modalIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-20px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem 1.5rem;
      background: var(--primary-600);
      color: white;
    }

    .modal-header.delete {
      background: var(--error);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
    }

    .close-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: var(--radius);
      font-size: 1.5rem;
      line-height: 1;
      color: white;
      cursor: pointer;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .modal-body {
      padding: 1.5rem;
      background: white;
    }

    /* ===== Simple Form Styles ===== */
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--gray-700);
      margin-bottom: 0.5rem;
    }

    .form-group .required {
      color: var(--error);
      margin-left: 2px;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--gray-300);
      border-radius: var(--radius);
      font-size: 0.9375rem;
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
      background: white;
      color: var(--gray-800);
      box-sizing: border-box;
    }

    .form-group input::placeholder {
      color: var(--gray-400);
    }

    .form-group input:hover,
    .form-group select:hover {
      border-color: var(--gray-400);
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--primary-600);
      box-shadow: 0 0 0 3px rgba(61, 96, 220, 0.15);
    }

    .form-group select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      padding-right: 2.5rem;
    }

    .form-group .error {
      color: var(--error);
      font-size: 0.8rem;
      margin-top: 0.375rem;
    }

    .warning-text {
      color: var(--error-dark);
      font-size: 0.875rem;
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--error-light);
      border-radius: var(--radius);
      border-left: 3px solid var(--error);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--gray-200);
      background: var(--gray-50);
    }

    .btn-secondary {
      padding: 0.625rem 1.25rem;
      background: white;
      border: 1px solid var(--gray-300);
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--gray-600);
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: var(--gray-100);
      border-color: var(--gray-400);
    }

    .btn-danger {
      padding: 0.625rem 1.25rem;
      background: var(--error);
      color: white;
      border: none;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-danger:hover:not(:disabled) {
      background: var(--error-dark);
    }

    .btn-danger:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .users-container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        gap: 1rem;
      }

      .stats-bar {
        flex-wrap: wrap;
        padding: 1.25rem;
      }

      .stat-item {
        flex: 1;
        min-width: 120px;
        border-right: none;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding-bottom: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .toolbar {
        flex-direction: column;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .table-container {
        overflow-x: auto;
      }

      .users-table {
        min-width: 700px;
      }

      .modal {
        margin: 1rem;
        max-width: calc(100% - 2rem);
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
      font-variant-numeric: tabular-nums;
      font-size: 26px;
      font-weight: 500;
      line-height: 1;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }


    .stats-grid .stat-card::before,
    .stats-grid .stat-card::after {
      display: none;
    }

    .stats-grid .stat-card .stat-number {
      font-variant-numeric: tabular-nums;
      font-size: 26px;
      font-weight: 500;
      line-height: 1;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }

    .stats-grid .stat-badge,
    .stats-grid .stat-trend {
      display: none;
    }

    /* Search field: the wrapper draws the border, the input stays bare */
    .search-box input {
      padding: 0;
      border: 0;
      background: transparent;
      box-shadow: none;
    }

    .search-box:focus-within {
      border-color: var(--primary-500);
      box-shadow: var(--focus-ring);
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
      font-variant-numeric: tabular-nums;
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

  `]
})
export class UserManagementComponent implements OnInit {
  private readonly confirmDialog = inject(ConfirmService);
  users: User[] = [];
  filteredUsers: User[] = [];
  roles: Role[] = [];
  
  searchTerm = '';
  filterRole = '';
  
  loading = false;
  submitting = false;
  
  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  isViewMode = false;
  
  userForm: FormGroup;
  editingUser: User | null = null;
  userToDelete: User | null = null;

  constructor(
    private userService: UserManagementService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.userForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(10), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
      roleId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filterUsers();
        this.loading = false;
      },
      error: (err) => {
        this.notificationService.error('Erreur', 'Impossible de charger les utilisateurs');
        this.loading = false;
      }
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
      },
      error: (err) => {
        console.error('Error loading roles, using defaults:', err);
        // Fallback to default roles if API fails
        this.roles = [
          { idRole: 1, libelle: 'Superviseur' },
          { idRole: 2, libelle: 'Demandeur' },
          { idRole: 3, libelle: 'Utilisateur' }
        ];
      }
    });
  }

  filterUsers(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm || 
        `${user.prenom} ${user.nom}`.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesRole = !this.filterRole || user.role?.libelle === this.filterRole;
      
      return matchesSearch && matchesRole;
    });
  }

  getUsersByRole(role: string): User[] {
    return this.users.filter(u => u.role?.libelle === role);
  }

  getAvatarColor(role: string): string {
    switch (role) {
      case 'Superviseur': return 'var(--primary-600)';
      case 'Demandeur': return 'var(--success)';
      case 'Utilisateur': return 'var(--warning)';
      default: return 'var(--gray-500)';
    }
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingUser = null;
    this.userForm.reset();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(10), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showModal = true;
  }

  openEditModal(user: User): void {
    this.isEditMode = true;
    this.isViewMode = false;
    this.editingUser = user;
    this.userForm.patchValue({
      firstName: user.prenom,
      lastName: user.nom,
      email: user.email,
      roleId: user.idRole
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.enable();
    this.showModal = true;
  }

  openViewModal(user: User): void {
    this.isViewMode = true;
    this.isEditMode = false;
    this.editingUser = user;
    this.userForm.patchValue({
      firstName: user.prenom,
      lastName: user.nom,
      email: user.email,
      roleId: user.idRole
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.disable();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingUser = null;
    this.isViewMode = false;
    this.isEditMode = false;
    this.userForm.reset();
    this.userForm.enable();
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    if (this.isEditMode && this.editingUser) {
      // For update, send the data in camelCase format (API uses camelCase JSON serialization)
      const roleIdValue = this.userForm.value.roleId;
      const updateData: UpdateUserDto = {
        id: this.editingUser.id,
        prenom: this.userForm.value.firstName,
        nom: this.userForm.value.lastName,
        email: this.userForm.value.email,
        idRole: typeof roleIdValue === 'number' ? roleIdValue : parseInt(roleIdValue, 10),
        appUserId: this.editingUser.appUserId,
        isActif: true
      };


      this.userService.updateUser(this.editingUser.id, updateData).subscribe({
        next: (updatedUser) => {
          // Immediately update the local array for instant UI feedback
          if (updatedUser) {
            const index = this.users.findIndex(u => u.id === updatedUser.id);
            if (index !== -1) {
              this.users[index] = updatedUser;
              this.users = [...this.users];
              this.filterUsers();
            }
          }
          this.notificationService.success('Succès', 'Utilisateur mis à jour avec succès');
          this.submitting = false;
          this.closeModal();
          // Also reload from server to ensure full consistency
          this.loadUsers();
        },
        error: (err) => {
          console.error('Update error:', err);
          this.notificationService.error('Erreur', err.error?.message || 'Erreur lors de la mise à jour');
          this.submitting = false;
        }
      });
    } else {
      const roleIdNum = parseInt(this.userForm.value.roleId, 10);
      
      if (!roleIdNum || roleIdNum < 1 || roleIdNum > 3) {
        this.notificationService.error('Erreur', 'Veuillez sélectionner un rôle valide');
        this.submitting = false;
        return;
      }

      const createData: CreateUserDto = {
        firstName: this.userForm.value.firstName,
        lastName: this.userForm.value.lastName,
        email: this.userForm.value.email,
        password: this.userForm.value.password,
        roleId: roleIdNum
      };

      
      this.userService.createUser(createData).subscribe({
        next: () => {
          this.notificationService.success('Succès', 'Utilisateur créé avec succès');
          this.submitting = false;
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => {
          let errorMsg = 'Erreur lors de la création';
          if (err.error?.errors) {
            // Handle validation errors from ASP.NET
            const errors = Object.values(err.error.errors).flat();
            errorMsg = errors.join(', ');
          } else if (err.error?.message) {
            errorMsg = err.error.message;
          } else if (typeof err.error === 'string') {
            errorMsg = err.error;
          }
          this.notificationService.error('Erreur', errorMsg);
          this.submitting = false;
        }
      });
    }
  }

  async confirmDelete(user: User): Promise<void> {
    const ok = await this.confirmDialog.ask({
      title: `Supprimer le compte de ${user.prenom ?? ''} ${user.nom ?? ''} ?`.replace(/\s+/g, ' '),
      message: "La personne ne pourra plus se connecter. Ses interventions ouvertes seront remises à affecter ; l'historique est conservé."
    });
    if (!ok) return;
    this.userToDelete = user;
    this.deleteUser();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  deleteUser(): void {
    if (!this.userToDelete) return;

    this.submitting = true;
    const deletedId = this.userToDelete.id;
    this.userService.deleteUser(deletedId).subscribe({
      next: () => {
        // Immediately remove from local array for instant UI feedback
        this.users = this.users.filter(u => u.id !== deletedId);
        this.filterUsers();
        this.notificationService.success('Succès', 'Utilisateur supprimé avec succès');
        this.submitting = false;
        this.closeDeleteModal();
        this.loadUsers();
      },
      error: (err) => {
        this.notificationService.error('Erreur', 'Erreur lors de la suppression');
        this.submitting = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/settings']);
  }
}
