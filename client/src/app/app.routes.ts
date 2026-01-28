import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { LayoutComponent } from './shared/layout/layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ChatComponent } from './features/chat/chat.component';
import { InterventionsComponent } from './features/interventions/interventions.component';
import { InterventionFormComponent } from './features/interventions/intervention-form/intervention-form.component';
import { EquipmentComponent } from './features/equipment/equipment.component';
import { EquipmentFormComponent } from './features/equipment/equipment-form/equipment-form.component';
import { ResourcesListComponent } from './features/resources/resources-list.component';
import { ResourceFormComponent } from './features/resources/resource-form/resource-form.component';
import { StockListComponent } from './features/stock/stock-list.component';
import { StockFormComponent } from './features/stock/stock-form/stock-form.component';
import { PlanningComponent } from './features/planning/planning.component';
import { SettingsComponent } from './features/settings/settings.component';
import { UserManagementComponent } from './features/settings/user-management/user-management.component';
import { ReferencesComponent } from './features/settings/references/references.component';
import { RapportsComponent } from './features/rapports/rapports.component';

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
        path: 'chat',
        component: ChatComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'planning',
        component: PlanningComponent,
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        path: 'interventions',
        component: InterventionsComponent
      },
      {
        path: 'interventions/new',
        component: InterventionFormComponent
      },
      {
        path: 'interventions/edit/:id',
        component: InterventionFormComponent
      },
      {
        path: 'interventions/view/:id',
        component: InterventionFormComponent,
        data: { viewMode: true }
      },
      {
        path: 'equipment',
        component: EquipmentComponent,
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        path: 'equipment/new',
        component: EquipmentFormComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'equipment/edit/:id',
        component: EquipmentFormComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'equipment/view/:id',
        component: EquipmentFormComponent,
        data: { viewMode: true }
      },
      {
        path: 'resources',
        component: ResourcesListComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
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
        path: 'stock',
        component: StockListComponent,
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
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
