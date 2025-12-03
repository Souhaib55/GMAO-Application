import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRole = route.data['role'] as string | string[];

  // Support both single role and array of roles
  if (Array.isArray(requiredRole)) {
    if (requiredRole.some(role => authService.hasRole(role))) {
      return true;
    }
  } else if (authService.hasRole(requiredRole)) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};
