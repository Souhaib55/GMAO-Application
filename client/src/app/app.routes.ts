import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { LayoutComponent } from './shared/layout/layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { InterventionsComponent } from './features/interventions/interventions.component';
import { InterventionFormComponent } from './features/interventions/intervention-form/intervention-form.component';
import { EquipmentComponent } from './features/equipment/equipment.component';
import { EquipmentFormComponent } from './features/equipment/equipment-form/equipment-form.component';
import { ResourceFormComponent } from './features/resources/resource-form/resource-form.component';
import { StockFormComponent } from './features/stock/stock-form/stock-form.component';
import { PlanningComponent } from './features/planning/planning.component';
import { SettingsComponent } from './features/settings/settings.component';
import { UserManagementComponent } from './features/settings/user-management/user-management.component';
import { ReferencesComponent } from './features/settings/references/references.component';
import { RapportsComponent } from './features/rapports/rapports.component';
import { PreventifComponent } from './features/preventif/preventif.component';
import { MagasinComponent } from './features/magasin/magasin.component';
import { ExplorateurComponent } from './features/explorateur/explorateur.component';
import { AchatsComponent } from './features/achats/achats.component';
import { BudgetsComponent } from './features/budgets/budgets.component';
import { TechniciensComponent } from './features/techniciens/techniciens.component';
import { JournalComponent } from './features/settings/journal/journal.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        // "Assistant GMAO" was replaced by the Explorateur de données
        path: 'chat',
        redirectTo: 'explorateur',
        pathMatch: 'full'
      },
      {
        path: 'achats',
        component: AchatsComponent,
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        path: 'budgets',
        component: BudgetsComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'techniciens',
        component: TechniciensComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'explorateur',
        component: ExplorateurComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'magasin',
        component: MagasinComponent,
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        path: 'preventif',
        component: PreventifComponent,
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        path: 'planning',
        component: PlanningComponent,
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        // The record page (follow-up, history) stays a full page
        path: 'interventions/view/:id',
        component: InterventionFormComponent,
        data: { viewMode: true }
      },
      {
        // Create / edit open as a side panel over the list
        path: 'interventions',
        component: InterventionsComponent,
        children: [
          { path: 'new', component: InterventionFormComponent, data: { drawer: true } },
          { path: 'edit/:id', component: InterventionFormComponent, data: { drawer: true } }
        ]
      },
      {
        path: 'equipment/view/:id',
        component: EquipmentFormComponent,
        data: { viewMode: true }
      },
      {
        path: 'equipment',
        component: EquipmentComponent,
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] },
        children: [
          { path: 'new', component: EquipmentFormComponent, canActivate: [roleGuard], data: { role: 'Superviseur', drawer: true } },
          { path: 'edit/:id', component: EquipmentFormComponent, canActivate: [roleGuard], data: { role: 'Superviseur', drawer: true } }
        ]
      },
      {
        // Old list screen replaced by the unified store (same articles, movements, thresholds)
        path: 'resources',
        redirectTo: 'magasin',
        pathMatch: 'full'
      },
      {
        path: 'resources/new',
        component: ResourceFormComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'resources/edit/:id',
        component: ResourceFormComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'resources/view/:id',
        component: ResourceFormComponent,
        data: { viewMode: true }
      },
      {
        // Old list screen replaced by the unified store (same articles, movements, thresholds)
        path: 'stock',
        redirectTo: 'magasin',
        pathMatch: 'full'
      },
      {
        path: 'stock/new',
        component: StockFormComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'stock/edit/:id',
        component: StockFormComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'stock/view/:id',
        component: StockFormComponent,
        data: { viewMode: true }
      },
      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'settings/users',
        component: UserManagementComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'settings/journal',
        component: JournalComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'settings/references',
        component: ReferencesComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'rapports',
        component: RapportsComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
