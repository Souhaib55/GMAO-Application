import { Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-equipment-button',
  templateUrl: './equipment-button.component.html',
  styleUrls: ['./equipment-button.component.scss']
})
export class EquipmentButtonComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  private baseUrl = 'https://localhost:5001/api/Equipment';
  private familleBaseUrl = 'https://localhost:5001/api/FamilleEquipment';
  private criticiteBaseUrl = 'https://localhost:5001/api/EquipmentCriticite';
  private etatBaseUrl = 'https://localhost:5001/api/EtatEquipement';
  private modeleBaseUrl = 'https://localhost:5001/api/ModeleEquipement';
  private groupeBaseUrl = 'https://localhost:5001/api/GroupeEquipement';

  equipmentForm: FormGroup;
  familleList: FamilleEquipment[] = [];
  criticiteList: EquipmentCriticite[] = [];
  etatList: EtatEquipment[] = [];
  modeleList: ModeleEquipment[] = [];
  groupeList: GroupeEquipment[] = [];
  isEditMode = false;
  isSubmitting = false;
  errorMessage = '';

  constructor() {
    this.equipmentForm = this.fb.group({
      idEquipement: [0],
      codeEquipement: ['', Validators.required],
      designation: ['', Validators.required],
      description: [''],
      idCriticite: [null, Validators.required],
      idEtat: [null, Validators.required],
      idFamille: [null, Validators.required],
      idModele: [null, Validators.required],
      idGroupe: [null, Validators.required],
      dateInstallation: [null],
      dateMiseEnService: [null],
      numeroSerie: [''],
      sousGarantie: [false],
      dateAchat: [null],
      dateFinGarantie: [null],
      dateConstruction: [null],
      coutAchat: [null],
      dateCreation: [new Date(), Validators.required],
      dateModification: [null],
      isDeleted: [false]
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.loadEquipment(+id);
      }
    });
  }

  private loadReferenceData(): void {
    forkJoin({
      familles: this.http.get<FamilleEquipment[]>(this.familleBaseUrl),
      criticites: this.http.get<EquipmentCriticite[]>(this.criticiteBaseUrl),
      etats: this.http.get<EtatEquipment[]>(this.etatBaseUrl),
      modeles: this.http.get<ModeleEquipment[]>(this.modeleBaseUrl),
      groupes: this.http.get<GroupeEquipment[]>(this.groupeBaseUrl)
    }).subscribe({
      next: (res) => {
        this.familleList = res.familles;
        this.criticiteList = res.criticites;
        this.etatList = res.etats;
        this.modeleList = res.modeles;
        this.groupeList = res.groupes;
        console.log('Reference data loaded:', res); // Verify data loading
      },
      error: (err) => {
        this.errorMessage = 'Failed to load reference data. Please check the API endpoints.';
        console.error('Error loading reference data:', err);
      }
    });
  }

  private loadEquipment(id: number): void {
    this.http.get<any>(`${this.baseUrl}/${id}`).subscribe({
      next: (data) => {
        const formattedData = {
          idEquipement: data.idEquipement,
          codeEquipement: data.codeEquipement,
          designation: data.designation,
          description: data.description,
          idCriticite: data.idCriticite,
          idEtat: data.idEtat,
          idFamille: data.idFamille,
          idModele: data.idModele,
          idGroupe: data.idGroupe,
          dateInstallation: data.dateInstallation ? new Date(data.dateInstallation) : null,
          dateMiseEnService: data.dateMiseEnService ? new Date(data.dateMiseEnService) : null,
          numeroSerie: data.numeroSerie,
          sousGarantie: data.sousGarantie,
          dateAchat: data.dateAchat ? new Date(data.dateAchat) : null,
          dateFinGarantie: data.dateFinGarantie ? new Date(data.dateFinGarantie) : null,
          dateConstruction: data.dateConstruction ? new Date(data.dateConstruction) : null,
          coutAchat: data.coutAchat,
          dateCreation: data.dateCreation ? new Date(data.dateCreation) : new Date(),
          dateModification: data.dateModification ? new Date(data.dateModification) : null,
          isDeleted: data.isDeleted
        };
        this.equipmentForm.patchValue(formattedData);
        console.log('Equipment data loaded:', formattedData); // Verify equipment data
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load equipment';
        console.error('Error loading equipment:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.equipmentForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      this.equipmentForm.markAllAsTouched();
      console.log('Form invalid. Errors:', this.equipmentForm.errors); // Log form issues
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const equipment = this.prepareDataForApi();
    console.log('Submitting equipment data:', equipment); // Log data being sent

    if (this.isEditMode) {
      this.updateEquipment(equipment);
    } else {
      this.createEquipment(equipment);
    }
  }

  private createEquipment(equipment: any): void {
    this.http.post<any>(this.baseUrl, equipment, {
      headers: new HttpHeaders().set('Content-Type', 'application/json')
    }).subscribe({
      next: (response) => {
        console.log('Equipment created successfully:', response);
        this.router.navigate(['/admin/equipment'], {
          state: { message: 'Equipment created successfully!', type: 'success' }
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to create equipment';
        console.error('Error creating equipment:', err);
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  private updateEquipment(equipment: any): void {
    this.http.put(`${this.baseUrl}/${equipment.idEquipement}`, equipment, {
      headers: new HttpHeaders().set('Content-Type', 'application/json')
    }).subscribe({
      next: () => {
        console.log('Equipment updated successfully');
        this.router.navigate(['/admin/equipment'], {
          state: { message: 'Equipment updated successfully!', type: 'success' }
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to update equipment';
        console.error('Error updating equipment:', err);
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  private prepareDataForApi(): any {
    const formValue = this.equipmentForm.value;
    const formatDate = (date: Date | null): string | null => date ? date.toISOString() : null;
    return {
      idEquipement: formValue.idEquipement || 0,
      codeEquipement: formValue.codeEquipement.trim(),
      designation: formValue.designation.trim(),
      description: formValue.description?.trim() || null,
      idCriticite: Number(formValue.idCriticite),
      idEtat: Number(formValue.idEtat),
      idFamille: Number(formValue.idFamille),
      idModele: Number(formValue.idModele),
      idGroupe: Number(formValue.idGroupe),
      dateInstallation: formatDate(formValue.dateInstallation),
      dateMiseEnService: formatDate(formValue.dateMiseEnService),
      numeroSerie: formValue.numeroSerie?.trim() || null,
      sousGarantie: Boolean(formValue.sousGarantie),
      dateAchat: formatDate(formValue.dateAchat),
      dateFinGarantie: formatDate(formValue.dateFinGarantie),
      dateConstruction: formatDate(formValue.dateConstruction),
      coutAchat: formValue.coutAchat != null ? Number(formValue.coutAchat) : null,
      dateCreation: formatDate(formValue.dateCreation || new Date()),
      dateModification: this.isEditMode ? formatDate(new Date()) : null,
      isDeleted: Boolean(formValue.isDeleted)
    };
  }

  goBack(): void {
    this.router.navigate(['/admin/equipment']);
  }
}

interface FamilleEquipment { idFamille: number; nomFamille: string; }
interface EquipmentCriticite { idCriticite: number; nomCriticite: string; }
interface EtatEquipment { idEtat: number; nomEtat: string; }
interface ModeleEquipment { idModele: number; nomModele: string; marque?: { nomMarque: string }; }
interface GroupeEquipment { idGroupe: number; nomGroupe: string; }