import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EquipmentService } from '../services/equipment.service';
import { ReferenceDataService, EquipmentCriticite, EtatEquipement, FamilleEquipement, GroupeEquipement, ModeleEquipement } from '../../../core/services/reference-data.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-equipment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="form-container">
      <div class="form-header">
        <h1>{{ isEditMode ? 'Modifier' : 'Nouvel' }} Équipement</h1>
        <button class="btn btn-secondary" (click)="cancel()">Annuler</button>
      </div>

      <form [formGroup]="equipmentForm" (ngSubmit)="onSubmit()" class="card">
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label for="codeEquipement">Code équipement <span class="required">*</span></label>
              <input
                id="codeEquipement"
                type="text"
                formControlName="codeEquipement"
                [class.error]="equipmentForm.get('codeEquipement')?.invalid && equipmentForm.get('codeEquipement')?.touched"
              />
              <span class="error-message" *ngIf="equipmentForm.get('codeEquipement')?.invalid && equipmentForm.get('codeEquipement')?.touched">
                Le code est requis
              </span>
            </div>

            <div class="form-group">
              <label for="designation">Désignation <span class="required">*</span></label>
              <input
                id="designation"
                type="text"
                formControlName="designation"
                [class.error]="equipmentForm.get('designation')?.invalid && equipmentForm.get('designation')?.touched"
              />
              <span class="error-message" *ngIf="equipmentForm.get('designation')?.invalid && equipmentForm.get('designation')?.touched">
                La désignation est requise
              </span>
            </div>

            <div class="form-group">
              <label for="idCriticite">Criticité</label>
              <select id="idCriticite" formControlName="idCriticite">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let criticite of criticites" [value]="criticite.idCriticite">
                  {{ criticite.nomCriticite }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idEtat">État</label>
              <select id="idEtat" formControlName="idEtat">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let etat of etats" [value]="etat.idEtat">
                  {{ etat.nomEtat }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idFamille">Famille</label>
              <select id="idFamille" formControlName="idFamille">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let famille of familles" [value]="famille.idFamille">
                  {{ famille.nomFamille }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idGroupe">Groupe</label>
              <select id="idGroupe" formControlName="idGroupe">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let groupe of groupes" [value]="groupe.idGroupe">
                  {{ groupe.nomGroupe }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="idModele">Modèle</label>
              <select id="idModele" formControlName="idModele">
                <option [value]="null">-- Sélectionner --</option>
                <option *ngFor="let modele of modeles" [value]="modele.idModele">
                  {{ modele.nomModele }} {{ modele.marque ? '(' + modele.marque.nomMarque + ')' : '' }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="numeroSerie">Numéro de série</label>
              <input id="numeroSerie" type="text" formControlName="numeroSerie" />
            </div>

            <div class="form-group">
              <label for="dateInstallation">Date d'installation</label>
              <input id="dateInstallation" type="date" formControlName="dateInstallation" />
            </div>

            <div class="form-group">
              <label for="dateMiseEnService">Date de mise en service</label>
              <input id="dateMiseEnService" type="date" formControlName="dateMiseEnService" />
            </div>

            <div class="form-group">
              <label for="dateAchat">Date d'achat</label>
              <input id="dateAchat" type="date" formControlName="dateAchat" />
            </div>

            <div class="form-group">
              <label for="dateConstruction">Date de construction</label>
              <input id="dateConstruction" type="date" formControlName="dateConstruction" />
            </div>

            <div class="form-group">
              <label for="coutAchat">Coût d'achat (€)</label>
              <input id="coutAchat" type="number" step="0.01" formControlName="coutAchat" />
            </div>

            <div class="form-group checkbox-group">
              <label>
                <input type="checkbox" formControlName="sousGarantie" />
                Sous garantie
              </label>
            </div>

            <div class="form-group" *ngIf="equipmentForm.get('sousGarantie')?.value">
              <label for="dateFinGarantie">Date fin de garantie</label>
              <input id="dateFinGarantie" type="date" formControlName="dateFinGarantie" />
            </div>
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea
              id="description"
              formControlName="description"
              rows="3"
              placeholder="Description de l'équipement..."
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
          <button type="submit" class="btn btn-primary" [disabled]="equipmentForm.invalid || loading">
            {{ isEditMode ? 'Mettre à jour' : 'Créer' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['../../../shared/styles/modern-form-design.scss']

})
export class EquipmentFormComponent implements OnInit {
  equipmentForm: FormGroup;
  isEditMode = false;
  equipmentId?: number;
  loading = false;

  // Reference data
  criticites: EquipmentCriticite[] = [];
  etats: EtatEquipement[] = [];
  familles: FamilleEquipement[] = [];
  groupes: GroupeEquipement[] = [];
  modeles: ModeleEquipement[] = [];

  constructor(
    private fb: FormBuilder,
    private equipmentService: EquipmentService,
    private referenceDataService: ReferenceDataService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.equipmentForm = this.fb.group({
      codeEquipement: ['', Validators.required],
      designation: ['', Validators.required],
      description: [''],
      idCriticite: [null],
      idEtat: [null],
      idFamille: [null],
      idGroupe: [null],
      idModele: [null],
      numeroSerie: [''],
      dateInstallation: [null],
      dateMiseEnService: [null],
      dateAchat: [null],
      dateConstruction: [null],
      coutAchat: [null],
      sousGarantie: [false],
      dateFinGarantie: [null]
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.equipmentId = +id;
      this.loadEquipment(this.equipmentId);
    }
  }

  loadReferenceData(): void {
    this.referenceDataService.getEquipmentCriticites().subscribe({
      next: (data) => this.criticites = data
    });

    this.referenceDataService.getEtatEquipements().subscribe({
      next: (data) => this.etats = data
    });

    this.referenceDataService.getFamillesEquipement().subscribe({
      next: (data) => this.familles = data
    });

    this.referenceDataService.getGroupesEquipement().subscribe({
      next: (data) => this.groupes = data
    });

    this.referenceDataService.getModelesEquipement().subscribe({
      next: (data) => this.modeles = data
    });
  }

  loadEquipment(id: number): void {
    this.loading = true;
    this.equipmentService.getEquipment(id).subscribe({
      next: (equipment) => {
        this.equipmentForm.patchValue({
          codeEquipement: equipment.codeEquipement,
          designation: equipment.designation,
          description: equipment.description,
          idCriticite: equipment.idCriticite,
          idEtat: equipment.idEtat,
          idFamille: equipment.idFamille,
          idGroupe: equipment.idGroupe,
          idModele: equipment.idModele,
          numeroSerie: equipment.numeroSerie,
          dateInstallation: this.formatDateForInput(equipment.dateInstallation),
          dateMiseEnService: this.formatDateForInput(equipment.dateMiseEnService),
          dateAchat: this.formatDateForInput(equipment.dateAchat),
          dateConstruction: this.formatDateForInput(equipment.dateConstruction),
          coutAchat: equipment.coutAchat,
          sousGarantie: equipment.sousGarantie,
          dateFinGarantie: this.formatDateForInput(equipment.dateFinGarantie)
        });
        this.loading = false;
      },
      error: () => {
        this.notificationService.error('Erreur', 'Impossible de charger l\'équipement');
        this.loading = false;
        this.router.navigate(['/equipment']);
      }
    });
  }

  onSubmit(): void {
    if (this.equipmentForm.invalid) {
      this.equipmentForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formValue = this.equipmentForm.value;

    if (this.isEditMode && this.equipmentId) {
      this.equipmentService.updateEquipment(this.equipmentId, formValue).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Équipement modifié avec succès'
          );
          this.router.navigate(['/equipment']);
        },
        error: () => {
          this.notificationService.error(
            'Erreur',
            'Impossible de modifier l\'équipement'
          );
          this.loading = false;
        }
      });
    } else {
      this.equipmentService.createEquipment(formValue).subscribe({
        next: () => {
          this.notificationService.success(
            'Succès',
            'Équipement créé avec succès'
          );
          this.router.navigate(['/equipment']);
        },
        error: () => {
          this.notificationService.error(
            'Erreur',
            'Impossible de créer l\'équipement'
          );
          this.loading = false;
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/equipment']);
  }

  private formatDateForInput(date?: Date | string): string | null {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
}
