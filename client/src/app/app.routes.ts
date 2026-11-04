import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password/reset-password.component';
import { LayoutComponent } from './shared/layout/layout.component';

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
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        // "Assistant GMAO" was replaced by the Explorateur de données
        path: 'chat',
        redirectTo: 'explorateur',
        pathMatch: 'full'
      },
      {
        path: 'achats',
        loadComponent: () => import('./features/achats/achats.component').then(m => m.AchatsComponent),
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        path: 'budgets',
        loadComponent: () => import('./features/budgets/budgets.component').then(m => m.BudgetsComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'techniciens',
        loadComponent: () => import('./features/techniciens/techniciens.component').then(m => m.TechniciensComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'explorateur',
        loadComponent: () => import('./features/explorateur/explorateur.component').then(m => m.ExplorateurComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'magasin',
        loadComponent: () => import('./features/magasin/magasin.component').then(m => m.MagasinComponent),
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        path: 'preventif',
        loadComponent: () => import('./features/preventif/preventif.component').then(m => m.PreventifComponent),
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        path: 'planning',
        loadComponent: () => import('./features/planning/planning.component').then(m => m.PlanningComponent),
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] }
      },
      {
        // The record page (follow-up, history) stays a full page
        path: 'interventions/view/:id',
        loadComponent: () => import('./features/interventions/intervention-form/intervention-form.component').then(m => m.InterventionFormComponent),
        data: { viewMode: true }
      },
      {
        // Create / edit open as a side panel over the list
        path: 'interventions',
        loadComponent: () => import('./features/interventions/interventions.component').then(m => m.InterventionsComponent),
        children: [
          { path: 'new', loadComponent: () => import('./features/interventions/intervention-form/intervention-form.component').then(m => m.InterventionFormComponent), data: { drawer: true } },
          { path: 'edit/:id', loadComponent: () => import('./features/interventions/intervention-form/intervention-form.component').then(m => m.InterventionFormComponent), data: { drawer: true } }
        ]
      },
      {
        // Printable QR labels: each opens "Déclarer une panne" with the machine filled in
        path: 'equipment/etiquettes',
        loadComponent: () => import('./features/equipment/etiquettes/etiquettes.component').then(m => m.EtiquettesComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'equipment/view/:id',
        loadComponent: () => import('./features/equipment/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent),
        data: { viewMode: true }
      },
      {
        path: 'equipment',
        loadComponent: () => import('./features/equipment/equipment.component').then(m => m.EquipmentComponent),
        canActivate: [roleGuard],
        data: { role: ['Superviseur', 'Utilisateur'] },
        children: [
          { path: 'new', loadComponent: () => import('./features/equipment/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent), canActivate: [roleGuard], data: { role: 'Superviseur', drawer: true } },
          { path: 'edit/:id', loadComponent: () => import('./features/equipment/equipment-form/equipment-form.component').then(m => m.EquipmentFormComponent), canActivate: [roleGuard], data: { role: 'Superviseur', drawer: true } }
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
        loadComponent: () => import('./features/resources/resource-form/resource-form.component').then(m => m.ResourceFormComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'resources/edit/:id',
        loadComponent: () => import('./features/resources/resource-form/resource-form.component').then(m => m.ResourceFormComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'resources/view/:id',
        loadComponent: () => import('./features/resources/resource-form/resource-form.component').then(m => m.ResourceFormComponent),
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
        loadComponent: () => import('./features/stock/stock-form/stock-form.component').then(m => m.StockFormComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'stock/edit/:id',
        loadComponent: () => import('./features/stock/stock-form/stock-form.component').then(m => m.StockFormComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'stock/view/:id',
        loadComponent: () => import('./features/stock/stock-form/stock-form.component').then(m => m.StockFormComponent),
        data: { viewMode: true }
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'settings/users',
        loadComponent: () => import('./features/settings/user-management/user-management.component').then(m => m.UserManagementComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'settings/journal',
        loadComponent: () => import('./features/settings/journal/journal.component').then(m => m.JournalComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        path: 'settings/references',
        loadComponent: () => import('./features/settings/references/references.component').then(m => m.ReferencesComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        // Printable monthly report for the management meeting
        path: 'rapport-mensuel',
        loadComponent: () => import('./features/rapport-mensuel/rapport-mensuel.component').then(m => m.RapportMensuelComponent),
        canActivate: [roleGuard],
        data: { role: 'Superviseur' }
      },
      {
        // Help: glossary, indicators explained, how-to per role, guided tour
        path: 'aide',
        loadComponent: () => import('./features/aide/aide.component').then(m => m.AideComponent)
      },
      {
        path: 'rapports',
        loadComponent: () => import('./features/rapports/rapports.component').then(m => m.RapportsComponent),
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
