import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, map, of, tap } from 'rxjs';
import { AccountService } from '../core/services/account.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private accountService = inject(AccountService);
  private router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    console.log('AuthGuard: Checking access');
    
    // If we already checked during initialization
    if (this.accountService.isInitialCheckDone()) {
      console.log('AuthGuard: Using cached authentication state');
      return of(this.checkUserAccess(route));
    }

    // Otherwise, get user info first
    console.log('AuthGuard: Fetching user info from server');
    return this.accountService.getUserInfo().pipe(
      tap(user => console.log('AuthGuard: User info received', user ? 'authenticated' : 'not authenticated')),
      map(() => {
        return this.checkUserAccess(route);
      })
    );
  }

  private checkUserAccess(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const currentUser = this.accountService.currentUser();
    
    // Check if user is logged in
    if (!currentUser) {
      console.log('Auth guard: No user found, redirecting to login');
      // Clear any potentially stale session data
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('isLoggedIn');
      return this.router.parseUrl('/login');
    }
    
    // Check for role-based access
    if (route.data['roles'] && !route.data['roles'].includes(currentUser.role)) {
      console.log(`Auth guard: User role ${currentUser.role} not authorized`);
      return this.router.parseUrl('/unauthorized');
    }
    
    console.log(`Auth guard: Access granted for user ${currentUser.firstName} with role ${currentUser.role}`);
    return true;
  }
}