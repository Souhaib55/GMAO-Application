import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  showPopup = false;
  popupMessage = '';
  popupType = 'error';
  isSubmitting = false;
  authCheckCompleted = false;

  ngOnInit() {
    console.log('LoginComponent: Initializing');
    
    // Initial auth check - check for existing user session
    this.performAuthCheck();
  }
  
  // Separate method to handle authentication check
  private performAuthCheck() {
    // Check with the server if the user is already authenticated
    this.accountService.getUserInfo().subscribe({
      next: (user) => {
        if (user) {
          console.log('LoginComponent: Already authenticated as', user.email);
          this.router.navigate(['/admin/dashboard']);
          return;
        }
        
        // Check if another session is active in a different tab
        if (this.accountService.isAnotherSessionActive()) {
          console.log('LoginComponent: Another session is active in a different tab');
          this.showError('For security reasons, only one account is allowed per browser. Please log out of the other account first or use a private browsing window.');
        }
        
        this.authCheckCompleted = true;
      },
      error: () => {
        console.log('LoginComponent: Authentication check failed, not logged in');
        this.authCheckCompleted = true;
      }
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.showError('Please provide valid email and password.');
      return;
    }

    // Prevent multiple submissions
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Get login credentials
    const loginCredentials = {
      email: this.loginForm.get('email')?.value || '',
      password: this.loginForm.get('password')?.value || ''
    };

    console.log('LoginComponent: Attempting login for', loginCredentials.email);
    this.accountService.login(loginCredentials).subscribe({
      next: (user) => {
        console.log('LoginComponent: Login successful as', user.email);
        this.router.navigateByUrl('/admin/dashboard');
      },
      error: (err) => {
        console.error('LoginComponent: Login failed', err);
        let errorMessage = 'Login failed. Please check your credentials.';
        if (err && err.error) {
          errorMessage = typeof err.error === 'string' ? err.error : 
                        (err.error.message || errorMessage);
        }
        this.showError(errorMessage);
        this.isSubmitting = false;
      }
    });
  }

  hidePopup() {
    this.showPopup = false;
  }

  showError(message: string) {
    this.showPopup = true;
    this.popupMessage = message;
    this.popupType = 'error';
    setTimeout(() => this.hidePopup(), 5000);
    console.error('Login error:', message);
  }
}