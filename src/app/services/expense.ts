import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/expenses`;

  getExpenses(vehicleId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?vehicleId=${vehicleId}`);
  }

  createExpense(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData);
  }

  deleteExpense(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getExpenseSummary(vehicleId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/summary/${vehicleId}`);
  }
}
