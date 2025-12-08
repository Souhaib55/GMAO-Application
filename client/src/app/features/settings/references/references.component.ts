import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ReferenceManagementService, ReferenceCategory } from '../services/reference-management.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-references',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="references-container">
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
            <h1>📊 Données de Référence</h1>
            <p>Gérer les tables de référence pour tous les modules</p>
          </div>
        </div>
      </div>

      <!-- Module Tabs -->
      <div class="module-tabs">
        <button 
          *ngFor="let module of modules" 
          class="module-tab"
          [class.active]="selectedModule === module.key"
          (click)="selectModule(module.key)"
        >
          <span class="tab-icon">{{ module.icon }}</span>
          <span class="tab-label">{{ module.label }}</span>
          <span class="tab-count">{{ getCategoriesForModule(module.key).length }}</span>
        </button>
      </div>

      <!-- Categories Grid -->
      <div class="categories-section">
        <h3 class="section-title">{{ getModuleLabel(selectedModule) }} - Catégories</h3>
        <div class="categories-grid">
          <div 
            *ngFor="let category of getCategoriesForModule(selectedModule)" 
            class="category-card"
            [class.active]="selectedCategory?.key === category.key"
            (click)="selectCategory(category)"
          >
            <div class="category-icon">{{ category.icon }}</div>
            <div class="category-info">
              <h4>{{ category.label }}</h4>
              <p>{{ category.description }}</p>
            </div>
            <div class="category-count" *ngIf="categoryItemCounts[category.key]">
              {{ categoryItemCounts[category.key] }} éléments
            </div>
          </div>
        </div>
      </div>

      <!-- Reference Items Table -->
      <div class="items-section" *ngIf="selectedCategory">
        <div class="items-header">
          <div class="header-left">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </div>
            <div>
              <h1 class="page-title">{{ selectedCategory.label }}</h1>
              <p class="page-subtitle">Gestion des {{ selectedCategory.label.toLowerCase() }}</p>
            </div>
          </div>
          <button class="btn-new" (click)="openCreateModal()">
            <span class="btn-icon">+</span>
            AJOUTER
          </button>
        </div>

        <div class="table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Libellé</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of items" class="item-row">
                <td>
                  <span class="id-badge">#{{ getItemId(item) }}</span>
                </td>
                <td>
                  <span class="item-name">{{ getItemName(item) }}</span>
                </td>
                <td>
                  <div class="actions">
                    <button class="action-btn edit" (click)="openEditModal(item)" title="Modifier">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="action-btn delete" (click)="confirmDelete(item)" title="Supprimer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="items.length === 0 && !loading">
                <td colspan="3" class="empty-state">
                  <div class="empty-content">
                    <span class="empty-icon">📭</span>
                    <p>Aucun élément dans cette catégorie</p>
                    <button class="btn-primary small" (click)="openCreateModal()">
                      Ajouter le premier
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- No Category Selected -->
      <div class="no-selection" *ngIf="!selectedCategory">
        <div class="no-selection-content">
          <span class="no-selection-icon">👆</span>
          <h3>Sélectionnez une catégorie</h3>
          <p>Choisissez une catégorie ci-dessus pour voir et gérer ses éléments</p>
        </div>
      </div>

      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="loading">
        <div class="spinner"></div>
        <span>Chargement...</span>
      </div>

      <!-- Create/Edit Modal -->
      <div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ isEditMode ? 'Modifier' : 'Ajouter' }} - {{ selectedCategory?.label }}</h2>
            <button class="close-btn" (click)="closeModal()">×</button>
          </div>
          <form [formGroup]="itemForm" (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="form-group">
                <label>Libellé <span class="required">*</span></label>
                <input type="text" formControlName="name" placeholder="Entrez le libellé">
                <span class="error" *ngIf="itemForm.get('name')?.invalid && itemForm.get('name')?.touched">
                  Le libellé est requis
                </span>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Annuler</button>
              <button type="submit" class="btn-primary" [disabled]="itemForm.invalid || submitting">
                {{ submitting ? 'En cours...' : (isEditMode ? 'Mettre à jour' : 'Créer') }}
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
            <p>Êtes-vous sûr de vouloir supprimer <strong>{{ getItemName(itemToDelete) }}</strong> ?</p>
            <p class="warning-text">Cette action est irréversible.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeDeleteModal()">Annuler</button>
            <button type="button" class="btn-danger" (click)="deleteItem()" [disabled]="submitting">
              {{ submitting ? 'Suppression...' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ===== Variables & Base - Modern Industrial Theme ===== */
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

    .references-container {
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

    .header-title h1 {
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

    /* Module Tabs */
    .module-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      padding: 0.5rem;
      background: white;
      border-radius: 12px;
      border: 1px solid var(--steel-200);
      box-shadow: var(--shadow-sm);
    }

    .module-tab {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      background: transparent;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--steel-500);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .module-tab:hover {
      background: var(--steel-100);
      color: var(--text-primary);
    }

    .module-tab.active {
      background: var(--industrial-dark);
      color: white;
    }

    .tab-icon {
      font-size: 1.125rem;
    }

    .tab-count {
      padding: 0.125rem 0.5rem;
      background: rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .module-tab.active .tab-count {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    /* Categories Section */
    .categories-section {
      margin-bottom: 1.5rem;
    }

    .section-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--steel-500);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .section-title::before {
      content: '';
      width: 3px;
      height: 14px;
      background: var(--primary);
      border-radius: 2px;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .category-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: white;
      border: 1px solid var(--steel-200);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .category-card:hover {
      border-color: var(--steel-300);
      box-shadow: var(--shadow-md);
    }

    .category-card.active {
      border-color: var(--primary);
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.04) 0%, rgba(6, 182, 212, 0.04) 100%);
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    .category-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      background: var(--steel-100);
      border-radius: 10px;
      transition: all 0.2s ease;
    }

    .category-card.active .category-icon {
      background: var(--industrial-dark);
    }

    .category-info {
      flex: 1;
      min-width: 0;
    }

    .category-info h4 {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .category-info p {
      margin: 0.25rem 0 0 0;
      font-size: 0.8125rem;
      color: var(--steel-500);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .category-count {
      padding: 0.25rem 0.75rem;
      background: var(--steel-100);
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--steel-600);
    }

    .category-card.active .category-count {
      background: var(--primary);
      color: white;
    }

    /* Items Section - Clean Modern Table */
    .items-section {
      background: #ffffff;
      border-radius: 16px;
      border: none;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .items-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      background: #f8fafc;
    }

    .items-header .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .items-header .header-icon {
      width: 48px;
      height: 48px;
      background: #3b82f6;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .items-header .page-title {
      font-size: 28px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .items-header .page-subtitle {
      font-size: 14px;
      color: #64748b;
      margin: 4px 0 0 0;
    }

    .items-header .btn-new {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }

    .items-header .btn-new:hover {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .items-header .btn-icon {
      font-size: 20px;
      font-weight: 400;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary.small {
      padding: 0.5rem 1rem;
      font-size: 0.8125rem;
    }

    /* Clean Table Design */
    .table-container {
      overflow-x: auto;
      background: #ffffff;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
    }

    .items-table th {
      padding: 1rem 1.5rem;
      text-align: left;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .items-table th:first-child {
      width: 100px;
    }

    .items-table th:last-child {
      width: 140px;
      text-align: right;
    }

    .items-table td {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      background: #ffffff;
    }

    .items-table td:last-child {
      text-align: right;
    }

    .item-row {
      transition: background 0.15s ease;
    }

    .item-row:hover td {
      background: #f8fafc;
    }

    .item-row:last-child td {
      border-bottom: none;
    }

    .id-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      padding: 0.375rem 0.75rem;
      background: #0f172a;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #ffffff;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    }

    .item-name {
      font-weight: 500;
      color: #1e293b;
      font-size: 0.9375rem;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .action-btn {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #ffffff;
    }

    .action-btn.edit {
      color: #0ea5e9;
    }

    .action-btn.edit:hover {
      background: #0ea5e9;
      border-color: #0ea5e9;
      color: #ffffff;
    }

    .action-btn.delete {
      color: #ef4444;
    }

    .action-btn.delete:hover {
      background: #ef4444;
      border-color: #ef4444;
      color: #ffffff;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem !important;
      background: #ffffff !important;
    }

    .empty-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .empty-icon {
      font-size: 3.5rem;
      opacity: 0.3;
    }

    .empty-content p {
      color: var(--steel-500);
      margin: 0;
      font-size: 0.875rem;
    }

    /* No Selection */
    .no-selection {
      background: white;
      border-radius: 12px;
      border: 2px dashed var(--steel-300);
      padding: 4rem 2rem;
    }

    .no-selection-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .no-selection-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      opacity: 0.6;
    }

    .no-selection-content h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .no-selection-content p {
      margin: 0.5rem 0 0 0;
      color: var(--steel-500);
      font-size: 0.875rem;
    }

    /* Loading */
    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      z-index: 100;
      border-radius: 12px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--steel-200);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Modal */
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
      max-width: 480px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      animation: modalIn 0.25s ease-out;
      overflow: hidden;
    }

    @keyframes modalIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
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
      background: var(--industrial-dark);
      color: white;
    }

    .modal-header.delete {
      background: var(--danger);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.0625rem;
      font-weight: 600;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      font-size: 1.25rem;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .modal-body {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.5rem;
    }

    .form-group .required {
      color: var(--danger);
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--steel-300);
      border-radius: 8px;
      font-size: 0.9375rem;
      font-family: inherit;
      transition: all 0.2s ease;
      background: white;
      color: var(--text-primary);
    }

    .form-group input::placeholder {
      color: var(--steel-400);
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    .form-group select {
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1.5 3.5h9L6 8z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1rem center;
      padding-right: 2.5rem;
    }

    .form-group select:disabled {
      background-color: var(--steel-100);
      cursor: not-allowed;
      opacity: 0.7;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-group textarea::placeholder {
      color: var(--steel-400);
    }

    .form-group .error {
      color: var(--danger);
      font-size: 0.75rem;
      font-weight: 500;
      margin-top: 0.375rem;
      display: block;
    }

    .warning-text {
      color: var(--danger);
      font-size: 0.875rem;
      margin-top: 0.5rem;
      padding: 0.625rem 0.875rem;
      background: rgba(239, 68, 68, 0.08);
      border-radius: 6px;
      border-left: 3px solid var(--danger);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--steel-200);
      background: var(--steel-50);
    }

    .btn-secondary {
      padding: 0.625rem 1.25rem;
      background: white;
      border: 1px solid var(--steel-300);
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--steel-600);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      border-color: var(--steel-400);
      background: var(--steel-100);
    }

    .btn-danger {
      padding: 0.625rem 1.25rem;
      background: var(--danger);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
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
      .references-container {
        padding: 1rem;
      }

      .module-tabs {
        flex-wrap: wrap;
      }

      .categories-grid {
        grid-template-columns: 1fr;
      }

      .modal {
        margin: 1rem;
        max-width: calc(100% - 2rem);
      }
    }
  `]
})
export class ReferencesComponent implements OnInit {
  modules = [
    { key: 'equipment', label: 'Équipement', icon: '⚙️' },
    { key: 'interventions', label: 'Interventions', icon: '🔧' },
    { key: 'resources', label: 'Ressources', icon: '📦' },
    { key: 'stock', label: 'Stock', icon: '🏭' }
  ];

  selectedModule = 'equipment';
  selectedCategory: ReferenceCategory | null = null;
  
  categories: ReferenceCategory[] = [];
  items: any[] = [];
  categoryItemCounts: { [key: string]: number } = {};
  
  loading = false;
  submitting = false;
  
  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  
  itemForm: FormGroup;
  editingItem: any = null;
  itemToDelete: any = null;

  constructor(
    private referenceService: ReferenceManagementService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.itemForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.categories = this.referenceService.getCategories();
    this.loadCategoryCounts();
  }

  loadCategoryCounts(): void {
    // Load counts for all categories
    this.categories.forEach(category => {
      this.referenceService.getItems(category.key).subscribe({
        next: (items) => {
          this.categoryItemCounts[category.key] = items.length;
        },
        error: () => {
          this.categoryItemCounts[category.key] = 0;
        }
      });
    });
  }

  getCategoriesForModule(moduleKey: string): ReferenceCategory[] {
    return this.categories.filter(c => c.module === moduleKey);
  }

  getModuleLabel(moduleKey: string): string {
    const module = this.modules.find(m => m.key === moduleKey);
    return module ? module.label : moduleKey;
  }

  selectModule(moduleKey: string): void {
    this.selectedModule = moduleKey;
    this.selectedCategory = null;
    this.items = [];
  }

  selectCategory(category: ReferenceCategory): void {
    this.selectedCategory = category;
    this.loadItems();
  }

  loadItems(): void {
    if (!this.selectedCategory) return;
    
    this.loading = true;
    this.referenceService.getItems(this.selectedCategory.key).subscribe({
      next: (items) => {
        this.items = items;
        this.loading = false;
      },
      error: (err) => {
        this.notificationService.error('Erreur', 'Impossible de charger les données');
        this.loading = false;
      }
    });
  }

  getItemId(item: any): any {
    if (!this.selectedCategory) return '';
    return item[this.selectedCategory.idField];
  }

  getItemName(item: any): string {
    if (!item || !this.selectedCategory) return '';
    return item[this.selectedCategory.nameField] || '';
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingItem = null;
    this.itemForm.reset();
    this.showModal = true;
  }

  openEditModal(item: any): void {
    this.isEditMode = true;
    this.editingItem = item;
    this.itemForm.patchValue({
      name: this.getItemName(item)
    });
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingItem = null;
    this.itemForm.reset();
  }

  onSubmit(): void {
    if (this.itemForm.invalid || !this.selectedCategory) {
      this.itemForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    
    // Build data object with correct field name
    const data: any = {};
    data[this.selectedCategory.nameField] = this.itemForm.value.name;

    if (this.isEditMode && this.editingItem) {
      const id = this.getItemId(this.editingItem);
      // Include the ID field in the update payload for backend validation
      data[this.selectedCategory.idField] = id;
      this.referenceService.updateItem(this.selectedCategory.key, id, data).subscribe({
        next: () => {
          this.notificationService.success('Succès', 'Élément mis à jour avec succès');
          this.closeModal();
          this.loadItems();
          this.loadCategoryCounts();
          this.submitting = false;
        },
        error: (err) => {
          this.notificationService.error('Erreur', err.error?.message || err.error || 'Erreur lors de la mise à jour');
          this.submitting = false;
        }
      });
    } else {
      this.referenceService.createItem(this.selectedCategory.key, data).subscribe({
        next: () => {
          this.notificationService.success('Succès', 'Élément créé avec succès');
          this.closeModal();
          this.loadItems();
          this.loadCategoryCounts();
          this.submitting = false;
        },
        error: (err) => {
          this.notificationService.error('Erreur', err.error?.message || err.error || 'Erreur lors de la création');
          this.submitting = false;
        }
      });
    }
  }

  confirmDelete(item: any): void {
    this.itemToDelete = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.itemToDelete = null;
  }

  deleteItem(): void {
    if (!this.itemToDelete || !this.selectedCategory) return;

    this.submitting = true;
    const id = this.getItemId(this.itemToDelete);
    
    this.referenceService.deleteItem(this.selectedCategory.key, id).subscribe({
      next: () => {
        this.notificationService.success('Succès', 'Élément supprimé avec succès');
        this.closeDeleteModal();
        this.loadItems();
        this.loadCategoryCounts();
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
