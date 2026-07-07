import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Auth } from '../../../services/auth';
import { VehicleService } from '../../../services/vehicle';
import { NotificationService } from '../../../services/notification';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  protected readonly authService = inject(Auth);
  protected readonly vehicleService = inject(VehicleService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly router = inject(Router);

  protected readonly sidebarOpen = signal(false);
  protected readonly notificationOpen = signal(false);
  protected readonly vehicleDropdownOpen = signal(false);

  constructor() {
    this.vehicleService.fetchVehicles().subscribe();
    this.notificationService.fetchNotifications().subscribe();
  }

  protected toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }

  protected toggleNotifications() {
    this.notificationOpen.update((v) => !v);
    if (this.notificationOpen()) {
      this.notificationService.fetchNotifications().subscribe();
    }
  }

  protected toggleVehicleDropdown() {
    this.vehicleDropdownOpen.update((v) => !v);
  }

  protected selectVehicle(vehicle: any) {
    this.vehicleService.selectVehicle(vehicle);
    this.vehicleDropdownOpen.set(false);
    
    // Force current page to reload to trigger state updates for the newly active vehicle
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  protected markNotificationRead(event: Event, id: string) {
    event.stopPropagation();
    this.notificationService.markAsRead(id).subscribe();
  }

  protected markAllNotificationsRead() {
    this.notificationService.markAllAsRead().subscribe();
  }

  protected deleteNotification(event: Event, id: string) {
    event.stopPropagation();
    this.notificationService.deleteNotification(id).subscribe();
  }

  protected handleLogout() {
    this.authService.logout();
  }
}
