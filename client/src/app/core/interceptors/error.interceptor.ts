import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
        console.error('Full error response:', error.error);
        if (error.error?.errors) {
          console.error('Validation errors:', error.error.errors);
        }
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
      }

      console.error(errorMessage);
      return throwError(() => error);
    })
  );
};
