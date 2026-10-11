import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthVisualComponent } from '../auth-visual/auth-visual.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthVisualComponent],
  templateUrl: './login.component.html',
  styleUrls: ['../auth-shell.scss']
})
export class LoginComponent {
  currentYear = new Date().getFullYear();
  loginForm: FormGroup;
  loading = false;
  error: string | null = null;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.error = null;

      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          // Back to the page that required the login, if it is an internal route
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const target = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/dashboard';
          this.router.navigateByUrl(target);
        },
        error: (err) => {
          if (err.status === 429) {
            this.error = 'Trop de tentatives. Patientez une minute avant de réessayer.';
          } else if (err.status === 0) {
            this.error = 'Serveur injoignable. Vérifiez la connexion au réseau de l\'usine.';
          } else {
            this.error = err.error?.message || 'Email ou mot de passe incorrect.';
          }
          this.loading = false;
        }
      });
    }
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
