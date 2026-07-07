import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/documents`;

  getDocuments(vehicleId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?vehicleId=${vehicleId}`);
  }

  createDocument(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData);
  }

  deleteDocument(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
