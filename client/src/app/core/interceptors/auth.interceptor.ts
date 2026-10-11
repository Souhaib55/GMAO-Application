import { HttpInterceptorFn } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Resolved lazily: AuthService itself sends requests from its constructor
  const injector = inject(Injector);
  const router = inject(Router);

  if (req.url.startsWith(environment.apiUrl)) {
    req = req.clone({ withCredentials: true });
  }

  return next(req).pipe(
    catchError((error) => {
      // Session checks, login and password reset answer 401 on purpose:
      // they must not bounce the user away from public pages.
      const isAccountCall = req.url.includes('/account/');

      if (error.status === 401 && !isAccountCall) {
        injector.get(AuthService).clearSession();
        if (!router.url.startsWith('/login')) {
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      }
      return throwError(() => error);
    })
  );
};
