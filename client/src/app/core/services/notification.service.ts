// gmao/client/src/app/core/services/notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { AccountService } from './account.service';

export interface NotificationItem {
  idDemandeIntervention: number;
  titre: string;
  dateCreation: Date;
  status: {
    id: number;
    statut: string;
  };
  isRead?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = 'https://localhost:5001/api/DemandeIntervention';
  
  // Track notifications with a BehaviorSubject
  private notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  // Track notification count separately
  private notificationCountSubject = new BehaviorSubject<number>(0);
  public notificationCount$ = this.notificationCountSubject.asObservable();
  
  // Cache for read notifications (persists during session)
  private readNotifications: Set<number> = new Set();

  constructor(
    private http: HttpClient,
    private accountService: AccountService
  ) {
    // Initial load of notifications
    this.loadTodayInterventions();
  }

  // Get today's notification count 
  getTodayInterventionCount(): Observable<number> {
    const currentUser = this.accountService.currentUser();
    if (!currentUser) {
      return of(0);
    }

    return this.http.get<number>(`${this.baseUrl}/today-count`, { withCredentials: true })
      .pipe(
        tap(count => this.notificationCountSubject.next(count)),
        catchError(error => {
          console.error('Error fetching notification count:', error);
          return of(0);
        })
      );
  }

  // Get today's interventions (full details)
  loadTodayInterventions(): void {
    const currentUser = this.accountService.currentUser();
    if (!currentUser) {
      this.notificationsSubject.next([]);
      this.notificationCountSubject.next(0);
      return;
    }

    // We'll use the existing endpoint with a date filter
    // In a real implementation, you might want a dedicated endpoint for notifications
    this.http.get<any>(`${this.baseUrl}?page=1&pageSize=100`, { withCredentials: true })
      .pipe(
        map(response => {
          // Filter to today's interventions
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          return response.data
            .filter((item: any) => {
              // Include only today's interventions that are not closed/approved
              const creationDate = new Date(item.dateCreation);
              creationDate.setHours(0, 0, 0, 0);
              
              const isToday = creationDate.getTime() === today.getTime();
              const isNotClosed = item.status?.id !== 4; // Not "Cloturee"
              const isNotRead = !this.readNotifications.has(item.idDemandeIntervention);
              
              // For a user or technicien, only show notifications assigned to them
              const user = this.accountService.currentUser();
              if (user?.role === 'Utilisateur' || user?.role === 'Technicien') {
                return isToday && isNotClosed && isNotRead && 
                       item.destinataire?.id === user.internalId;
              }
              
              return isToday && isNotClosed && isNotRead;
            })
            .map((item: any) => ({
              idDemandeIntervention: item.idDemandeIntervention,
              titre: item.titre,
              dateCreation: new Date(item.dateCreation),
              status: item.status || { id: 0, statut: 'Inconnu' }
            }));
        }),
        catchError(error => {
          console.error('Error fetching notifications:', error);
          return of([]);
        })
      )
      .subscribe(notifications => {
        this.notificationsSubject.next(notifications);
        this.notificationCountSubject.next(notifications.length);
      });
  }

  // Mark a specific notification as read
  markAsRead(interventionId: number): void {
    // Add to read set
    this.readNotifications.add(interventionId);
    
    // Update notifications list
    const current = this.notificationsSubject.value;
    const updated = current.filter(n => n.idDemandeIntervention !== interventionId);
    
    this.notificationsSubject.next(updated);
    this.notificationCountSubject.next(updated.length);
  }

  // Clear all notifications
  clearAllNotifications(): void {
    const current = this.notificationsSubject.value;
    current.forEach(n => this.readNotifications.add(n.idDemandeIntervention));
    
    this.notificationsSubject.next([]);
    this.notificationCountSubject.next(0);
  }

  // Get notification status class
  getStatusClass(statusId: number): string {
    switch (statusId) {
      case 1: return 'status-new';      // À traiter
      case 2: return 'status-progress'; // En cours
      case 3: return 'status-done';     // Réalisée
      case 4: return 'status-closed';   // Clôturée
      case 5: return 'status-canceled'; // Annulée
      default: return 'status-unknown';
    }
  }
}