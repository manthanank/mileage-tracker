import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class VehicleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/vehicles`;

  // Signals
  readonly vehicles = signal<any[]>([]);
  readonly activeVehicle = signal<any>(null);

  /**
   * Fetches all user vehicles and auto-selects the active one from session cache
   */
  fetchVehicles(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      tap((res) => {
        if (res.success) {
          this.vehicles.set(res.data);
          
          // Restore active vehicle selection from localStorage
          const cachedId = localStorage.getItem('activeVehicleId');
          if (cachedId) {
            const found = res.data.find((v: any) => v._id === cachedId);
            if (found) {
              this.activeVehicle.set(found);
              return;
            }
          }

          // Fallback to first vehicle if cache is empty or invalid
          if (res.data.length > 0) {
            this.selectVehicle(res.data[0]);
          } else {
            this.activeVehicle.set(null);
          }
        }
      })
    );
  }

  selectVehicle(vehicle: any): void {
    this.activeVehicle.set(vehicle);
    if (vehicle) {
      localStorage.setItem('activeVehicleId', vehicle._id);
    } else {
      localStorage.removeItem('activeVehicleId');
    }
  }

  createVehicle(vehicleData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, vehicleData).pipe(
      tap((res) => {
        if (res.success) {
          this.vehicles.update((list) => [...list, res.data]);
          if (this.vehicles().length === 1) {
            this.selectVehicle(res.data);
          }
        }
      })
    );
  }

  deleteVehicle(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap((res) => {
        if (res.success) {
          const isDeletedActive = this.activeVehicle()?._id === id;
          this.vehicles.update((list) => list.filter((v) => v._id !== id));
          
          if (isDeletedActive) {
            if (this.vehicles().length > 0) {
              this.selectVehicle(this.vehicles()[0]);
            } else {
              this.selectVehicle(null);
            }
          }
        }
      })
    );
  }
}
