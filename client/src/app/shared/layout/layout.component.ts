import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
    private notificationService: InterventionNotificationService,
    private sanitizer: DomSanitizer
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

  getTimeAgo(date: Date | string): string {
    const now = new Date();
    let createdAt: Date;
    
    // Handle string date input and ensure proper parsing
    if (typeof date === 'string') {
      // If the date string doesn't include timezone info, treat it as UTC
      if (!date.endsWith('Z') && !date.includes('+')) {
        createdAt = new Date(date + 'Z');
      } else {
        createdAt = new Date(date);
      }
    } else {
      createdAt = new Date(date);
    }
    
    const diffMs = now.getTime() - createdAt.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffSecs < 60) return 'À l\'instant';
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

  getNotificationSvgIcon(type: string): SafeHtml {
    const icons: { [key: string]: string } = {
      'intervention_created': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
      'intervention_assigned': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>`,
      'intervention_started': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
      'intervention_completed': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>`,
      'intervention_cancelled': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      'intervention_closed': `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>`
    };
    const svg = icons[type] || `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
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
