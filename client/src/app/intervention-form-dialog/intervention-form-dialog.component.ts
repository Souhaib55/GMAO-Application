import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-intervention-form-dialog',
  templateUrl: './intervention-form-dialog.component.html',
  styleUrls: ['./intervention-form-dialog.component.scss']
})
export class InterventionFormDialogComponent {
  
  constructor(
    private dialogRef: MatDialogRef<InterventionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
  
  getUrgencyClass(urgence: string | undefined): string {
    if (!urgence) return '';
    
    const normalizedUrgence = urgence.toLowerCase();
    if (normalizedUrgence === 'haute') return 'high-urgency';
    if (normalizedUrgence === 'moyenne') return 'medium-urgency';
    if (normalizedUrgence === 'basse') return 'low-urgency';
    return '';
  }
}