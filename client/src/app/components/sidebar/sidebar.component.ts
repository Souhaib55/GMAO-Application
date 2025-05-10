import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AccountService } from 'app/core/services/account.service';
import { User } from 'app/shared/models/user';

declare const $: any;
declare interface RouteInfo {
    path?: string;
    title: string;
    icon: string;
    class: string;
    children?: RouteInfo[];
    roles?: string[]; // Add roles property to define who can see this menu item
}

export const ROUTES: RouteInfo[] = [
  { path: 'dashboard', title: 'Dashboard', icon: 'grid_view_rounded', class: '' }, // All roles
  { path: 'askaidatabase', title: 'GMAO Chat', icon: 'chat_bubble_rounded', class: '', roles: ['Superviseur'] },
  // Replace the nested equipment menu with a direct link
  { path: 'equipment', title: 'Equipements', icon: 'construction_rounded', class: '', roles: ['Superviseur', 'Utilisateur'] },
  { path: 'intervention', title: 'Interventions', icon: 'manage_accounts_rounded', class: '' }, // All roles
  { path: 'planning', title: 'Planning', icon: 'content_paste', class: '', roles: ['Superviseur', 'Utilisateur'] },
  { path: 'stock', title: 'Stock/Achat', icon: 'shopping_cart_rounded', class: '', roles: ['Superviseur'] },
  { path: 'ressources', title: 'Ressources', icon: 'view_in_art_rounded', class: '', roles: ['Superviseur', 'Utilisateur'] },
  { path: 'reports', title: 'Rapports', icon: 'library_books', class: '', roles: ['Superviseur'] },
  { path: 'helpcomponent', title: 'Paramètre', icon: 'settings', class: '', roles: ['Superviseur'] }
];

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})


export class SidebarComponent implements OnInit {
  menuItems: any[];
  currentUser: User | null = null;

  constructor(
    private router: Router,
    public accountService: AccountService  // Changed to public for template access
  ) { }

  ngOnInit() {
    // Get current user
    this.currentUser = this.accountService.currentUser();
    
    // Filter menu items based on user's role
    this.menuItems = this.filterMenuItemsByRole(ROUTES);

    // Update expanded state
    this.menuItems = this.menuItems.map(item => {
      if (item.children) {
        return { ...item, expanded: this.isAnyChildActive(item) };
      }
      return item;
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.menuItems.forEach(item => {
        if (item.children) {
          // Keep submenu expanded if any child is active
          if (this.isAnyChildActive(item)) {
            item.expanded = true;
          }
        }
      });
    });
  }

  private filterMenuItemsByRole(routes: RouteInfo[]): RouteInfo[] {
    if (!this.currentUser) {
      return []; // If no user is logged in, don't show any menu items
    }

    return routes.filter(route => {
      // If no roles are specified, show to everyone
      if (!route.roles) {
    return true;
  }

      // Check if user role is in the allowed roles
      const hasAccess = route.roles.includes(this.currentUser?.role || '');
      
      // If this is a parent route with children, filter the children too
      if (route.children && hasAccess) {
        const filteredChildren = route.children.filter(child => {
          if (!child.roles) return true;
          return child.roles.includes(this.currentUser?.role || '');
        });
        
        // Only include parent if it has accessible children
        if (filteredChildren.length > 0) {
          route.children = filteredChildren;
          return true;
}
        return false;
      }
      
      return hasAccess;
    });
  }

  toggleSubmenu(item: any) {
    item.expanded = !item.expanded;
  }

  isActive(item: RouteInfo): boolean {
    // For items with a path (no children), check exact match
    if (item.path && !item.children) {
      return this.router.isActive(item.path, true);
    }
    // For parent items with children, return false to prevent highlighting
    return false;
  }

  private isAnyChildActive(item: RouteInfo): boolean {
    return item.children && item.children.some(child => this.router.isActive(child.path, true));
  }

  isMobileMenu() {
    if ($(window).width() > 991) {
      return false;
    }
    return true;
  }
  
  // Add logout method
  logout(): void {
    // Call the logout method and then navigate to login page
    this.accountService.logout();
    this.router.navigateByUrl('/login');
  }

  // Get user's email for display in the logout section
  getUserEmail(): string {
    return this.currentUser?.email || '';
  }
}