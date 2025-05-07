// src/app/services/meal.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MealItem } from '../components/meal-accordion/meal-accordion.component';
import { environment } from '../../environments/environment';

export interface Meal {
  _id?: string;
  userId?: string;
  fecha: string;  // formato YYYY-MM-DD
  tipo: string;   // 'desayuno', 'almuerzo', 'cena', 'snacks'
  items: MealItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MealService {
  private apiUrl = `${environment.API_URL}/meals`;
  
  constructor(private http: HttpClient) {}
  
  /**
   * Obtiene las comidas para una fecha específica
   */
  getMealsByDate(date: string): Observable<Meal[]> {
    return this.http.get<Meal[]>(`${this.apiUrl}?date=${date}`).pipe(
      catchError(error => {
        console.error('Error al obtener comidas:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Guarda una comida
   */
  saveMeal(meal: Meal): Observable<Meal> {
    if (meal._id) {
      // Actualizar existente
      return this.http.put<Meal>(`${this.apiUrl}/${meal._id}`, meal);
    } else {
      // Crear nueva
      return this.http.post<Meal>(this.apiUrl, meal);
    }
  }
  
  /**
   * Elimina un ítem de una comida
   */
  removeItemFromMeal(mealId: string, itemIndex: number): Observable<Meal> {
    return this.http.delete<Meal>(`${this.apiUrl}/${mealId}/items/${itemIndex}`);
  }
  
  /**
   * Actualiza la cantidad de un ítem específico
   */
  updateItemQuantity(mealId: string, itemIndex: number, quantity: number): Observable<Meal> {
    return this.http.patch<Meal>(`${this.apiUrl}/${mealId}/items/${itemIndex}`, { cantidad: quantity });
  }
}