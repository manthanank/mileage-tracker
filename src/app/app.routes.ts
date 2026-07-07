import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/auth/register/register').then(m => m.RegisterComponent)
  },
  {
    path: '',
    loadComponent: () => import('./components/layout/shell/shell').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./components/features/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'vehicles',
        loadComponent: () => import('./components/features/vehicles/vehicles').then(m => m.VehiclesComponent)
      },
      {
        path: 'fuel-logs',
        loadComponent: () => import('./components/features/fuel-logs/fuel-logs').then(m => m.FuelLogsComponent)
      },
      {
        path: 'trips',
        loadComponent: () => import('./components/features/trips/trips').then(m => m.TripsComponent)
      },
      {
        path: 'expenses',
        loadComponent: () => import('./components/features/expenses/expenses').then(m => m.ExpensesComponent)
      },
      {
        path: 'maintenance',
        loadComponent: () => import('./components/features/maintenance/maintenance').then(m => m.MaintenanceComponent)
      },
      {
        path: 'garage',
        loadComponent: () => import('./components/features/garage/garage').then(m => m.GarageComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
