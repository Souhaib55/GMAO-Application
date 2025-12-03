import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { InterventionService } from '../services/intervention.service';
import { ReferenceDataService, InterventionEtat, TypeIntervention, Urgence, ChaineProduction, Panne } from '../../../core/services/reference-data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-intervention-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="form-container">
      <div class="form-header">
        <h1>{{ isEditMode ? 'Modifier' : 'Nouvelle' }} Intervention</h1>
        <button class="btn btn-secondary" (click)="cancel()">Annuler</button>
      </div>

      <form [formGroup]="interventionForm" (ngSubmit)="onSubmit()" class="card">
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="titre">Titre <span class="required">*</span></label>
              <input
                id="titre"
                type="text"
                formControlName="titre"
                [class.error]="interventionForm.get('titre')?.invalid && interventionForm.get('titre')?.touched"
              />
              <span class="error-message" *ngIf="interventionForm.get('titre')?.invalid && interventionForm.get('titre')?.touched">
                Le titre est requis
              </span>
            </div>

            <div class="form-group">
              <label for="dateCreation">Date de création <span class="required">*</span></label>
              <input
                id="dateCreation"
                type="datetime-local"
                formControlName="dateCreation"
                [class.error]="interventionForm.get('dateCreation')?.invalid && interventionForm.get('dateCreation')?.touched"
              />
            </div>

            <div class="form-group">
              <label for="idTypeIntervention">Type d'intervention</label>
              <select id="idTypeIntervention" formControlName="idTypeIntervention">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let type of typesIntervention" [value]="type.idTypeIntervention">
                  {{ type.libelle }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idUrgence">Urgence</label>
              <select id="idUrgence" formControlName="idUrgence">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let urgence of urgences" [value]="urgence.idUrgence">
                  {{ urgence.libelle }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idChaineProduction">Chaîne de production</label>
              <select id="idChaineProduction" formControlName="idChaineProduction">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let chaine of chainesProduction" [value]="chaine.idChaineProduction">
                  {{ chaine.libelle }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idPanne">Type de panne</label>
              <select id="idPanne" formControlName="idPanne">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let panne of pannes" [value]="panne.idPanne">
                  {{ panne.libelle }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idEtat">État</label>
              <select id="idEtat" formControlName="idEtat">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let etat of etats" [value]="etat.idEtat">
                  {{ etat.libelle }}
                </option>
              </select>
            </div>

            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" formControlName="machineArretee" />
                Machine arrêtée
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              formControlName="description"
              rows="4"
              placeholder="Décrivez le problème ou la demande..."
            ></textarea>
          </div>

          <div class="form-group">
            <label for="file">Pièce jointe</label>
            <input
              id="file"
              type="file"
              (change)="onFileSelected($event)"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <small class="form-text">Formats acceptés: PDF, Word, Images (Max 10MB)</small>
          </div>

          <div *ngIf="selectedFile" class="file-preview">
            <span>📎 {{ selectedFile.name }}</span>
            <button type="button" class="btn-remove" (click)="removeFile()">✕</button>
          </div>

          <div *ngIf="loading" class="loading-overlay">
            <span class="spinner"></span>
          </div>
        </div>

        <div class="card-footer">
          <button type="button" class="btn btn-secondary" (click)="cancel()" [disabled]="loading">
            Annuler
          </button>
          <button type="submit" class="btn btn-primary" [disabled]="interventionForm.invalid || loading">
            {{ isEditMode ? 'Mettre à jour' : 'Créer' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['../../../shared/styles/modern-form-design.scss']

})
export class InterventionFormComponent implements OnInit {
  interventionForm: FormGroup;
  isEditMode = false;
  interventionId?: number;
  loading = false;
  selectedFile?: File;

  // Reference data
  etats: InterventionEtat[] = [];
  typesIntervention: TypeIntervention[] = [];
  urgences: Urgence[] = [];
  chainesProduction: ChaineProduction[] = [];
  pannes: Panne[] = [];

  constructor(
    private fb: FormBuilder,
    private interventionService: InterventionService,
    private referenceDataService: ReferenceDataService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.interventionForm = this.fb.group({
      titre: ['', Validators.required],
      dateCreation: [this.formatDateForInput(new Date()), Validators.required],
      idTypeIntervention: [null],
      idUrgence: [null],
      idChaineProduction: [null],
      idPanne: [null],
      idEtat: [null],
      machineArretee: [false],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.interventionId = +id;
      this.loadIntervention(this.interventionId);
    }
  }

  loadReferenceData(): void {
    this.referenceDataService.getInterventionEtats().subscribe({
      next: (data) => this.etats = data,
      error: () => this.notificationService.error('Erreur', 'Impossible de charger les états')
    });

    this.referenceDataService.getTypesIntervention().subscribe({
      next: (data) => this.typesIntervention = data,
      error: () => this.notificationService.error('Erreur', 'Impossible de charger les types')
    });

    this.referenceDataService.getUrgences().subscribe({
      next: (data) => this.urgences = data,
      error: () => this.notificationService.error('Erreur', 'Impossible de charger les urgences')
    });

    this.referenceDataService.getChainesProduction().subscribe({
      next: (data) => this.chainesProduction = data,
      error: () => this.notificationService.error('Erreur', 'Impossible de charger les chaînes')
    });

    this.referenceDataService.getPannes().subscribe({
      next: (data) => this.pannes = data,
      error: () => this.notificationService.error('Erreur', 'Impossible de charger les pannes')
    });
  }

  loadIntervention(id: number): void {
    this.loading = true;
    this.interventionService.getIntervention(id).subscribe({
      next: (intervention) => {
        this.interventionForm.patchValue({
          titre: intervention.titre,
          dateCreation: this.formatDateForInput(new Date(intervention.dateCreation)),
          idTypeIntervention: intervention.typeIntervention?.idTypeIntervention,
          idUrgence: intervention.urgence?.idUrgence,
          idChaineProduction: intervention.chaineProduction?.idChaineProduction,
          idPanne: intervention.panne?.idPanne,
          idEtat: intervention.etat?.idEtat,
          machineArretee: intervention.machineArretee,
          description: intervention.description
        });
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Erreur', 'Impossible de charger l\'intervention');
        this.loading = false;
        this.router.navigate(['/interventions']);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        this.notificationService.warning('Fichier trop volumineux', 'La taille maximum est de 10MB');
        input.value = '';
        return;
      }

      this.selectedFile = file;
    }
  }

  removeFile(): void {
    this.selectedFile = undefined;
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit(): void {
    if (this.interventionForm.invalid) {
      this.interventionForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.interventionForm.value;
    
    // Get current user ID for demandeursId
    const currentUser = this.authService.currentUser;
    const interventionData = {
      titre: formValue.titre,
      dateCreation: new Date(formValue.dateCreation).toISOString(),
      machineArretee: formValue.machineArretee || false,
      idEtat: formValue.idEtat || null,
      idTypeIntervention: formValue.idTypeIntervention || null,
      idUrgence: formValue.idUrgence || null,
      idChaineProduction: formValue.idChaineProduction || null,
      idPanne: formValue.idPanne || null,
      demandeursId: currentUser?.internalId,
      destinatairesId: formValue.destinatairesId || null,
      description: formValue.description || ''
    };

    if (this.isEditMode && this.interventionId) {
      this.interventionService.updateIntervention(this.interventionId, interventionData, this.selectedFile).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Intervention modifiée avec succès'
          );
          this.router.navigate(['/interventions']);
        },
        error: () => {
          this.notificationService.error(
            'Erreur',
            'Impossible de modifier l\'intervention'
          );
          this.loading = false;
        }
      });
    } else {
      this.interventionService.createIntervention(interventionData, this.selectedFile).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Intervention créée avec succès'
          );
          this.router.navigate(['/interventions']);
        },
        error: () => {
          this.notificationService.error(
            'Erreur',
            'Impossible de créer l\'intervention'
          );
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/interventions']);
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
