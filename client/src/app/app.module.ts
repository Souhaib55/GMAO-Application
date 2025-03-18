import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app.routing';
import { ComponentsModule } from './components/components.module';
import { AppComponent } from './app.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { MatIconModule } from '@angular/material/icon';
import { AnalyticsComponent } from './analytics/analytics.component';
import { AskaidatabaseComponent } from './askaidatabase/askaidatabase.component';
import { EquipmentComponent } from './equipment/equipment.component';
import { InterventionComponent } from './intervention/intervention.component';
import { PlanningComponent } from './planning/planning.component';
import { StockComponent } from './stock/stock.component';
import { RessourcesComponent } from './ressources/ressources.component';
import { ReportsComponent } from './reports/reports.component';
import { HelpcomponentComponent } from './helpcomponent/helpcomponent.component';

@NgModule({
  imports: [
    BrowserAnimationsModule,         // For Material animations in design
    RouterModule,                   // For navigation (navbar, sidebar)
    AppRoutingModule,               // Custom routing
    ComponentsModule,
    
    MatIconModule               
  ],
  declarations: [
    AppComponent,                   // Main app component
    AdminLayoutComponent, AnalyticsComponent, AskaidatabaseComponent, EquipmentComponent, InterventionComponent, PlanningComponent, StockComponent, RessourcesComponent, ReportsComponent, HelpcomponentComponent,           // Layout with navbar, sidebar, content
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }