// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment.prod';
import { Router } from '@angular/router';

export interface UserProfile {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  peso: number;
  altura: number;
  sexo: string;
  edad: number;
  objetivo: string;
  actividad: string;
  objetivosNutricionales: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };

  // Campos opcionales/extendidos
  consumoActual?: {
    calorias?: number;
    proteinas?: number;
    carbohidratos?: number;
    grasas?: number;
  };
  pesoAnterior?: number;
  pesoHoy?: number;
}


export interface RegisterData {
  nombre: string;
  apellido: string;
  correo: string;
  password: string;
  peso: number;
  altura: number;
  sexo: 'masculino' | 'femenino' | 'otro';
  edad: number;
  objetivo: 'perder peso' | 'mantenerse' | 'ganar músculo';
  actividad: 'sedentario' | 'ligero' | 'moderado' | 'activo' | 'muy activo';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = environment.API_URL + '/users';
  private tokenKey = 'nutritrack_token';
  private userKey = 'nutritrack_user';
  private tokenExpiryKey = 'nutritrack_token_expiry';
  
  // Estado de autenticación observable
  private authState = new BehaviorSubject<boolean>(false);
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  
  // Exposición pública del estado de autenticación como Observable
  public authStatus$ = this.authState.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();

  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.checkAuth();
  }
  
  // Verificar estado de autenticación al iniciar
  private checkAuth() {
    const token = this.getToken();
    
    if (token && !this.isTokenExpired()) {
      // Token válido, actualizar estado y cargar datos de usuario
      this.authState.next(true);
      
      // Intentar cargar datos de usuario desde localStorage
      const userData = this.getUserData();
      if (userData) {
        this.currentUserSubject.next(userData);
      } else {
        // Si no hay datos en localStorage, intentar obtener del perfil
        this.getProfile().subscribe({
          next: (user) => {
            this.currentUserSubject.next(user);
          },
          error: () => {
            // Si hay error al cargar el perfil, limpiar y desconectar
            this.clearAuthData();
          }
        });
      }
    } else if (token && this.isTokenExpired()) {
      // Token expirado, limpiar todo
      this.clearAuthData();
    }
  }

  login(data: { correo: string; password: string }): Observable<{ token: string; user: UserProfile }> {
    return this.http.post<{ token: string; user: UserProfile }>(
      `${this.api}/login`,
      data
    ).pipe(
      tap(res => {
        this.saveToken(res.token);
        this.saveUserData(res.user);
        this.saveTokenExpiry(res.token); // Guardar la fecha de expiración del token
        this.authState.next(true);
        this.currentUserSubject.next(res.user);
      })
    );
  }

  register(data: RegisterData): Observable<any> {
    return this.http.post(`${this.api}/register`, data);
  }

  getProfile(): Observable<UserProfile> {
    // Intenta usar datos en caché primero si están disponibles
    const cachedUser = this.getUserData();
    if (cachedUser) {
      this.currentUserSubject.next(cachedUser);
    }
    
    // Siempre solicitar datos frescos del servidor
    return this.http.get<UserProfile>(
      `${this.api}/profile`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(user => {
        this.saveUserData(user);
        this.currentUserSubject.next(user);
      })
    );
  }

  private saveTokenExpiry(token: string) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return;
      
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp) {
        localStorage.setItem(this.tokenExpiryKey, payload.exp.toString());
      }
    } catch (error) {
      console.error('Error guardando expiración del token:', error);
    }
  }
  
  private clearAuthData() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.tokenExpiryKey);
    this.authState.next(false);
    this.currentUserSubject.next(null);
  }

  

  saveToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  
  saveUserData(user: UserProfile) {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
  
  getUserData(): UserProfile | null {
    const userData = localStorage.getItem(this.userKey);
    return userData ? JSON.parse(userData) : null;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      console.warn('No hay token disponible para autenticación');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
    
    console.log('Token disponible:', token ? 'Sí' : 'No');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  logout(): Observable<any> {
    // Limpiar almacenamiento local antes de la petición
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    
    // Actualizar estado de autenticación
    this.authState.next(false);
    this.currentUserSubject.next(null);
    
    // Redirigir a login
    this.router.navigate(['/auth/login']);
    
    // La petición HTTP es opcional ya que los tokens JWT no se pueden invalidar en el servidor
    // a menos que implementes un sistema de blacklisting
    return this.http.post(`${this.api}/logout`, {}).pipe(
      // En caso de error, asumimos que el logout es exitoso de todas formas
      // ya que hemos limpiado localStorage
      tap({
        error: () => {
          console.log('Error en logout HTTP, pero los datos locales fueron limpiados');
          return true;
        }
      })
    );
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }
  
  // Verificar si el token ha caducado
  isTokenExpired(): boolean {
    const expiryString = localStorage.getItem(this.tokenExpiryKey);
    if (!expiryString) {
      // Si no tenemos fecha de expiración, verificamos directamente del token
      const token = this.getToken();
      if (!token) return true;
      
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        
        const payload = JSON.parse(atob(parts[1]));
        const now = Math.floor(Date.now() / 1000);
        
        return payload.exp && payload.exp < now;
      } catch (error) {
        console.error('Error verificando expiración del token:', error);
        return true;
      }
    }
    
    const expiry = parseInt(expiryString, 10);
    const now = Math.floor(Date.now() / 1000);
    return expiry < now;
  }
  getCurrentUserId(): string | null {
    const userData = this.getUserData();
    return userData ? userData._id : null;
  }
  
  // Actualizar perfil de usuario
  updateProfile(data: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<{message: string, user: UserProfile}>(
      `${this.api}/profile`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(res => res.user),
      tap(user => {
        this.saveUserData({...this.getUserData(), ...user});
        this.currentUserSubject.next({...this.getUserData(), ...user});
      })
    );
  }
}