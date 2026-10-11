import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { StockService } from '../services/stock.service';
import { ReferenceDataService, StockEntities, StockStatus, StockSupplier } from '../../../core/services/reference-data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-stock-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  template: `
    <div class="form-container">
      <app-page-header icon="stock" [title]="formTitle" subtitle="Article, quantités et fournisseur">
        <div class="header-actions">
          <button class="btn btn-print" (click)="printForm()" *ngIf="isViewMode" title="Imprimer / Télécharger PDF">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9V2h12v7"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimer
          </button>
          <button class="btn btn-secondary" (click)="cancel()">{{ isViewMode ? 'Retour' : 'Annuler' }}</button>
        </div>
      </app-page-header>

      <form [formGroup]="stockForm" (ngSubmit)="onSubmit()" class="card">
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="code">Code <span class="required">*</span></label>
              <input
                id="code"
                type="text"
                formControlName="code"
                [class.error]="stockForm.get('code')?.invalid && stockForm.get('code')?.touched"
              />
              <span class="error-message" *ngIf="stockForm.get('code')?.invalid && stockForm.get('code')?.touched">
                Le code est requis
              </span>
            </div>

            <div class="form-group">
              <label for="stockEntitiesId">Entité <span class="required">*</span></label>
              <select
                id="stockEntitiesId"
                formControlName="stockEntitiesId"
                [class.error]="stockForm.get('stockEntitiesId')?.invalid && stockForm.get('stockEntitiesId')?.touched"
              >
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let entity of entities" [value]="entity.id">
                  {{ entity.name }}
                </option>
              </select>
              <span class="error-message" *ngIf="stockForm.get('stockEntitiesId')?.invalid && stockForm.get('stockEntitiesId')?.touched">
                L'entité est requise
              </span>
            </div>

            <div class="form-group">
              <label for="stockStatusId">Statut <span class="required">*</span></label>
              <select
                id="stockStatusId"
                formControlName="stockStatusId"
                [class.error]="stockForm.get('stockStatusId')?.invalid && stockForm.get('stockStatusId')?.touched"
              >
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let status of statuses" [value]="status.id">
                  {{ status.statusName }}
                </option>
              </select>
              <span class="error-message" *ngIf="stockForm.get('stockStatusId')?.invalid && stockForm.get('stockStatusId')?.touched">
                Le statut est requis
              </span>
            </div>

            <div class="form-group">
              <label for="stockSupplierId">Fournisseur <span class="required">*</span></label>
              <select
                id="stockSupplierId"
                formControlName="stockSupplierId"
                [class.error]="stockForm.get('stockSupplierId')?.invalid && stockForm.get('stockSupplierId')?.touched"
              >
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let supplier of suppliers" [value]="supplier.id">
                  {{ supplier.supplierName }}
                </option>
              </select>
              <span class="error-message" *ngIf="stockForm.get('stockSupplierId')?.invalid && stockForm.get('stockSupplierId')?.touched">
                Le fournisseur est requis
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description <span class="required">*</span></label>
            <textarea
              id="description"
              formControlName="description"
              rows="4"
              [class.error]="stockForm.get('description')?.invalid && stockForm.get('description')?.touched"
              placeholder="Description du stock..."
            ></textarea>
            <span class="error-message" *ngIf="stockForm.get('description')?.invalid && stockForm.get('description')?.touched">
              La description est requise
            </span>
          </div>

          <div *ngIf="loading" class="loading-overlay">
            <span class="spinner"></span>
          </div>
        </div>

        <div class="card-footer">
          <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="loading">
            {{ isViewMode ? 'Retour' : 'Annuler' }}
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="stockForm.invalid || loading" *ngIf="!isViewMode">
            {{ isEditMode ? 'Mettre à jour' : 'Créer' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['../../../shared/styles/modern-form-design.scss']

})
export class StockFormComponent implements OnInit {

  get formTitle(): string {
    if (this.isViewMode) return 'Fiche stock';
    return this.isEditMode ? 'Modifier le stock' : 'Nouvel article en stock';
  }
  stockForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  stockId?: number;
  loading = false;

  // Reference data
  entities: StockEntities[] = [];
  statuses: StockStatus[] = [];
  suppliers: StockSupplier[] = [];

  constructor(
    private fb: FormBuilder,
    private stockService: StockService,
    private referenceDataService: ReferenceDataService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.stockForm = this.fb.group({
      code: ['', Validators.required],
      description: ['', Validators.required],
      stockEntitiesId: [null, Validators.required],
      stockStatusId: [null, Validators.required],
      stockSupplierId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
    
    // Check if view mode from route data
    this.isViewMode = this.route.snapshot.data['viewMode'] === true;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = !this.isViewMode;
      this.stockId = +id;
      this.loadStock(this.stockId);
      
      // Disable form in view mode
      if (this.isViewMode) {
        this.stockForm.disable();
      }
    }
  }

  loadReferenceData(): void {
    this.referenceDataService.getStockEntities().subscribe({
      next: (data) => this.entities = data
    });

    this.referenceDataService.getStockStatuses().subscribe({
      next: (data) => this.statuses = data
    });

    this.referenceDataService.getStockSuppliers().subscribe({
      next: (data) => this.suppliers = data
    });
  }

  loadStock(id: number): void {
    this.loading = true;
    this.stockService.getStock(id).subscribe({
      next: (stock) => {
        this.stockForm.patchValue({
          code: stock.code,
          description: stock.description,
          stockEntitiesId: stock.stockEntitiesId,
          stockStatusId: stock.stockStatusId,
          stockSupplierId: stock.stockSupplierId
        });
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Erreur', 'Impossible de charger le stock');
        this.loading = false;
        this.router.navigate(['/stock']);
      }
    });
  }

  onSubmit(): void {
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.stockForm.value;

    if (this.isEditMode && this.stockId) {
      this.stockService.updateStock(this.stockId, formValue).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Stock modifié avec succès'
          );
          this.router.navigate(['/stock']);
        },
        error: () => {
          this.notificationService.error(
            'Erreur',
            'Impossible de modifier le stock'
          );
          this.loading = false;
        }
      });
    } else {
      this.stockService.createStock(formValue).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Stock créé avec succès'
          );
          this.router.navigate(['/stock']);
        },
        error: () => {
          this.notificationService.error(
            'Erreur',
            'Impossible de créer le stock'
          );
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/stock']);
  }

  printForm(): void {
    window.print();
  }
}
