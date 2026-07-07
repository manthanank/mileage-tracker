import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TripService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/trips`;

  // Signals
  readonly activeTrip = signal<any>(null);

  /**
   * Scans if there is an active running trip on load
   */
  checkActiveTrip(vehicleId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?vehicleId=${vehicleId}&status=running`).pipe(
      tap((res) => {
        if (res.success && res.data.length > 0) {
          this.activeTrip.set(res.data[0]);
        } else {
          this.activeTrip.set(null);
        }
      })
    );
  }

  getTrips(vehicleId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?vehicleId=${vehicleId}`);
  }

  startTrip(tripData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/start`, tripData).pipe(
      tap((res) => {
        if (res.success) {
          this.activeTrip.set(res.data);
        }
      })
    );
  }

  endTrip(tripId: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${tripId}/end`, formData).pipe(
      tap((res) => {
        if (res.success) {
          this.activeTrip.set(null);
        }
      })
    );
  }

  recordGpsPoint(tripId: string, lat: number, lng: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${tripId}/gps`, { lat, lng });
  }

  getTripStats(vehicleId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/${vehicleId}`);
  }

  deleteTrip(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
