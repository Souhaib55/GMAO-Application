import { Component, OnInit, inject, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Calendar, CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { AccountService } from 'app/core/services/account.service';
import { MatDialog } from '@angular/material/dialog';
import { InterventionFormDialogComponent } from '../intervention-form-dialog/intervention-form-dialog.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-planning',
  templateUrl: './planning.component.html',
  styleUrls: ['./planning.component.scss']
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

  currentView: string = 'dayGridMonth';
  currentDate: string = '';

  get isSuperviseur(): boolean {
    const user = this.accountService.currentUser();
    return user?.role === 'Superviseur';
  }

  ngOnInit(): void {
    if (!this.isSuperviseur) {
      this.router.navigate(['/admin/dashboard']);
      return;
    }
    
    this.loadReferenceData();
    this.loadInterventions();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.calendarElement = document.getElementById('calendar');
      if (this.calendarElement && this.isSuperviseur) {
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
        this.interventions = res.data;
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
    if (!this.calendarElement || !this.isSuperviseur) return;

    this.calendar = new Calendar(this.calendarElement, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: this.currentView,
      headerToolbar: { left: '', center: '', right: '' },
      height: '100%',
      contentHeight: 'auto',
      editable: this.isSuperviseur,
      selectable: this.isSuperviseur,
      selectMirror: true,
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
      select: (info) => {
        if (this.isSuperviseur) {
          this.openInterventionFormDialog(info.start);
        }
      },
      eventClick: (info) => {
        if (this.isSuperviseur) {
          const eventId = parseInt(info.event.id);
          this.router.navigate(['/admin/intervention/edit', eventId]);
        }
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
        infoEl.innerHTML = `Chaine: ${arg.event.extendedProps.chaineProduction || 'N/A'} | Type: ${arg.event.extendedProps.typeIntervention || 'N/A'} | Urgence: ${arg.event.extendedProps.urgence || 'N/A'}`;
        
        wrapper.appendChild(titleEl);
        wrapper.appendChild(infoEl);
        
        return { domNodes: [wrapper] };
      },
      eventDisplay: 'block'
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
      let backgroundColor = '#3788d8';
      if (intervention.urgence?.libelle?.toLowerCase() === 'haute') backgroundColor = '#e74c3c';
      else if (intervention.urgence?.libelle?.toLowerCase() === 'moyenne') backgroundColor = '#f39c12';
      else if (intervention.urgence?.libelle?.toLowerCase() === 'basse') backgroundColor = '#2ecc71';

      const title = `${intervention.machineArretee ? '[Stopped] ' : ''}${intervention.titre}`;

      return {
        id: intervention.idDemandeIntervention.toString(),
        title: title,
        start: new Date(intervention.dateCreation),
        // Changed from allDay: true to false to show in time grid
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
          destinataire: intervention.destinataire ? `${intervention.destinataire.nom} ${intervention.destinataire.prenom}` : 'Not assigned'
        }
      };
    });
  }

  openInterventionFormDialog(date: Date): void {
    const dialogRef = this.dialog.open(InterventionFormDialogComponent, {
      width: '600px',
      data: { date: date, reference: this.reference }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) this.createIntervention(result);
    });
  }

  createIntervention(formData: FormData): void {
    this.isLoading = true;
    this.http.post<any>(this.baseUrl, formData, { withCredentials: true }).subscribe({
      next: (res) => {
        this.showPopupMessage('Intervention scheduled successfully', 'success');
        this.loadInterventions();
      },
      error: (err) => {
        console.error('Failed to create intervention:', err);
        this.showPopupMessage(err.error?.message || 'Failed to schedule intervention', 'error');
        this.isLoading = false;
      }
    });
  }

  addNewEvent(): void {
    if (!this.isSuperviseur) return;
    const currentDate = new Date();
    this.openInterventionFormDialog(currentDate);
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