import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AccountService } from 'app/core/services/account.service';

@Component({
  selector: 'app-intervention-button',
  templateUrl: './intervention-button.component.html',
  styleUrls: ['./intervention-button.component.scss']
})
export class InterventionButtonComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);

  private baseUrl = 'https://localhost:5001/api/DemandeIntervention';
  private etatBaseUrl = 'https://localhost:5001/api/Etat';
  private typeInterventionBaseUrl = 'https://localhost:5001/api/TypeIntervention';
  private urgenceBaseUrl = 'https://localhost:5001/api/Urgence';
  private chaineProductionBaseUrl = 'https://localhost:5001/api/ChaineProduction';
  private panneBaseUrl = 'https://localhost:5001/api/Panne';
  private usersBaseUrl = 'https://localhost:5001/api/Users';

  interventionForm: FormGroup;
  etatList: any[] = [];
  typeInterventionList: any[] = [];
  urgenceList: any[] = [];
  chaineProductionList: any[] = [];
  panneList: any[] = [];
  demandeurList: any[] = [];
  destinataireList: any[] = [];
  currentUser: any = null;
  isEditMode = false;
  isSubmitting = false;
  errorMessage = '';
  selectedFile: File | null = null;
  existingFileName: string | null = null;

  constructor() {
    this.interventionForm = this.fb.group({
      idDemandeIntervention: [0],
      titre: ['', Validators.required],
      machineArretee: [false],
      idEtat: [1, Validators.required],
      idTypeIntervention: [null, Validators.required],
      idUrgence: [null, Validators.required],
      idChaineProduction: [null, Validators.required],
      idPanne: [null, Validators.required],
      demandeursID: [null, Validators.required],
      destinatairesID: [null],
      dateCreation: [new Date(), Validators.required],
      isActif: [true]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.accountService.currentUser();
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadReferenceData();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        if (this.currentUser.role !== 'Superviseur') {
          this.errorMessage = 'Only Superviseur can edit interventions.';
          this.router.navigate(['/admin/intervention']);
          return;
        }
        this.isEditMode = true;
        this.loadIntervention(+id);
      } else {
        this.setupFormBasedOnRole();
      }
    });
  }

  private setupFormBasedOnRole(): void {
    switch (this.currentUser.role) {
      case 'Superviseur':
        break;
      case 'Demandeur':
        this.interventionForm.patchValue({ demandeursID: this.currentUser.internalId });
        this.interventionForm.get('demandeursID')?.disable();
        this.interventionForm.get('destinatairesID')?.disable();
        break;
      case 'Utilisateur':
        this.interventionForm.get('destinatairesID')?.disable();
        break;
      default:
        this.errorMessage = 'Unknown user role';
        this.router.navigate(['/admin/dashboard']);
    }
  }

  private loadReferenceData(): void {
    forkJoin({
      etats: this.http.get<any[]>(this.etatBaseUrl, { withCredentials: true }),
      types: this.http.get<any[]>(this.typeInterventionBaseUrl, { withCredentials: true }),
      urgences: this.http.get<any[]>(this.urgenceBaseUrl, { withCredentials: true }),
      chaines: this.http.get<any[]>(this.chaineProductionBaseUrl, { withCredentials: true }),
      pannes: this.http.get<any[]>(this.panneBaseUrl, { withCredentials: true }),
      users: this.http.get<any[]>(this.usersBaseUrl, { withCredentials: true })
    }).subscribe({
      next: (res) => {
        this.etatList = res.etats;
        this.typeInterventionList = res.types;
        this.urgenceList = res.urgences;
        this.chaineProductionList = res.chaines;
        this.panneList = res.pannes;
        this.demandeurList = res.users.filter(user => user.idRole === 2);
        this.destinataireList = res.users.filter(user => user.idRole === 3);
      },
      error: (err) => {
        console.error('Failed to load reference data:', err);
        this.errorMessage = 'Failed to load reference data.';
      }
    });
  }

  private loadIntervention(id: number): void {
    this.http.get<any>(`${this.baseUrl}/${id}`, { withCredentials: true }).subscribe({
      next: (data) => {
        this.existingFileName = data.fileName;
        const formattedData = {
          idDemandeIntervention: data.idDemandeIntervention,
          titre: data.titre,
          machineArretee: data.machineArretee,
          idEtat: data.idEtat,
          idTypeIntervention: data.idTypeIntervention,
          idUrgence: data.idUrgence,
          idChaineProduction: data.idChaineProduction,
          idPanne: data.idPanne,
          demandeursID: data.demandeursID,
          destinatairesID: data.destinatairesID,
          dateCreation: new Date(data.dateCreation),
          isActif: data.isActif
        };
        this.interventionForm.patchValue(formattedData);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load intervention';
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    } else {
      this.selectedFile = null;
    }
  }

  onSubmit(): void {
    if (this.interventionForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      this.interventionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formData = this.prepareDataForApi();

    if (this.isEditMode) {
      this.updateIntervention(formData);
    } else {
      this.createIntervention(formData);
    }
  }

  private prepareDataForApi(): FormData {
    const formValue = this.interventionForm.getRawValue();
    const formData = new FormData();
    formData.append('idDemandeIntervention', formValue.idDemandeIntervention.toString());
    formData.append('titre', formValue.titre.trim());
    formData.append('machineArretee', formValue.machineArretee.toString());
    formData.append('idEtat', formValue.idEtat.toString());
    formData.append('idTypeIntervention', formValue.idTypeIntervention.toString());
    formData.append('idUrgence', formValue.idUrgence.toString());
    formData.append('idChaineProduction', formValue.idChaineProduction.toString());
    formData.append('idPanne', formValue.idPanne.toString());
    formData.append('demandeursID', formValue.demandeursID.toString());
    if (formValue.destinatairesID != null) {
      formData.append('destinatairesID', formValue.destinatairesID.toString());
    }
    const date = new Date(formValue.dateCreation);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); // Adjust for timezone
    formData.append('dateCreation', date.toISOString());
    formData.append('isActif', formValue.isActif.toString());
    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    }
    return formData;
  }

  private createIntervention(formData: FormData): void {
    this.http.post<any>(this.baseUrl, formData, { withCredentials: true }).subscribe({
      next: () => {
        this.router.navigate(['/admin/intervention'], {
          state: { message: 'Intervention created successfully!', type: 'success' }
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to create intervention';
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  private updateIntervention(formData: FormData): void {
    const id = this.interventionForm.get('idDemandeIntervention')?.value;
    this.http.put(`${this.baseUrl}/${id}`, formData, { withCredentials: true }).subscribe({
      next: () => {
        this.router.navigate(['/admin/intervention'], {
          state: { message: 'Intervention updated successfully!', type: 'success' }
        });
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to update intervention';
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/intervention']);
  }
}