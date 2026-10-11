import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthVisualComponent } from '../auth-visual/auth-visual.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthVisualComponent],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../auth-shell.scss']
})
export class ResetPasswordComponent implements OnInit {
  currentYear = new Date().getFullYear();
  resetPasswordForm: FormGroup;
  loading = false;
  validatingToken = true;
  tokenValid = false;
  error: string | null = null;
  success: string | null = null;
  showPassword = false;
  showConfirmPassword = false;
  
  private token: string = '';
  private email: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Extract token and email from URL query params
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';
      
      if (!this.token || !this.email) {
        this.validatingToken = false;
        this.error = 'Lien de réinitialisation invalide. Veuillez demander un nouveau lien.';
        return;
      }

      // Validate the token
      this.authService.validateResetToken(this.email, this.token).subscribe({
        next: () => {
          this.validatingToken = false;
          this.tokenValid = true;
        },
        error: (err) => {
          this.validatingToken = false;
          this.tokenValid = false;
          this.error = err.error?.message || 'Le lien de réinitialisation est invalide ou a expiré.';
        }
      });
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid) {
      this.loading = true;
      this.error = null;
      this.success = null;

      const resetData = {
        email: this.email,
        token: this.token,
        newPassword: this.resetPasswordForm.value.newPassword,
        confirmPassword: this.resetPasswordForm.value.confirmPassword
      };

      this.authService.resetPassword(resetData).subscribe({
        next: (response) => {
          this.success = response.message || 'Votre mot de passe a été réinitialisé avec succès.';
          this.loading = false;
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (err) => {
          this.error = err.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
          this.loading = false;
        }
      });
    }
  }

  get newPassword() {
    return this.resetPasswordForm.get('newPassword');
  }

  get confirmPassword() {
    return this.resetPasswordForm.get('confirmPassword');
  }

  // Password validation helpers
  hasMinLength(): boolean {
    return this.newPassword?.value?.length >= 8;
  }

  hasUppercase(): boolean {
    return this.newPassword?.value && /[A-Z]/.test(this.newPassword.value);
  }

  hasLowercase(): boolean {
    return this.newPassword?.value && /[a-z]/.test(this.newPassword.value);
  }

  hasNumber(): boolean {
    return this.newPassword?.value && /[0-9]/.test(this.newPassword.value);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  requestNewLink(): void {
    this.router.navigate(['/forgot-password']);
  }
}
