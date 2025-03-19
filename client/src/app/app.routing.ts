import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component'; // Adjust path as needed
import { LoginComponent } from './account/login/login.component'; // Adjust path as needed
import { AdminLayoutRoutes } from './layouts/admin-layout/admin-layout.routing';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CommonModule } from '@angular/common';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
      path: 'admin', 
      component: AdminLayoutComponent,
      children: AdminLayoutRoutes  // Use the actual AdminLayoutRoutes array
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },  // Corrected redirect
  { path: '**', redirectTo: 'login' }  // Optional: catch-all route
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forRoot(routes, { useHash: true })
  ],
  exports: [RouterModule] // Export RouterModule for use in AppModule
})
export class AppRoutingModule { }






/*import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '',
    component: AdminLayoutComponent,
    children: [      // [{path: 'loadChildren: () => import('./layouts/admin-layout/admin-layout.module').then(m => m.AdminLayoutModule)}]
      {
        path: '',
        loadChildren: () => import('./layouts/admin-layout/admin-layout.module').then(m => m.AdminLayoutModule)
      }
    ]
  }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forRoot(routes, { useHash: true })
  ],
  exports: [RouterModule] // Export RouterModule for use in AppModule
})
export class AppRoutingModule { }
*/