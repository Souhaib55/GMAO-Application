import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  emailSent = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.loading = true;
      this.error = null;
      this.success = null;

      this.authService.forgotPassword(this.forgotPasswordForm.value.email).subscribe({
        next: (response) => {
          this.emailSent = true;
          this.success = response.message || 'Un email de réinitialisation a été envoyé à votre adresse email.';
          this.loading = false;
        },
        error: (err) => {
          this.error = err.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
          this.loading = false;
        }
      });
    }
  }

  get email() {
    return this.forgotPasswordForm.get('email');
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
