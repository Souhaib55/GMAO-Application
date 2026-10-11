import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ResourceService } from '../services/resource.service';
import { ReferenceDataService, FamillePiece, Constructeur, CriticitePiece } from '../../../core/services/reference-data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-resource-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent],
  template: `
    <div class="form-container">
      <app-page-header icon="resources" [title]="formTitle" subtitle="Référence, famille, constructeur et quantité en stock">
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

      <form [formGroup]="pieceForm" (ngSubmit)="onSubmit()" class="card">
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="codePiece">Code pièce <span class="required">*</span></label>
              <input
                id="codePiece"
                type="text"
                formControlName="codePiece"
                [class.error]="pieceForm.get('codePiece')?.invalid && pieceForm.get('codePiece')?.touched"
              />
              <span class="error-message" *ngIf="pieceForm.get('codePiece')?.invalid && pieceForm.get('codePiece')?.touched">
                Le code est requis
              </span>
            </div>

            <div class="form-group">
              <label for="designation">Désignation <span class="required">*</span></label>
              <input
                id="designation"
                type="text"
                formControlName="designation"
                [class.error]="pieceForm.get('designation')?.invalid && pieceForm.get('designation')?.touched"
              />
              <span class="error-message" *ngIf="pieceForm.get('designation')?.invalid && pieceForm.get('designation')?.touched">
                La désignation est requise
              </span>
            </div>

            <div class="form-group">
              <label for="idFamillePiece">Famille</label>
              <select id="idFamillePiece" formControlName="idFamillePiece">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let famille of familles" [value]="famille.idFamillePiece">
                  {{ famille.nomFamille }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idConstructeur">Constructeur</label>
              <select id="idConstructeur" formControlName="idConstructeur">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let constructeur of constructeurs" [value]="constructeur.idConstructeur">
                  {{ constructeur.nomConstructeur }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idCriticitePiece">Criticité</label>
              <select id="idCriticitePiece" formControlName="idCriticitePiece">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let criticite of criticites" [value]="criticite.idCriticitePiece">
                  {{ criticite.niveauCriticitePiece }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="quantite_Stock">Quantité en stock <span class="required">*</span></label>
              <input
                id="quantite_Stock"
                type="number"
                formControlName="quantite_Stock"
                min="0"
                [class.error]="pieceForm.get('quantite_Stock')?.invalid && pieceForm.get('quantite_Stock')?.touched"
              />
              <span class="error-message" *ngIf="pieceForm.get('quantite_Stock')?.invalid && pieceForm.get('quantite_Stock')?.touched">
                La quantité est requise
              </span>
            </div>

            <div class="form-group">
              <label for="seuilMinimum">Seuil de réapprovisionnement</label>
              <input id="seuilMinimum" type="number" min="0" step="1" formControlName="seuilMinimum" />
              <small class="form-text">Une alerte « stock bas » s'affiche quand la quantité atteint ce seuil.</small>
              <span class="error-message" *ngIf="pieceForm.get('seuilMinimum')?.invalid">Le seuil ne peut pas être négatif.</span>
            </div>

            <div class="form-group">
              <label for="prixUnitaire">Prix unitaire (DT) <span class="required">*</span></label>
              <input
                id="prixUnitaire"
                type="number"
                step="0.01"
                formControlName="prixUnitaire"
                min="0"
                [class.error]="pieceForm.get('prixUnitaire')?.invalid && pieceForm.get('prixUnitaire')?.touched"
              />
              <span class="error-message" *ngIf="pieceForm.get('prixUnitaire')?.invalid && pieceForm.get('prixUnitaire')?.touched">
                Le prix est requis
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              placeholder="Description de la pièce..."
            ></textarea>
          </div>

          <div *ngIf="loading" class="loading-overlay">
            <span class="spinner"></span>
          </div>
        </div>

        <div class="card-footer">
          <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="loading">
            {{ isViewMode ? 'Retour' : 'Annuler' }}
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="pieceForm.invalid || loading" *ngIf="!isViewMode">
            {{ isEditMode ? 'Mettre à jour' : 'Créer' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['../../../shared/styles/modern-form-design.scss']

})
export class ResourceFormComponent implements OnInit {

  get formTitle(): string {
    if (this.isViewMode) return 'Fiche pièce';
    return this.isEditMode ? 'Modifier la pièce' : 'Nouvelle pièce';
  }
  pieceForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  pieceId?: number;
  loading = false;

  // Reference data
  familles: FamillePiece[] = [];
  constructeurs: Constructeur[] = [];
  criticites: CriticitePiece[] = [];

  constructor(
    private fb: FormBuilder,
    private resourceService: ResourceService,
    private referenceDataService: ReferenceDataService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.pieceForm = this.fb.group({
      codePiece: ['', Validators.required],
      designation: ['', Validators.required],
      description: [''],
      idFamillePiece: [null],
      idConstructeur: [null],
      idCriticitePiece: [null],
      quantite_Stock: [0, [Validators.required, Validators.min(0)]],
      seuilMinimum: [0, [Validators.min(0)]],
      prixUnitaire: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
    
    // Check if view mode from route data
    this.isViewMode = this.route.snapshot.data['viewMode'] === true;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = !this.isViewMode;
      this.pieceId = +id;
      this.loadPiece(this.pieceId);
      
      // Disable form in view mode
      if (this.isViewMode) {
        this.pieceForm.disable();
      }
    }
  }

  loadReferenceData(): void {
    this.referenceDataService.getFamillesPiece().subscribe({
      next: (data) => this.familles = data
    });

    this.referenceDataService.getConstructeurs().subscribe({
      next: (data) => this.constructeurs = data
    });

    this.referenceDataService.getCriticitesPiece().subscribe({
      next: (data) => this.criticites = data
    });
  }

  loadPiece(id: number): void {
    this.loading = true;
    this.resourceService.getPiece(id).subscribe({
      next: (piece) => {
        this.pieceForm.patchValue({
          codePiece: piece.codePiece,
          designation: piece.designation,
          description: piece.description,
          idFamillePiece: piece.idFamillePiece,
          idConstructeur: piece.idConstructeur,
          idCriticitePiece: piece.idCriticitePiece,
          quantite_Stock: piece.quantite_Stock,
          seuilMinimum: piece.seuilMinimum ?? 0,
          prixUnitaire: piece.prixUnitaire
        });
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Erreur', 'Impossible de charger la pièce');
        this.loading = false;
        this.router.navigate(['/resources']);
      }
    });
  }

  onSubmit(): void {
    if (this.pieceForm.invalid) {
      this.pieceForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.pieceForm.value;

    if (this.isEditMode && this.pieceId) {
      this.resourceService.updatePiece(this.pieceId, formValue).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Pièce modifiée avec succès'
          );
          this.router.navigate(['/resources']);
        },
        error: (err: any) => {
          this.notificationService.error(
            'Enregistrement impossible',
            (typeof err?.error === 'string' ? err.error : err?.error?.message) || 'Impossible de modifier la pièce'
          );
          this.loading = false;
        }
      });
    } else {
      this.resourceService.createPiece(formValue).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Pièce créée avec succès'
          );
          this.router.navigate(['/resources']);
        },
        error: (err: any) => {
          this.notificationService.error(
            'Enregistrement impossible',
            (typeof err?.error === 'string' ? err.error : err?.error?.message) || 'Impossible de créer la pièce'
          );
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/resources']);
  }

  printForm(): void {
    window.print();
  }
}
