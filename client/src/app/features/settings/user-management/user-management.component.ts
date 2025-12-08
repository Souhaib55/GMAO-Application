import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserManagementService, User, Role, CreateUserDto, UpdateUserDto } from '../services/user-management.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="users-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <button class="btn-back" (click)="goBack()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Retour
          </button>
          <div class="header-title">
            <h1>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Gestion des Utilisateurs
            </h1>
            <p>Créer, modifier et gérer les comptes utilisateurs</p>
          </div>
        </div>
        <button class="btn-primary" (click)="openCreateModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nouvel Utilisateur
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-number">{{ users.length }}</span>
          <span class="stat-label">Total Utilisateurs</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ getUsersByRole('Superviseur').length }}</span>
          <span class="stat-label">Superviseurs</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ getUsersByRole('Demandeur').length }}</span>
          <span class="stat-label">Demandeurs</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">{{ getUsersByRole('Utilisateur').length }}</span>
          <span class="stat-label">Utilisateurs</span>
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
                  <span class="empty-icon">👥</span>
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
                  Min. 6 caractères, 1 majuscule, 1 minuscule, 1 chiffre
                </span>
              </div>

              <div class="form-group">
                <label>Rôle <span class="required">*</span></label>
                <select formControlName="roleId">
                  <option value="" disabled>Sélectionner un rôle</option>
                  <option *ngFor="let role of roles" [value]="role.idRole">{{ role.libelle }}</option>
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

      <!-- Delete Confirmation Modal -->
      <div class="modal-overlay" *ngIf="showDeleteModal" (click)="closeDeleteModal()">
        <div class="modal delete-modal" (click)="$event.stopPropagation()">
          <div class="modal-header delete">
            <h2>⚠️ Confirmer la suppression</h2>
          </div>
          <div class="modal-body">
            <p>Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{{ userToDelete?.prenom }} {{ userToDelete?.nom }}</strong> ?</p>
            <p class="warning-text">Cette action désactivera le compte utilisateur.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeDeleteModal()">Annuler</button>
            <button type="button" class="btn-danger" (click)="deleteUser()" [disabled]="submitting">
              {{ submitting ? 'Suppression...' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ===== Variables & Base - Modern Industrial Theme (matches References) ===== */
    :host {
      --primary: #0ea5e9;
      --primary-dark: #0284c7;
      --primary-light: #38bdf8;
      --accent: #06b6d4;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --industrial-dark: #0f172a;
      --industrial-mid: #1e293b;
      --industrial-light: #334155;
      --steel-50: #f8fafc;
      --steel-100: #f1f5f9;
      --steel-200: #e2e8f0;
      --steel-300: #cbd5e1;
      --steel-400: #94a3b8;
      --steel-500: #64748b;
      --steel-600: #475569;
      --steel-700: #334155;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }

    .users-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem;
      position: relative;
      min-height: 100vh;
      background: #f1f5f9;
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
      border-radius: 8px;
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
      font-weight: 700;
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
      background: var(--industrial-dark);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--industrial-mid);
      box-shadow: var(--shadow-md);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Stats Bar */
    .stats-bar {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding: 1rem 1.5rem;
      background: white;
      border-radius: 12px;
      border: 1px solid var(--steel-200);
      box-shadow: var(--shadow-sm);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      padding-right: 1.5rem;
      border-right: 1px solid var(--steel-200);
    }

    .stat-item:last-child {
      border-right: none;
    }

    .stat-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--steel-500);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
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
      border-radius: 10px;
      transition: all 0.2s ease;
    }

    .search-box:focus-within {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
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
      border-radius: 10px;
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
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    /* Table */
    .table-container {
      background: white;
      border-radius: 12px;
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
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8125rem;
      font-weight: 700;
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
      background: rgba(14, 165, 233, 0.1);
      color: #0284c7;
    }

    .role-demandeur {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
    }

    .role-utilisateur {
      background: rgba(245, 158, 11, 0.1);
      color: #d97706;
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
      border-radius: 20px;
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
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
    }

    .status-badge.active::before {
      background: var(--success);
    }

    .status-badge.inactive {
      background: rgba(239, 68, 68, 0.1);
      color: #dc2626;
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
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-btn.view {
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
    }

    .action-btn.view:hover {
      background: #22c55e;
      color: white;
    }

    .action-btn.edit {
      background: rgba(14, 165, 233, 0.1);
      color: var(--primary);
    }

    .action-btn.edit:hover {
      background: var(--primary);
      color: white;
    }

    .action-btn.delete {
      background: rgba(239, 68, 68, 0.1);
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
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      z-index: 100;
      border-radius: 24px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(59, 130, 246, 0.2);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ===== Simple Modal Styles ===== */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
      padding: 1rem;
    }

    .modal {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
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
      background: #1e293b;
      color: white;
    }

    .modal-header.delete {
      background: #dc2626;
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
      border-radius: 8px;
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
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .form-group .required {
      color: #ef4444;
      margin-left: 2px;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
      background: white;
      color: #1f2937;
      box-sizing: border-box;
    }

    .form-group input::placeholder {
      color: #9ca3af;
    }

    .form-group input:hover,
    .form-group select:hover {
      border-color: #9ca3af;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
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
      color: #ef4444;
      font-size: 0.8rem;
      margin-top: 0.375rem;
    }

    .warning-text {
      color: #dc2626;
      font-size: 0.875rem;
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: #fef2f2;
      border-radius: 8px;
      border-left: 3px solid #ef4444;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .btn-secondary {
      padding: 0.625rem 1.25rem;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #4b5563;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
    }

    .btn-danger {
      padding: 0.625rem 1.25rem;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
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
  `]
})
export class UserManagementComponent implements OnInit {
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
      password: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]],
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
        console.log('Loaded roles from DB:', this.roles);
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
      case 'Superviseur': return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      case 'Demandeur': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'Utilisateur': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      default: return 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
    }
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingUser = null;
    this.userForm.reset();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)]);
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
      const updateData = {
        id: this.editingUser.id,
        prenom: this.userForm.value.firstName,
        nom: this.userForm.value.lastName,
        email: this.userForm.value.email,
        idRole: parseInt(this.userForm.value.roleId, 10),
        appUserId: this.editingUser.appUserId,
        isActif: true
      };

      console.log('Updating user with data:', updateData);

      this.userService.updateUser(this.editingUser.id, updateData as any).subscribe({
        next: () => {
          this.notificationService.success('Succès', 'Utilisateur mis à jour avec succès');
          this.closeModal();
          this.loadUsers();
          this.submitting = false;
        },
        error: (err) => {
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

      console.log('Creating user with data:', createData);
      
      this.userService.createUser(createData).subscribe({
        next: () => {
          this.notificationService.success('Succès', 'Utilisateur créé avec succès');
          this.closeModal();
          this.loadUsers();
          this.submitting = false;
        },
        error: (err) => {
          console.log('Full error:', err);
          console.log('Error body:', err.error);
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

  confirmDelete(user: User): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  deleteUser(): void {
    if (!this.userToDelete) return;

    this.submitting = true;
    this.userService.deleteUser(this.userToDelete.id).subscribe({
      next: () => {
        this.notificationService.success('Succès', 'Utilisateur supprimé avec succès');
        this.closeDeleteModal();
        this.loadUsers();
        this.submitting = false;
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
