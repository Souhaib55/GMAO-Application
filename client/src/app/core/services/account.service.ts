import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { User } from 'app/shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  private baseUrl = 'https://localhost:5001/api/account';
  private initialCheckDone = false;
  private heartbeatInterval: any;
  private visibilityHandler: any;
  
  // Keys for session management
  private readonly AUTH_KEY = 'isLoggedIn';
  private readonly USER_KEY = 'currentUser';
  private readonly SESSION_ID_KEY = 'gmao_session_id';
  private readonly BROWSER_SESSION_KEY = 'gmao_browser_session';
  private readonly SESSION_TIMESTAMP_KEY = 'gmao_session_timestamp';
  private readonly SESSION_HEARTBEAT_KEY = 'gmao_session_heartbeat';
  private readonly TAB_CLOSED_KEY = 'gmao_tab_closed';
  private readonly USER_EMAIL_KEY = 'gmao_user_email';
  // Session timeout - 20 minutes in milliseconds
  private readonly SESSION_TIMEOUT = 20 * 60 * 1000;
  // Heartbeat timeout - only 5 seconds (extremely short to detect closed tabs quickly)
  private readonly HEARTBEAT_TIMEOUT = 5 * 1000;

  constructor(private http: HttpClient) {
    // Generate a unique ID for this browser tab/window
    if (!sessionStorage.getItem(this.SESSION_ID_KEY)) {
      sessionStorage.setItem(this.SESSION_ID_KEY, this.generateUniqueId());
    }
    
    // Clear the tab closed flag on startup (in case it was set from previous session)
    localStorage.removeItem(this.TAB_CLOSED_KEY);
    
    // Check for stale sessions on startup - use less aggressive check by default
    this.checkAndClearStaleSession(false);
    
    const storedUser = sessionStorage.getItem(this.USER_KEY);
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser ? JSON.parse(storedUser) : null);
    this.currentUser$ = this.currentUserSubject.asObservable();
    
    // Listen for storage events (another tab logged in/out)
    window.addEventListener('storage', (event) => {
      if (event.key === this.BROWSER_SESSION_KEY || 
          event.key === this.SESSION_HEARTBEAT_KEY || 
          event.key === this.TAB_CLOSED_KEY ||
          event.key === this.USER_EMAIL_KEY ||
          event.key === null) { // null means clear all storage
        console.log('Storage changed:', event.key, event.newValue);
        
        // If another tab logged out or storage was cleared
        if ((event.key === this.BROWSER_SESSION_KEY && !event.newValue) || event.key === null) {
          if (this.isLoggedIn()) {
            console.log('Another tab cleared the browser session - logging out here too');
            sessionStorage.removeItem(this.USER_KEY);
            sessionStorage.removeItem(this.AUTH_KEY);
            this.currentUserSubject.next(null);
          }
        }
        
        // If session is still active in localStorage but we're not logged in, try to adopt it
        if (event.key === this.SESSION_HEARTBEAT_KEY && event.newValue && !this.isLoggedIn()) {
          console.log('Detected active session in another tab, attempting to sync');
          this.initializeFromExistingSession();
        }
      }
    });
    
    // Add event listener for tab/window close
    window.addEventListener('beforeunload', (event) => {
      console.log('Tab closing - marking session for preservation');
      
      // Don't set the tab closed flag, just update the heartbeat
      // This allows the session to persist when the user closes a tab
      // but wants to reopen the application later
      if (this.isLoggedIn()) {
        localStorage.setItem(this.SESSION_HEARTBEAT_KEY, Date.now().toString());
      }
    });
    
    // Use visibility API to detect when tab is hidden/visible
    this.setupVisibilityHandling();
    
    // Update session timestamp and heartbeat periodically if logged in
    this.setupSessionKeepAlive();
    
    // Check for existing browser session on new tab open
    this.initializeFromExistingSession();
  }

  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  private setupVisibilityHandling(): void {
    // Handle tab visibility changes
    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        // Tab is being hidden, might be closed
        console.log('Tab hidden - may be closing');
      } else if (document.visibilityState === 'visible') {
        // Tab is visible again, check for existing session
        console.log('Tab visible - checking session state');
        this.initializeFromExistingSession();
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
  
  // Modified method to perform a complete logout (both client and server-side)
  private performFullLogout(): void {
    // Clear browser-wide session data regardless of which tab owns it
    localStorage.removeItem(this.BROWSER_SESSION_KEY);
    localStorage.removeItem(this.SESSION_TIMESTAMP_KEY);
    localStorage.removeItem(this.SESSION_HEARTBEAT_KEY);
    localStorage.removeItem(this.USER_EMAIL_KEY);
    
    // Set tab closed flag to true - this indicates an explicit logout
    localStorage.setItem(this.TAB_CLOSED_KEY, 'true');
    
    // Clear session-specific data
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.AUTH_KEY);
    
    // Update subject
    this.currentUserSubject.next(null);
    
    // Try to notify the server, but don't wait for response
    try {
      // Use a synchronous request to ensure it happens before the tab closes
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/logout`, false); // false makes it synchronous
      xhr.withCredentials = true;
      xhr.send();
    } catch (e) {
      console.error('Failed to notify server about logout:', e);
    }
  }
  
  private cleanupBeforeClose(): void {
    // This method is kept for backward compatibility
    // Now just delegates to the full logout
    this.performFullLogout();
  }
  
  // Check if there's a stale session and clear it
  private checkAndClearStaleSession(aggressive = false): boolean {
    const sessionTimestamp = localStorage.getItem(this.SESSION_TIMESTAMP_KEY);
    const activeSession = localStorage.getItem(this.BROWSER_SESSION_KEY);
    const heartbeat = localStorage.getItem(this.SESSION_HEARTBEAT_KEY);
    const tabClosed = localStorage.getItem(this.TAB_CLOSED_KEY);
    const currentTime = Date.now();
    
    let wasStale = false;
    
    // If tab closed flag is set, always consider session as stale
    if (tabClosed === 'true') {
      console.log('Detected tab closed flag, clearing browser-wide session data');
      localStorage.removeItem(this.BROWSER_SESSION_KEY);
      localStorage.removeItem(this.SESSION_TIMESTAMP_KEY);
      localStorage.removeItem(this.SESSION_HEARTBEAT_KEY);
      localStorage.removeItem(this.TAB_CLOSED_KEY);
      localStorage.removeItem(this.USER_EMAIL_KEY);
      return true;
    }
    
    // Modified stale session detection to be more lenient
    if (activeSession && (
        (!sessionTimestamp && !heartbeat) || 
        (sessionTimestamp && (currentTime - parseInt(sessionTimestamp)) > this.SESSION_TIMEOUT && 
         (!heartbeat || (currentTime - parseInt(heartbeat)) > this.HEARTBEAT_TIMEOUT)) ||
        aggressive
    )) {
      console.log('Detected potentially stale session, clearing browser-wide session data');
      localStorage.removeItem(this.BROWSER_SESSION_KEY);
      localStorage.removeItem(this.SESSION_TIMESTAMP_KEY);
      localStorage.removeItem(this.SESSION_HEARTBEAT_KEY);
      localStorage.removeItem(this.TAB_CLOSED_KEY);
      localStorage.removeItem(this.USER_EMAIL_KEY);
      wasStale = true;
    }
    
    return wasStale;
  }
  
  // Setup interval to update session timestamp and heartbeat while user is active
  private setupSessionKeepAlive(): void {
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Set up a new heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      if (this.isLoggedIn()) {
        // Update heartbeat even if we don't own the session
        // This allows better session sharing between tabs
        localStorage.setItem(this.SESSION_HEARTBEAT_KEY, Date.now().toString());
        
        // Current sessionId
        const sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);
        const activeBrowserSession = localStorage.getItem(this.BROWSER_SESSION_KEY);
        
        // Only update timestamp if we own the browser session or there isn't one
        if (!activeBrowserSession || activeBrowserSession === sessionId) {
          const currentTime = Date.now().toString();
          localStorage.setItem(this.SESSION_TIMESTAMP_KEY, currentTime);
          localStorage.setItem(this.BROWSER_SESSION_KEY, sessionId!);
          
          // Store current user email in localStorage for cross-tab identity check
          const currentUser = this.currentUserSubject.value;
          if (currentUser && currentUser.email) {
            localStorage.setItem(this.USER_EMAIL_KEY, currentUser.email);
          }
        }
      }
    }, 5000); // Very frequent heartbeat (5 seconds) to quickly detect closed tabs
  }

  // New helper method to initialize from existing browser session
  private initializeFromExistingSession(): void {
    const activeSession = localStorage.getItem(this.BROWSER_SESSION_KEY);
    const tabClosed = localStorage.getItem(this.TAB_CLOSED_KEY);
    const storedEmail = localStorage.getItem(this.USER_EMAIL_KEY);
    
    // If tab closed flag is set, clear any session data
    if (tabClosed === 'true') {
      console.log('Tab closed flag detected during initialization - clearing session data');
      localStorage.removeItem(this.TAB_CLOSED_KEY);
      localStorage.removeItem(this.BROWSER_SESSION_KEY);
      localStorage.removeItem(this.SESSION_TIMESTAMP_KEY);
      localStorage.removeItem(this.SESSION_HEARTBEAT_KEY);
      localStorage.removeItem(this.USER_EMAIL_KEY);
      if (this.isLoggedIn()) {
        sessionStorage.removeItem(this.USER_KEY);
        sessionStorage.removeItem(this.AUTH_KEY);
        this.currentUserSubject.next(null);
      }
      return;
    }
    
    if (activeSession && !this.isLoggedIn() && storedEmail) {
      console.log('Found existing browser session - initializing tab');
      
      // Let's validate with the server immediately
      this.getUserInfo().subscribe({
        next: (user) => {
          if (user && user.email === storedEmail) {
            console.log('Successfully initialized from existing session');
            // Update the UI to reflect the logged-in state
            sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
            sessionStorage.setItem(this.AUTH_KEY, 'true');
            this.currentUserSubject.next(user);
          } else if (user && user.email !== storedEmail) {
            console.log('User mismatch in session - logging out');
            this.performFullLogout();
          }
        },
        error: () => {
          console.log('Failed to initialize from existing session');
          this.performFullLogout();
        }
      });
    }
  }

  // Updated login method to better handle existing sessions
  login(credentials: { email: string; password: string }): Observable<User> {
    console.log('Login attempt for:', credentials.email);
    
    // Clear tab closed flag if it exists
    if (localStorage.getItem(this.TAB_CLOSED_KEY) === 'true') {
      console.log('Detected tab closed flag during login - clearing it');
      localStorage.removeItem(this.TAB_CLOSED_KEY);
      localStorage.removeItem(this.BROWSER_SESSION_KEY);
      localStorage.removeItem(this.SESSION_TIMESTAMP_KEY);
      localStorage.removeItem(this.SESSION_HEARTBEAT_KEY);
      localStorage.removeItem(this.USER_EMAIL_KEY);
    }
    
    // Regular stale session check with aggressive cleanup
    this.checkAndClearStaleSession(false); // Changed to false to not clear valid sessions
    
    // Check if already logged in in this tab
    if (this.isLoggedIn()) {
      console.log('Already logged in this tab, cannot login as different user');
      return throwError(() => ({ 
        error: 'For security reasons, please log out of your current account before logging in with a different account.' 
      }));
    }
    
    // Check if any browser tab has an active session AFTER clearing stale ones
    const activeSession = localStorage.getItem(this.BROWSER_SESSION_KEY);
    const storedEmail = localStorage.getItem(this.USER_EMAIL_KEY);
    const heartbeat = localStorage.getItem(this.SESSION_HEARTBEAT_KEY);
    
    // If there's an active session with a different email
    if (activeSession && storedEmail) {
      // Check if the heartbeat is recent (within last 30 seconds)
      const currentTime = Date.now();
      const heartbeatTime = parseInt(heartbeat || '0');
      const isRecentHeartbeat = (currentTime - heartbeatTime) < 30000; // 30 seconds
      
      if (isRecentHeartbeat && storedEmail !== credentials.email) {
        console.log('Active session detected with different email:', storedEmail);
        return throwError(() => ({ 
          error: 'For security reasons, only one account is allowed per browser. Please log out of the other account first or use a private browsing window to log in with a different account.' 
        }));
      }
    }
    
    return this.http.post<any>(`${this.baseUrl}/login`, credentials, { withCredentials: true }).pipe(
      map(response => {
        const user: User = {
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          role: response.role,
          appUserId: response.userId,
          internalId: response.internalId
        };
        
        // Store user data and set logged in flag
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
        sessionStorage.setItem(this.AUTH_KEY, 'true');
        
        // Set browser-wide session identifier with timestamp and heartbeat
        const sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);
        localStorage.setItem(this.BROWSER_SESSION_KEY, sessionId!);
        localStorage.setItem(this.SESSION_TIMESTAMP_KEY, Date.now().toString());
        localStorage.setItem(this.SESSION_HEARTBEAT_KEY, Date.now().toString());
        localStorage.setItem(this.USER_EMAIL_KEY, user.email);
        localStorage.removeItem(this.TAB_CLOSED_KEY);
        
        // Set up heartbeat again to ensure it's running
        this.setupSessionKeepAlive();
        
        this.currentUserSubject.next(user);
        return user;
      }),
      catchError(error => {
        console.error('Login failed:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.performFullLogout();
    
    // Additional server-side notification with proper error handling
    this.http.post(`${this.baseUrl}/logout`, {}, { withCredentials: true }).subscribe({
      error: (err) => console.error('Logout request failed:', err) // Log error but proceed
    });
  }

  getUserInfo(): Observable<User | null> {
    // Check for tab closed flag and clear it
    if (localStorage.getItem(this.TAB_CLOSED_KEY) === 'true') {
      console.log('Detected tab closed flag during getUserInfo - clearing it');
      localStorage.removeItem(this.TAB_CLOSED_KEY);
      localStorage.removeItem(this.BROWSER_SESSION_KEY);
      localStorage.removeItem(this.SESSION_TIMESTAMP_KEY);
      localStorage.removeItem(this.SESSION_HEARTBEAT_KEY);
      localStorage.removeItem(this.USER_EMAIL_KEY);
    } else {
      // Regular stale session check
      const wasStale = this.checkAndClearStaleSession(false);
      
      // If we detected a stale session, make sure our current tab is cleared too
      if (wasStale && this.isLoggedIn()) {
        console.log('Detected stale session while we thought we were logged in - clearing session data');
        this.clearSessionData();
        return of(null);
      }
    }
    
    // If we're already logged in this tab, use cached user data
    if (this.currentUserSubject.value) {
      console.log('Using cached user data');
      this.initialCheckDone = true;
      
      // Update localStorage with our session ID to help other tabs
      const sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);
      localStorage.setItem(this.BROWSER_SESSION_KEY, sessionId!);
      localStorage.setItem(this.SESSION_HEARTBEAT_KEY, Date.now().toString());
      localStorage.setItem(this.USER_EMAIL_KEY, this.currentUserSubject.value.email);
      
      return of(this.currentUserSubject.value);
    }
    
    // Check for browser-wide session
    const activeSession = localStorage.getItem(this.BROWSER_SESSION_KEY);
    const storedEmail = localStorage.getItem(this.USER_EMAIL_KEY);
    
    // Make a server call to check authentication status
    return this.http.get<any>(`${this.baseUrl}/user-info`, { withCredentials: true }).pipe(
      map(response => {
        if (!response || Object.keys(response).length === 0) {
          // No valid session, clear any stale data
          this.clearSessionData();
          return null;
        }
        
        const user: User = {
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          role: response.role,
          appUserId: response.id,
          internalId: response.internalId
        };
        
        // Check if we're trying to adopt a session with different user
        if (activeSession && storedEmail && storedEmail !== user.email) {
          console.log('Session mismatch - server returns different user than stored');
          this.performFullLogout();
          return null;
        }
        
        // Store user data and set logged in flag
        sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
        sessionStorage.setItem(this.AUTH_KEY, 'true');
        
        // Set browser-wide session identifier with timestamp and heartbeat
        const sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);
        localStorage.setItem(this.BROWSER_SESSION_KEY, sessionId!);
        localStorage.setItem(this.SESSION_TIMESTAMP_KEY, Date.now().toString());
        localStorage.setItem(this.SESSION_HEARTBEAT_KEY, Date.now().toString());
        localStorage.setItem(this.USER_EMAIL_KEY, user.email);
        localStorage.removeItem(this.TAB_CLOSED_KEY);
        
        // Set up heartbeat again to ensure it's running
        this.setupSessionKeepAlive();
        
        this.currentUserSubject.next(user);
        this.initialCheckDone = true;
        return user;
      }),
      catchError(() => {
        // Error means no valid session, clear data
        this.clearSessionData();
        return of(null);
      })
    );
  }

  private clearSessionData(): void {
    // Clear session-specific data
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.AUTH_KEY);
    
    const sessionId = sessionStorage.getItem(this.SESSION_ID_KEY);
    const activeBrowserSession = localStorage.getItem(this.BROWSER_SESSION_KEY);
    
    // Only clear browser-wide session if it belongs to this tab
    if (activeBrowserSession === sessionId) {
      localStorage.removeItem(this.BROWSER_SESSION_KEY);
      localStorage.removeItem(this.SESSION_TIMESTAMP_KEY);
      localStorage.removeItem(this.SESSION_HEARTBEAT_KEY);
      localStorage.removeItem(this.USER_EMAIL_KEY);
    }
    
    localStorage.removeItem(this.TAB_CLOSED_KEY);
    this.currentUserSubject.next(null);
    this.initialCheckDone = true;
  }

  currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isInitialCheckDone(): boolean {
    return this.initialCheckDone;
  }
  
  isLoggedIn(): boolean {
    return sessionStorage.getItem(this.AUTH_KEY) === 'true' && !!this.currentUserSubject.value;
  }
  
  isAnotherSessionActive(): boolean {
    // Check for tab closed flag and clear it
    if (localStorage.getItem(this.TAB_CLOSED_KEY) === 'true') {
      console.log('Tab closed flag detected, clearing it and considering no active session');
      localStorage.removeItem(this.TAB_CLOSED_KEY);
      localStorage.removeItem(this.BROWSER_SESSION_KEY);
      localStorage.removeItem(this.SESSION_TIMESTAMP_KEY);
      localStorage.removeItem(this.SESSION_HEARTBEAT_KEY);
      localStorage.removeItem(this.USER_EMAIL_KEY);
      return false;
    }
    
    // Check for active sessions without clearing them
    const activeSession = localStorage.getItem(this.BROWSER_SESSION_KEY);
    const currentSessionId = sessionStorage.getItem(this.SESSION_ID_KEY);
    const heartbeat = localStorage.getItem(this.SESSION_HEARTBEAT_KEY);
    
    // If there's no active session, return false
    if (!activeSession || !heartbeat) {
      return false;
    }
    
    // Check if the heartbeat is recent (within last 30 seconds)
    const currentTime = Date.now();
    const heartbeatTime = parseInt(heartbeat);
    const isRecentHeartbeat = (currentTime - heartbeatTime) < 30000; // 30 seconds
    
    // If there's an active session with a recent heartbeat and it doesn't match our session ID
    return isRecentHeartbeat && activeSession !== currentSessionId;
  }
  
  // Called when angular app is destroyed (component destroyed)
  ngOnDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
  }
}