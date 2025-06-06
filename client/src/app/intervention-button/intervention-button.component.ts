import { Component, OnInit, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  fileClearFlag = false;

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
      console.warn('No current user found, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    this.loadReferenceData();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        if (this.currentUser.role !== 'Superviseur') {
          this.errorMessage = 'Only Superviseur can edit interventions.';
          console.warn(this.errorMessage);
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
        console.error(this.errorMessage);
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
        console.log('Reference data loaded:', { etats: this.etatList.length, types: this.typeInterventionList.length, urgences: this.urgenceList.length, chaines: this.chaineProductionList.length, pannes: this.panneList.length, demandeurs: this.demandeurList.length, destinataires: this.destinataireList.length });
      },
      error: (err) => {
        console.error('Failed to load reference data:', err);
        this.errorMessage = 'Failed to load reference data. Please try again later.';
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
        console.log(`Loaded intervention ID ${id}:`, formattedData);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to load intervention data';
        console.error(`Error loading intervention ID ${id}:`, err);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.fileClearFlag = false;
      console.log(`File selected: ${this.selectedFile.name}, size: ${this.selectedFile.size} bytes`);
    } else {
      this.selectedFile = null;
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.existingFileName = null;
    this.fileClearFlag = true;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    console.log('File cleared');
  }

  onSubmit(): void {
    if (this.interventionForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      this.interventionForm.markAllAsTouched();
      console.warn('Form invalid:', this.getInvalidControls());
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      const data = this.prepareDataForApi();
      if (this.isEditMode) {
        this.updateIntervention(data);
      } else {
        this.createIntervention(data);
      }
    } catch (err: any) {
      console.error('Error preparing data:', err.message);
      this.errorMessage = err.message || 'Error preparing form data.';
      this.isSubmitting = false;
    }
  }

  private getInvalidControls(): string[] {
    const invalid = [];
    const controls = this.interventionForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(`${name}: ${JSON.stringify(controls[name].errors)}`);
      }
    }
    return invalid;
  }

  private prepareDataForApi(): FormData {
    const formValue = this.interventionForm.getRawValue();
    const dateCreation = new Date(formValue.dateCreation);
    const year = dateCreation.getFullYear();
    const month = String(dateCreation.getMonth() + 1).padStart(2, '0');
    const day = String(dateCreation.getDate()).padStart(2, '0');
    const hours = String(dateCreation.getHours()).padStart(2, '0');
    const minutes = String(dateCreation.getMinutes()).padStart(2, '0');
    const seconds = String(dateCreation.getSeconds()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    const idTypeIntervention = parseInt(formValue.idTypeIntervention);
    const idUrgence = parseInt(formValue.idUrgence);
    const idChaineProduction = parseInt(formValue.idChaineProduction);
    const idPanne = parseInt(formValue.idPanne);
    const demandeursID = parseInt(formValue.demandeursID);

    // Enhanced validation
    if (!formValue.titre || formValue.titre.trim() === '') throw new Error('Title is required');
    if (isNaN(idTypeIntervention) || idTypeIntervention <= 0) throw new Error('Invalid Type Intervention');
    if (isNaN(idUrgence) || idUrgence <= 0) throw new Error('Invalid Urgency');
    if (isNaN(idChaineProduction) || idChaineProduction <= 0) throw new Error('Invalid Production Chain');
    if (isNaN(idPanne) || idPanne <= 0) throw new Error('Invalid Breakdown');
    if (isNaN(demandeursID) || demandeursID <= 0) throw new Error('Invalid Requester');

    const dto = {
      IdDemandeIntervention: parseInt(formValue.idDemandeIntervention) || 0,
      Titre: formValue.titre.trim(),
      MachineArretee: !!formValue.machineArretee,
      IDEtat: parseInt(formValue.idEtat) || 1,
      IDTypeIntervention: idTypeIntervention,
      IDUrgence: idUrgence,
      IDChaineProduction: idChaineProduction,
      IDPanne: idPanne,
      DemandeursID: demandeursID,
      DestinatairesID: formValue.destinatairesID ? parseInt(formValue.destinatairesID) : null,
      DateCreation: localDateString,
      IsActif: true,
      WorkflowAction: null,
      RaisonAnnulation: null
    };

    console.log('Prepared DTO:', dto);

    const formData = new FormData();
    formData.append('demandeDto', JSON.stringify(dto));
    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    }
    if (this.isEditMode && this.fileClearFlag) {
      formData.append('fileName', '');
    }

    return formData;
  }

  private createIntervention(data: FormData): void {
    console.log('Creating intervention...');
    this.logFormDataContent(data);
    const headers = new HttpHeaders({ 'Accept': 'application/json' });
    // Don't explicitly specify Content-Type, let the browser set it with boundary
    this.http.post<any>(this.baseUrl, data, { headers, withCredentials: true, observe: 'response' }).subscribe({
      next: (response) => {
        console.log('Intervention created:', response.body);
        this.router.navigate(['/admin/intervention'], { state: { message: 'Intervention created successfully!', type: 'success' } });
      },
      error: (err) => {
        console.error('Creation failed:', err);
        let errorMsg = 'Failed to create intervention. ';
        if (err.status === 400 && err.error) {
          errorMsg += typeof err.error === 'string' ? err.error : 'Check your input data.';
        } else if (err.status === 401) {
          errorMsg += 'Unauthorized.';
        } else {
          errorMsg += 'Server error.';
        }
        this.errorMessage = errorMsg;
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  private updateIntervention(data: FormData): void {
    const id = this.interventionForm.get('idDemandeIntervention')?.value;
    console.log(`Updating intervention ID ${id}...`);
    this.logFormDataContent(data);
    this.http.put<any>(`${this.baseUrl}/${id}`, data, { withCredentials: true, observe: 'response' }).subscribe({
      next: (response) => {
        console.log('Intervention updated:', response.body);
        this.router.navigate(['/admin/intervention'], { state: { message: 'Intervention updated successfully!', type: 'success' } });
      },
      error: (err) => {
        console.error('Update failed:', err);
        let errorMsg = 'Failed to update intervention. ';
        if (err.status === 400 && err.error) {
          errorMsg += typeof err.error === 'string' ? err.error : 'Check your input data.';
        }
        this.errorMessage = errorMsg;
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  private logFormDataContent(formData: FormData): void {
    console.log('FormData contents:');
    formData.forEach((value, key) => {
      if (key === 'demandeDto') {
        try {
          const dto = JSON.parse(value as string);
          console.log(`${key}:`, dto);
        } catch (err) {
          console.log(`${key}: ${value} (parse error)`);
        }
      } else {
        console.log(`${key}: ${value}`);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/intervention']);
  }
}