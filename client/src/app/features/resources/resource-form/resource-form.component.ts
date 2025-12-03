import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ResourceService } from '../services/resource.service';
import { ReferenceDataService, FamillePiece, Constructeur, CriticitePiece } from '../../../core/services/reference-data.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-resource-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="form-container">
      <div class="form-header">
        <h1>{{ isEditMode ? 'Modifier' : 'Nouvelle' }} Pièce</h1>
        <button class="btn btn-secondary" (click)="cancel()">Annuler</button>
      </div>

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
              <label for="prixUnitaire">Prix unitaire (€) <span class="required">*</span></label>
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
            Annuler
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="pieceForm.invalid || loading">
            {{ isEditMode ? 'Mettre à jour' : 'Créer' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['../../../shared/styles/modern-form-design.scss']

})
export class ResourceFormComponent implements OnInit {
  pieceForm: FormGroup;
  isEditMode = false;
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
      prixUnitaire: [0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.pieceId = +id;
      this.loadPiece(this.pieceId);
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
        error: () => {
          this.notificationService.error(
            'Erreur',
            'Impossible de modifier la pièce'
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
        error: () => {
          this.notificationService.error(
            'Erreur',
            'Impossible de créer la pièce'
          );
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/resources']);
  }
}
