import { Component, OnInit } from '@angular/core';
import { InitService } from './core/services/init.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'GMAO Application';
  
  constructor(private initService: InitService) {}
  
  ngOnInit() {
    // Initialize application and check authentication state
    this.initService.init().subscribe();
  }
}