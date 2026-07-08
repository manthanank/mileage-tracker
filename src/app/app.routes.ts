import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/landing/landing').then(m => m.LandingComponent),
    pathMatch: 'full',
    data: {
      title: 'DrivePulse | AI-Powered Mileage & Telemetry Tracker',
      description: 'Track vehicle mileage, fuel logs, running expenses, trip telemetry and documents with AI-powered analytics and service forecasts.'
    }
  },
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login').then(m => m.LoginComponent),
    data: {
      title: 'Sign In',
      description: 'Log in to DrivePulse to manage your vehicle fleet, view telemetry logs, and analyze insights.'
    }
  },
  {
    path: 'register',
    loadComponent: () => import('./components/auth/register/register').then(m => m.RegisterComponent),
    data: {
      title: 'Register',
      description: 'Create a free DrivePulse account to track vehicle efficiency, service countdowns, and paperwork expiry warning alerts.'
    }
  },
  {
    path: 'app',
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
        loadComponent: () => import('./components/features/dashboard/dashboard').then(m => m.DashboardComponent),
        data: {
          title: 'AI Analytics Dashboard',
          description: 'Analyze vehicle health scores, pending service runs, refuel predictions, and automated Gemini AI diagnostic recommendations.'
        }
      },
      {
        path: 'vehicles',
        loadComponent: () => import('./components/features/vehicles/vehicles').then(m => m.VehiclesComponent),
        data: {
          title: 'Manage Garage',
          description: 'Register and update your cars, motorcycles, or scooters, set starting odometer readings, and configure vehicle specifications.'
        }
      },
      {
        path: 'fuel-logs',
        loadComponent: () => import('./components/features/fuel-logs/fuel-logs').then(m => m.FuelLogsComponent),
        data: {
          title: 'Fuel Economy Journals',
          description: 'Log refueling data, partial refills, price per liter, and calculate precise fuel efficiency indices (km/L).'
        }
      },
      {
        path: 'trips',
        loadComponent: () => import('./components/features/trips/trips').then(m => m.TripsComponent),
        data: {
          title: 'Trip Telemetry Log',
          description: 'Start live stopwatch rides, input travel notes, log location scopes, and review driving metrics.'
        }
      },
      {
        path: 'expenses',
        loadComponent: () => import('./components/features/expenses/expenses').then(m => m.ExpensesComponent),
        data: {
          title: 'Expenses Ledger',
          description: 'Record maintenance fees, toll rates, tax expenses, parking costs, and download full financial audits.'
        }
      },
      {
        path: 'maintenance',
        loadComponent: () => import('./components/features/maintenance/maintenance').then(m => m.MaintenanceComponent),
        data: {
          title: 'Service Scheduler',
          description: 'Monitor tires, chains, general engines, oil status, and view mileage-degraded warning projections.'
        }
      },
      {
        path: 'garage',
        loadComponent: () => import('./components/features/garage/garage').then(m => m.GarageComponent),
        data: {
          title: 'Digital Paperwork Vault',
          description: 'Securely upload insurance policies, RC papers, PUC pollution files, and get automated expiration reminders.'
        }
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
