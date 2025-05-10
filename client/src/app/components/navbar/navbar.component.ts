import { Component, OnInit } from '@angular/core';
import { AccountService } from '../../core/services/account.service';
import { Router } from '@angular/router';
import { ROUTES } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  isNavOpen = false;

  constructor(
    public accountService: AccountService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if the nav was previously open (could use localStorage if needed)
    const body = document.getElementsByTagName('body')[0];
    this.isNavOpen = body.classList.contains('nav-open');
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

  logout(): void {
    // Call the logout method and then navigate to login page
    this.accountService.logout();
    this.router.navigateByUrl('/login');
  }

  getUserInitials(): string {
    const user = this.accountService.currentUser();
    if (!user || !user.email) {
      return '';
    }

    // Extract initials from email (e.g., "AM" from "ammani@gmail.com")
    const email = user.email;
    const username = email.split('@')[0];
    
    if (username.length >= 2) {
      // Take first two characters and convert to uppercase
      return username.substring(0, 2).toUpperCase();
    } else if (username.length === 1) {
      // If username is just one character, use that
      return username.toUpperCase();
    } else {
      return '';
    }
  }

  onSearch(event: any): void {
    const searchTerm = event.target.value.trim().toLowerCase();
    console.log('Search term:', searchTerm);
    
    // If search is empty, navigate to dashboard by default
    if (!searchTerm) {
      console.log('Empty search term, navigating to dashboard');
      this.router.navigateByUrl('/admin/dashboard');
      return;
    }

    // Track different types of matches
    let exactMatch: string | null = null;
    let startsWithMatch: string | null = null;
    let containsMatch: string | null = null;
    
    // Helper function to search through routes
    const searchRoutes = (routes: any[]): void => {
      for (const route of routes) {
        // Skip routes without titles or paths
        if (!route.title || !route.path) continue;
        
        const routeTitle = route.title.toLowerCase();
        
        // Check for exact match (title equals search term)
        if (routeTitle === searchTerm) {
          exactMatch = route.path;
          return; // Found perfect match, exit early
        }
        
        // Check for starts-with match
        if (!startsWithMatch && routeTitle.startsWith(searchTerm)) {
          startsWithMatch = route.path;
        }
        
        // Check for contains match
        if (!containsMatch && routeTitle.includes(searchTerm)) {
          containsMatch = route.path;
        }
        
        // If this route has children, search through them
        if (route.children && route.children.length > 0) {
          for (const child of route.children) {
            if (!child.title || !child.path) continue;
            
            const childTitle = child.title.toLowerCase();
            
            // Check for exact match
            if (childTitle === searchTerm) {
              exactMatch = child.path;
              return; // Found perfect match, exit early
            }
            
            // Check for starts-with match
            if (!startsWithMatch && childTitle.startsWith(searchTerm)) {
              startsWithMatch = child.path;
            }
            
            // Check for contains match
            if (!containsMatch && childTitle.includes(searchTerm)) {
              containsMatch = child.path;
            }
          }
        }
      }
    };
    
    // Start the search
    searchRoutes(ROUTES);
    
    // Use the best match available, in priority order
    const matchedPath = exactMatch || startsWithMatch || containsMatch;
    
    if (matchedPath) {
      console.log('Navigating to:', matchedPath);
      // FIX: Add '/admin/' prefix for correct routing
      this.router.navigateByUrl('/admin/' + matchedPath);
    } else {
      console.log('No match found, navigating to dashboard');
      // FIX: Use correct path for dashboard
      this.router.navigateByUrl('/admin/dashboard');
    }
  }
}