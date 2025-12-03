import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Add credentials to all API requests
  if (req.url.includes(environment.apiUrl)) {
    req = req.clone({
      withCredentials: true
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        // Redirect to login on 401 Unauthorized
        const router = inject(Router);
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
