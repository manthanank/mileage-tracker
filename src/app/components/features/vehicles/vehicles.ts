import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { VehicleService } from '../../../services/vehicle';

@Component({
  selector: 'app-vehicles',
  imports: [ReactiveFormsModule, DecimalPipe],
  templateUrl: './vehicles.html',
  styleUrl: './vehicles.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehiclesComponent {
  protected readonly vehicleService = inject(VehicleService);
  private readonly fb = inject(FormBuilder);

  // Signals
  protected readonly isAddingVehicle = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // New vehicle reactive form
  protected readonly vehicleForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    type: ['bike', [Validators.required]],
    brand: ['', [Validators.required]],
    model: ['', [Validators.required]],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
    fuelType: ['petrol', [Validators.required]],
    registrationNumber: [''],
    startOdometer: ['', [Validators.required, Validators.min(0)]],
  });

  protected showAddForm() {
    this.isAddingVehicle.set(true);
    this.errorMessage.set(null);
  }

  protected hideAddForm() {
    this.isAddingVehicle.set(false);
    this.vehicleForm.reset({
      type: 'bike',
      year: new Date().getFullYear(),
      fuelType: 'petrol',
    });
  }

  protected onSubmit() {
    if (this.vehicleForm.invalid) {
      this.vehicleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // Make numbers clean
    const rawVal = this.vehicleForm.value;
    const payload = {
      ...rawVal,
      year: Number(rawVal.year),
      startOdometer: Number(rawVal.startOdometer),
    };

    this.vehicleService.createVehicle(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.hideAddForm();
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to add vehicle. Please try again.');
      },
    });
  }

  protected selectActive(vehicle: any) {
    this.vehicleService.selectVehicle(vehicle);
  }

  protected deleteVehicle(id: string) {
    if (confirm('Are you sure you want to delete this vehicle? This will delete all its logs, fuel records, trips, and documents permanently.')) {
      this.vehicleService.deleteVehicle(id).subscribe();
    }
  }
}
