// src/app/services/product.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment.prod';

export interface Product {
  _id: string;
  nombre: string;
  marca?: string;
  codigoBarras?: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  porcion?: number;
  userId?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private baseUrl = environment.API_URL + +'/products'; // Ajusta tu URL
  currentUserId: string | null = null;

  constructor(private http: HttpClient) {
    // Opcional: extraer userId de token JWT si lo guardas en localStorage
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.currentUserId = payload.userId;
    }
  }

  /** Obtiene todos los productos (globales + propios) */
  getAll(mis: boolean = false, favoritos: boolean = false, query: string = ''): Observable<Product[]> {
    let params = new HttpParams();
    if (query) params = params.set('query', query);
    if (mis) params = params.set('mis', 'true');
    if (favoritos) params = params.set('favoritos', 'true');
    return this.http.get<Product[]>(`${this.baseUrl}/search`, { params });
  }

  /** Obtiene producto por ID */
  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  /** Crea un nuevo producto */
  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<{ product: Product }>(this.baseUrl, product)
      .pipe(map(res => res.product));
  }

  /** Actualiza un producto */
  update(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.put<{ product: Product }>(`${this.baseUrl}/${id}`, data)
      .pipe(map(res => res.product));
  }

  /** Elimina un producto */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Busca producto por código de barras */
  getByBarcode(barcode: string): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/barcode/${barcode}`);
  }

  /** Productos recientes y restantes */
  getRecientes(): Observable<{ recientes: Product[]; restantes: Product[] }> {
    return this.http.get<{ recientes: Product[]; restantes: Product[] }>(`${this.baseUrl}/recientes`);
  }
}
