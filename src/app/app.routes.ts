// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { alreadyAuthGuard } from './guards/already-auth.guard';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./welcome/welcome.page').then(m => m.WelcomePage),
    canActivate: [alreadyAuthGuard] // Aplicar el guard a la ruta raíz
  },
  {
    path: 'auth',
    canActivate: [alreadyAuthGuard], // Aplicar el guard al módulo de autenticación
    children: [
      { path: 'login',    loadComponent: () => import('./auth/login/login.page').then(m => m.LoginPage) },
      { path: 'register', loadComponent: () => import('./auth/register/register.page').then(m => m.RegisterPage) },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'inicio',
        loadComponent: () => import('./tabs/inicio/inicio.page').then(m => m.InicioPage)
      },
      {
        path: 'inicio/search',
        loadComponent: () => import('./tabs/inicio/search/search.page').then(m => m.SearchPage)
      },
      {
        path: 'inicio/product/:id',
        loadComponent: () => import('./tabs/inicio/product-detail/product-detail.page').then(m => m.ProductDetailPage)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./tabs/perfil/perfil.page').then(m => m.PerfilPage)
      },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];