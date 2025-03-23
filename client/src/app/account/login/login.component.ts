import { Component, inject, ViewEncapsulation } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { AccountService } from 'app/core/services/account.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
  
})
export class LoginComponent  {
  
  // login logic here (e.g., authentication)

  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private router = inject(Router);


  loginForm = this.fb.group({
    email: [''],
    password: ['']
  })

  onSubmit() {
    this.accountService.login(this.loginForm.value).subscribe({
      next: () => {
        this.accountService.getUserInfo().subscribe();
        this.router.navigateByUrl('/admin/dashboard');
      },
    })
  }

}
