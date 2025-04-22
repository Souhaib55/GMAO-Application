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

const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'homepage', component: HomepageComponent},
    { path: 'homepage/login' ,component: LoginComponent}, 

    { path: 'equipment/create', component: EquipmentButtonComponent },
    { path: 'equipment/edit/:id', component: EquipmentButtonComponent },

    { path: 'stock/create', component: StockButtonComponent },
    { path: 'stock/edit/:id', component: StockButtonComponent },

    { path: 'ressources/create', component: RessourcesButtonComponent },
    { path: 'ressources/edit/:id', component: RessourcesButtonComponent },

    {path: 'intervention/create', component: InterventionButtonComponent},
    {path: 'intervention/edit/:id', component: InterventionButtonComponent},

    { path: 'admin', component: AdminLayoutComponent, children: AdminLayoutRoutes },
    { path: '', redirectTo: 'homepage', pathMatch: 'full' },
    { path: '**', redirectTo: 'homepage' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule]
})
export class AppRoutingModule { }