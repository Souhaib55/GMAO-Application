import { Component, OnInit , ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom
})
export class LoginComponent implements OnInit {

  constructor() { }
  // Your login logic here (e.g., authentication)
  // After successful login, navigate to the admin dashboard
  //this.router.navigate(['/admin/dashboard']);

  ngOnInit(): void {
  }

}
