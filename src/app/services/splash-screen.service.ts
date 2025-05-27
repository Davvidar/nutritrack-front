// src/app/services/splash-screen.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer, forkJoin } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

export interface SplashState {
  isVisible: boolean;
  isLoading: boolean;
  progress: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SplashScreenService {
  private splashStateSubject = new BehaviorSubject<SplashState>({
    isVisible: false,
    isLoading: false,
    progress: 0,
    message: 'Iniciando NutriTrack...'
  });

  public splashState$ = this.splashStateSubject.asObservable();

  private readonly MINIMUM_SPLASH_DURATION = 2500; // Mínimo 2.5 segundos para mostrar la marca
  private readonly INITIALIZATION_STEPS = [
    { message: 'Iniciando NutriTrack...', duration: 300 },
    { message: 'Verificando autenticación...', duration: 500 },
    { message: 'Cargando configuración...', duration: 400 },
    { message: 'Sincronizando datos...', duration: 600 },
    { message: 'Preparando experiencia...', duration: 400 },
    { message: '¡Ya casi estamos listos!', duration: 300 }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Inicia el proceso de splash screen y la inicialización de la app
   */
  startSplashScreen(): Observable<boolean> {
    console.log('SplashScreenService: Iniciando splash screen');
    
    this.updateSplashState({
      isVisible: true,
      isLoading: true,
      progress: 0,
      message: 'Iniciando NutriTrack...'
    });

    const startTime = Date.now();

    // Combinar inicialización real con duración mínima
    return forkJoin({
      appInitialization: this.initializeApp(),
      minimumDuration: timer(this.MINIMUM_SPLASH_DURATION)
    }).pipe(
      map(({ appInitialization }) => {
        const elapsedTime = Date.now() - startTime;
        console.log(`SplashScreenService: Inicialización completada en ${elapsedTime}ms`);
        return appInitialization;
      }),
      switchMap((isAuthenticated) => {
        // Completar progreso y mostrar mensaje final
        this.updateSplashState({
          isVisible: true,
          isLoading: false,
          progress: 100,
          message: '¡Listo para comenzar!'
        });

        // Esperar un momento antes de ocultar
        return timer(800).pipe(
          map(() => {
            this.hideSplashScreen();
            return isAuthenticated;
          })
        );
      })
    );
  }

  /**
   * Inicializa la aplicación y sus servicios
   */
  private initializeApp(): Observable<boolean> {
    let currentStep = 0;
    let currentProgress = 0;

    return new Observable(observer => {
      const processNextStep = () => {
        if (currentStep >= this.INITIALIZATION_STEPS.length) {
          // Finalizar con verificación de autenticación
          this.performAuthCheck().then(isAuthenticated => {
            observer.next(isAuthenticated);
            observer.complete();
          }).catch(error => {
            console.error('SplashScreenService: Error en verificación de auth:', error);
            observer.next(false);
            observer.complete();
          });
          return;
        }

        const step = this.INITIALIZATION_STEPS[currentStep];
        currentProgress = ((currentStep + 1) / this.INITIALIZATION_STEPS.length) * 90; // Hasta 90%, el 10% final es para auth

        this.updateSplashState({
          isVisible: true,
          isLoading: true,
          progress: currentProgress,
          message: step.message
        });

        currentStep++;
        setTimeout(processNextStep, step.duration);
      };

      processNextStep();
    });
  }

  /**
   * Verifica el estado de autenticación
   */
  private async performAuthCheck(): Promise<boolean> {
    try {
      this.updateSplashState({
        isVisible: true,
        isLoading: true,
        progress: 95,
        message: 'Verificando sesión...'
      });

      // Verificar si hay token válido
      const isAuthenticated = this.authService.isAuthenticated();
      
      if (isAuthenticated && !this.authService.isTokenExpired()) {
        // Cargar perfil de usuario si está autenticado
        await this.loadUserProfile();
        return true;
      } else {
        // Limpiar datos si el token expiró
        if (this.authService.isTokenExpired()) {
          console.log('SplashScreenService: Token expirado, limpiando datos');
          this.authService.logout().subscribe();
        }
        return false;
      }
    } catch (error) {
      console.error('SplashScreenService: Error en verificación de autenticación:', error);
      return false;
    }
  }

  /**
   * Carga el perfil del usuario si está autenticado
   */
  private async loadUserProfile(): Promise<void> {
    try {
      this.updateSplashState({
        isVisible: true,
        isLoading: true,
        progress: 98,
        message: 'Cargando tu perfil...'
      });

      // Intentar cargar el perfil
      await this.authService.getProfile().pipe(take(1)).toPromise();
      console.log('SplashScreenService: Perfil de usuario cargado');
    } catch (error) {
      console.error('SplashScreenService: Error cargando perfil:', error);
      // No es crítico, la app puede funcionar sin el perfil pre-cargado
    }
  }

  /**
   * Oculta el splash screen
   */
  hideSplashScreen(): void {
    console.log('SplashScreenService: Ocultando splash screen');
    this.updateSplashState({
      isVisible: false,
      isLoading: false,
      progress: 100,
      message: '¡Listo!'
    });
  }

  /**
   * Navega a la pantalla apropiada basada en el estado de autenticación
   */
  navigateToAppropriateScreen(isAuthenticated: boolean): void {
    if (isAuthenticated) {
      console.log('SplashScreenService: Usuario autenticado, navegando a tabs');
      this.router.navigate(['/tabs'], { replaceUrl: true });
    } else {
      console.log('SplashScreenService: Usuario no autenticado, navegando a login');
      this.router.navigate(['/auth/login'], { replaceUrl: true });
    }
  }

  /**
   * Actualiza el estado del splash screen
   */
  private updateSplashState(newState: Partial<SplashState>): void {
    const currentState = this.splashStateSubject.value;
    const updatedState = { ...currentState, ...newState };
    this.splashStateSubject.next(updatedState);
  }

  /**
   * Obtiene el estado actual del splash screen
   */
  getCurrentState(): SplashState {
    return this.splashStateSubject.value;
  }

  /**
   * Fuerza el cierre del splash screen (para casos de error)
   */
  forceHide(): void {
    console.log('SplashScreenService: Forzando cierre del splash screen');
    this.hideSplashScreen();
  }

  /**
   * Reinicia el splash screen (útil para refresh de la app)
   */
  reset(): void {
    this.updateSplashState({
      isVisible: false,
      isLoading: false,
      progress: 0,
      message: 'Iniciando NutriTrack...'
    });
  }
}