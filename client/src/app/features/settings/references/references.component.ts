import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
            <h1>
              <svg class="header-title-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Données de Référence
            </h1>
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
          <span class="tab-icon" [innerHTML]="getModuleIconSvg(module.icon)"></span>
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
            <div class="category-icon" [innerHTML]="getCategoryIconSvg(category.icon)"></div>
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
          <div class="no-selection-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 6h16M4 12h16M4 18h7"/>
              <circle cx="18" cy="18" r="3"/>
              <path d="M18 15v1.5"/>
              <path d="M18 19.5v.5"/>
            </svg>
          </div>
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
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .header-title-icon {
      color: #3b82f6;
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
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    }

    .tab-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    }

    .tab-icon svg {
      width: 20px;
      height: 20px;
      stroke: currentColor;
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
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-radius: 12px;
      transition: all 0.2s ease;
      color: #3b82f6;
    }

    .category-icon svg {
      width: 22px;
      height: 22px;
      stroke: currentColor;
    }

    .category-card.active .category-icon {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
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
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
    }

    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-primary.small {
      padding: 0.625rem 1.25rem;
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
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #ffffff;
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
      box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
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

    /* No Selection - Modern Empty State */
    .no-selection {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 16px;
      border: 2px dashed var(--steel-200);
      padding: 4rem 2rem;
      transition: all 0.3s ease;
    }

    .no-selection:hover {
      border-color: var(--primary);
      border-style: solid;
    }

    .no-selection-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .no-selection-icon {
      width: 80px;
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border-radius: 20px;
      margin-bottom: 1.5rem;
      color: #3b82f6;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    }

    .no-selection-content h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .no-selection-content p {
      margin: 0.75rem 0 0 0;
      color: var(--steel-500);
      font-size: 0.9375rem;
      max-width: 320px;
      line-height: 1.5;
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
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
    }

    .modal-header.delete {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: white;
      letter-spacing: -0.01em;
    }

    .close-btn {
      width: 36px;
      height: 36px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      font-size: 1.5rem;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }

    .modal-body {
      padding: 1.75rem 1.5rem;
      background: #ffffff;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-group label {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 0.625rem;
    }

    .form-group .required {
      color: #ef4444;
      font-weight: 500;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.9375rem;
      font-family: inherit;
      transition: all 0.2s ease;
      background: #f8fafc;
      color: #1e293b;
    }

    .form-group input::placeholder {
      color: #94a3b8;
    }

    .form-group input:hover,
    .form-group select:hover,
    .form-group textarea:hover {
      border-color: #cbd5e1;
      background: #ffffff;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #3b82f6;
      background: #ffffff;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
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
      color: #94a3b8;
    }

    .form-group .error {
      color: #ef4444;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-top: 0.5rem;
      display: block;
    }

    .warning-text {
      color: #dc2626;
      font-size: 0.875rem;
      margin-top: 0.75rem;
      padding: 0.75rem 1rem;
      background: #fef2f2;
      border-radius: 8px;
      border-left: 3px solid #ef4444;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.25rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .btn-secondary {
      padding: 0.75rem 1.5rem;
      background: white;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-secondary:hover {
      border-color: #cbd5e1;
      background: #f1f5f9;
      color: #475569;
    }

    .btn-danger {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
    { key: 'equipment', label: 'Équipement', icon: 'cog' },
    { key: 'interventions', label: 'Interventions', icon: 'wrench' },
    { key: 'resources', label: 'Ressources', icon: 'box' },
    { key: 'stock', label: 'Stock', icon: 'warehouse' }
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
    private router: Router,
    private sanitizer: DomSanitizer
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

  // Modern SVG Icons mapping for modules
  private moduleIcons: { [key: string]: string } = {
    'cog': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    'wrench': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    'box': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    'warehouse': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect x="6" y="10" width="12" height="12"/></svg>'
  };

  // Modern SVG Icons mapping for categories
  private categoryIcons: { [key: string]: string } = {
    'alert-triangle': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'settings': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    'folder': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    'layers': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    'award': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
    'cpu': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
    'activity': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    'tool': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    'zap': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'git-branch': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>',
    'alert-circle': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    'archive': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>',
    'hard-hat': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/><path d="M4 15v-3a6 6 0 0 1 6-6h0"/><path d="M14 6h0a6 6 0 0 1 6 6v3"/></svg>',
    'gauge': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>',
    'map-pin': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    'check-circle': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    'truck': '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>'
  };

  getModuleIconSvg(iconName: string): SafeHtml {
    const svg = this.moduleIcons[iconName] || this.moduleIcons['box'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getCategoryIconSvg(iconName: string): SafeHtml {
    const svg = this.categoryIcons[iconName] || this.categoryIcons['folder'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
