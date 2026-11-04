import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ReferenceManagementService, ReferenceCategory } from '../services/reference-management.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';

import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-references',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageHeaderComponent, AppIconComponent],
  template: `
    <div class="gm-page">
      <app-page-header icon="references" title="Listes de choix"
                       subtitle="Les choix proposés dans les formulaires (chaînes, types de pannes, familles…). Une modification ici est reprise partout.">
        <button class="btn btn-secondary" (click)="goBack()"><app-icon name="chevron-left"></app-icon> Paramètres</button>
      </app-page-header>

      <div class="gm-tabs">
        <button *ngFor="let module of modules" [class.on]="selectedModule === module.key" (click)="selectModule(module.key)">
          <app-icon [name]="module.icon"></app-icon> {{ module.label }}
          <span class="count">{{ getCategoriesForModule(module.key).length }}</span>
        </button>
      </div>

      <div class="ref-layout">
        <!-- Lists of the module -->
        <nav class="ref-nav" aria-label="Listes">
          <div class="nav-title">Listes · {{ getModuleLabel(selectedModule) }}</div>
          <ng-container *ngFor="let category of frequentCategories">
            <ng-container *ngTemplateOutlet="navItem; context: { $implicit: category }"></ng-container>
          </ng-container>
          <!-- Lists changed rarely: folded, so the common ones stay easy to find -->
          <ng-container *ngIf="rareCategories.length">
            <button type="button" class="more-toggle" [attr.aria-expanded]="showRare" (click)="showRare = !showRare">
              <app-icon [name]="showRare ? 'chevron-left' : 'chevron-right'"></app-icon>
              {{ showRare ? 'Masquer les autres listes' : 'Autres listes (' + rareCategories.length + ')' }}
            </button>
            <ng-container *ngIf="showRare">
              <ng-container *ngFor="let category of rareCategories">
                <ng-container *ngTemplateOutlet="navItem; context: { $implicit: category }"></ng-container>
              </ng-container>
            </ng-container>
          </ng-container>
          <ng-template #navItem let-category>
            <button type="button" class="nav-item" [class.on]="selectedCategory?.key === category.key" (click)="selectCategory(category)"
                    [attr.aria-current]="selectedCategory?.key === category.key ? 'true' : null">
              <span class="nav-icon" [innerHTML]="getCategoryIconSvg(category.icon)"></span>
              <span class="nav-text"><b>{{ category.label }}</b><small>{{ category.description }}</small></span>
              <span class="nav-count">{{ countLabel(category.key) }}</span>
            </button>
          </ng-template>
        </nav>

        <!-- Items of the selected list -->
        <section class="gm-card ref-panel">
          <ng-container *ngIf="selectedCategory as c; else pick">
            <div class="panel-head">
              <div>
                <span class="eyebrow">{{ getModuleLabel(selectedModule) }}</span>
                <h2>{{ c.label }}</h2>
                <p>{{ c.description }} · {{ items.length }} élément{{ items.length > 1 ? 's' : '' }}</p>
              </div>
              <button class="btn btn-primary" (click)="openCreateModal()"><app-icon name="plus"></app-icon> Ajouter</button>
            </div>

            <div class="list-search" *ngIf="!loading && items.length > 5">
              <span class="gm-search"><app-icon name="search"></app-icon>
                <input type="search" [(ngModel)]="filtre" placeholder="Rechercher dans la liste…" [attr.aria-label]="'Rechercher dans ' + c.label">
              </span>
            </div>

            <div class="gm-loading" *ngIf="loading"><span class="spinner"></span> Chargement…</div>

            <div class="gm-empty" *ngIf="!loading && !items.length">
              <app-icon name="list"></app-icon>
              <strong>Liste vide</strong>
              <span>Ajoutez le premier élément : il sera proposé dans les formulaires.</span>
              <button class="btn btn-primary btn-sm mt-1" (click)="openCreateModal()"><app-icon name="plus"></app-icon> Ajouter</button>
            </div>

            <div class="gm-empty" *ngIf="!loading && items.length && !filteredItems.length">
              <app-icon name="search"></app-icon>
              <strong>Aucun élément ne correspond à « {{ filtre }} »</strong>
              <button class="btn btn-secondary btn-sm mt-1" (click)="filtre = ''">Effacer la recherche</button>
            </div>

            <ul class="item-list" *ngIf="!loading && filteredItems.length">
              <li *ngFor="let item of filteredItems; let i = index">
                <span class="item-index">{{ i + 1 }}</span>
                <span class="item-name">{{ getItemName(item) }}</span>
                <span class="item-actions">
                  <button class="gm-icon-btn" (click)="openEditModal(item)" title="Modifier" [attr.aria-label]="'Modifier ' + getItemName(item)"><app-icon name="edit"></app-icon></button>
                  <button class="gm-icon-btn danger" (click)="confirmDelete(item)" title="Supprimer" [attr.aria-label]="'Supprimer ' + getItemName(item)"><app-icon name="trash"></app-icon></button>
                </span>
              </li>
            </ul>
          </ng-container>
          <ng-template #pick>
            <div class="gm-empty"><app-icon name="list"></app-icon><strong>Choisissez une liste</strong><span>Sélectionnez une liste à gauche pour voir et modifier ses éléments.</span></div>
          </ng-template>
        </section>
      </div>

      <!-- Create / edit -->
      <ng-container *ngIf="showModal">
        <div class="gm-backdrop" (click)="closeModal()"></div>
        <div class="gm-dialog" role="dialog">
          <div class="gm-drawer-head">
            <div>
              <h2>{{ isEditMode ? 'Modifier' : 'Ajouter' }} un élément</h2>
              <div class="sub">{{ selectedCategory?.label }}</div>
            </div>
          </div>
          <form class="gm-drawer-body" [formGroup]="itemForm" (ngSubmit)="onSubmit()" id="refForm">
            <div class="gm-field">
              <label for="refName">Libellé<span class="req">*</span></label>
              <input id="refName" type="text" formControlName="name" placeholder="Nom affiché dans les listes de choix" maxlength="100">
              <span class="err" *ngIf="itemForm.get('name')?.invalid && itemForm.get('name')?.touched">Le libellé est requis.</span>
            </div>
          </form>
          <div class="gm-drawer-foot">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Annuler</button>
            <button type="submit" form="refForm" class="btn btn-primary" [disabled]="itemForm.invalid || submitting">
              {{ submitting ? 'Enregistrement…' : (isEditMode ? 'Enregistrer' : 'Ajouter') }}
            </button>
          </div>
        </div>
      </ng-container>

    </div>
  `,
  styles: [`
    :host { --burgundy: #8c1c2b; --navy: #13254b; }

    .ref-layout { display: grid; grid-template-columns: 310px minmax(0, 1fr); gap: 16px; align-items: start; }
    @media (max-width: 900px) { .ref-layout { grid-template-columns: 1fr; } }

    .ref-nav {
      position: sticky; top: 12px;
      display: flex; flex-direction: column; gap: 2px; padding: 8px;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
    }
    .nav-title { padding: 8px 10px 6px; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
    .nav-item {
      position: relative; display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 10px; border: 0; border-radius: 10px; background: none;
      font: inherit; text-align: left; cursor: pointer;
      transition: background-color 0.15s;
    }
    .nav-item:hover { background: var(--gray-50); }
    .nav-item.on { background: #eef3fd; }
    .nav-item.on::before { content: ''; position: absolute; left: -8px; top: 10px; bottom: 10px; width: 3px; border-radius: 0 3px 3px 0; background: var(--burgundy); }
    .nav-icon {
      width: 36px; height: 36px; flex-shrink: 0; border-radius: 50%;
      display: grid; place-items: center; background: #e3ecfb; color: var(--navy);
    }
    .nav-item.on .nav-icon { background: var(--surface); box-shadow: 0 2px 8px -2px rgba(30, 70, 140, 0.2); }
    .nav-icon ::ng-deep svg { width: 18px; height: 18px; stroke-width: 1.7; }
    .nav-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .nav-text b { font-size: 0.85rem; font-weight: 600; color: var(--navy); }
    .nav-text small { font-size: 0.74rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nav-count {
      min-width: 26px; height: 22px; padding: 0 7px; border-radius: 999px;
      display: grid; place-items: center;
      background: var(--gray-100); color: var(--gray-600); font-size: 0.72rem; font-weight: 600; font-variant-numeric: tabular-nums;
    }
    .nav-item.on .nav-count { background: var(--burgundy); color: #fff; }

    .ref-panel { padding: 0; overflow: hidden; }
    .panel-head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
      padding: 20px 22px; border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, #f6f9fe, var(--surface));
    }
    .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--burgundy); }
    .eyebrow::before { content: ''; width: 14px; height: 2px; border-radius: 2px; background: var(--burgundy); }
    .panel-head h2 { margin: 6px 0 0; font-size: 1.25rem; font-weight: 700; color: var(--navy); letter-spacing: -0.01em; }
    .panel-head p { margin: 4px 0 0; font-size: 0.84rem; color: var(--text-secondary); }

    .item-list { list-style: none; margin: 0; padding: 4px 0; }
    .item-list li { display: flex; align-items: center; gap: 14px; padding: 10px 22px; border-bottom: 1px solid var(--border); }
    .item-list li:last-child { border-bottom: 0; }
    .item-list li:hover { background: var(--gray-50); }
    .item-index {
      width: 26px; height: 26px; flex-shrink: 0; border-radius: 8px;
      display: grid; place-items: center;
      background: var(--gray-100); color: var(--gray-600); font-size: 0.72rem; font-weight: 600; font-variant-numeric: tabular-nums;
    }
    .item-name { flex: 1; min-width: 0; font-size: 0.9rem; font-weight: 500; color: var(--text); }
    .item-actions { display: inline-flex; gap: 2px; opacity: 0.6; transition: opacity 0.15s; }
    .item-list li:hover .item-actions, .item-actions:focus-within { opacity: 1; }
    @media (hover: none) { .item-actions { opacity: 1; } }

    .more-toggle { display: flex; align-items: center; gap: 6px; width: 100%; margin-top: 4px; padding: 10px; border: 0; border-top: 1px solid var(--gray-100); background: none; font: inherit; font-size: 0.8125rem; font-weight: 500; color: var(--primary-700); cursor: pointer; text-align: left; border-radius: 0 0 8px 8px; }
    .more-toggle:hover { background: var(--gray-50); }
    .list-search { padding: 12px 22px 0; }
    .list-search .gm-search { max-width: 360px; }
    @media (pointer: coarse) { .more-toggle { min-height: 44px; } }
    .confirm-text { margin: 0; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; }
  `]
})
export class ReferencesComponent implements OnInit {
  private readonly confirmDialog = inject(ConfirmService);
  modules = [
    { key: 'equipment', label: 'Machines et chaînes', icon: 'equipment' },
    { key: 'interventions', label: 'Interventions', icon: 'interventions' },
    // Lists used by the Magasin article form. The old "Stock" lists (entities, statuses, suppliers)
    // were replaced by Magasin > Magasins and Achats > Fournisseurs, so they are not offered here.
    { key: 'resources', label: 'Magasin', icon: 'stock' }
  ];

