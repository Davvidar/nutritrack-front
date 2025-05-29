// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree
} from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('AuthGuard: Verificando autenticación para:', state.url);

  // Obtener token
  const token = auth.getToken();
  
  // Si no hay token, redirigir a login
  if (!token) {
    console.log('AuthGuard: No hay token, redirigiendo a login');
    return router.createUrlTree(['/auth/login']);
  }

  // Verificar si el token ha expirado
  if (auth.isTokenExpired()) {
    console.log('AuthGuard: Token expirado, limpiando sesión y redirigiendo a login');
    
    // Limpiar sesión de manera silenciosa
    auth.logout().subscribe({
      next: () => console.log('AuthGuard: Sesión limpiada exitosamente'),
      error: (err) => console.warn('AuthGuard: Error al limpiar sesión:', err)
    });
    
    return router.createUrlTree(['/auth/login']);
  }

  // Verificar que el usuario esté realmente autenticado
  if (!auth.isAuthenticated()) {
    console.log('AuthGuard: Usuario no autenticado, redirigiendo a login');
    return router.createUrlTree(['/auth/login']);
  }

  console.log('AuthGuard: Usuario autenticado, permitiendo acceso');
  return true;
};



// Guard para verificar roles específicos (útil para funciones admin)
/* export const roleGuard = (requiredRole: string): CanActivateFn => {
  return (route, state): boolean | UrlTree => {
    const auth = inject(AuthService);
    const router = inject(Router);

    console.log(`RoleGuard: Verificando rol '${requiredRole}' para:`, state.url);

    // Primero verificar autenticación básica
    if (!auth.getToken() || auth.isTokenExpired() || !auth.isAuthenticated()) {
      console.log('RoleGuard: Usuario no autenticado');
      return router.createUrlTree(['/auth/login']);
    }

    // Verificar rol
    const userData = auth.getUserData();
    if (!userData || userData.rol !== requiredRole) {
      console.log(`RoleGuard: Usuario no tiene el rol requerido. Actual: ${userData?.rol}, Requerido: ${requiredRole}`);
      // Redirigir a una página de "no autorizado" o al inicio
      return router.createUrlTree(['/tabs/inicio']);
    }

    console.log(`RoleGuard: Usuario tiene el rol '${requiredRole}', acceso permitido`);
    return true;
  };
}; */

// Guard para verificar que el perfil esté completo
export const profileCompleteGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  console.log('ProfileCompleteGuard: Verificando completitud del perfil');

  // Verificar autenticación básica primero
  if (!auth.getToken() || auth.isTokenExpired() || !auth.isAuthenticated()) {
    console.log('ProfileCompleteGuard: Usuario no autenticado');
    return router.createUrlTree(['/auth/login']);
  }

  // Verificar que el perfil esté completo
  const userData = auth.getUserData();
  if (!userData) {
    console.log('ProfileCompleteGuard: No hay datos de usuario');
    return router.createUrlTree(['/auth/login']);
  }

  // Verificar campos críticos del perfil
  const requiredFields = ['peso', 'altura', 'edad', 'sexo', 'objetivo', 'actividad'];
  const missingFields = requiredFields.filter(field => 
    !userData[field as keyof typeof userData] || 
    userData[field as keyof typeof userData] === null ||
    userData[field as keyof typeof userData] === undefined
  );

  if (missingFields.length > 0) {
    console.log('ProfileCompleteGuard: Faltan campos del perfil:', missingFields);
    // Redirigir a página de completar perfil (cuando la tengas)
    // return router.createUrlTree(['/complete-profile']);
    console.warn('ProfileCompleteGuard: Página de completar perfil no implementada, permitiendo acceso');
  }

  console.log('ProfileCompleteGuard: Perfil completo, acceso permitido');
  return true;
};