// src/app/services/recipe.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment.prod';

export interface Ingredient {
  productId: string;
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
  private baseUrl = environment.API_URL +  +'/recipes'; // Ajusta tu URL

  constructor(private http: HttpClient) {}

  /** Obtiene todas las recetas (globales + propias) */
  getAll(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(this.baseUrl);
  }

  /** Obtiene receta por ID */
  getById(id: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.baseUrl}/${id}`);
  }

  /** Crea una nueva receta */
  create(recipe: Partial<Recipe>): Observable<Recipe> {
    return this.http.post<{ recipe: Recipe }>(this.baseUrl, recipe)
      .pipe(map(res => res.recipe));
  }

  /** Actualiza una receta existente */
  update(id: string, data: Partial<Recipe>): Observable<Recipe> {
    return this.http.put<{ recipe: Recipe }>(`${this.baseUrl}/${id}`, data)
      .pipe(map(res => res.recipe));
  }

  /** Elimina una receta */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
