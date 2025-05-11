import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class TokenRefreshInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // No interceptar las peticiones de login/registro
    if (request.url.includes('/login') || request.url.includes('/register')) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si hay un error 401 (No autorizado), puede ser que el token haya expirado
        if (error.status === 401) {
          // Si el token ha expirado según nuestra lógica
          if (this.authService.isTokenExpired()) {
            // Sesión expirada, redirigir a login
            this.authService.logout().subscribe();
            this.router.navigate(['/auth/login']);
          } 
        }
        
        return throwError(() => error);
      })
    );
  }
}