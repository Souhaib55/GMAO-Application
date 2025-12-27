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
    <div class="form-container" [class.view-mode]="isViewMode">
      <div class="form-header">
        <h1>{{ isViewMode ? 'Détails' : (isEditMode ? 'Modifier' : 'Nouvelle') }} Intervention</h1>
        <div class="header-actions">
          <button class="btn btn-print" (click)="printForm()" *ngIf="isViewMode" title="Imprimer / Télécharger PDF">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9V2h12v7"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimer
          </button>
          <button class="btn btn-secondary" (click)="cancel()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            {{ isViewMode ? 'Retour' : 'Annuler' }}
          </button>
        </div>
      </div>

      <form [formGroup]="interventionForm" (ngSubmit)="onSubmit()" class="card" id="intervention-form-print">
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="titre">Titre <span class="required" *ngIf="!isViewMode">*</span></label>
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
              <label for="dateCreation">Date de création <span class="required" *ngIf="!isViewMode">*</span></label>
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
              <label class="checkbox-label">
                <input type="checkbox" formControlName="machineArretee" />
                <span class="checkbox-text">Machine arrêtée</span>
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

          <div class="form-group" *ngIf="!isViewMode">
            <label for="file">Pièce jointe</label>
            <input
              id="file"
              type="file"
              (change)="onFileSelected($event)"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.bmp,.zip,.rar"
            />
            <small class="form-text">Formats acceptés: PDF, Word, Excel, Text, Images, Archives (Max 10MB)</small>
          </div>

          <div *ngIf="existingFileName && !selectedFile" class="file-preview existing-file" [class.clickable]="isViewMode" (click)="isViewMode && downloadExistingFile()">
            <div class="file-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>Fichier existant: {{ existingFileName }}</span>
            </div>
            <button type="button" class="btn-download" (click)="downloadExistingFile(); $event.stopPropagation()" *ngIf="isViewMode" title="Télécharger le fichier">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Télécharger
            </button>
            <button type="button" class="btn-remove" (click)="removeExistingFile()" title="Supprimer le fichier existant" *ngIf="!isViewMode">✕</button>
          </div>

          <div *ngIf="selectedFile" class="file-preview">
            <div class="file-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span>{{ selectedFile.name }}</span>
            </div>
            <button type="button" class="btn-remove" (click)="removeFile()" *ngIf="!isViewMode">✕</button>
          </div>

          <div *ngIf="loading" class="loading-overlay">
            <span class="spinner"></span>
          </div>
        </div>

        <div class="card-footer" *ngIf="!isViewMode">
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
  styles: [`
    .header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .btn-print {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
    
    .btn-print:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    .btn svg {
      flex-shrink: 0;
    }
    
    .file-preview {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      margin-top: 16px;
    }
    
    .file-preview.clickable {
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .file-preview.clickable:hover {
      background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #0369a1;
      font-weight: 600;
      font-size: 15px;
    }
    
    .file-info svg {
      color: #0ea5e9;
    }
    
    .btn-download {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #0ea5e9;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-download:hover {
      background: #0284c7;
    }
    
    .btn-remove {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fef2f2;
      color: #ef4444;
      border: 1px solid #fecaca;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-remove:hover {
      background: #ef4444;
      color: white;
    }
    
    .checkbox-group {
      display: flex;
      align-items: center;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      padding: 12px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      transition: all 0.2s;
    }
    
    .checkbox-label:hover {
      background: #f1f5f9;
    }
    
    .checkbox-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
    
    .checkbox-text {
      font-size: 14px;
      font-weight: 500;
      color: #475569;
    }
    
    /* View mode specific styles */
    :host-context(.view-mode) .form-group input:disabled,
    :host-context(.view-mode) .form-group select:disabled,
    :host-context(.view-mode) .form-group textarea:disabled {
      background: #ffffff !important;
      color: #1e293b !important;
      font-weight: 500 !important;
      font-size: 15px !important;
      border-color: #e2e8f0 !important;
      opacity: 1 !important;
    }
    
    .view-mode .card-body {
      background: #ffffff;
    }
    
    @media print {
      .form-header,
      .btn-print,
      .btn-secondary,
      .btn-download,
      .btn-remove {
        display: none !important;
      }
      
      .form-container {
        padding: 0;
        background: white;
      }
      
      .card {
        box-shadow: none;
        border: none;
      }
      
      .form-group input:disabled,
      .form-group select:disabled,
      .form-group textarea:disabled {
        border: 1px solid #ccc !important;
        background: #f9f9f9 !important;
      }
    }
  `],
  styleUrls: ['../../../shared/styles/modern-form-design.scss']

})
export class InterventionFormComponent implements OnInit {
  interventionForm: FormGroup;
  isEditMode = false;
  isViewMode = false;
  interventionId?: number;
  loading = false;
  selectedFile?: File;
  existingFileName?: string;
  fileRemoved = false; // Track if user explicitly removed existing file
  hadOriginalFile = false; // Track if intervention originally had a file
  removeExistingFileFlag = false;

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
    
