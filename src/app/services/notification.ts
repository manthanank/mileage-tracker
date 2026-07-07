import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  // Signals
  readonly notifications = signal<any[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter((n) => !n.read).length);

  fetchNotifications(): Observable<any> {
    return this.http.get<any>(this.apiUrl).pipe(
      tap((res) => {
        if (res.success) {
          this.notifications.set(res.data);
        }
      })
    );
  }

  markAsRead(id: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap((res) => {
        if (res.success) {
          this.notifications.update((list) =>
            list.map((n) => (n._id === id ? { ...n, read: true } : n))
          );
        }
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/read-all`, {}).pipe(
      tap((res) => {
        if (res.success) {
          this.notifications.update((list) =>
            list.map((n) => ({ ...n, read: true }))
          );
        }
      })
    );
  }

  deleteNotification(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap((res) => {
        if (res.success) {
          this.notifications.update((list) => list.filter((n) => n._id !== id));
        }
      })
    );
  }
}
