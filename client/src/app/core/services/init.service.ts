import { inject, Injectable } from '@angular/core';
import { AccountService } from './account.service';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InitService {
    private accountService = inject(AccountService)

    init() {
        return forkJoin({
            user: this.accountService.getUserInfo()
        })
    }          // Purpose of this code: To fetch user information asynchronously and return it as a labeled object ({ user: <data> }) once the operation completes, using forkJoin to manage the Observable.


  
}