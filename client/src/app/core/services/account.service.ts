import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { User } from 'app/shared/models/user';
import { environment } from 'environments/environment';


@Injectable({
  providedIn: 'root'
})
export class AccountService {
  baseUrl = 'https://localhost:5001/api/'; 
  private http = inject(HttpClient)
  currentUser = signal<User | null>(null);

  login(values: any) {
    let params = new HttpParams();
    params = params.append('useCookies', 'true');
    return this.http.post(this.baseUrl + 'login', values, {params , withCredentials: true});
  }

  register(values: any) {
    return this.http.post(this.baseUrl + 'account/register', values);
  }

  getUserInfo() {
    return this.http.get<User>(this.baseUrl + 'account/user-info' , {withCredentials : true}).subscribe({
      next : user => this.currentUser.set(user)
    })
  }

  logout() {
    return this.http.post(this.baseUrl + 'account/logout' , {} , {withCredentials : true})
  }


}

// Explanation of the above code:

/*

This code is an Angular service called AccountService. It helps with things like logging in,
registering, and managing user information. Here's what it does:

Login: Sends your username and password to the server to log you in.

Register: Sends your details to the server to create a new account.

Get User Info: Fetches the logged-in user's details (like name or email) from the server.

Logout: Tells the server to log you out.

It uses HttpClient to talk to the server and environment to get the server's address.

******
Signals are a new way to manage state (data that can change) in Angular.
Think of them like a box that holds a value. When the value inside the box changes,
Angular automatically updates anything that depends on it.
******


*/ 