  selectedModule = 'equipment';
  selectedCategory: ReferenceCategory | null = null;
  
  categories: ReferenceCategory[] = [];
  items: any[] = [];
  categoryItemCounts: { [key: string]: number | undefined } = {};
  filtre = '';
  showRare = false;

  get frequentCategories(): ReferenceCategory[] { return this.getCategoriesForModule(this.selectedModule).filter(c => c.frequent); }
  get rareCategories(): ReferenceCategory[] { return this.getCategoriesForModule(this.selectedModule).filter(c => !c.frequent); }

  /** Items of the open list matching the search (accents and case ignored). */
  get filteredItems(): any[] {
    const n = (x: string) => (x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const f = n(this.filtre.trim());
    return f ? this.items.filter(i => n(this.getItemName(i)).includes(f)) : this.items;
  }

  countLabel(key: string): string { const c = this.categoryItemCounts[key]; return c === undefined ? '–' : String(c); }
  
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
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {
    this.itemForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadCategories();

    // Deep link from the settings hub: /settings/references?category=<key>
    const key = this.route.snapshot.queryParamMap.get('category');
    const category = key ? this.categories.find(c => c.key === key) : undefined;
    if (category) {
      this.selectedModule = category.module;
      this.selectCategory(category);
    } else {
      this.selectModule(this.selectedModule);
    }
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

  /** Opens the module on its first list, so the page never shows an empty panel. */
  selectModule(moduleKey: string): void {
    this.selectedModule = moduleKey;
    this.showRare = false;
    this.selectedCategory = null;
    this.items = [];
    const first = this.frequentCategories[0] ?? this.getCategoriesForModule(moduleKey)[0];
    if (first) this.selectCategory(first);
  }

  selectCategory(category: ReferenceCategory): void {
    this.selectedCategory = category;
    this.filtre = '';
    // A rare list opened by a link stays visible in the menu
    if (!category.frequent) this.showRare = true;
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

  async confirmDelete(item: any): Promise<void> {
    const ok = await this.confirmDialog.ask({
      title: `Supprimer « ${this.getItemName(item)} » ?`,
      message: 'Cet élément ne sera plus proposé dans les formulaires.'
    });
    if (!ok) return;
    this.itemToDelete = item;
    this.deleteItem();
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

  getCategoryIconSvg(iconName: string): SafeHtml {
    const svg = this.categoryIcons[iconName] || this.categoryIcons['folder'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
