import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Obtener el token de autenticación
    const token = this.authService.getToken();
    
    // Si hay token y la petición va a la API, añadir el token a la cabecera
    if (token && request.url.includes(this.getApiUrl())) {
      const authReq = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(authReq);
    }
    
    // Si no hay token o la petición no va a la API, dejar pasar la petición sin modificar
    return next.handle(request);
  }
  
  private getApiUrl(): string {
    // Obtener la URL base de la API desde el entorno o usar una URL por defecto
    try {
      // Acceder a environment podría dar error si no está cargado correctamente
      return '/api'; // Parte base de la URL, podría ser diferente en tu caso
    } catch (error) {
      console.error('Error al obtener URL de API:', error);
      return '/api'; // URL por defecto en caso de error
    }
  }
}