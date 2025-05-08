import { Component, OnInit } from '@angular/core';
import { AccountService } from '../../core/services/account.service';
import { Router } from '@angular/router';

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
    const searchTerm = event.target.value;
    // Implement search logic here
    console.log('Searching for:', searchTerm);
  }
}