// src/app/guards/already-auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Guard adicional para rutas que requieren que el usuario NO esté autenticado
export const alreadyAuthGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('AlreadyAuthGuard: Verificando si usuario ya está autenticado para:', state.url);

  // Si hay token válido y no está expirado, redirigir a tabs
  if (auth.getToken() && !auth.isTokenExpired() && auth.isAuthenticated()) {
    console.log('AlreadyAuthGuard: Usuario ya autenticado, redirigiendo a tabs');
    return router.createUrlTree(['/tabs/inicio']);
  }

  // Si el token existe pero está expirado, limpiarlo
  if (auth.getToken() && auth.isTokenExpired()) {
    console.log('AlreadyAuthGuard: Token expirado, limpiando sesión');
    auth.logout().subscribe({
      next: () => console.log('AlreadyAuthGuard: Sesión limpiada'),
      error: (err) => console.warn('AlreadyAuthGuard: Error limpiando sesión:', err)
    });
  }

  console.log('AlreadyAuthGuard: Usuario no autenticado, permitiendo acceso a:', state.url);
  return true;
};