import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { InterventionNotificationService } from '../../core/services/intervention-notification.service';
import { UserInfo, Notification } from '../../core/models';
import { AppIconComponent } from '../components/app-icon/app-icon.component';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, Subscription, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { otCode } from '../utils/gm-format';

registerLocaleData(localeFr, 'fr');

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface SearchHit {
  group: string;
  icon: string;
  label: string;
  sub?: string;
  route: any[];
  query?: { [key: string]: any };
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AppIconComponent],
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

  today = new Date();
  currentYear = new Date().getFullYear();
  pageSection = 'GMAO';
  pageTitle = '';
  visibleGroups: MenuGroup[] = [];

  menuGroups: MenuGroup[] = [
    {
      label: 'Pilotage',
      items: [
        { label: 'Tableau de bord', icon: 'dashboard', route: '/dashboard', roles: ['Superviseur', 'Demandeur', 'Utilisateur'] },
        { label: 'Planning', icon: 'calendar', route: '/planning', roles: ['Superviseur', 'Utilisateur'] }
      ]
    },
    {
      label: 'Maintenance',
      items: [
        { label: 'Interventions', icon: 'interventions', route: '/interventions', roles: ['Superviseur', 'Demandeur', 'Utilisateur'] },
        { label: 'Préventif', icon: 'preventive', route: '/preventif', roles: ['Superviseur', 'Utilisateur'] },
        { label: 'Équipements', icon: 'equipment', route: '/equipment', roles: ['Superviseur', 'Utilisateur'] },
        { label: 'Techniciens', icon: 'team', route: '/techniciens', roles: ['Superviseur'] }
      ]
    },
    {
      label: 'Magasin & achats',
      items: [
        { label: 'Magasin', icon: 'stock', route: '/magasin', roles: ['Superviseur', 'Utilisateur'] },
        { label: 'Achats', icon: 'purchase', route: '/achats', roles: ['Superviseur', 'Utilisateur'] },
        { label: 'Budgets', icon: 'budget', route: '/budgets', roles: ['Superviseur'] }
      ]
    },
    {
      label: 'Analyse',
      items: [
        { label: 'Explorateur de données', icon: 'explorer', route: '/explorateur', roles: ['Superviseur'] },
        { label: 'Rapports', icon: 'reports', route: '/rapports', roles: ['Superviseur'] }
      ]
    },
    {
      label: 'Système',
      items: [
        { label: 'Paramètres', icon: 'settings', route: '/settings', roles: ['Superviseur'] }
      ]
    }
  ];

  /** Screens that are reachable but no longer listed in the menu (kept for existing links). */
  private readonly hiddenPages: { [route: string]: { section: string; title: string } } = {
    '/resources': { section: 'Magasin & achats', title: 'Pièces de rechange' },
    '/stock': { section: 'Magasin & achats', title: 'Stock (ancien module)' },
    '/journal': { section: 'Système', title: "Journal d'activité" }
  };

  private readonly subPageLabels: { [segment: string]: string } = {
    new: 'Nouveau',
    edit: 'Modification',
    view: 'Fiche',
    users: 'Utilisateurs',
    references: 'Référentiels',
    historique: 'Historique'
  };

  // Global search (Ctrl K)
  searchTerm = '';
  searchOpen = false;
  searchLoading = false;
  searchHits: SearchHit[] = [];
  searchIndex = 0;
  private search$ = new Subject<string>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: InterventionNotificationService,
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {}

  /** Reference time for "Il y a …" labels, refreshed every 30 s (stable between change-detection passes). */
  private now = Date.now();
  private clock?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.clock = setInterval(() => this.now = Date.now(), 30000);
    this.subscriptions.push(
      this.search$.pipe(
        map(t => t.trim()),
        debounceTime(220),
        distinctUntilChanged(),
        switchMap(term => this.runSearch(term))
      ).subscribe(hits => {
        this.searchHits = hits;
        this.searchIndex = 0;
        this.searchLoading = false;
      })
    );

    this.updatePageTitle(this.router.url);
    this.subscriptions.push(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe(e => this.updatePageTitle(e.urlAfterRedirects))
    );

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.visibleGroups = this.computeVisibleGroups();
      
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
    clearInterval(this.clock);
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.notificationService.stopPolling();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.userDropdownOpen = false;
    this.notificationDropdownOpen = false;
    this.searchOpen = false;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      (document.getElementById('gm-global-search') as HTMLInputElement | null)?.focus();
    }
  }

  // ------------------------------------------------------------------ Global search

  onSearchInput(): void {
    this.searchOpen = true;
    this.searchLoading = this.searchTerm.trim().length >= 2;
    this.search$.next(this.searchTerm);
  }

  onSearchKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.searchIndex = Math.min(this.searchIndex + 1, this.searchHits.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.searchIndex = Math.max(this.searchIndex - 1, 0);
    } else if (event.key === 'Enter' && this.searchHits[this.searchIndex]) {
      this.openHit(this.searchHits[this.searchIndex]);
    } else if (event.key === 'Escape') {
      this.searchOpen = false;
      (event.target as HTMLElement).blur();
    }
  }

  openHit(hit: SearchHit): void {
    this.router.navigate(hit.route, hit.query ? { queryParams: hit.query } : undefined);
    this.searchOpen = false;
    this.searchTerm = '';
    this.searchHits = [];
    this.closeMobileMenu();
  }

  hitGroups(): string[] {
    return [...new Set(this.searchHits.map(h => h.group))];
  }

  hitsOf(group: string): SearchHit[] {
    return this.searchHits.filter(h => h.group === group);
  }

  hitPosition(hit: SearchHit): number {
    return this.searchHits.indexOf(hit);
  }

  private runSearch(term: string): Observable<SearchHit[]> {
    if (term.length < 2 || !this.currentUser) return of([]);
    const role = this.currentUser.role;
    const low = term.toLowerCase();
    const api = environment.apiUrl;
    const canSeeAssets = role === 'Superviseur' || role === 'Utilisateur';

    const pages: SearchHit[] = this.visibleGroups
      .flatMap(g => g.items)
      .filter(i => i.label.toLowerCase().includes(low))
      .map(i => ({ group: 'Écrans', icon: i.icon, label: i.label, route: [i.route] }));

    const interventions$: Observable<SearchHit[]> = this.http
      .get<any>(`${api}/DemandeIntervention`, { params: { search: term, page: 1, pageSize: 5 } })
      .pipe(
        map(r => (r.data || r.items || []).map((d: any): SearchHit => ({
          group: 'Interventions', icon: 'interventions', label: d.titre,
          sub: `${otCode(d.idDemandeIntervention)} · ${d.equipement?.designation || d.chaineProduction?.libelle || ''}`,
          route: ['/interventions/view', d.idDemandeIntervention]
        }))),
        catchError(() => of([]))
      );

    const equipements$: Observable<SearchHit[]> = !canSeeAssets ? of([]) : this.http
      .get<any[]>(`${api}/Equipment/lookup`)
      .pipe(
        map(list => list
          .filter(e => `${e.codeEquipement} ${e.designation}`.toLowerCase().includes(low))
          .slice(0, 5)
          .map((e): SearchHit => ({ group: 'Équipements', icon: 'equipment', label: e.designation, sub: e.codeEquipement, route: ['/equipment/view', e.idEquipement] }))),
        catchError(() => of([]))
      );

    const articles$: Observable<SearchHit[]> = !canSeeAssets ? of([]) : this.http
      .get<any>(`${api}/magasin/articles`, { params: { search: term, pageSize: 5 } })
      .pipe(
        map(r => (r.data || []).map((a: any): SearchHit => ({
          group: 'Magasin', icon: 'stock', label: a.designation, sub: `${a.codePiece} · ${a.quantite_Stock} ${a.unite} en stock`,
          route: ['/magasin'], query: { article: a.idPiece }
        }))),
        catchError(() => of([]))
      );

    return forkJoin([interventions$, equipements$, articles$]).pipe(
      map(([i, e, a]) => [...pages.slice(0, 4), ...i, ...e, ...a])
    );
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  /** Sidebar hamburger: collapses the rail on desktop, closes the drawer on mobile. */
  onMenuToggle(): void {
    if (window.matchMedia('(max-width: 992px)').matches) {
      this.closeMobileMenu();
    } else {
      this.toggleSidebar();
    }
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
    const now = new Date(this.now);
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

  canShowMenuItem(item: MenuItem): boolean {
    if (!this.currentUser) return false;
    return item.roles.includes(this.currentUser.role);
  }

  private computeVisibleGroups(): MenuGroup[] {
    return this.menuGroups
      .map(group => ({ ...group, items: group.items.filter(item => this.canShowMenuItem(item)) }))
      .filter(group => group.items.length > 0);
  }

  private updatePageTitle(url: string): void {
    const segments = url.split('?')[0].split('/').filter(Boolean);
    const root = '/' + (segments[0] || 'dashboard');
    for (const group of this.menuGroups) {
      const item = group.items.find(i => i.route === root);
      if (item) {
        this.pageSection = group.label;
        this.pageTitle = item.label;
        const sub = segments[1] && this.subPageLabels[segments[1]];
        if (sub) {
          this.pageSection = item.label;
          this.pageTitle = sub;
        }
        return;
      }
    }
    const hidden = this.hiddenPages[root];
    this.pageSection = hidden?.section ?? 'GMAO';
    this.pageTitle = hidden?.title ?? '';
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }
}
