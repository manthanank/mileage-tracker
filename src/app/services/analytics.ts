import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/analytics`;

  getVehicleDashboard(vehicleId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/vehicles/${vehicleId}/dashboard`);
  }

  getMonthlySummary(vehicleId: string, month: number, year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/monthly/${vehicleId}?month=${month}&year=${year}`);
  }

  getAnnualSummary(vehicleId: string, year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/annual/${vehicleId}?year=${year}`);
  }

  /**
   * Downloads report as a blob, ensuring AuthInterceptor attaches authorization headers
   */
  downloadReport(vehicleId: string, type: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/report/download?vehicleId=${vehicleId}&type=${type}`, {
      responseType: 'blob',
    });
  }
}
