// gmao/client/src/app/components/navbar/navbar.component.ts
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { AccountService } from '../../core/services/account.service';
import { Router } from '@angular/router';
import { ROUTES } from '../sidebar/sidebar.component';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isNavOpen = false;
  notificationCount = 0;
  notifications: NotificationItem[] = [];
  showNotificationsPanel = false;
  private refreshSubscription?: Subscription;
  private notificationsSubscription?: Subscription;
  
  @ViewChild('notificationsPanel') notificationsPanel?: ElementRef;

  constructor(
    public accountService: AccountService,
    private router: Router,
    public notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Check if the nav was previously open
    const body = document.getElementsByTagName('body')[0];
    this.isNavOpen = body.classList.contains('nav-open');
    
    // Subscribe to notification updates
    this.notificationsSubscription = this.notificationService.notifications$
      .subscribe(notifications => {
        this.notifications = notifications;
      });
      
    // Subscribe to notification count
    this.notificationService.notificationCount$
      .subscribe(count => {
        this.notificationCount = count;
      });
    
    // Load notifications immediately
    this.loadNotifications();
    
    // Then refresh notifications every minute
    this.refreshSubscription = interval(60000)
      .pipe(
        switchMap(() => {
          this.notificationService.loadTodayInterventions();
          return this.notificationService.notificationCount$;
        })
      )
      .subscribe();
  }
  
  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    if (this.notificationsSubscription) {
      this.notificationsSubscription.unsubscribe();
    }
  }
  
  loadNotifications(): void {
    this.notificationService.loadTodayInterventions();
  }

  sidebarToggle(): void {
    const body = document.getElementsByTagName('body')[0];
    this.isNavOpen = !this.isNavOpen;
    
    if (body.classList.contains('nav-open')) {
      body.classList.remove('nav-open');
    } else {
      body.classList.add('nav-open');
    }
  }

  shouldShowNotifications(): boolean {
    const user = this.accountService.currentUser();
    if (!user) return false;
    return ['Superviseur', 'Utilisateur', 'Technicien'].includes(user.role);
  }

  // Toggle notifications panel
  toggleNotificationsPanel(): void {
    this.showNotificationsPanel = !this.showNotificationsPanel;
  }
  
  // Hide notifications when clicking elsewhere
  @HostListener('document:click', ['$event'])
  clickOutside(event: Event): void {
    // Check if click was outside notification area
    const notificationIcon = document.querySelector('.notification-container');
    const notificationsPanel = this.notificationsPanel?.nativeElement;
    
    if (this.showNotificationsPanel && 
        notificationsPanel && 
        !notificationsPanel.contains(event.target) &&
        notificationIcon && 
        !notificationIcon.contains(event.target as Node)) {
      this.showNotificationsPanel = false;
    }
  }

  // Navigate to a specific intervention
  navigateToIntervention(interventionId: number): void {
    this.showNotificationsPanel = false;
    this.router.navigateByUrl(`/intervention/edit/${interventionId}`);
  }
  
  // Navigate to all interventions
  navigateToInterventions(): void {
    this.showNotificationsPanel = false;
    this.router.navigateByUrl('/intervention');
  }
  
  // Dismiss a notification
  dismissNotification(event: Event, interventionId: number): void {
    event.stopPropagation(); // Prevent navigation
    this.notificationService.markAsRead(interventionId);
  }
  
  // Format date for display
  formatNotificationDate(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60); // diff in minutes
    
    if (diff < 1) return 'À l\'instant';
    if (diff < 60) return `Il y a ${diff} min`;
    
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    
    return date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    console.log('Search term:', term);
    // Implémentez la fonctionnalité de recherche
  }
  
  getUserInitials(): string {
    const user = this.accountService.currentUser();
    if (!user) return '';
    return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
  }
}