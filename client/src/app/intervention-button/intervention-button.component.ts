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
        console.log('Reference data loaded successfully');
        console.log('Etats:', this.etatList);
        console.log('TypeInterventions:', this.typeInterventionList);
        console.log('Urgences:', this.urgenceList);
        console.log('ChaineProductions:', this.chaineProductionList);
        console.log('Pannes:', this.panneList);
        console.log('Demandeurs:', this.demandeurList);
        console.log('Destinataires:', this.destinataireList);
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
        console.log('Loaded intervention data:', data);
        
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
          dateCreation: new Date(data.dateCreation), // Local time for display
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
      console.log(`File selected: ${this.selectedFile.name}, size: ${this.selectedFile.size} bytes, type: ${this.selectedFile.type}`);
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
    console.log('File cleared - Will remove existing file on save');
  }

  onSubmit(): void {
    if (this.interventionForm.invalid) {
      this.errorMessage = 'Please fill all required fields correctly.';
      this.interventionForm.markAllAsTouched();
      console.warn('Form invalid:', this.interventionForm.errors, this.getInvalidControls());
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
    } catch (err) {
      console.error('Error preparing data:', err);
      this.errorMessage = 'Error preparing form data. Please check your inputs.';
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
    // Get raw values including disabled fields
    const formValue = this.interventionForm.getRawValue();
    const dateCreation = new Date(formValue.dateCreation);

    // Create DTO object with all necessary fields - NOTE: Property names must match exactly what the backend expects
    // The backend is expecting PascalCase property names (IDEtat, IDTypeIntervention, etc.)
    const dto = {
      IdDemandeIntervention: parseInt(formValue.idDemandeIntervention) || 0,
      Titre: formValue.titre?.trim() || '',
      MachineArretee: !!formValue.machineArretee, // Ensure boolean
      IDEtat: parseInt(formValue.idEtat) || 1, // This field must be IDEtat, not idEtat
      IDTypeIntervention: parseInt(formValue.idTypeIntervention) || 0,
      IDUrgence: parseInt(formValue.idUrgence) || 0,
      IDChaineProduction: parseInt(formValue.idChaineProduction) || 0,
      IDPanne: parseInt(formValue.idPanne) || 0,
      DemandeursID: parseInt(formValue.demandeursID) || 0,
      DestinatairesID: formValue.destinatairesID ? parseInt(formValue.destinatairesID) : null,
      DateCreation: dateCreation.toISOString(), // Backend expects UTC
      IsActif: true,
      WorkflowAction: null,
      RaisonAnnulation: null
    };

    console.log('Prepared DTO object:', dto);

    // Create FormData object
    const formData = new FormData();
    formData.append('demandeDto', JSON.stringify(dto));
    
    // Handle file upload
    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
      console.log(`Appending file: ${this.selectedFile.name}, size: ${this.selectedFile.size}`);
    } 
    
    // Clear existing file in edit mode if flag is set
    if (this.isEditMode && this.fileClearFlag) {
      formData.append('fileName', '');
      console.log('Appending empty fileName to clear existing file');
    }

    return formData;
  }

    // Only update the createIntervention method - the fix for the property names has already been applied

    private createIntervention(data: FormData): void {
    console.log('Sending POST request to create intervention');
    
    // Log Form Data content (for debugging)
    this.logFormDataContent(data);
    
    // Extract the DTO from FormData for debugging
    const dtoJson = data.get('demandeDto') as string;
    let dto = null;
    
    if (dtoJson) {
      try {
        dto = JSON.parse(dtoJson);
        console.log('Sending data with IDEtat =', dto.IDEtat);
        
        // Create a NEW FormData with individual fields instead of a JSON string
        const properFormData = new FormData();
        
        // Add each field individually to the form data
        Object.entries(dto).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            properFormData.append(key, String(value));
          }
        });
        
        // Handle file upload - reattach the file if present
        if (this.selectedFile) {
          properFormData.append('file', this.selectedFile, this.selectedFile.name);
        }
        
        // Replace the original formdata with our new properly formatted one
        data = properFormData;
        
        // Log the newly formatted FormData
        console.log('Reformatted FormData with individual fields:');
        this.logFormDataContent(data);
      } catch (e) {
        console.error('Error parsing DTO JSON:', e);
      }
    }
    
    // Do not set Content-Type header as the browser will set it correctly with boundary for multipart/form-data
    const headers = new HttpHeaders({
      'Accept': 'application/json'
    });
    
    this.http.post<any>(this.baseUrl, data, { 
      headers: headers,
      withCredentials: true,
      observe: 'response'
    }).subscribe({
      next: (response) => {
        console.log('Intervention created successfully. Status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response body:', response.body);
        
        this.router.navigate(['/admin/intervention'], {
          state: { message: 'Intervention created successfully!', type: 'success' }
        });
      },
      error: (err) => {
        console.error('Create intervention error. Status:', err.status);
        console.error('Error details:', err);
        console.error('Error response:', err.error);
        
        // Add more detailed error logging
        if (err.error && typeof err.error === 'object') {
          console.error('Error object keys:', Object.keys(err.error));
          
          // If the server returned validation errors
          if (err.error.errors) {
            console.error('Validation errors:', err.error.errors);
          }
        }
        
        let errorMsg = 'Failed to create intervention. ';
        if (err.error && typeof err.error === 'string') {
          errorMsg += err.error;
        } else if (err.error?.message) {
          errorMsg += err.error.message;
        } else if (err.status === 400) {
          errorMsg += 'Please check your input data.';
        }
        
        this.errorMessage = errorMsg;
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  private updateIntervention(data: FormData): void {
    const id = this.interventionForm.get('idDemandeIntervention')?.value;
    console.log(`Sending PUT request to update intervention ID ${id}`);
    
    // Log Form Data contents (for debugging)
    this.logFormDataContent(data);
    
    this.http.put<any>(`${this.baseUrl}/${id}`, data, { 
      withCredentials: true,
      observe: 'response' // Get the full response including headers
    }).subscribe({
      next: (response) => {
        console.log('Intervention updated successfully. Status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response body:', response.body);
        
        this.router.navigate(['/admin/intervention'], {
          state: { message: 'Intervention updated successfully!', type: 'success' }
        });
      },
      error: (err) => {
        console.error('Update intervention error. Status:', err.status);
        console.error('Error details:', err);
        console.error('Error response:', err.error);
        
        let errorMsg = 'Failed to update intervention. ';
        if (err.error && typeof err.error === 'string') {
          errorMsg += err.error;
        } else if (err.error?.message) {
          errorMsg += err.error.message;
        } else if (err.status === 400) {
          errorMsg += 'Please check your input data.';
        }
        
        this.errorMessage = errorMsg;
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  // Helper method to log FormData content for debugging
  private logFormDataContent(formData: FormData): void {
    console.log('--- FormData Content ---');
    formData.forEach((value, key) => {
      if (key === 'demandeDto') {
        console.log(`${key}: ${value}`);
        try {
          // Pretty print the JSON for better readability in console
          const dto = JSON.parse(value as string);
          console.log('Parsed demandeDto:', dto);
          
          // Validate required fields
          this.validateDto(dto);
        } catch (e) {
          console.error('Error parsing demandeDto:', e);
        }
      } else if (key === 'file' && value instanceof File) {
        console.log(`${key}: ${value.name} (${value.size} bytes, ${value.type})`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });
    console.log('----------------------');
  }

  // Validate DTO to catch common issues
  private validateDto(dto: any): void {
    const requiredNumericFields = ['IDTypeIntervention', 'IDUrgence', 'IDChaineProduction', 'IDPanne', 'DemandeursID'];
    const issues = [];

    for (const field of requiredNumericFields) {
      const value = dto[field];
      if (value === null || value === undefined || value === 0) {
        issues.push(`Missing or invalid ${field}: ${value}`);
      }
    }

    if (!dto.Titre || dto.Titre.trim() === '') {
      issues.push('Missing Titre');
    }

    if (issues.length > 0) {
      console.warn('Potential issues with DTO:', issues);
    } else {
      console.log('DTO validation passed');
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/intervention']);
  }
}