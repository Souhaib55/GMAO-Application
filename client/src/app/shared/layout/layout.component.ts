import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { InterventionNotificationService } from '../../core/services/intervention-notification.service';
import { UserInfo, Notification } from '../../core/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = true;
  mobileMenuOpen = false;
  userDropdownOpen = false;
  notificationDropdownOpen = false;
  currentUser: UserInfo | null = null;
  
  // Notifications
  notifications: Notification[] = [];
  unreadCount = 0;
  private subscriptions: Subscription[] = [];

  menuItems = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      roles: ['Superviseur', 'Demandeur', 'Utilisateur']
    },
    {
      label: 'GMAO Chat',
      icon: 'chat',
      route: '/chat',
      roles: ['Superviseur']
    },
    {
      label: 'Planning',
      icon: 'calendar',
      route: '/planning',
      roles: ['Superviseur', 'Utilisateur']
    },
    {
      label: 'Interventions',
      icon: 'interventions',
      route: '/interventions',
      roles: ['Superviseur', 'Demandeur', 'Utilisateur']
    },
    {
      label: 'Équipements',
      icon: 'equipment',
      route: '/equipment',
      roles: ['Superviseur', 'Utilisateur']
    },
    {
      label: 'Ressources',
      icon: 'resources',
      route: '/resources',
      roles: ['Superviseur']
    },
    {
      label: 'Stock/Achat',
      icon: 'stock',
      route: '/stock',
      roles: ['Superviseur']
    },
    {
      label: 'Rapports',
      icon: 'reports',
      route: '/rapports',
      roles: ['Superviseur']
    },
    {
      label: 'Paramètres',
      icon: 'settings',
      route: '/settings',
      roles: ['Superviseur']
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: InterventionNotificationService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      // Start notification polling only for Superviseur and Utilisateur
      if (user && (user.role === 'Superviseur' || user.role === 'Utilisateur')) {
        this.notificationService.startPolling(30000);
        
        // Subscribe to notifications
        this.subscriptions.push(
          this.notificationService.notifications$.subscribe(notifications => {
            this.notifications = notifications;
          }),
          this.notificationService.unreadCount$.subscribe(count => {
            this.unreadCount = count;
          })
        );
      } else {
        this.notificationService.clearState();
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.notificationService.stopPolling();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.userDropdownOpen = false;
    this.notificationDropdownOpen = false;
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.userDropdownOpen = !this.userDropdownOpen;
    this.notificationDropdownOpen = false;
  }

  toggleNotificationDropdown(event: Event): void {
    event.stopPropagation();
    this.notificationDropdownOpen = !this.notificationDropdownOpen;
    this.userDropdownOpen = false;
    
    // Load fresh notifications when opening
    if (this.notificationDropdownOpen) {
      this.notificationService.loadNotifications();
    }
  }

  closeUserDropdown(): void {
    this.userDropdownOpen = false;
  }

  closeNotificationDropdown(): void {
    this.notificationDropdownOpen = false;
  }

  markNotificationAsRead(notification: Notification, event: Event): void {
    event.stopPropagation();
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe();
    }
    
    // Navigate to intervention if linked
    if (notification.interventionId) {
      this.router.navigate(['/planning']);
      this.closeNotificationDropdown();
    }
  }

  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe();
  }

  deleteNotification(notification: Notification, event: Event): void {
    event.stopPropagation();
    this.notificationService.deleteNotification(notification.id).subscribe();
  }

  clearAllNotifications(event: Event): void {
    event.stopPropagation();
    this.notificationService.clearAllNotifications().subscribe();
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const createdAt = new Date(date);
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'intervention_created': return 'bi-plus-circle';
      case 'intervention_assigned': return 'bi-person-check';
      case 'intervention_started': return 'bi-play-circle';
      case 'intervention_completed': return 'bi-check-circle';
      case 'intervention_cancelled': return 'bi-x-circle';
      case 'intervention_closed': return 'bi-archive';
      default: return 'bi-bell';
    }
  }

  canShowMenuItem(item: any): boolean {
    if (!this.currentUser) return false;
    return item.roles.includes(this.currentUser.role);
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
