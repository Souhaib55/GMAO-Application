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
    { path: 'dashboard', title: 'Dashboard',  icon: 'grid_view_rounded', class: '' },
    { path: 'askaidatabase', title: 'GMAO Chat',  icon:'chat_bubble_rounded', class: '' },
    { path: 'equipment', title: 'Equipements',  icon:'home_repair_service_rounded', class: '' },
    { path: 'intervention', title: 'Interventions',  icon:'construction_rounded', class: '' },
    { path: 'planning', title: 'Planning',  icon:'content_paste', class: '' },
    { path: 'stock', title: 'Stock/Achat',  icon:'shopping_cart_rounded', class: '' },
    { path: 'ressources', title: 'Ressources',  icon:'view_in_art_rounded', class: '' },
    { path: 'reports', title: 'Rapports',  icon:'library_books', class: '' },
    { path: 'helpcomponent', title: 'paramètre ',  icon:'settings', class: '' },
];

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  menuItems: RouteInfo[];

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