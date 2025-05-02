import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppRoutingModule } from './app.routing';
import { ComponentsModule } from './components/components.module';
import { AppComponent } from './app.component';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout.component';
import { MatIconModule } from '@angular/material/icon';
import { AskaidatabaseComponent } from './askaidatabase/askaidatabase.component';
import { EquipmentComponent } from './equipment/equipment.component';
import { InterventionComponent } from './intervention/intervention.component';
import { PlanningComponent } from './planning/planning.component';
import { StockComponent } from './stock/stock.component';
import { RessourcesComponent } from './ressources/ressources.component';
import { ReportsComponent } from './reports/reports.component';
import { HelpcomponentComponent } from './helpcomponent/helpcomponent.component';
import { LoginComponent } from './account/login/login.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClientModule } from '@angular/common/http';
import { MatNativeDateModule } from '@angular/material/core';
import { EquipmentButtonComponent } from './equipment-button/equipment-button.component';
import { StockButtonComponent } from './stock-button/stock-button.component';
import { RessourcesButtonComponent } from './ressources-button/ressources-button.component';
import { InterventionButtonComponent } from './intervention-button/intervention-button.component';
import { HomepageComponent } from './homepage/homepage.component';
import { TriggerComponent } from './trigger/trigger.component';
import { InitService } from './core/services/init.service';
import { firstValueFrom } from 'rxjs'; // Import firstValueFrom

@NgModule({
  imports: [
    BrowserAnimationsModule,
    RouterModule,
    AppRoutingModule,
    ComponentsModule,
    MatIconModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatSidenavModule,
    MatListModule,
    MatCardModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatGridListModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDividerModule,
  ],
  declarations: [
    AppComponent,
    AdminLayoutComponent,
    AskaidatabaseComponent,
    EquipmentComponent,
    InterventionComponent,
    PlanningComponent,
    StockComponent,
    RessourcesComponent,
    ReportsComponent,
    HelpcomponentComponent,
    LoginComponent,
    EquipmentButtonComponent,
    StockButtonComponent,
    RessourcesButtonComponent,
    InterventionButtonComponent,
    HomepageComponent,
    TriggerComponent
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (initService: InitService) => () => {
        // Use firstValueFrom instead of toPromise
        return firstValueFrom(initService.init());
      },
      deps: [InitService],
      multi: true
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }