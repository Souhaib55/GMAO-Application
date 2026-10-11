import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserInfo, LoginDto, RegisterDto } from '../models';

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/account`;
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  get currentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  constructor(private http: HttpClient) {
    this.checkAuthStatus();
  }

  login(credentials: LoginDto): Observable<UserInfo> {
    return this.http.post<UserInfo>(`${this.apiUrl}/login`, credentials, {
      withCredentials: true
    }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  register(data: RegisterDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  /** Forget the local session (the server session is already gone). */
  clearSession(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('currentUser');
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        localStorage.removeItem('currentUser');
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        localStorage.removeItem('currentUser');
        return of(void 0);
      })
    );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(data: ResetPasswordDto): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(`${this.apiUrl}/reset-password`, data);
  }

  validateResetToken(email: string, token: string): Observable<ValidateTokenResponse> {
    return this.http.post<ValidateTokenResponse>(`${this.apiUrl}/validate-reset-token`, { email, token });
  }

  checkAuthStatus(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }

    this.http.get<UserInfo>(`${this.apiUrl}/user-info`, {
      withCredentials: true
    }).subscribe({
      next: (user) => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      },
      error: () => {
        this.currentUserSubject.next(null);
        localStorage.removeItem('currentUser');
      }
    });
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }
}
