import { Component, OnInit, inject, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Calendar, CalendarOptions, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { AccountService } from 'app/core/services/account.service';
import { MatDialog } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-planning',
  templateUrl: './planning.component.html',
  styleUrls: ['./planning.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class PlanningComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private accountService = inject(AccountService);

  private baseUrl = 'https://localhost:5001/api/DemandeIntervention';
  private etatBaseUrl = 'https://localhost:5001/api/Etat';
  private typeInterventionBaseUrl = 'https://localhost:5001/api/TypeIntervention';
  private urgenceBaseUrl = 'https://localhost:5001/api/Urgence';
  private chaineProductionBaseUrl = 'https://localhost:5001/api/ChaineProduction';
  private panneBaseUrl = 'https://localhost:5001/api/Panne';
  private usersBaseUrl = 'https://localhost:5001/api/Users';

  calendar: Calendar | null = null;
  calendarElement: HTMLElement | null = null;
  isLoading = false;
  interventions: any[] = [];
  reference = {
    etats: [],
    types: [],
    urgences: [],
    chaines: [],
    pannes: [],
    demandeurs: [],
    destinataires: []
  };
  showPopup = false;
  popupMessage = '';
  popupType: 'success' | 'error' = 'success';
  
  // Selected intervention details
  selectedIntervention: any = null;
  showInterventionDetails = false;

  currentView: string = 'dayGridMonth';
  currentDate: string = '';

  get isSuperviseur(): boolean {
    const user = this.accountService.currentUser();
    return user?.role === 'Superviseur';
  }

  get currentUser(): any {
    return this.accountService.currentUser();
  }

  ngOnInit(): void {
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

  loadReferenceData(): void {
    this.isLoading = true;
    forkJoin({
      etats: this.http.get<any[]>(this.etatBaseUrl, { withCredentials: true }),
      types: this.http.get<any[]>(this.typeInterventionBaseUrl, { withCredentials: true }),
      urgences: this.http.get<any[]>(this.urgenceBaseUrl, { withCredentials: true }),
      chaines: this.http.get<any[]>(this.chaineProductionBaseUrl, { withCredentials: true }),
      pannes: this.http.get<any[]>(this.panneBaseUrl, { withCredentials: true }),
      users: this.http.get<any[]>(this.usersBaseUrl, { withCredentials: true })
    }).subscribe({
      next: (res) => {
        this.reference.etats = res.etats;
        this.reference.types = res.types;
        this.reference.urgences = res.urgences;
        this.reference.chaines = res.chaines;
        this.reference.pannes = res.pannes;
        this.reference.demandeurs = res.users.filter(user => user.idRole === 2);
        this.reference.destinataires = res.users.filter(user => user.idRole === 3);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load reference data:', err);
        this.showPopupMessage('Failed to load reference data', 'error');
        this.isLoading = false;
      }
    });
  }

  loadInterventions(): void {
    this.isLoading = true;
    this.http.get<any>(`${this.baseUrl}?page=1&pageSize=1000`, { withCredentials: true }).subscribe({
      next: (res) => {
        // If user is a technician (Utilisateur), filter interventions assigned to them
        if (this.isSuperviseur) {
          this.interventions = res.data;
        } else {
          // Filter interventions where current user is the destinataire
          const currentUserId = this.currentUser?.internalId;
          this.interventions = res.data.filter((intervention: any) => 
            intervention.destinatairesID === currentUserId || 
            (intervention.destinataire && intervention.destinataire.id === currentUserId)
          );
        }
        
        this.isLoading = false;
        if (this.calendar) {
          this.updateCalendarEvents();
        }
      },
      error: (err) => {
        console.error('Failed to load interventions:', err);
        this.showPopupMessage('Failed to load interventions', 'error');
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
      editable: false, // No editing allowed, view only
      selectable: false, // No selection allowed
      selectMirror: false,
      dayMaxEvents: false,
      weekends: true,
      // Add settings for 24-hour display
      slotMinTime: '00:00:00',
      slotMaxTime: '24:00:00',
      slotDuration: '01:00:00',
      nowIndicator: true,
      dayHeaders: true,
      allDaySlot: false,
      // End of added settings
      eventClick: (info: EventClickArg) => {
        const eventId = parseInt(info.event.id);
        this.showInterventionDetail(eventId);
      },
      events: this.getCalendarEvents(),
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      eventContent: (arg) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'fc-event-content-wrapper';
        
        const titleEl = document.createElement('div');
        titleEl.className = 'fc-event-title';
        titleEl.innerHTML = arg.event.title;
        
        const infoEl = document.createElement('div');
        infoEl.className = 'fc-event-info';
        infoEl.innerHTML = `${arg.event.extendedProps.typeIntervention || 'N/A'}`;
        
        wrapper.appendChild(titleEl);
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

  updateCalendarEvents(): void {
    if (!this.calendar) return;
    const events = this.calendar.getEvents();
    events.forEach(event => event.remove());
    const calendarEvents = this.getCalendarEvents();
    calendarEvents.forEach(event => this.calendar?.addEvent(event));
  }

  getCalendarEvents(): any[] {
    if (!this.interventions || this.interventions.length === 0) return [];

    return this.interventions.map(intervention => {
      let backgroundColor = '#3788d8'; // Default color
      
      // Set color based on urgence
      if (intervention.urgence?.libelle?.toLowerCase() === 'haute') {
        backgroundColor = '#e74c3c'; // Red for high urgency
      } else if (intervention.urgence?.libelle?.toLowerCase() === 'moyenne') {
        backgroundColor = '#f39c12'; // Orange for medium urgency
      } else if (intervention.urgence?.libelle?.toLowerCase() === 'basse') {
        backgroundColor = '#2ecc71'; // Green for low urgency
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
          typeIntervention: intervention.typeIntervention?.libelle,
          urgence: intervention.urgence?.libelle,
          chaineProduction: intervention.chaineProduction?.libelle,
          panne: intervention.panne?.libelle,
          demandeur: intervention.demandeur ? `${intervention.demandeur.nom} ${intervention.demandeur.prenom}` : 'Unknown',
          destinataire: intervention.destinataire ? `${intervention.destinataire.nom} ${intervention.destinataire.prenom}` : 'Not assigned',
          description: intervention.description || 'No description available'
        }
      };
    });
  }

  showInterventionDetail(id: number): void {
    const intervention = this.interventions.find(i => i.idDemandeIntervention === id);
    if (intervention) {
      this.selectedIntervention = intervention;
      this.showInterventionDetails = true;
    }
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
      this.currentDate = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (this.currentView === 'timeGridWeek') {
      const firstDay = new Date(date);
      const dayOfWeek = date.getDay();
      firstDay.setDate(date.getDate() - dayOfWeek);
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      const firstDayStr = firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const lastDayStr = lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      this.currentDate = `${firstDayStr} - ${lastDayStr}`;
    } else {
      this.currentDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  }

  navigateToInterventionDetails(id: number): void {
    this.router.navigate(['/intervention/edit', id]);
  }

  private showPopupMessage(message: string, type: 'success' | 'error'): void {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;
    setTimeout(() => this.hidePopup(), 3000);
  }

  hidePopup(): void {
    this.showPopup = false;
  }
}