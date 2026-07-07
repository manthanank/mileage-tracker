import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FuelService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/fuel`;

  getFuelEntries(vehicleId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?vehicleId=${vehicleId}`);
  }

  createFuelEntry(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData);
  }

  deleteFuelEntry(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