    // Check if view mode from route data
    this.isViewMode = this.route.snapshot.data['viewMode'] === true;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = !this.isViewMode;
      this.interventionId = +id;
      this.loadIntervention(this.interventionId);
      
      // Disable form in view mode
      if (this.isViewMode) {
        this.interventionForm.disable();
      }
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
        // Load existing file name if present
        if (intervention.fileName) {
          this.existingFileName = intervention.fileName;
        }
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Erreur', 'Impossible de charger l\'intervention');
        this.loading = false;
        this.router.navigate(['/interventions']);
      }
    });
  }

  removeExistingFile(): void {
    this.existingFileName = undefined;
    this.removeExistingFileFlag = true;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.notificationService.warning('Fichier trop volumineux', 'La taille maximum est de 10MB');
        input.value = '';
        return;
      }

      // Validate file extension
      const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
      const fileName = file.name.toLowerCase();
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
      if (!allowedExtensions.includes(fileExtension)) {
        this.notificationService.warning('Type de fichier non autorisé', `Types acceptés: ${allowedExtensions.join(', ')}`);
        input.value = '';
        return;
      }

      this.selectedFile = file;
      this.fileRemoved = false; // Reset flag when uploading new file
      this.removeExistingFileFlag = false; // Also reset this flag
    }
  }

  removeFile(): void {
    this.selectedFile = undefined;
    // Only mark for deletion if there was actually an existing file
    if (this.hadOriginalFile && this.isEditMode) {
      this.fileRemoved = true;
    }
    this.existingFileName = undefined;
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
    
    // Helper function to convert form value to integer or null
    const toIntOrNull = (value: any): number | null => {
      if (value === null || value === undefined || value === '' || value === 'null') {
        return null;
      }
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? null : parsed;
    };
    
    const interventionData = {
      titre: formValue.titre,
      dateCreation: new Date(formValue.dateCreation).toISOString(),
      machineArretee: formValue.machineArretee || false,
      idEtat: toIntOrNull(formValue.idEtat),
      idTypeIntervention: toIntOrNull(formValue.idTypeIntervention),
      idUrgence: toIntOrNull(formValue.idUrgence),
      idChaineProduction: toIntOrNull(formValue.idChaineProduction),
      idPanne: toIntOrNull(formValue.idPanne),
      demandeursId: currentUser?.internalId,
      destinatairesId: toIntOrNull(formValue.destinatairesId),
      description: formValue.description || ''
    };

    if (this.isEditMode && this.interventionId) {
      // If user removed existing file, we need to signal backend
      if (this.removeExistingFileFlag && !this.selectedFile) {
        // Send update with fileName="" to signal file removal
        const formData = new FormData();
        formData.append('interventionData', JSON.stringify({
          ...interventionData,
          idDemandeIntervention: this.interventionId
        }));
        formData.append('fileName', ''); // Signal to remove file
        
        this.interventionService.updateInterventionWithFormData(this.interventionId, formData).subscribe({
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
      }
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

  downloadExistingFile(): void {
    if (!this.interventionId) return;
    
    this.interventionService.downloadFile(this.interventionId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.existingFileName || 'fichier';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.notificationService.error('Erreur', 'Impossible de télécharger le fichier');
      }
    });
  }

  printForm(): void {
    window.print();
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
