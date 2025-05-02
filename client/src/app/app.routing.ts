import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { LoginComponent } from './account/login/login.component';
import { AdminLayoutRoutes } from './layouts/admin-layout/admin-layout.routing';
import { EquipmentButtonComponent } from './equipment-button/equipment-button.component';
import { StockButtonComponent } from './stock-button/stock-button.component';
import { RessourcesButtonComponent } from './ressources-button/ressources-button.component';
import { InterventionButtonComponent } from './intervention-button/intervention-button.component';
import { HomepageComponent } from './homepage/homepage.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginGuard } from './guards/login.guard';

const routes: Routes = [
    { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },
    { path: 'homepage', component: HomepageComponent },
    { path: 'homepage/login', component: LoginComponent, canActivate: [LoginGuard] },

    { path: 'equipment/create', component: EquipmentButtonComponent, canActivate: [AuthGuard], data: { roles: ['Superviseur'] } },
    { path: 'equipment/edit/:id', component: EquipmentButtonComponent, canActivate: [AuthGuard], data: { roles: ['Superviseur'] } },

    { path: 'stock/create', component: StockButtonComponent, canActivate: [AuthGuard], data: { roles: ['Superviseur'] } },
    { path: 'stock/edit/:id', component: StockButtonComponent, canActivate: [AuthGuard], data: { roles: ['Superviseur'] } },

    { path: 'ressources/create', component: RessourcesButtonComponent, canActivate: [AuthGuard], data: { roles: ['Superviseur'] } },
    { path: 'ressources/edit/:id', component: RessourcesButtonComponent, canActivate: [AuthGuard], data: { roles: ['Superviseur'] } },

    { path: 'intervention/create', component: InterventionButtonComponent, canActivate: [AuthGuard], data: { roles: ['Superviseur', 'Demandeur', 'Utilisateur'] } },
    { path: 'intervention/edit/:id', component: InterventionButtonComponent, canActivate: [AuthGuard], data: { roles: ['Superviseur'] } },

    { path: 'admin', component: AdminLayoutComponent, canActivate: [AuthGuard], children: AdminLayoutRoutes },
    { path: '', redirectTo: 'homepage', pathMatch: 'full' },
    { path: '**', redirectTo: 'homepage' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule]
})
export class AppRoutingModule { }