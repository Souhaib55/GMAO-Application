import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface User {
  id: number;
  appUserId: string;
  nom: string | null;
  prenom: string | null;
  email: string;
  dateCreation: Date;
  dateModification: Date;
  isActif: boolean;
  idRole: number;
  role?: Role;
}

export interface Role {
  idRole: number;
  libelle: string;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: number;
}

export interface UpdateUserDto {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  idRole: number;
  appUserId?: string;
  isActif?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Get all users
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`, {
      withCredentials: true,
      headers: new HttpHeaders({
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      })
    });
  }

  // Get user by ID
  getUser(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`, {
      withCredentials: true
    });
  }

  // Create user (uses account/register endpoint)
  createUser(user: CreateUserDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/account/register`, user, {
      withCredentials: true
    });
  }

  // Update user
  updateUser(id: number, user: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, user, {
      withCredentials: true
    });
  }

  // Delete user (soft delete)
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`, {
      withCredentials: true
    });
  }

  // Get all roles
  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.apiUrl}/users/roles`, {
      withCredentials: true
    });
  }
}
