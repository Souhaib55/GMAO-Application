import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  autoClose?: boolean;
  duration?: number; // milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications$ = new BehaviorSubject<Notification[]>([]);
  public notifications = this.notifications$.asObservable();

  constructor() {
    this.loadNotifications();
  }

  show(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
      autoClose: notification.autoClose !== false,
      duration: notification.duration || 5000
    };

    const current = this.notifications$.value;
    this.notifications$.next([newNotification, ...current]);
    this.saveNotifications();

    if (newNotification.autoClose) {
      setTimeout(() => {
        this.remove(newNotification.id);
      }, newNotification.duration);
    }
  }

  success(title: string, message: string): void {
    this.show({ type: 'success', title, message, duration: 4000 });
  }

  error(title: string, message: string, autoClose: boolean = true): void {
    this.show({ type: 'error', title, message, autoClose, duration: 6000 });
  }

  warning(title: string, message: string): void {
    this.show({ type: 'warning', title, message, duration: 5000 });
  }

  info(title: string, message: string): void {
    this.show({ type: 'info', title, message, duration: 4000 });
  }

  remove(id: string): void {
    const current = this.notifications$.value;
    this.notifications$.next(current.filter(n => n.id !== id));
    this.saveNotifications();
  }

  markAsRead(id: string): void {
    const current = this.notifications$.value;
    const updated = current.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    this.notifications$.next(updated);
    this.saveNotifications();
  }

  markAllAsRead(): void {
    const current = this.notifications$.value;
    const updated = current.map(n => ({ ...n, read: true }));
    this.notifications$.next(updated);
    this.saveNotifications();
  }

  clearAll(): void {
    this.notifications$.next([]);
    this.saveNotifications();
  }

  getUnreadCount(): Observable<number> {
    return new Observable(observer => {
      this.notifications.subscribe(notifications => {
        const unreadCount = notifications.filter(n => !n.read).length;
        observer.next(unreadCount);
      });
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveNotifications(): void {
    try {
      const notifications = this.notifications$.value;
      // Keep only last 50 notifications
      const trimmed = notifications.slice(0, 50);
      localStorage.setItem('gmao_notifications', JSON.stringify(trimmed));
    } catch (e) {
      console.error('Error saving notifications', e);
    }
  }

  private loadNotifications(): void {
    try {
      const stored = localStorage.getItem('gmao_notifications');
      if (stored) {
        const notifications = JSON.parse(stored);
        this.notifications$.next(notifications);
      }
    } catch (e) {
      console.error('Error loading notifications', e);
    }
  }
}
