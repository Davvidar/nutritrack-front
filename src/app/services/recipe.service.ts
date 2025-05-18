// src/app/services/recipe.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment.prod';
import { AuthService } from './auth.service';

export interface Ingredient {
  productId: string | any;
  cantidad: number;
}

export interface Recipe {
  _id: string;
  nombre: string;
  ingredientes: Ingredient[];
  pesoFinal: number;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  azucares?: number;
  grasasSaturadas?: number;
  fibra?: number;
  userId?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private baseUrl = environment.API_URL + '/recipes';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /** Obtiene todas las recetas (globales + propias) */
  getAll(favoritos: boolean = false): Observable<Recipe[]> {
    let params = new HttpParams();
    if (favoritos) {
      params = params.set('favoritos', 'true');
    }

    return this.http.get<Recipe[]>(this.baseUrl, {
      headers: this.authService.getAuthHeaders(),
      params
    });
  }

  /** Obtiene receta por ID */
  getById(id: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.baseUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  /** Crea una nueva receta */
  create(recipe: Partial<Recipe>): Observable<Recipe> {
    return this.http.post<{ recipe: Recipe }>(this.baseUrl, recipe, {
      headers: this.authService.getAuthHeaders()
    }).pipe(map(res => res.recipe));
  }

  /** Actualiza una receta existente */
  update(id: string, data: Partial<Recipe>): Observable<Recipe> {
    return this.http.put<{ recipe: Recipe }>(`${this.baseUrl}/${id}`, data, {
      headers: this.authService.getAuthHeaders()
    }).pipe(map(res => res.recipe));
  }

  /** Elimina una receta */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`, {
      headers: this.authService.getAuthHeaders()
    });
  }

  /** 
   * Busca recetas por nombre o ingredientes 
   * (método preparado para cuando el backend lo implemente)
   */
  search(query: string = '', favoritos: boolean = false): Observable<Recipe[]> {
    let params = new HttpParams();
    if (query) {
      params = params.set('query', query);
    }
    if (favoritos) {
      params = params.set('favoritos', 'true');
    }

    return this.http.get<Recipe[]>(`${this.baseUrl}/search`, {
      headers: this.authService.getAuthHeaders(),
      params
    });
  }
}