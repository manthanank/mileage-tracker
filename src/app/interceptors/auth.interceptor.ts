import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { Auth } from '../services/auth';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Auth);
  const token = authService.getAccessToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error) => {
      // Check if error is 401 and token has expired
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const errorBody = error.error;
        
        // Match the TOKEN_EXPIRED code sent by the backend error handler
        if (errorBody && errorBody.code === 'TOKEN_EXPIRED') {
          return authService.refreshToken().pipe(
            switchMap((data: any) => {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${data.accessToken}`
                }
              });
              return next(retryReq);
            }),
            catchError((refreshError) => {
              authService.logout();
              return throwError(() => refreshError);
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};
