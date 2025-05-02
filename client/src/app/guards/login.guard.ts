import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AccountService } from '../core/services/account.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(private accountService: AccountService, private router: Router) {}

  canActivate(): Observable<boolean> {
    console.log('LoginGuard: Checking if already logged in');
    
    // First check if we already determined our auth state during initialization
    if (this.accountService.isInitialCheckDone()) {
      console.log('LoginGuard: Using cached authentication state');
      if (this.accountService.isLoggedIn()) {
        console.log('LoginGuard: Already logged in, redirecting to dashboard');
        this.router.navigate(['/admin/dashboard']);
        return of(false);
      }
      return of(true);
    }

    // If not, make the call to check user info
    console.log('LoginGuard: Fetching user info from server');
    return this.accountService.getUserInfo().pipe(
      tap(user => console.log('LoginGuard: User info received', user ? 'authenticated' : 'not authenticated')),
      map(user => {
        if (user) {
          console.log('LoginGuard: Already logged in, redirecting to dashboard');
          this.router.navigate(['/admin/dashboard']);
          return false;
        }
        console.log('LoginGuard: Not logged in, allowing access to login page');
        return true;
      }),
      catchError(() => {
        console.log('LoginGuard: Error checking auth state, allowing access to login page');
        return of(true); // Allow access to login if error
      })
    );
  }
}