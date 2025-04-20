import { Routes } from '@angular/router';

import { DashboardComponent } from '../../dashboard/dashboard.component';
import { AskaidatabaseComponent } from 'app/askaidatabase/askaidatabase.component';
import { EquipmentComponent } from 'app/equipment/equipment.component';
import { EquipmentButtonComponent } from 'app/equipment-button/equipment-button.component';
import { InterventionComponent } from 'app/intervention/intervention.component';
import { PlanningComponent } from 'app/planning/planning.component';
import { StockComponent } from 'app/stock/stock.component';
import { RessourcesComponent } from 'app/ressources/ressources.component';
import { ReportsComponent } from 'app/reports/reports.component';
import { HelpcomponentComponent } from 'app/helpcomponent/helpcomponent.component';
import { StockButtonComponent } from 'app/stock-button/stock-button.component';

export const AdminLayoutRoutes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    
    { path: 'dashboard',      component: DashboardComponent },
    { path: 'askaidatabase',  component: AskaidatabaseComponent },

    { path: 'equipment',      component: EquipmentComponent },
    { path: 'equipment/create', component: EquipmentButtonComponent },
    { path: 'equipment/edit/:id', component: EquipmentButtonComponent },

    { path: 'intervention',   component: InterventionComponent },
    { path: 'planning',       component: PlanningComponent },

    { path: 'stock',          component: StockComponent },
    { path: 'stock/create', component: StockButtonComponent },
    { path: 'stock/edit/:id', component: StockButtonComponent },


    { path: 'ressources',     component: RessourcesComponent },
    { path: 'ressources/create', component: EquipmentButtonComponent },
    { path: 'ressources/edit/:id', component: EquipmentButtonComponent  },


    { path: 'reports',        component: ReportsComponent },
    { path: 'helpcomponent',  component: HelpcomponentComponent },
];