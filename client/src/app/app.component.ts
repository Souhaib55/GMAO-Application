import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationToastComponent } from './shared/components/notification-toast/notification-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NotificationToastComponent
  ],
  template: `
    <router-outlet></router-outlet>
    <app-notification-toast></app-notification-toast>
  `
})
export class AppComponent {
  title = 'GMAO Application';
}
