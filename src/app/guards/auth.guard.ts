// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();
  if (token) {
    return true;
  }
  // No hay token, redirigimos a login
  router.navigate(['/auth/login']);
  return false;
};
