import { Component, inject, signal, effect, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { VehicleService } from '../../../services/vehicle';
import { TripService } from '../../../services/trip';

@Component({
  selector: 'app-trips',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './trips.html',
  styleUrl: './trips.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripsComponent implements OnDestroy {
  private readonly vehicleService = inject(VehicleService);
  private readonly tripService = inject(TripService);
  private readonly fb = inject(FormBuilder);

  protected readonly activeVehicle = this.vehicleService.activeVehicle;
  protected readonly activeTrip = this.tripService.activeTrip;
  protected readonly Number = Number;

  // Signals
  protected readonly trips = signal<any[]>([]);
  protected readonly tripStats = signal<any>({ longestRide: 0, shortestRide: 0, averageRide: 0, totalTrips: 0 });
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isLoading = signal(false);
  
  // Stopwatch
  protected readonly runningDuration = signal(0);
  private timerInterval: any = null;

  // File Upload state (support multiple photos)
  private selectedFiles: File[] = [];

  // Start Form
  protected readonly startForm = this.fb.group({
    startOdometer: ['', [Validators.required, Validators.min(0)]],
    purpose: ['Personal', [Validators.required]],
    startLocation: ['', [Validators.required]],
    notes: [''],
    tags: [''],
  });

  // End Form
  protected readonly endForm = this.fb.group({
    endOdometer: ['', [Validators.required, Validators.min(0)]],
    endLocation: ['', [Validators.required]],
    notes: [''],
    rideScore: [90, [Validators.required, Validators.min(0), Validators.max(100)]],
    weatherCondition: ['Sunny'],
    weatherTemp: [31],
    weatherHumidity: [68],
  });

  constructor() {
    // Reload logs and active state when vehicle changes
    effect(() => {
      const active = this.activeVehicle();
      if (active) {
        this.loadTripData(active._id);
      } else {
        this.trips.set([]);
        this.clearTimer();
      }
    });

    // Handle stopwatch trigger on activeTrip state change
    effect(() => {
      const trip = this.activeTrip();
      if (trip && trip.status === 'running') {
        this.startTimer(trip.startDate);
        // Patch default end odometer
        this.endForm.patchValue({
          endOdometer: String(trip.startOdometer),
        });
      } else {
        this.clearTimer();
      }
    });
  }

  ngOnDestroy() {
    this.clearTimer();
  }

  private loadTripData(vehicleId: string) {
    this.isLoading.set(true);
    this.tripService.checkActiveTrip(vehicleId).subscribe();
    this.tripService.getTrips(vehicleId).subscribe({
      next: (res) => {
        if (res.success) {
          this.trips.set(res.data.filter((t: any) => t.status === 'completed'));
        }
      },
    });
    this.tripService.getTripStats(vehicleId).subscribe({
      next: (res) => {
        if (res.success) {
          this.tripStats.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private startTimer(startDateStr: string) {
    this.clearTimer();
    const startDate = new Date(startDateStr).getTime();
    
    const updateTime = () => {
      const diffMs = new Date().getTime() - startDate;
      this.runningDuration.set(Math.max(1, Math.round(diffMs / 60000))); // in minutes
    };
    
    updateTime();
    this.timerInterval = setInterval(updateTime, 10000); // update every 10 seconds
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.runningDuration.set(0);
  }

  protected onStartTrip() {
    if (this.startForm.invalid) {
      this.startForm.markAllAsTouched();
      return;
    }

    const active = this.activeVehicle();
    if (!active) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      ...this.startForm.value,
      vehicleId: active._id,
      startOdometer: Number(this.startForm.value.startOdometer),
    };

    this.tripService.startTrip(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.vehicleService.fetchVehicles().subscribe();
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to start trip.');
      },
    });
  }

  protected onPhotosSelected(event: any) {
    const files = event.target.files;
    this.selectedFiles = [];
    if (files) {
      for (let i = 0; i < files.length; i++) {
        this.selectedFiles.push(files[i]);
      }
    }
  }

  protected onEndTrip() {
    const trip = this.activeTrip();
    if (!trip) return;

    if (this.endForm.invalid) {
      this.endForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const rawEnd = this.endForm.value;

    const formData = new FormData();
    formData.append('endOdometer', String(rawEnd.endOdometer));
    formData.append('endLocation', rawEnd.endLocation || '');
    formData.append('notes', rawEnd.notes || '');
    formData.append('rideScore', String(rawEnd.rideScore));
    
    // Structure weather
    const weather = {
      condition: rawEnd.weatherCondition,
      temp: Number(rawEnd.weatherTemp),
      humidity: Number(rawEnd.weatherHumidity),
    };
    formData.append('weather', JSON.stringify(weather));

    // Append multiple files
    this.selectedFiles.forEach((file) => {
      formData.append('photos', file);
    });

    this.tripService.endTrip(trip._id, formData).subscribe({
      next: (res) => {
        if (res.success) {
          const active = this.activeVehicle();
          if (active) {
            this.loadTripData(active._id);
          }
          this.vehicleService.fetchVehicles().subscribe();
          this.endForm.reset({
            rideScore: 90,
            weatherCondition: 'Sunny',
            weatherTemp: 31,
            weatherHumidity: 68,
          });
          this.selectedFiles = [];
        }
        this.isSubmitting.set(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Failed to end trip.');
      },
    });
  }

  /**
   * Optional Simulator: records a live GPS point into active trip coordinates history
   */
  protected simulateGpsPing() {
    const trip = this.activeTrip();
    if (!trip) return;

    // Simulate location (e.g. Pune coordinates bounds)
    const mockLat = 18.5204 + (Math.random() - 0.5) * 0.05;
    const mockLng = 73.8567 + (Math.random() - 0.5) * 0.05;

    this.tripService.recordGpsPoint(trip._id, mockLat, mockLng).subscribe({
      next: () => alert(`GPS Point Simulated: Lat ${mockLat.toFixed(4)}, Lng ${mockLng.toFixed(4)}`),
    });
  }

  protected getEstimatedFuelUsed(distance: number): number {
    // fallback or calculate based on health statistics
    const defaultMileage = 35; // 35 km/L fallback
    return parseFloat((distance / defaultMileage).toFixed(1));
  }

  protected getEstimatedCost(distance: number): number {
    const fuelLiters = this.getEstimatedFuelUsed(distance);
    const avgPrice = 104; // fallback fuel price
    return Math.round(fuelLiters * avgPrice);
  }

  protected deleteTrip(id: string) {
    if (confirm('Are you sure you want to delete this trip? Statistics will be updated.')) {
      this.tripService.deleteTrip(id).subscribe({
        next: () => {
          const active = this.activeVehicle();
          if (active) this.loadTripData(active._id);
        },
      });
    }
  }

  protected getTripPhotoUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `http://localhost:3000/uploads/${path}`;
  }
}
