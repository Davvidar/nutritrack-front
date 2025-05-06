// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment.prod';

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
  // …otros campos…
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

  constructor(private http: HttpClient) {}

  login(data: { correo: string; password: string }): Observable<{ token: string; user: any }> {
    return this.http.post<{ token: string; user: any }>(
      `${this.api}/login`,
      data
    ).pipe(
      tap(res => this.saveToken(res.token))
    );
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.api}/register`, data);
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(
      `${this.api}/profile`,
      { headers: this.getAuthHeaders() }
    );
  }

  saveToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
  logout(): Observable<any> {
    return this.http.post(`${this.api}/logout`, {}, { headers: this.getAuthHeaders() })
      .pipe(tap(() => localStorage.removeItem(this.tokenKey)));
  }
}
