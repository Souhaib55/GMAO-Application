import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { AccountService } from 'app/core/services/account.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-intervention-form-dialog',
  templateUrl: './intervention-form-dialog.component.html',
  styleUrls: ['./intervention-form-dialog.component.scss']
})
export class InterventionFormDialogComponent implements OnInit {
  // Statut constants
  readonly STATUS_A_TRAITER = 1; // "A traiter"
  readonly STATUS_EN_COURS = 2;  // "En cours"
  readonly STATUS_REALISEE = 3;  // "Réalisée"
  readonly STATUS_CLOTUREE = 4;  // "Clôturée"
  readonly STATUS_ANNULEE = 5;   // "Annulée"
  
  isLoading = false;
  canAccept = false;
  canComplete = false;
  canValidate = false;
  canCancel = false;
  canAssign = false;
  canEdit = false;
  hasAccepted = false;
  
  private baseUrl = `${environment.apiUrl}/DemandeIntervention`;
  currentUser: any;
  
  constructor(
    public dialogRef: MatDialogRef<InterventionFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private accountService: AccountService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.accountService.currentUser;
    if (this.data.intervention) {
      this.determineAvailableActions(this.data.intervention);
    }
  }

  determineAvailableActions(intervention: any): void {
    if (!intervention || !this.currentUser) {
      console.error('Dialog - No intervention or user data available');
      return;
    }

    console.log('Dialog - Determining actions for:', intervention);
    console.log('Dialog - User role:', this.currentUser.role);
    
    const statusId = intervention.status?.id;
    const currentUserId = this.currentUser.internalId;
    const isTechnicianAssigned = intervention.destinataire?.id === currentUserId;
    const isRequester = intervention.demandeur?.id === currentUserId;
    const isSuperviseur = this.currentUser.role === 'Superviseur';
    const isUtilisateur = this.currentUser.role === 'Utilisateur';
    const isTechnicien = this.currentUser.role === 'Technicien';
    const isDemandeur = this.currentUser.role === 'Demandeur';
    
    // Reset all flags
    this.canAccept = false;
    this.canComplete = false;
    this.canValidate = false;
    this.canCancel = false;
    this.canAssign = false;
    this.canEdit = false;
    this.hasAccepted = false;
    
    // Check if intervention is in a final state
    const isFinalState = statusId === this.STATUS_CLOTUREE || statusId === this.STATUS_ANNULEE;
    if (isFinalState) return;
    
    // Superviseur actions based on workflow
    if (isSuperviseur) {
      console.log('Dialog - Processing Superviseur actions');
      
      switch (statusId) {
        case this.STATUS_A_TRAITER: // A traiter
          this.canAssign = true;
          this.canCancel = true;
          this.canEdit = true;
          console.log('Dialog - Superviseur can assign, cancel, edit (A traiter)');
          break;
        
        case this.STATUS_EN_COURS: // En cours
          this.canEdit = true;
          this.canCancel = true;
          console.log('Dialog - Superviseur can edit, cancel (En cours)');
          break;
        
        case this.STATUS_REALISEE: // Réalisée
          this.canValidate = true; 
          this.canCancel = true;
          console.log('Dialog - Superviseur can validate, cancel (Réalisée)');
          break;
      }
    }
    
    // Utilisateur ou Technicien actions based on workflow
    else if ((isUtilisateur || isTechnicien) && isTechnicianAssigned) {
      console.log('Dialog - Processing Utilisateur/Technicien actions');
      
      if (statusId === this.STATUS_EN_COURS) {
        if (intervention.dateAssignation) {
          // Déjà acceptée -> montrer "Réaliser" seulement
          this.canComplete = true;
          this.hasAccepted = true;
          this.canCancel = false; 
          console.log('Dialog - Utilisateur/Technicien can complete (already accepted)');
        } else {
          // Non acceptée -> montrer "Accepter" et "Supprimer"
          this.canAccept = true;
          this.canCancel = true;
          console.log('Dialog - Utilisateur/Technicien can accept, cancel (not yet accepted)');
        }
      }
    }
    
    // Demandeur actions based on workflow
    else if (isDemandeur && isRequester) {
      console.log('Dialog - Processing Demandeur actions');
      
      this.canCancel = !isFinalState && 
                     (statusId === this.STATUS_A_TRAITER || 
                     (statusId === this.STATUS_EN_COURS && !intervention.dateAssignation));
      console.log('Dialog - Demandeur can cancel:', this.canCancel);
    }
  }

