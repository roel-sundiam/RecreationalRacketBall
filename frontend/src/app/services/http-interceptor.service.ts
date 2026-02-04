import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token;
  const selectedClub = authService.selectedClub;

  console.log('🔧 HTTP Interceptor - Token:', !!token, 'Club:', selectedClub?.club?.name || selectedClub?.clubId || 'none');

  // Check if token is expired before sending request
  if (token && authService.isTokenExpired()) {
    console.log('🔒 HTTP Interceptor - Token expired before request, triggering auto-logout');
    authService.logout();

    // Return 401 error locally without making the request
    return throwError(() => new HttpErrorResponse({
      error: { success: false, message: 'Token expired' },
      status: 401,
      statusText: 'Unauthorized',
      url: req.url
    }));
  }

  // Build headers object
  let headers = req.headers;

  // Add Authorization header if token exists
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
    console.log('🔧 HTTP Interceptor - Added Authorization header');
  } else {
    console.log('🔧 HTTP Interceptor - No token, proceeding without auth');
  }

  // Add X-Club-Id header if club is selected
  if (selectedClub && selectedClub.clubId) {
    headers = headers.set('X-Club-Id', selectedClub.clubId);
    console.log('🏢 HTTP Interceptor - Added X-Club-Id header:', selectedClub.clubId);
  }

  // Clone request with all headers
  const authReq = req.clone({ headers });

  // Handle the request and catch 401 errors from backend
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If we get a 401 Unauthorized error from backend, auto-logout
      if (error.status === 401) {
        console.log('🔒 HTTP Interceptor - 401 Unauthorized from backend, triggering auto-logout');
        authService.logout();
      }
      // Re-throw the error so components can still handle it if needed
      return throwError(() => error);
    })
  );
};