// src/app/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment.prod';
import { AuthService } from './auth.service';

export interface Product {
  _id: string;
  nombre: string;
  marca?: string;
  codigoBarras?: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  azucares?: number;
  grasas: number;
  grasasSaturadas?: number;
  fibra?: number;
  porcion?: number;
  userId?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private baseUrl = environment.API_URL + '/products'; // URL corregida
  currentUserId: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Extraer userId de token JWT
    const token = this.authService.getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.currentUserId = payload.id || payload.userId;
      } catch (e) {
        console.error('Error decodificando el token:', e);
      }
    }
  }

  /** Obtiene todos los productos (globales + propios) */
  getAll(mis: boolean = false, favoritos: boolean = false, query: string = ''): Observable<Product[]> {
    let params = new HttpParams();
    if (query) params = params.set('query', query);
    if (mis) params = params.set('mis', 'true');
    if (favoritos) params = params.set('favoritos', 'true');
    
    return this.http.get<Product[]>(`${this.baseUrl}`, { 
      headers: this.authService.getAuthHeaders(),
      params 
    });
  }

  /** Obtiene producto por ID */
  getById(id: string): Observable<Product> {
    return this.http.get<Product>(
      `${this.baseUrl}/${id}`, 
      { headers: this.authService.getAuthHeaders() }
    );
  }

  /** Crea un nuevo producto */
  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<{ product: Product }>(
      this.baseUrl, 
      product, 
      { headers: this.authService.getAuthHeaders() }
    ).pipe(map(res => res.product));
  }

  /** Actualiza un producto */
  update(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.put<{ product: Product }>(
      `${this.baseUrl}/${id}`, 
      data, 
      { headers: this.authService.getAuthHeaders() }
    ).pipe(map(res => res.product));
  }

  /** Elimina un producto */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`, 
      { headers: this.authService.getAuthHeaders() }
    );
  }

  /** Busca producto por código de barras */
  getByBarcode(barcode: string): Observable<Product> {
    return this.http.get<Product>(
      `${this.baseUrl}/barcode/${barcode}`, 
      { headers: this.authService.getAuthHeaders() }
    );
  }

  /** Productos recientes y restantes */
  getRecientes(): Observable<{ recientes: Product[]; restantes: Product[] }> {
    return this.http.get<{ recientes: Product[]; restantes: Product[] }>(
      `${this.baseUrl}/recientes`, 
      { headers: this.authService.getAuthHeaders() }
    );
  }

  /** Buscar productos */
  searchProducts(query: string = '', mis: boolean = false, favoritos: boolean = false): Observable<Product[]> {
    let params = new HttpParams();
    if (query) params = params.set('query', query);
    if (mis) params = params.set('mis', 'true');
    if (favoritos) params = params.set('favoritos', 'true');
    
    return this.http.get<Product[]>(`${this.baseUrl}/search`, { 
      headers: this.authService.getAuthHeaders(),
      params 
    });
  }
}