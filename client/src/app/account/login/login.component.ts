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
    this.performAuthCheck();
  }

  private performAuthCheck() {
    this.accountService.getUserInfo().subscribe({
      next: (user) => {
        if (user) {
          console.log('LoginComponent: Already authenticated as', user.email);
          this.router.navigate(['/admin/dashboard']);
          return;
        }
        if (this.accountService.isAnotherSessionActive()) {
          console.log('LoginComponent: Another session is active in a different tab');
          this.showError('Pour des raisons de sécurité, un seul compte est autorisé par navigateur. Veuillez vous déconnecter de l\'autre compte ou utiliser une fenêtre de navigation privée.');
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
    // Client-side validation for empty or invalid fields
    if (this.loginForm.invalid) {
      const emailControl = this.loginForm.get('email');
      if (emailControl?.errors?.['required']) {
        this.showError('Veuillez entrer votre email.');
        return;
      }
      if (emailControl?.errors?.['email']) {
        this.showError('Email incorrect.');
        return;
      }
      const passwordControl = this.loginForm.get('password');
      if (passwordControl?.errors?.['required']) {
        this.showError('Veuillez entrer votre mot de passe.');
        return;
      }
      return;
    }

    // Prevent multiple submissions
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    // Prepare login credentials
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
        
        // Parse error message from server
        let errorText = '';
        if (err && err.error) {
          errorText = typeof err.error === 'string' ? 
                      err.error.toLowerCase() : 
                      (err.error.message ? err.error.message.toLowerCase() : '');
        }

        // Show specific error messages based on the error
        if (errorText.includes('user not found') || 
            errorText.includes('email not found') || 
            errorText.includes('email introuvable') || 
            errorText.includes('utilisateur introuvable') || 
            errorText.includes('utilisateur non trouvé') ||
            errorText.includes('email incorrect')) {
          this.showError('Email incorrect.');
        } 
        else if (errorText.includes('password') || 
                errorText.includes('mot de passe') ||
                errorText.includes('invalid credentials') ||
                errorText.includes('wrong password')) {
          this.showError('Mot de passe incorrect.');
        } 
        else if (errorText.includes('both') || 
                errorText.includes('credentials') ||
                errorText.includes('authentication failed')) {
          this.showError('Email et mot de passe incorrect.');
        } 
        else {
          // Default message if we can't determine the specific error
          this.showError('Échec de connexion. Veuillez vérifier vos identifiants.');
        }
        
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