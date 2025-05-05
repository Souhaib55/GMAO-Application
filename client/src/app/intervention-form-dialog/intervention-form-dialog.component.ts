import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-intervention-form-dialog',
  template: `
    <h2 mat-dialog-title>Schedule New Intervention</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="intervention-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Title</mat-label>
          <input matInput formControlName="titre" required>
          <mat-error *ngIf="form.get('titre')?.hasError('required')">Title is required</mat-error>
        </mat-form-field>
        
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="dateCreation" disabled>
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
          
          <div class="half-width machine-arretee-field">
            <mat-checkbox formControlName="machineArretee">Machine Arrêtée</mat-checkbox>
          </div>
        </div>
        
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Type d'Intervention</mat-label>
            <mat-select formControlName="idTypeIntervention" required>
              <mat-option *ngFor="let type of data.reference.types" [value]="type.idTypeIntervention">
                {{ type.libelle }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('idTypeIntervention')?.hasError('required')">Type is required</mat-error>
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Urgence</mat-label>
            <mat-select formControlName="idUrgence" required>
              <mat-option *ngFor="let urgence of data.reference.urgences" [value]="urgence.idUrgence">
                {{ urgence.libelle }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('idUrgence')?.hasError('required')">Urgence is required</mat-error>
          </mat-form-field>
        </div>
        
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Chaîne de Production</mat-label>
            <mat-select formControlName="idChaineProduction" required>
              <mat-option *ngFor="let chaine of data.reference.chaines" [value]="chaine.idChaineProduction">
                {{ chaine.libelle }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('idChaineProduction')?.hasError('required')">Chaîne is required</mat-error>
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Panne</mat-label>
            <mat-select formControlName="idPanne" required>
              <mat-option *ngFor="let panne of data.reference.pannes" [value]="panne.idPanne">
                {{ panne.libelle }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('idPanne')?.hasError('required')">Panne is required</mat-error>
          </mat-form-field>
        </div>
        
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Demandeur</mat-label>
            <mat-select formControlName="demandeursID" required>
              <mat-option *ngFor="let demandeur of data.reference.demandeurs" [value]="demandeur.id">
                {{ demandeur.nom }} {{ demandeur.prenom }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.get('demandeursID')?.hasError('required')">Demandeur is required</mat-error>
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Destinataire</mat-label>
            <mat-select formControlName="destinatairesID">
              <mat-option *ngFor="let destinataire of data.reference.destinataires" [value]="destinataire.id">
                {{ destinataire.nom }} {{ destinataire.prenom }}
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">CANCEL</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid" (click)="onSubmit()">CREATE</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .intervention-form {
      display: flex;
      flex-direction: column;
      min-width: 500px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .half-width {
      width: 48%;
    }
    
    .form-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .machine-arretee-field {
      display: flex;
      align-items: center;
      padding-top: 15px;
    }
  `]
})
export class InterventionFormDialogComponent implements OnInit {
  form: FormGroup;
  
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InterventionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      titre: ['', Validators.required],
      dateCreation: [data.date, Validators.required],
      machineArretee: [false],
      idEtat: [1], // Default to first state (typically "A traiter")
      idTypeIntervention: ['', Validators.required],
      idUrgence: ['', Validators.required],
      idChaineProduction: ['', Validators.required],
      idPanne: ['', Validators.required],
      demandeursID: ['', Validators.required],
      destinatairesID: [''],
      isActif: [true]
    });
  }
  
  ngOnInit(): void {
    // Set default values if available
    if (this.data.reference.types.length > 0) {
      this.form.get('idTypeIntervention')?.setValue(this.data.reference.types[0].idTypeIntervention);
    }
    
    if (this.data.reference.urgences.length > 0) {
      this.form.get('idUrgence')?.setValue(this.data.reference.urgences[0].idUrgence);
    }
    
    if (this.data.reference.chaines.length > 0) {
      this.form.get('idChaineProduction')?.setValue(this.data.reference.chaines[0].idChaineProduction);
    }
    
    if (this.data.reference.pannes.length > 0) {
      this.form.get('idPanne')?.setValue(this.data.reference.pannes[0].idPanne);
    }
    
    if (this.data.reference.demandeurs.length > 0) {
      this.form.get('demandeursID')?.setValue(this.data.reference.demandeurs[0].id);
    }
  }
  
  onSubmit(): void {
    if (this.form.valid) {
      const formData = new FormData();
      const formValue = this.form.value;
      
      // Append all form values to FormData
      Object.keys(formValue).forEach(key => {
        if (formValue[key] !== null && formValue[key] !== undefined) {
          if (key === 'dateCreation') {
            const date = new Date(formValue[key]);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); // Adjust for timezone
            formData.append(key, date.toISOString());
          } else {
            formData.append(key, formValue[key].toString());
          }
        }
      });
      
      this.dialogRef.close(formData);
    }
  }
  
  onCancel(): void {
    this.dialogRef.close();
  }
}