  // Méthode pour exécuter une action du workflow
  performAction(action: string): void {
    this.isLoading = true;
    const interventionId = this.data.intervention.idDemandeIntervention;
    
    // Pour les annulations, demander une raison
    let raisonAnnulation = null;
    if (action === 'cancel') {
      raisonAnnulation = prompt("Veuillez fournir une raison d'annulation:", "");
      if (raisonAnnulation === null) {
        // L'utilisateur a annulé le prompt
        this.isLoading = false;
        return;
      }
    }
    
    const payload = {
      idDemandeIntervention: interventionId,
      workflowAction: action,
      raisonAnnulation: raisonAnnulation
    };
    
    console.log('Dialog - Sending payload:', payload);
    
    this.http.put(`${this.baseUrl}/${interventionId}`, payload, {
      withCredentials: true
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log('Dialog - Action response:', response);
        
        // Mettre à jour l'intervention avec la réponse du serveur
        if (response) {
          this.data.intervention = response;
          this.determineAvailableActions(response);
        }
        
        // Générer un message de succès selon l'action
        let actionMessage = '';
        switch(action) {
          case 'accept': 
            actionMessage = 'Intervention acceptée avec succès';
            break;
          case 'complete':
            actionMessage = 'Intervention marquée comme réalisée';
            break;
          case 'validate':
            actionMessage = 'Intervention approuvée et clôturée';
            break;
          case 'cancel':
            actionMessage = 'Intervention annulée';
            // Fermer la boîte de dialogue après annulation
            setTimeout(() => this.closeDialog(true, actionMessage, response), 1000);
            return;
          default:
            actionMessage = `Action "${action}" effectuée avec succès`;
        }
        
        this.closeDialog(true, actionMessage, response);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Dialog - Error performing action:', error);
        
        // Afficher un message d'erreur explicite
        const errorMessage = error.error?.message || error.statusText || 'Une erreur est survenue';
        alert(`Erreur: ${errorMessage}`);
        
        this.closeDialog(false, null, null, errorMessage);
      }
    });
  }
  
  // Méthode pour fermer le dialogue avec un résultat
  closeDialog(success: boolean, message?: string, intervention?: any, error?: string): void {
    this.dialogRef.close({
      success: success,
      message: message,
      intervention: intervention,
      error: error
    });
  }
  
  // Navigation vers l'intervention edit
  editIntervention(): void {
    this.closeDialog(true, 'Redirection vers la page d\'édition');
  }
  
  // Fermer le dialogue sans action
  onClose(): void {
    this.closeDialog(false);
  }
  
  // Obtenir la classe CSS pour le statut
  getStatusClass(statusId: number | undefined): string {
    if (!statusId) return '';
    
    switch (statusId) {
      case this.STATUS_A_TRAITER: return 'status-new'; 
      case this.STATUS_EN_COURS: return 'status-in-progress';
      case this.STATUS_REALISEE: return 'status-completed';
      case this.STATUS_CLOTUREE: return 'status-closed';
      case this.STATUS_ANNULEE: return 'status-cancelled';
      default: return '';
    }
  }
  
  // Obtenir la classe CSS pour l'urgence
  getUrgencyClass(urgence: string | undefined): string {
    if (!urgence) return '';
    
    const normalizedUrgence = urgence.toLowerCase();
    if (normalizedUrgence === 'haute') return 'high-urgency';
    if (normalizedUrgence === 'moyenne') return 'medium-urgency';
    if (normalizedUrgence === 'basse') return 'low-urgency';
    return '';
  }
}