import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Calendar } from '@fullcalendar/core';
import { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AccountService } from 'app/core/services/account.service';
import { MatDialog } from '@angular/material/dialog';
import { InterventionFormDialogComponent } from '../intervention-form-dialog/intervention-form-dialog.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-planning',
  templateUrl: './planning.component.html',
  styleUrls: ['./planning.component.scss'],
  animations: [
    // Ajoutez vos animations ici si nécessaire
  ]
})
export class PlanningComponent implements OnInit, AfterViewInit, OnDestroy {
  
  // API endpoints
  private baseUrl = 'https://localhost:5001/api/DemandeIntervention';
  private etatBaseUrl = 'https://localhost:5001/api/Etat';
  private typeInterventionBaseUrl = 'https://localhost:5001/api/TypeIntervention';
  private urgenceBaseUrl = 'https://localhost:5001/api/Urgence';
  private chaineProductionBaseUrl = 'https://localhost:5001/api/ChaineProduction';
  private panneBaseUrl = 'https://localhost:5001/api/Panne';
  private usersBaseUrl = 'https://localhost:5001/api/Users';
  private statusBaseUrl = 'https://localhost:5001/api/Status';

  calendar: Calendar | null = null;
  calendarElement: HTMLElement | null = null;
  isLoading = false;
  interventions: any[] = [];
  // Liste des interventions cachées (uniquement de l'affichage)
  hiddenInterventions: number[] = [];
  reference = {
    etats: [],
    types: [],
    urgences: [],
    chaines: [],
    pannes: [],
    demandeurs: [],
    destinataires: [],
    statuses: []
  };
  showPopup = false;
  popupMessage = '';
  popupType: 'success' | 'error' = 'success';
  
  // Selected intervention details
  selectedIntervention: any = null;
  showInterventionDetails = false;
  
  // Action flags for sidebar
  canAccept = false;
  canComplete = false;
  canValidate = false;
  canCancel = false;
  canAssign = false;
  canViewDetails = false;
  canEdit = false;
  hasAccepted = false;

  currentView: string = 'dayGridMonth';
  currentDate: string = '';
  userRole: string = '';

  // Workflow status IDs
  readonly STATUS_A_TRAITER = 1;
  readonly STATUS_EN_COURS = 2;
  readonly STATUS_REALISEE = 3;
  readonly STATUS_CLOTUREE = 4;
  readonly STATUS_ANNULEE = 5;

  // Clé pour le localStorage (spécifique à l'utilisateur)
  private get localStorageKey(): string {
    const userId = this.currentUser?.internalId || 'unknown';
    return `gmao_hidden_interventions_${userId}`;
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private accountService: AccountService,
    private dialog: MatDialog
  ) {}

  get isSuperviseur(): boolean {
    return this.userRole === 'Superviseur';
  }

  get isTechnicien(): boolean {
    return this.userRole === 'Technicien';
  }
  
  get isUtilisateur(): boolean {
    return this.userRole === 'Utilisateur';
  }

  get isDemandeur(): boolean {
    return this.userRole === 'Demandeur';
  }
  
  get isTechnicienOrUtilisateur(): boolean {
    return this.isTechnicien || this.isUtilisateur;
  }

  get currentUser(): any {
    return this.accountService.currentUser();
  }

  ngOnInit(): void {
    const user = this.accountService.currentUser();
    if (user) {
      this.userRole = user.role;
    }
    
    // Charger les interventions masquées depuis le localStorage
    this.loadHiddenInterventionsFromStorage();
    
    this.loadReferenceData();
    this.loadInterventions();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.calendarElement = document.getElementById('calendar');
      if (this.calendarElement) {
        this.initializeCalendar();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.calendar) {
      this.calendar.destroy();
      this.calendar = null;
    }
  }

