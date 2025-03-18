import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

declare const $: any;
declare interface RouteInfo {
    path: string;
    title: string;
    icon: string;
    class: string;
}
export const ROUTES: RouteInfo[] = [
    { path: '/dashboard', title: 'Dashboard',  icon: 'dashboard', class: '' },
    { path: '/analytics', title: 'Analytics',  icon:'signal_cellular_alt', class: '' },
    { path: '/askaidatabase', title: 'Ask Ai Database',  icon:'storage_rounded', class: '' },
    { path: '/equipment', title: 'Equipment',  icon:'home_repair_service_rounded', class: '' },
    { path: '/intervention', title: 'Interventions',  icon:'construction_rounded', class: '' },
    { path: '/planning', title: 'Planning',  icon:'content_paste', class: '' },
    { path: '/stock', title: 'Stock/Parts',  icon:'inventory_2_rounded', class: '' },
    { path: '/ressources', title: 'Ressources',  icon:'person', class: '' },
    { path: '/reports', title: 'Reports',  icon:'library_books', class: '' },
    { path: '/helpcomponent', title: 'Help',  icon:'help_outline_rounded', class: '' },
];

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  menuItems: any[];

  constructor() { }

  ngOnInit() {
    this.menuItems = ROUTES.filter(menuItem => menuItem);
  }
  isMobileMenu() {
      if ($(window).width() > 991) {
          return false;
      }
      return true;
  };
}
