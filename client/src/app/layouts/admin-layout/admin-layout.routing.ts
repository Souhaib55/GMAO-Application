import { Routes } from '@angular/router';
import { DashboardComponent } from '../../dashboard/dashboard.component';
import { AskaidatabaseComponent } from 'app/askaidatabase/askaidatabase.component';
import { EquipmentComponent } from 'app/equipment/equipment.component';
import { TriggerComponent } from 'app/trigger/trigger.component'; // Import new TriggerComponent
import { EquipmentButtonComponent } from 'app/equipment-button/equipment-button.component';
import { InterventionComponent } from 'app/intervention/intervention.component';
import { PlanningComponent } from 'app/planning/planning.component';
import { StockComponent } from 'app/stock/stock.component';
import { RessourcesComponent } from 'app/ressources/ressources.component';
import { ReportsComponent } from 'app/reports/reports.component';
import { HelpcomponentComponent } from 'app/helpcomponent/helpcomponent.component';
import { StockButtonComponent } from 'app/stock-button/stock-button.component';
import { AuthGuard } from 'app/guards/auth.guard';

export const AdminLayoutRoutes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', component: DashboardComponent }, // Accessible to all
    { 
        path: 'askaidatabase', 
        component: AskaidatabaseComponent, 
        canActivate: [AuthGuard], 
        data: { roles: ['Superviseur'] } 
    },
    { 
        path: 'equipment/crud', 
        component: EquipmentComponent, 
        canActivate: [AuthGuard], 
        data: { roles: ['Superviseur', 'Utilisateur'] } 
    },
    { 
        path: 'equipment/trigger', 
        component: TriggerComponent, 
        canActivate: [AuthGuard], 
        data: { roles: ['Superviseur', 'Utilisateur'] } 
    },
    { path: 'intervention', component: InterventionComponent }, // Accessible to all
    { 
        path: 'planning', 
        component: PlanningComponent, 
        canActivate: [AuthGuard], 
        data: { roles: ['Superviseur'] } 
    },
    { 
        path: 'stock', 
        component: StockComponent, 
        canActivate: [AuthGuard], 
        data: { roles: ['Superviseur'] } 
    },
    { 
        path: 'ressources', 
        component: RessourcesComponent, 
        canActivate: [AuthGuard], 
        data: { roles: ['Superviseur', 'Utilisateur'] } 
    },
    { 
        path: 'reports', 
        component: ReportsComponent, 
        canActivate: [AuthGuard], 
        data: { roles: ['Superviseur'] } 
    },
    { 
        path: 'helpcomponent', 
        component: HelpcomponentComponent, 
        canActivate: [AuthGuard], 
        data: { roles: ['Superviseur'] } 
    }
];