  // Méthode pour charger les interventions cachées depuis le localStorage
  loadHiddenInterventionsFromStorage(): void {
    try {
      const storedData = localStorage.getItem(this.localStorageKey);
      if (storedData) {
        this.hiddenInterventions = JSON.parse(storedData);
        console.log(`Chargement de ${this.hiddenInterventions.length} intervention(s) masquée(s) depuis le stockage local`);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des interventions masquées:', error);
      // En cas d'erreur, on réinitialise
      this.hiddenInterventions = [];
    }
  }

  // Méthode pour sauvegarder les interventions cachées dans le localStorage
  saveHiddenInterventionsToStorage(): void {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(this.hiddenInterventions));
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des interventions masquées:', error);
    }
  }

  loadReferenceData(): void {
    this.isLoading = true;
    forkJoin({
      etats: this.http.get<any[]>(this.etatBaseUrl, { withCredentials: true }),
      types: this.http.get<any[]>(this.typeInterventionBaseUrl, { withCredentials: true }),
      urgences: this.http.get<any[]>(this.urgenceBaseUrl, { withCredentials: true }),
      chaines: this.http.get<any[]>(this.chaineProductionBaseUrl, { withCredentials: true }),
      pannes: this.http.get<any[]>(this.panneBaseUrl, { withCredentials: true }),
      users: this.http.get<any[]>(this.usersBaseUrl, { withCredentials: true }),
      statuses: this.http.get<any[]>(this.statusBaseUrl, { withCredentials: true })
    }).subscribe({
      next: (res) => {
        this.reference.etats = res.etats;
        this.reference.types = res.types;
        this.reference.urgences = res.urgences;
        this.reference.chaines = res.chaines;
        this.reference.pannes = res.pannes;
        this.reference.demandeurs = res.users.filter(user => user.idRole === 2);
        this.reference.destinataires = res.users.filter(user => user.idRole === 3 || user.idRole === 4);
        this.reference.statuses = res.statuses;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load reference data:', err);
        this.showPopupMessage('Échec de chargement des données de référence', 'error');
        this.isLoading = false;
      }
    });
  }

  loadInterventions(): void {
    this.isLoading = true;
    this.http.get<any>(`${this.baseUrl}?page=1&pageSize=1000`, { withCredentials: true }).subscribe({
      next: (res) => {
        const currentUserId = this.currentUser?.internalId;
        
        if (this.isSuperviseur) {
          this.interventions = res.data;
        } else if (this.isTechnicien || this.isUtilisateur) {
          this.interventions = res.data.filter((intervention: any) => 
            intervention.destinataire && 
            intervention.destinataire.id === currentUserId
          );
        } else if (this.isDemandeur) {
          this.interventions = res.data.filter((intervention: any) => 
            intervention.demandeur && 
            intervention.demandeur.id === currentUserId
          );
        } else {
          this.interventions = [];
        }
        
        this.isLoading = false;
        if (this.calendar) {
          this.updateCalendarEvents();
        }
        
        if (this.selectedIntervention) {
          const updatedIntervention = this.interventions.find(
            i => i.idDemandeIntervention === this.selectedIntervention.idDemandeIntervention
          );
          if (updatedIntervention) {
            this.selectedIntervention = updatedIntervention;
            this.determineAvailableActions(updatedIntervention);
          }
        }
      },
      error: (err) => {
        console.error('Failed to load interventions:', err);
        this.showPopupMessage('Échec de chargement des interventions', 'error');
        this.isLoading = false;
      }
    });
  }

  initializeCalendar(): void {
    if (!this.calendarElement) return;

    this.calendar = new Calendar(this.calendarElement, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: this.currentView,
      headerToolbar: { left: '', center: '', right: '' },
      height: '100%',
      contentHeight: 'auto',
      editable: false,
      selectable: false,
      selectMirror: false,
      dayMaxEvents: false,
      weekends: true,
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      slotDuration: '01:00:00',
      nowIndicator: true,
      dayHeaders: true,
      allDaySlot: false,
      eventClick: (info: EventClickArg) => {
        if ((info.jsEvent.target as HTMLElement).classList.contains('event-close-icon')) {
          return;
        }
        
        info.jsEvent.preventDefault();
        
        const eventId = parseInt(info.event.id);
        this.showInterventionDetail(eventId);
      },
      events: this.getCalendarEvents(),
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      eventContent: (arg) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-event-content-wrapper';
        
        const headerContainer = document.createElement('div');
        headerContainer.className = 'event-header-container';
        
        if (this.isSuperviseur) {
          const closeIcon = document.createElement('span');
          closeIcon.className = 'event-close-icon';
          closeIcon.innerHTML = '&times;';
          closeIcon.title = 'Masquer cette intervention du calendrier';
          
          closeIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            const interventionId = parseInt(arg.event.id);
            this.hideInterventionFromCalendar(interventionId);
          });
          
          headerContainer.appendChild(closeIcon);
        }
        
        const titleEl = document.createElement('div');
        titleEl.className = 'fc-event-title';
        titleEl.innerHTML = arg.event.title;
        
        headerContainer.appendChild(titleEl);
        wrapper.appendChild(headerContainer);
        
        const infoEl = document.createElement('div');
        infoEl.className = 'fc-event-info';
        
        const statusInfo = arg.event.extendedProps.status ? 
          `<span class="status-badge status-${arg.event.extendedProps.statusId}">${arg.event.extendedProps.status}</span>` : '';
        
        infoEl.innerHTML = `${statusInfo} ${arg.event.extendedProps.typeIntervention || 'N/A'}`;
        
        wrapper.appendChild(infoEl);
        
        return { domNodes: [wrapper] };
      },
      eventDisplay: 'block',
      views: {
        timeGridWeek: {
          slotLabelFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }
        },
        timeGridDay: {
          slotLabelFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }
        }
      }
    });

    this.calendar.render();
    this.updateCurrentDateDisplay();
  }

  hideInterventionFromCalendar(interventionId: number): void {
    const confirmHide = confirm('Voulez-vous masquer cette intervention du calendrier ? (Elle restera accessible dans la base de données)');
    if (!confirmHide) return;
    
    if (!this.hiddenInterventions.includes(interventionId)) {
      this.hiddenInterventions.push(interventionId);
      
      // Sauvegarder les changements dans le localStorage
      this.saveHiddenInterventionsToStorage();
    }
    
    this.updateCalendarEvents();
    this.showPopupMessage('Intervention masquée du calendrier', 'success');
  }

  showAllHiddenInterventions(): void {
    if (this.hiddenInterventions.length === 0) return;
    
    const count = this.hiddenInterventions.length;
    this.hiddenInterventions = [];
    
    // Sauvegarder les changements dans le localStorage
    this.saveHiddenInterventionsToStorage();
    
    this.updateCalendarEvents();
    this.showPopupMessage(`${count} intervention(s) réaffichée(s)`, 'success');
  }

  removeIntervention(interventionId: number): void {
    const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?');
    if (!confirmDelete) return;
    
    const intervention = this.interventions.find(i => i.idDemandeIntervention === interventionId);
    if (!intervention) return;
    
    this.selectedIntervention = intervention;
    
    const raisonAnnulation = prompt("Veuillez fournir une raison d'annulation:", "");
    if (raisonAnnulation === null) return;
    
    this.isLoading = true;
    
    const payload = {
      idDemandeIntervention: interventionId,
      workflowAction: 'cancel',
      raisonAnnulation: raisonAnnulation
    };
    
    this.http.put(`${this.baseUrl}/${interventionId}`, payload, {
      withCredentials: true
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        
        if (response) {
          const index = this.interventions.findIndex(i => i.idDemandeIntervention === interventionId);
          if (index !== -1) {
            this.interventions[index] = response;
          }
          
          this.updateCalendarEvents();
        }
        
        this.showPopupMessage('Intervention annulée avec succès', 'success');
        this.selectedIntervention = null;
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur lors de la suppression de l\'intervention:', error);
        
        const errorMessage = error.error?.message || error.message || 'Échec de l\'annulation';
        this.showPopupMessage(`Erreur: ${errorMessage}`, 'error');
      }
    });
  }

  updateCalendarEvents(): void {
    if (!this.calendar) return;
    const events = this.calendar.getEvents();
    events.forEach(event => event.remove());
    const calendarEvents = this.getCalendarEvents();
    calendarEvents.forEach(event => this.calendar?.addEvent(event));
  }

  getCalendarEvents(): any[] {
    if (!this.interventions || this.interventions.length === 0) return [];

    return this.interventions
      .filter(intervention => !this.hiddenInterventions.includes(intervention.idDemandeIntervention))
      .map(intervention => {
        let backgroundColor = '#3788d8'; // Default color
        
        if (intervention.status) {
          switch (intervention.status.id) {
            case this.STATUS_A_TRAITER:
              backgroundColor = '#ffc107'; // Yellow
              break;
            case this.STATUS_EN_COURS:
              backgroundColor = '#ff9800'; // Orange
              break;
            case this.STATUS_REALISEE:
              backgroundColor = '#28a745'; // Green
              break;
            case this.STATUS_CLOTUREE:
              backgroundColor = '#2196f3'; // Blue
              break;
            case this.STATUS_ANNULEE:
              backgroundColor = '#dc3545'; // Red
              break;
          }
        }

        const title = `${intervention.machineArretee ? '⚠️ ' : ''}${intervention.titre}`;

        return {
          id: intervention.idDemandeIntervention.toString(),
          title: title,
          start: new Date(intervention.dateCreation),
          allDay: false,
          backgroundColor: backgroundColor,
          borderColor: backgroundColor,
          textColor: '#fff',
          extendedProps: {
            machineArretee: intervention.machineArretee,
            etat: intervention.etat?.libelle,
            status: intervention.status?.statut,
            statusId: intervention.status?.id,
            typeIntervention: intervention.typeIntervention?.libelle,
            urgence: intervention.urgence?.libelle,
            chaineProduction: intervention.chaineProduction?.libelle,
            panne: intervention.panne?.libelle,
            demandeur: intervention.demandeur ? `${intervention.demandeur.nom} ${intervention.demandeur.prenom}` : 'Unknown',
            destinataire: intervention.destinataire ? `${intervention.destinataire.nom} ${intervention.destinataire.prenom}` : 'Non assignée',
            description: intervention.description || 'Aucune description disponible',
            dateAssignation: intervention.dateAssignation,
            dateRealisation: intervention.dateRealisation,
            dateCloture: intervention.dateCloture
          }
        };
      });
  }

  // Le reste du code reste inchangé
  // ...

  showInterventionDetail(id: number): void {
    this.closeInterventionDetails();
    
    const intervention = this.interventions.find(i => i.idDemandeIntervention === id);
    if (intervention) {
      this.selectedIntervention = intervention;
      this.showInterventionDetails = true;
      this.determineAvailableActions(intervention);
    }
  }

  determineAvailableActions(intervention: any): void {
    if (!intervention || !this.currentUser) {
      console.log('No intervention or user data available');
      return;
    }
    
    console.log('Determining available actions for intervention:', intervention);
    console.log('User role:', this.userRole);
    console.log('Date assignation:', intervention.dateAssignation);
    
    const statusId = intervention.status?.id;
    const currentUserId = this.currentUser.internalId;
    const isTechnicianAssigned = intervention.destinataire?.id === currentUserId;
    const isRequester = intervention.demandeur?.id === currentUserId;
    
    console.log('Status ID:', statusId);
    console.log('Current user ID:', currentUserId);
    console.log('Is technician assigned?', isTechnicianAssigned);
    console.log('Is requester?', isRequester);
    
    // Reset all flags
    this.canAccept = false;
    this.canComplete = false;
    this.canValidate = false;
    this.canCancel = false;
    this.canAssign = false;
    this.canViewDetails = true;
    this.canEdit = false;
    this.hasAccepted = false;
    
    // Check if intervention is in a final state
    const isFinalState = statusId === this.STATUS_CLOTUREE || statusId === this.STATUS_ANNULEE;
    if (isFinalState) {
      console.log('Intervention is in final state, no actions available');
      return;
    }
    
    // Superviseur actions based on workflow
    if (this.isSuperviseur) {
      console.log('Processing Superviseur actions');
      
      switch (statusId) {
        case this.STATUS_A_TRAITER: // A traiter
          this.canAssign = true;
          this.canCancel = true;
          this.canEdit = true;
          console.log('Superviseur can assign, cancel, edit (A traiter)');
          break;
        
        case this.STATUS_EN_COURS: // En cours
          this.canEdit = true;
          this.canCancel = true;
          console.log('Superviseur can edit, cancel (En cours)');
          break;
        
        case this.STATUS_REALISEE: // Réalisée
          this.canValidate = true; 
          this.canCancel = true;
          console.log('Superviseur can validate, cancel (Réalisée)');
          break;
      }
    }
    
    // Utilisateur ou Technicien actions based on workflow
    else if ((this.isUtilisateur || this.isTechnicien) && isTechnicianAssigned) {
      console.log('Processing Utilisateur/Technicien actions');
      
      if (statusId === this.STATUS_EN_COURS) {
        if (intervention.dateAssignation) {
          // Déjà acceptée -> montrer "Réaliser" seulement
          this.canComplete = true;
          this.hasAccepted = true;
          this.canCancel = false; // Ne plus montrer "Supprimer" après acceptation
          console.log('Utilisateur/Technicien can complete (already accepted)');
        } else {
          // Non acceptée -> montrer "Accepter" et "Supprimer"
          this.canAccept = true;
          this.canCancel = true;
          console.log('Utilisateur/Technicien can accept, cancel (not yet accepted)');
        }
      }
    }
    
    // Demandeur actions based on workflow
    else if (this.isDemandeur && isRequester) {
      console.log('Processing Demandeur actions');
      
      // Demandeur peut annuler une intervention non-finalisée et non-acceptée
      this.canCancel = !isFinalState && 
                       (statusId === this.STATUS_A_TRAITER || 
                       (statusId === this.STATUS_EN_COURS && !intervention.dateAssignation));
      console.log('Demandeur can cancel:', this.canCancel);
    }
  }

  performAction(action: string): void {
    if (!this.selectedIntervention) return;
    
    this.isLoading = true;
    const interventionId = this.selectedIntervention.idDemandeIntervention;
    
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
    
    console.log('Sending payload:', payload);
    
    this.http.put(`${this.baseUrl}/${interventionId}`, payload, {
      withCredentials: true
    }).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        console.log('Action response:', response);
        
        // CORRECTION: Utiliser la réponse de l'API pour mettre à jour l'intervention
        if (response) {
          // Mettre à jour l'intervention locale avec celle renvoyée par le serveur
          this.selectedIntervention = response;
          
          // Mettre également à jour l'intervention dans le tableau des interventions
          const index = this.interventions.findIndex(i => i.idDemandeIntervention === interventionId);
          if (index !== -1) {
            this.interventions[index] = response;
          }
          
          // Recalculer les actions disponibles
          this.determineAvailableActions(this.selectedIntervention);
          
          // Mettre à jour l'affichage du calendrier
          this.updateCalendarEvents();
        }
        
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
            // Fermer le panneau de détails après annulation
            setTimeout(() => this.closeInterventionDetails(), 1000);
            break;
          default:
            actionMessage = `Action "${action}" effectuée avec succès`;
        }
        
        this.showPopupMessage(actionMessage, 'success');
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error performing action:', error);
        
        // CORRECTION: Afficher un message d'erreur plus précis
        const errorMessage = error.error?.message || error.message || 'Échec de l\'action';
        this.showPopupMessage(`Erreur: ${errorMessage}`, 'error');
      }
    });
  }

  closeInterventionDetails(): void {
    this.showInterventionDetails = false;
    this.selectedIntervention = null;
  }

  changeView(): void {
    if (this.calendar) {
      this.calendar.changeView(this.currentView);
      this.updateCurrentDateDisplay();
    }
  }

  next(): void {
    if (this.calendar) {
      this.calendar.next();
      this.updateCurrentDateDisplay();
    }
  }

  previous(): void {
    if (this.calendar) {
      this.calendar.prev();
      this.updateCurrentDateDisplay();
    }
  }

  today(): void {
    if (this.calendar) {
      this.calendar.today();
      this.updateCurrentDateDisplay();
    }
  }

  updateCurrentDateDisplay(): void {
    if (!this.calendar) return;
    const date = this.calendar.getDate();
    if (this.currentView === 'dayGridMonth') {
      this.currentDate = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    } else if (this.currentView === 'timeGridWeek') {
      const firstDay = new Date(date);
      const dayOfWeek = date.getDay();
      firstDay.setDate(date.getDate() - dayOfWeek);
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      const firstDayStr = firstDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const lastDayStr = lastDay.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      this.currentDate = `${firstDayStr} - ${lastDayStr}`;
    } else {
      this.currentDate = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  }

  editIntervention(): void {
    if (!this.selectedIntervention) return;
    this.router.navigate(['/intervention/edit', this.selectedIntervention.idDemandeIntervention]);
  }

  getUrgencyClass(urgence: string | undefined): string {
    if (!urgence) return '';
    
    const normalizedUrgence = urgence.toLowerCase();
    if (normalizedUrgence === 'haute') return 'high-urgency';
    if (normalizedUrgence === 'moyenne') return 'medium-urgency';
    if (normalizedUrgence === 'basse') return 'low-urgency';
    return '';
  }

  getStatusClass(statusId: number | undefined): string {
    if (!statusId) return '';
    
    switch (statusId) {
      case this.STATUS_A_TRAITER: return 'status-new'; // Yellow
      case this.STATUS_EN_COURS: return 'status-in-progress'; // Orange
      case this.STATUS_REALISEE: return 'status-completed'; // Green
      case this.STATUS_CLOTUREE: return 'status-closed'; // Blue
      case this.STATUS_ANNULEE: return 'status-cancelled'; // Red
      default: return '';
    }
  }
  
  getStatusText(statusId: number | undefined): string {
    if (!statusId) return 'Inconnu';
    
    const status = this.reference.statuses.find((s: any) => s.id === statusId);
    return status ? status.statut : 'Inconnu';
  }

  openInterventionDialog(intervention: any): void {
    const dialogRef = this.dialog.open(InterventionFormDialogComponent, {
      width: '600px',
      data: { intervention: intervention }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.showPopupMessage(result.message || 'Action effectuée avec succès', 'success');
        this.loadInterventions();
      } else if (result && !result.success) {
        this.showPopupMessage(result.error || 'Une erreur est survenue', 'error');
      }
    });
  }

  showPopupMessage(message: string, type: 'success' | 'error'): void {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;
    setTimeout(() => this.hidePopup(), 3000);
  }

  hidePopup(): void {
    this.showPopup = false;
  }
}