import { Component, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { VehicleService } from '../../../services/vehicle';
import { FuelService } from '../../../services/fuel';

@Component({
  selector: 'app-fuel-logs',
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './fuel-logs.html',
  styleUrl: './fuel-logs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuelLogsComponent {
  private readonly vehicleService = inject(VehicleService);
  private readonly fuelService = inject(FuelService);
  private readonly fb = inject(FormBuilder);

  protected readonly activeVehicle = this.vehicleService.activeVehicle;

  // Signals
  protected readonly fuelEntries = signal<any[]>([]);
  protected readonly isAddingLog = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(false);

  // File Upload State
  private selectedFile: File | null = null;

  // Reactive Form
  protected readonly fuelForm = this.fb.group({
    date: [new Date().toISOString().substring(0, 10), [Validators.required]],
    odometer: ['', [Validators.required, Validators.min(0)]],
    liters: ['', [Validators.required, Validators.min(0.1)]],
    pricePerLiter: ['', [Validators.required, Validators.min(0.1)]],
    totalCost: ['', [Validators.required, Validators.min(0.1)]],
    fuelStation: [''],
    location: [''],
    partialFill: [false],
    missedPreviousFill: [false],
    notes: [''],
  });

  constructor() {
    // Automatically load refuel logs when active vehicle switches
    effect(() => {
      const active = this.activeVehicle();
      if (active) {
        this.loadFuelEntries(active._id);
      } else {
        this.fuelEntries.set([]);
      }
    });

    // Reactive UX: Auto-compute Total Cost on liters / price change
    this.fuelForm.valueChanges.subscribe(() => {
      const liters = this.fuelForm.get('liters')?.value;
      const price = this.fuelForm.get('pricePerLiter')?.value;
      if (liters && price) {
        const total = parseFloat((Number(liters) * Number(price)).toFixed(2));
        this.fuelForm.get('totalCost')?.setValue(String(total), { emitEvent: false });
      }
    });
  }

  private loadFuelEntries(vehicleId: string) {
    this.isLoading.set(true);
    this.fuelService.getFuelEntries(vehicleId).subscribe({
      next: (res) => {
        if (res.success) {
          this.fuelEntries.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected showAddForm() {
    this.isAddingLog.set(true);
    this.errorMessage.set(null);
    this.selectedFile = null;
    
    // Auto-populate next odometer as current active vehicle odometer for easy logs
    const currentOdo = this.activeVehicle()?.currentOdometer || 0;
    this.fuelForm.patchValue({
      date: new Date().toISOString().substring(0, 10),
      odometer: currentOdo > 0 ? String(currentOdo) : '',
      partialFill: false,
      missedPreviousFill: false,
    });
  }

  protected hideAddForm() {
    this.isAddingLog.set(false);
    this.fuelForm.reset();
  }

  protected onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  protected onSubmit() {
    if (this.fuelForm.invalid) {
      this.fuelForm.markAllAsTouched();
      return;
    }

    const active = this.activeVehicle();
    if (!active) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // Build FormData for file uploads support
    const formData = new FormData();
    formData.append('vehicleId', active._id);
    formData.append('date', this.fuelForm.get('date')?.value || '');
    formData.append('odometer', String(this.fuelForm.get('odometer')?.value));
    formData.append('liters', String(this.fuelForm.get('liters')?.value));
    formData.append('pricePerLiter', String(this.fuelForm.get('pricePerLiter')?.value));
    formData.append('totalCost', String(this.fuelForm.get('totalCost')?.value));
    formData.append('fuelStation', this.fuelForm.get('fuelStation')?.value || '');
    formData.append('location', this.fuelForm.get('location')?.value || '');
    formData.append('partialFill', String(this.fuelForm.get('partialFill')?.value));
    formData.append('missedPreviousFill', String(this.fuelForm.get('missedPreviousFill')?.value));
    formData.append('notes', this.fuelForm.get('notes')?.value || '');
    
    if (this.selectedFile) {
      formData.append('receiptPhoto', this.selectedFile);
    }

    this.fuelService.createFuelEntry(formData).subscribe({
      next: (res) => {
        if (res.success) {
          this.hideAddForm();
          this.loadFuelEntries(active._id);
          // Sync active vehicle current odo signal
          this.vehicleService.fetchVehicles().subscribe();
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to record refuel entry.');
      },
    });
  }

  protected deleteEntry(id: string) {
    if (confirm('Are you sure you want to delete this fuel entry? All mileage history calculations will be updated.')) {
      this.fuelService.deleteFuelEntry(id).subscribe({
        next: () => {
          const active = this.activeVehicle();
          if (active) {
            this.loadFuelEntries(active._id);
            this.vehicleService.fetchVehicles().subscribe();
          }
        },
      });
    }
  }

  /**
   * Helper to render full receipt URL (local backend uploads folder prefix or absolute Cloudinary URL)
   */
  protected getReceiptUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    // Local uploads mapping (fallback local dev port)
    return `http://localhost:3000/uploads/${path}`;
  }
}
