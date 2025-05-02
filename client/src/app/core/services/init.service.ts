import { Injectable } from '@angular/core';
import { Observable, tap, of } from 'rxjs';
import { AccountService } from './account.service';
import { first, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InitService {
  constructor(private accountService: AccountService) {}

  init(): Observable<any> {
    console.log('Application initialization started');
    
    // Check if browser was closed without proper logout (tab closed flag not set)
    // and there's an active session in localStorage
    const activeSession = localStorage.getItem('gmao_browser_session');
    const tabClosed = localStorage.getItem('gmao_tab_closed');
    
    if (activeSession && tabClosed !== 'true') {
      console.log('Found existing browser session during initialization');
    }
    
    // Always check server-side auth state to ensure we have the most accurate data
    return this.accountService.getUserInfo().pipe(
      first(), // Make sure we only take the first emission
      tap(user => {
        if (user) {
          console.log(`Initialization complete, authenticated as: ${user.firstName} ${user.lastName} (${user.role})`);
          
          // If we have a valid user, ensure browser session is properly set
          const sessionId = sessionStorage.getItem('gmao_session_id');
          if (sessionId) {
            localStorage.setItem('gmao_browser_session', sessionId);
            localStorage.setItem('gmao_session_timestamp', Date.now().toString());
            localStorage.setItem('gmao_session_heartbeat', Date.now().toString());
            localStorage.setItem('gmao_user_email', user.email);
            localStorage.removeItem('gmao_tab_closed');
          }
        } else {
          console.log('Initialization complete, not authenticated');
        }
      }),
      catchError(err => {
        console.error('Initialization failed:', err);
        return of(null);
      })
    );
  }
}