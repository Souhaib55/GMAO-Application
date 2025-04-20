import { Component, OnInit, inject } from '@angular/core';
  import { HttpClient, HttpHeaders } from '@angular/common/http';
  import { ActivatedRoute, Router } from '@angular/router';
  import { FormBuilder, FormGroup, Validators } from '@angular/forms';
  import { forkJoin } from 'rxjs';
  
  @Component({
    selector: 'app-ressources-button',
    templateUrl: './ressources-button.component.html',
    styleUrls: ['./ressources-button.component.scss']
  })
  export class RessourcesButtonComponent implements OnInit {
    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private fb = inject(FormBuilder);
  
    private baseUrl = 'https://localhost:5001/api/Piece';
    private familleBaseUrl = 'https://localhost:5001/api/FamillePiece';
    private constructeurBaseUrl = 'https://localhost:5001/api/Constructeur';
    private criticiteBaseUrl = 'https://localhost:5001/api/CriticitePiece';
  
    pieceForm: FormGroup;
    familleList: any[] = [];
    constructeurList: any[] = [];
    criticiteList: any[] = [];
    isEditMode = false;
    isSubmitting = false;
    errorMessage = '';
  
    constructor() {
      this.pieceForm = this.fb.group({
        idPiece: [0],
        codePiece: ['', Validators.required],
        designation: ['', Validators.required],
        description: [''],
        idFamillePiece: [null, Validators.required],
        idConstructeur: [null, Validators.required],
        idCriticitePiece: [null, Validators.required],
        quantite_Stock: [0, Validators.required],
        prixUnitaire: [0, Validators.required],
        dateCreation: [new Date(), Validators.required],
        dateModification: [null],
        isActif: [true]
      });
    }
  
    ngOnInit(): void {
      this.loadReferenceData();
      this.route.paramMap.subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.isEditMode = true;
          this.loadPiece(+id);
        }
      });
    }
  
    private loadReferenceData(): void {
      forkJoin({
        familles: this.http.get<any[]>(this.familleBaseUrl),
        constructeurs: this.http.get<any[]>(this.constructeurBaseUrl),
        criticites: this.http.get<any[]>(this.criticiteBaseUrl)
      }).subscribe({
        next: (res) => {
          this.familleList = res.familles;
          this.constructeurList = res.constructeurs;
          this.criticiteList = res.criticites;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load reference data.';
        }
      });
    }
  
    private loadPiece(id: number): void {
      this.http.get<any>(`${this.baseUrl}/${id}`).subscribe({
        next: (data) => {
          const formattedData = {
            idPiece: data.idPiece,
            codePiece: data.codePiece,
            designation: data.designation,
            description: data.description,
            idFamillePiece: data.idFamillePiece,
            idConstructeur: data.idConstructeur,
            idCriticitePiece: data.idCriticitePiece,
            quantite_Stock: data.quantite_Stock,
            prixUnitaire: data.prixUnitaire,
            dateCreation: data.dateCreation ? new Date(data.dateCreation) : new Date(),
            dateModification: data.dateModification ? new Date(data.dateModification) : null,
            isActif: data.isActif
          };
          this.pieceForm.patchValue(formattedData);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to load piece';
        }
      });
    }
  
    onSubmit(): void {
      if (this.pieceForm.invalid) {
        this.errorMessage = 'Please fill all required fields correctly.';
        this.pieceForm.markAllAsTouched();
        return;
      }
  
      this.isSubmitting = true;
      this.errorMessage = '';
  
      const piece = this.prepareDataForApi();
  
      if (this.isEditMode) {
        this.updatePiece(piece);
      } else {
        this.createPiece(piece);
      }
    }
  
    private createPiece(piece: any): void {
      this.http.post<any>(this.baseUrl, piece, {
        headers: new HttpHeaders().set('Content-Type', 'application/json')
      }).subscribe({
        next: () => {
          this.router.navigate(['/admin/ressources'], {
            state: { message: 'Piece created successfully!', type: 'success' }
          });
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to create piece';
          this.isSubmitting = false;
        },
        complete: () => this.isSubmitting = false
      });
    }
  
    private updatePiece(piece: any): void {
      this.http.put(`${this.baseUrl}/${piece.idPiece}`, piece, {
        headers: new HttpHeaders().set('Content-Type', 'application/json')
      }).subscribe({
        next: () => {
          this.router.navigate(['/admin/ressources'], {
            state: { message: 'Piece updated successfully!', type: 'success' }
          });
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to update piece';
          this.isSubmitting = false;
        },
        complete: () => this.isSubmitting = false
      });
    }
  
    private prepareDataForApi(): any {
      const formValue = this.pieceForm.value;
      const formatDate = (date: Date | null): string | null => date ? date.toISOString() : null;
      return {
        idPiece: formValue.idPiece || 0,
        codePiece: formValue.codePiece.trim(),
        designation: formValue.designation.trim(),
        description: formValue.description?.trim() || null,
        idFamillePiece: Number(formValue.idFamillePiece),
        idConstructeur: Number(formValue.idConstructeur),
        idCriticitePiece: Number(formValue.idCriticitePiece),
        quantite_Stock: Number(formValue.quantite_Stock),
        prixUnitaire: Number(formValue.prixUnitaire),
        dateCreation: formatDate(formValue.dateCreation || new Date()),
        dateModification: this.isEditMode ? formatDate(new Date()) : null,
        isActif: Boolean(formValue.isActif)
      };
    }
  
    goBack(): void {
      this.router.navigate(['/admin/ressources']);
    }
  }