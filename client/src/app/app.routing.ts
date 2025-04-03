import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { LoginComponent } from './account/login/login.component';
import { AdminLayoutRoutes } from './layouts/admin-layout/admin-layout.routing';
import { EquipmentButtonComponent } from './equipment-button/equipment-button.component';
import { StockButtonComponent } from './stock-button/stock-button.component';

const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'equipment/create', component: EquipmentButtonComponent },
    { path: 'equipment/edit/:id', component: EquipmentButtonComponent },
    { path: 'stock/create', component: StockButtonComponent },
    { path: 'stock/edit/:id', component: StockButtonComponent },
    { path: 'admin', component: AdminLayoutComponent, children: AdminLayoutRoutes },
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: '**', redirectTo: 'login' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule]
})
export class AppRoutingModule { }