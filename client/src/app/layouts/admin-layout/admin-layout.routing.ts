import { Routes } from '@angular/router';

import { DashboardComponent } from '../../dashboard/dashboard.component';
import { AskaidatabaseComponent } from 'app/askaidatabase/askaidatabase.component';
import { AnalyticsComponent } from 'app/analytics/analytics.component';
import { EquipmentComponent } from 'app/equipment/equipment.component';
import { InterventionComponent } from 'app/intervention/intervention.component';
import { PlanningComponent } from 'app/planning/planning.component';
import { StockComponent } from 'app/stock/stock.component';
import { RessourcesComponent } from 'app/ressources/ressources.component';
import { ReportsComponent } from 'app/reports/reports.component';
import { HelpcomponentComponent } from 'app/helpcomponent/helpcomponent.component';





export const AdminLayoutRoutes: Routes = [
    // {
    //   path: '',
    //   children: [ {
    //     path: 'dashboard',
    //     component: DashboardComponent
    // }]}, {
    // path: '',
    // children: [ {
    //   path: 'userprofile',
    //   component: UserProfileComponent
    // }]
    // }, {
    //   path: '',
    //   children: [ {
    //     path: 'icons',
    //     component: IconsComponent
    //     }]
    // }, {
    //     path: '',
    //     children: [ {
    //         path: 'notifications',
    //         component: NotificationsComponent
    //     }]
    // }, {
    //     path: '',
    //     children: [ {
    //         path: 'maps',
    //         component: MapsComponent
    //     }]
    // }, {
    //     path: '',
    //     children: [ {
    //         path: 'typography',
    //         component: TypographyComponent
    //     }]
    // }, {
    //     path: '',
    //     children: [ {
    //         path: 'upgrade',
    //         component: UpgradeComponent
    //     }]
    // }
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    
    { path: 'dashboard',      component: DashboardComponent },
    { path: 'analytics',      component: AnalyticsComponent },
    { path: 'askaidatabase',  component: AskaidatabaseComponent },
    { path: 'equipment',      component: EquipmentComponent },
    { path: 'intervention',   component: InterventionComponent },
    { path: 'planning',       component: PlanningComponent },
    { path: 'stock',          component: StockComponent },
    { path: 'ressources',     component: RessourcesComponent },
    { path: 'reports',        component: ReportsComponent },
    { path: 'helpcomponent',  component: HelpcomponentComponent },


   

];
