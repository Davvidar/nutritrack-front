// src/app/services/theme.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'nutritrack-theme';
  private readonly currentThemeSubject = new BehaviorSubject<Theme>('light');
  private readonly isDarkModeSubject = new BehaviorSubject<boolean>(false);
  
  // Observable para que los componentes puedan suscribirse a cambios de tema
  public readonly currentTheme$: Observable<Theme> = this.currentThemeSubject.asObservable();
  public readonly isDarkMode$: Observable<boolean> = this.isDarkModeSubject.asObservable();

  constructor() {
    this.initializeTheme();
    this.setupSystemThemeListener();
  }

  /**
   * Inicializa el tema al cargar la aplicación
   */
  private initializeTheme(): void {
    const savedTheme = this.getSavedTheme();
    const systemPrefersDark = this.getSystemPreference();
    
    console.log('ThemeService: Inicializando tema', { savedTheme, systemPrefersDark });
    
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      // Si no hay tema guardado, usar preferencia del sistema
      this.setTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }

  /**
   * Configura el listener para cambios en la preferencia del sistema
   */
  private setupSystemThemeListener(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      mediaQuery.addEventListener('change', (e) => {
        console.log('ThemeService: Cambio en preferencia del sistema:', e.matches);
        
        // Solo aplicar automáticamente si el usuario tiene configurado 'auto'
        if (this.currentThemeSubject.value === 'auto') {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  /**
   * Obtiene la preferencia del sistema
   */
  private getSystemPreference(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }

  /**
   * Obtiene el tema guardado en localStorage
   */
  private getSavedTheme(): Theme | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(this.THEME_KEY);
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        return saved as Theme;
      }
    }
    return null;
  }

  /**
   * Guarda el tema en localStorage
   */
  private saveTheme(theme: Theme): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.THEME_KEY, theme);
    }
  }

  /**
   * Aplica el tema al DOM
   */
  private applyTheme(effectiveTheme: 'light' | 'dark'): void {
    if (typeof document !== 'undefined') {
      const isDark = effectiveTheme === 'dark';
      
      console.log('ThemeService: Aplicando tema', { efectivo: effectiveTheme, isDark });
      
      // Aplicar o quitar el atributo data-theme
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      } else {
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      }
      
      // Actualizar el meta theme-color para la barra de estado del navegador móvil
      this.updateThemeColor(isDark);
      
      // Actualizar el estado interno
      this.isDarkModeSubject.next(isDark);
    }
  }

  /**
   * Actualiza el color de la barra de estado del navegador
   */
  private updateThemeColor(isDark: boolean): void {
    if (typeof document !== 'undefined') {
      let themeColorMeta = document.querySelector('meta[name="theme-color"]');
      
      if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.setAttribute('name', 'theme-color');
        document.head.appendChild(themeColorMeta);
      }
      
      // Color verde de NutriTrack para ambos temas
      const themeColor = '#6ab04c';
      themeColorMeta.setAttribute('content', themeColor);
    }
  }

  /**
   * Cambia el tema de la aplicación
   */
  public setTheme(theme: Theme): void {
    console.log('ThemeService: Estableciendo tema:', theme);
    
    this.currentThemeSubject.next(theme);
    this.saveTheme(theme);
    
    let effectiveTheme: 'light' | 'dark';
    
    if (theme === 'auto') {
      effectiveTheme = this.getSystemPreference() ? 'dark' : 'light';
    } else {
      effectiveTheme = theme;
    }
    
    this.applyTheme(effectiveTheme);
  }

  /**
   * Alterna entre tema claro y oscuro
   */
  public toggleTheme(): void {
    const current = this.currentThemeSubject.value;
    let newTheme: Theme;
    
    if (current === 'light') {
      newTheme = 'dark';
    } else if (current === 'dark') {
      newTheme = 'light';
    } else {
      // Si está en auto, cambiar al opuesto de la preferencia actual
      newTheme = this.isDarkModeSubject.value ? 'light' : 'dark';
    }
    
    console.log('ThemeService: Alternando tema de', current, 'a', newTheme);
    this.setTheme(newTheme);
  }

  /**
   * Obtiene el tema actual
   */
  public getCurrentTheme(): Theme {
    return this.currentThemeSubject.value;
  }

  /**
   * Verifica si el modo oscuro está activo
   */
  public isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }

  /**
   * Obtiene el tema efectivo (sin 'auto')
   */
  public getEffectiveTheme(): 'light' | 'dark' {
    const current = this.currentThemeSubject.value;
    if (current === 'auto') {
      return this.getSystemPreference() ? 'dark' : 'light';
    }
    return current;
  }

  /**
   * Resetea el tema a la configuración por defecto
   */
  public resetToDefault(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.THEME_KEY);
    }
    
    const defaultTheme = this.getSystemPreference() ? 'dark' : 'light';
    this.setTheme(defaultTheme);
  }

  /**
   * Verifica si el tema automático está disponible
   */
  public isAutoThemeSupported(): boolean {
    return typeof window !== 'undefined' && 
           window.matchMedia && 
           typeof window.matchMedia('(prefers-color-scheme: dark)').matches === 'boolean';
  }

  /**
   * Obtiene información completa del estado del tema
   */
  public getThemeInfo(): {
    current: Theme;
    effective: 'light' | 'dark';
    isDark: boolean;
    systemPreference: 'light' | 'dark';
    autoSupported: boolean;
  } {
    return {
      current: this.getCurrentTheme(),
      effective: this.getEffectiveTheme(),
      isDark: this.isDarkMode(),
      systemPreference: this.getSystemPreference() ? 'dark' : 'light',
      autoSupported: this.isAutoThemeSupported()
    };
  }

  /**
   * Método para debug - imprime el estado actual del tema
   */
  public debugThemeState(): void {
    console.log('ThemeService Debug:', this.getThemeInfo());
  }
}