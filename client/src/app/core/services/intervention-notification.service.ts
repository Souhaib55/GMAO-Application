import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Notification, NotificationCount } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class InterventionNotificationService {
  private readonly baseUrl = `${environment.apiUrl}/notification`;
  
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  
  private pollingInterval: any;

  constructor(private http: HttpClient) {}

  // Start polling for new notifications
  startPolling(intervalMs: number = 30000): void {
    this.loadNotifications();
    this.loadUnreadCount();
    
    // Clear any existing polling
    this.stopPolling();
    
    this.pollingInterval = setInterval(() => {
      this.loadUnreadCount();
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Get all notifications
  loadNotifications(unreadOnly: boolean = false, limit: number = 20): void {
    this.http.get<Notification[]>(`${this.baseUrl}?unreadOnly=${unreadOnly}&limit=${limit}`)
      .pipe(
        catchError(error => {
          console.error('Error loading notifications:', error);
          return [];
        })
      )
      .subscribe(notifications => {
        this.notificationsSubject.next(notifications);
      });
  }

  // Get notifications as observable
  getNotifications(unreadOnly: boolean = false, limit: number = 20): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.baseUrl}?unreadOnly=${unreadOnly}&limit=${limit}`);
  }

  // Get notification count
  loadUnreadCount(): void {
    this.http.get<NotificationCount>(`${this.baseUrl}/count`)
      .pipe(
        catchError(error => {
          console.error('Error loading notification count:', error);
          return [{ unreadCount: 0, totalCount: 0 }];
        })
      )
      .subscribe((count: any) => {
        this.unreadCountSubject.next(count.unreadCount ?? 0);
      });
  }

  getNotificationCount(): Observable<NotificationCount> {
    return this.http.get<NotificationCount>(`${this.baseUrl}/count`);
  }

  // Mark as read
  markAsRead(id: number): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap(() => {
        // Update local state
        const notifications = this.notificationsSubject.value.map(n =>
          n.id === id ? { ...n, isRead: true, readAt: new Date() } : n
        );
        this.notificationsSubject.next(notifications);
        
        // Update unread count
        const currentCount = this.unreadCountSubject.value;
        this.unreadCountSubject.next(Math.max(0, currentCount - 1));
      })
    );
  }

  // Mark all as read
  markAllAsRead(): Observable<any> {
    return this.http.patch(`${this.baseUrl}/read-all`, {}).pipe(
      tap(() => {
        // Update local state
        const notifications = this.notificationsSubject.value.map(n => ({
          ...n,
          isRead: true,
          readAt: new Date()
        }));
        this.notificationsSubject.next(notifications);
        this.unreadCountSubject.next(0);
      })
    );
  }

  // Delete notification
  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        const notifications = this.notificationsSubject.value.filter(n => n.id !== id);
        this.notificationsSubject.next(notifications);
        this.loadUnreadCount();
      })
    );
  }

  // Clear all notifications
  clearAllNotifications(): Observable<any> {
    return this.http.delete(`${this.baseUrl}/clear-all`).pipe(
      tap(() => {
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
      })
    );
  }

  // Clear local state (for logout)
  clearState(): void {
    this.stopPolling();
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }
}
