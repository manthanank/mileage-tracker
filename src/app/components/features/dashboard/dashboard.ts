import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { VehicleService } from '../../../services/vehicle';
import { AnalyticsService } from '../../../services/analytics';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly vehicleService = inject(VehicleService);
  private readonly analyticsService = inject(AnalyticsService);

  protected readonly activeVehicle = this.vehicleService.activeVehicle;
  protected readonly dashboardData = signal<any>(null);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Automatically reload dashboard when user swaps active vehicle
    effect(() => {
      const active = this.activeVehicle();
      if (active) {
        this.loadDashboard(active._id);
      } else {
        this.dashboardData.set(null);
        this.isLoading.set(false);
      }
    });
  }

  protected loadDashboard(vehicleId: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.analyticsService.getVehicleDashboard(vehicleId).subscribe({
      next: (res) => {
        if (res.success) {
          this.dashboardData.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.error.set('Failed to fetch dashboard data.');
      },
    });
  }

  protected getHealthColorClass(score: number): string {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/20';
    if (score >= 70) return 'text-yellow-400 border-yellow-500/20';
    return 'text-rose-400 border-rose-500/20';
  }

  protected getHealthStrokeColor(score: number): string {
    if (score >= 90) return '#10b981'; // emerald-500
    if (score >= 70) return '#f59e0b'; // yellow-500
    return '#f43f5e'; // rose-500
  }
}
