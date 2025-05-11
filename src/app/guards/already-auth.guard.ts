// src/app/guards/already-auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const alreadyAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  
  // Si hay token y no está expirado, redirigir al inicio
  if (auth.getToken() && !auth.isTokenExpired()) {
    router.navigate(['/tabs/inicio']);
    return false; // No permitir acceso a la ruta solicitada
  }
  
  // Si no está autenticado, permitir acceso a la ruta
  return true;
};