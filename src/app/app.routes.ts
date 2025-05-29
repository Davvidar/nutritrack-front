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
    path: 'splash',
    loadComponent: () => import('./components/splash-screen/splash-screen.component').then(m => m.SplashScreenComponent)
  },
  {
    path: 'auth',
    canActivate: [alreadyAuthGuard], // Aplicar el guard al módulo de autenticación
    children: [
      { 
        path: 'login', 
        loadComponent: () => import('./auth/login/login.page').then(m => m.LoginPage) 
      },
      { 
        path: 'register', 
        loadComponent: () => import('./auth/register/register.page').then(m => m.RegisterPage) 
      },
      { 
        path: 'forgot-password', 
        loadComponent: () => import('./auth/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPage) 
      },
      { 
        path: 'reset-password/:token', 
        loadComponent: () => import('./auth/forgot-password/reset-password/reset-password.page').then(m => m.ResetPasswordPage) 
      },
      { 
        path: '', 
        redirectTo: 'login', 
        pathMatch: 'full' 
      }
    ]
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      // Rutas de Inicio
      {
        path: 'inicio',
        loadComponent: () => import('./tabs/inicio/inicio.page').then(m => m.InicioPage)
      },
      {
        path: 'inicio/search',
        loadComponent: () => import('./tabs/inicio/search/search.page').then(m => m.SearchPage)
      },
      
      // Rutas de Productos
      {
        path: 'inicio/product/:id',
        loadComponent: () => import('./tabs/inicio/product-detail/product-detail.page').then(m => m.ProductDetailPage)
      },
      {
        path: 'inicio/product/:id/edit',
        loadComponent: () => import('./tabs/inicio/edit-product/product-edit.page').then(m => m.ProductEditPage)
      },
      {
        path: 'inicio/create-product',
        loadComponent: () => import('./tabs/inicio/create-product/create-product.page').then(m => m.CreateProductPage)
      },
      
      // Rutas de Recetas
      {
        path: 'inicio/create-recipe',
        loadComponent: () => import('./tabs/inicio/create-recipe/create-recipe.page').then(m => m.CreateRecipePage)
      },
      {
        path: 'inicio/recipe/:id',
        loadComponent: () => import('./tabs/inicio/recipe-detail/recipe-detail.page').then(m => m.RecipeDetailPage)
      },
      {
        path: 'inicio/recipe/:id/edit',
        loadComponent: () => import('./tabs/inicio/create-recipe/create-recipe.page').then(m => m.CreateRecipePage)
      },

      // Rutas de Perfil
      {
        path: 'perfil',
        loadComponent: () => import('./tabs/perfil/perfil.page').then(m => m.PerfilPage)
      },
      {
        path: 'perfil/settings',
        loadComponent: () => import('./tabs/perfil/settingsPage/settings.page').then(m => m.SettingsPage)
      },
      
      // Rutas de Estadísticas
      {
        path: 'estadisticas',
        loadComponent: () => import('./tabs/estadisticas/estadisticas.page').then(m => m.EstadisticasPage)
      },
      
      // Redirección por defecto dentro de tabs
      { 
        path: '', 
        redirectTo: 'inicio', 
        pathMatch: 'full' 
      }
    ]
  },
  
  // Redirección por defecto para rutas no encontradas
  { 
    path: '**', 
    redirectTo: '' 
  }
];