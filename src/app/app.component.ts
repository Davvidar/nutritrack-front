// src/app/app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

// Servicios
import { SplashScreenService, SplashState } from './services/splash-screen.service';
import { AuthService } from './services/auth.service';

// Componentes
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';
import { StatusBar } from '@capacitor/status-bar';

StatusBar.setOverlaysWebView({ overlay: false });

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IonicModule, 
    CommonModule, 
    RouterOutlet, 
    SplashScreenComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  splashState: SplashState = {
    isVisible: true,
    isLoading: true,
    progress: 0,
    message: 'Iniciando NutriTrack...'
  };

  private splashSubscription?: Subscription;
  private initializationComplete = false;

  constructor(
    private platform: Platform,
    private splashScreenService: SplashScreenService,
    private authService: AuthService
  ) {
    this.initializeApp();
  }

  ngOnInit() {
    console.log('AppComponent: ngOnInit - Inicializando aplicación');
    
    // Suscribirse al estado del splash screen
    this.splashSubscription = this.splashScreenService.splashState$.subscribe(
      state => {
        console.log('AppComponent: Estado del splash actualizado:', state);
        this.splashState = state;
        
        // Si el splash se oculta y la inicialización está completa, asegurar navegación
        if (!state.isVisible && this.initializationComplete) {
          this.ensureProperNavigation();
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.splashSubscription) {
      this.splashSubscription.unsubscribe();
    }
  }

  private async initializeApp() {
    try {
      console.log('AppComponent: Esperando a que la plataforma esté lista...');
      
      await this.platform.ready();
      console.log('AppComponent: Plataforma lista, iniciando splash screen');

      // Pequeño delay para asegurar que la UI esté lista
      await new Promise(resolve => setTimeout(resolve, 100));

      // Iniciar el proceso de splash screen
      this.splashScreenService.startSplashScreen()
        .pipe(take(1))
        .subscribe({
          next: (isAuthenticated: boolean) => {
            console.log('AppComponent: Inicialización completada. Usuario autenticado:', isAuthenticated);
            this.initializationComplete = true;
            
            // Navegar a la pantalla apropiada
            setTimeout(() => {
              this.splashScreenService.navigateToAppropriateScreen(isAuthenticated);
            }, 500);
          },
          error: (error) => {
            console.error('AppComponent: Error durante la inicialización:', error);
            this.handleInitializationError();
          }
        });

    } catch (error) {
      console.error('AppComponent: Error crítico durante la inicialización:', error);
      this.handleInitializationError();
    }
  }

  private handleInitializationError() {
    console.log('AppComponent: Manejando error de inicialización');
    
    // En caso de error, ocultar splash y navegar a login
    this.initializationComplete = true;
    this.splashScreenService.forceHide();
    
    setTimeout(() => {
      this.splashScreenService.navigateToAppropriateScreen(false);
    }, 1000);
  }

  private ensureProperNavigation() {
    // Verificar que estemos en la ruta correcta después de ocultar el splash
    const currentUrl = window.location.pathname;
    const isAuthenticated = this.authService.isAuthenticated() && !this.authService.isTokenExpired();
    
    console.log('AppComponent: Verificando navegación. URL actual:', currentUrl, 'Autenticado:', isAuthenticated);
    
    // Si estamos en la raíz y la inicialización está completa, redirigir
    if (currentUrl === '/' || currentUrl === '/splash' || currentUrl === '') {
      console.log('AppComponent: Redirigiendo desde URL raíz');
      this.splashScreenService.navigateToAppropriateScreen(isAuthenticated);
    }
  }
}