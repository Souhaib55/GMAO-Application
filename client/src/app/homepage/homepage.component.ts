import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from '../core/services/account.service';

@Component({
  selector: 'app-homepage',
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss']
})
export class HomepageComponent implements OnInit {
  isLoggedIn = false;
  userName = '';

  constructor(
    private router: Router, 
    private accountService: AccountService
  ) {}

  ngOnInit() {
    // Check if user is already logged in
    this.accountService.getUserInfo().subscribe(user => {
      this.isLoggedIn = !!user;
      if (user) {
        this.userName = user.firstName;
      }
    });
  }

  goToLogin() {
    // If already logged in, go to dashboard
    if (this.isLoggedIn) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}