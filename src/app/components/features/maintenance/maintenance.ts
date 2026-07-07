import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { VehicleService } from '../../../services/vehicle';
import { ServiceMaintenanceService } from '../../../services/service-maintenance';

@Component({
  selector: 'app-maintenance',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './maintenance.html',
  styleUrl: './maintenance.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceComponent {
  private readonly vehicleService = inject(VehicleService);
  private readonly serviceMaintenanceService = inject(ServiceMaintenanceService);
  private readonly fb = inject(FormBuilder);

  protected readonly activeVehicle = this.vehicleService.activeVehicle;

  // Signals
  protected readonly services = signal<any[]>([]);
  protected readonly isAddingService = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(false);

  private selectedFile: File | null = null;

  // Form definition
  protected readonly serviceForm = this.fb.group({
    date: [new Date().toISOString().substring(0, 10), [Validators.required]],
    odometer: ['', [Validators.required, Validators.min(0)]],
    type: ['General Service', [Validators.required]],
    cost: ['', [Validators.required, Validators.min(0)]],
    serviceProvider: [''],
    nextServiceOdometer: [''],
    nextServiceDate: [''],
    description: [''],
  });

  constructor() {
    effect(() => {
      const active = this.activeVehicle();
      if (active) {
        this.loadServiceHistory(active._id);
      } else {
        this.services.set([]);
      }
    });
  }

  private loadServiceHistory(vehicleId: string) {
    this.isLoading.set(true);
    this.serviceMaintenanceService.getServices(vehicleId).subscribe({
      next: (res) => {
        if (res.success) {
          this.services.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected showAddForm() {
    this.isAddingService.set(true);
    this.errorMessage.set(null);
    this.selectedFile = null;

    const currentOdo = this.activeVehicle()?.currentOdometer || 0;
    this.serviceForm.patchValue({
      date: new Date().toISOString().substring(0, 10),
      odometer: currentOdo > 0 ? String(currentOdo) : '',
      type: 'General Service',
      cost: '',
    });
  }

  protected hideAddForm() {
    this.isAddingService.set(false);
    this.serviceForm.reset();
  }

  protected onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  protected onSubmit() {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    const active = this.activeVehicle();
    if (!active) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const raw = this.serviceForm.value;
    const formData = new FormData();
    formData.append('vehicleId', active._id);
    formData.append('date', raw.date || '');
    formData.append('odometer', String(raw.odometer));
    formData.append('type', raw.type || '');
    formData.append('cost', String(raw.cost));
    formData.append('description', raw.description || '');
    formData.append('serviceProvider', raw.serviceProvider || '');
    
    if (raw.nextServiceOdometer) {
      formData.append('nextServiceOdometer', String(raw.nextServiceOdometer));
    }
    if (raw.nextServiceDate) {
      formData.append('nextServiceDate', raw.nextServiceDate);
    }
    if (this.selectedFile) {
      formData.append('invoicePhoto', this.selectedFile);
    }

    this.serviceMaintenanceService.createService(formData).subscribe({
      next: (res) => {
        if (res.success) {
          this.hideAddForm();
          this.loadServiceHistory(active._id);
          this.vehicleService.fetchVehicles().subscribe();
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to log service details.');
      },
    });
  }

  protected deleteService(id: string) {
    if (confirm('Are you sure you want to delete this service record? Any synced expense will also be deleted.')) {
      this.serviceMaintenanceService.deleteService(id).subscribe({
        next: () => {
          const active = this.activeVehicle();
          if (active) {
            this.loadServiceHistory(active._id);
            this.vehicleService.fetchVehicles().subscribe();
          }
        },
      });
    }
  }

  protected getInvoiceUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3000/uploads/${path}`;
  }
}
