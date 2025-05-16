// src/app/services/daily-log.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin, throwError } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProductService, Product } from './product.service';
import { NutritionUpdateService } from './nutrition-update.service';
import { environment } from 'src/environments/environment.prod';
import { Recipe, RecipeService} from './recipe.service';

export interface MealItemDTO {
  productId?: string;
  recipeId?: string;
  cantidad: number; // en gramos
}

export interface MealItem {
  name: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  cantidad: number;
  productId?: string;
  recipeId?: string;
}

export interface DailyLog {
  _id?: string;
  userId?: string;
  fecha: string | Date; // ISO string o Date
  pesoDelDia?: number | null;
  comidas: {
    desayuno: MealItemDTO[];
    almuerzo: MealItemDTO[];
    comida: MealItemDTO[];
    merienda: MealItemDTO[];
    cena: MealItemDTO[];
    recena: MealItemDTO[];
  };
}

export interface SummaryResponse {
  message?: string;
  consumido: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };
  objetivo: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };
  diferencia: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };
}

@Injectable({ providedIn: 'root' })
export class DailyLogService {
  private readonly API = environment.API_URL + '/dailylogs';
  
  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private productService: ProductService,
    private recipeService: RecipeService,
    private nutritionUpdateService: NutritionUpdateService
  ) {}
  
  /**
   * Obtiene el DailyLog completo para la fecha indicada con detalles de productos/recetas.
   * Si no existe, la API debería devolver un objeto con todas las comidas vacías.
   */
  getDailyLogWithDetails(date: Date): Observable<any> {
    return this.getByDate(date).pipe(
      switchMap(dailyLog => {
        // Para cada comida, obtenemos un Observable<MealItem[]>
        const desayuno$ = this.transformMealItems(dailyLog.comidas.desayuno || []);
        const almuerzo$ = this.transformMealItems(dailyLog.comidas.almuerzo || []);
        const comida$ = this.transformMealItems(dailyLog.comidas.comida || []);
        const merienda$ = this.transformMealItems(dailyLog.comidas.merienda || []);
        const cena$ = this.transformMealItems(dailyLog.comidas.cena || []);
        const recena$ = this.transformMealItems(dailyLog.comidas.recena || []);
        
        return forkJoin({
          desayuno: desayuno$,
          almuerzo: almuerzo$,
          comida: comida$,
          merienda: merienda$,
          cena: cena$,
          recena: recena$
        }).pipe(
          map(resolvedComidas => {
            return {
              comidas: resolvedComidas // Este objeto contiene los MealItem[] con detalles completos
            };
          })
        );
      })
    );
  }

  /**
   * Transforma los DTO de los items de comida en objetos completos con información nutricional.
   * @param itemDTOs Array de DTOs de items de comida con IDs de productos/recetas
   * @returns Observable que emite array de MealItems con información nutricional
   */
  private transformMealItems(itemDTOs: MealItemDTO[]): Observable<MealItem[]> {
    if (!itemDTOs || itemDTOs.length === 0) {
      return of([]);
    }
    
    const itemObservables: Observable<MealItem>[] = itemDTOs.map(dto => {
      if (dto.productId) {
        return this.productService.getById(dto.productId).pipe(
          map((product: Product) => {
            const factor = dto.cantidad / 100;
            return {
              name: product.nombre,
              calorias: (product.calorias || 0) * factor,
              proteinas: (product.proteinas || 0) * factor,
              carbohidratos: (product.carbohidratos || 0) * factor,
              grasas: (product.grasas || 0) * factor,
              cantidad: dto.cantidad,
              productId: dto.productId
            };
          }),
          catchError(err => {
            console.error(`Error obteniendo producto ${dto.productId}:`, err);
            return of({
              name: `Error cargando ID ${dto.productId}`,
              calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0,
              cantidad: dto.cantidad, productId: dto.productId
            });
          })
        );
      } else if (dto.recipeId) {
        // Manejar recetas
        return this.recipeService.getById(dto.recipeId).pipe(
          map((recipe: Recipe) => {
            // Calcular la proporción basada en el peso final
            const factor = dto.cantidad / recipe.pesoFinal;
            return {
              name: recipe.nombre,
              calorias: (recipe.calorias || 0) * factor,
              proteinas: (recipe.proteinas || 0) * factor,
              carbohidratos: (recipe.carbohidratos || 0) * factor,
              grasas: (recipe.grasas || 0) * factor,
              cantidad: dto.cantidad,
              recipeId: dto.recipeId
            };
          }),
          catchError(err => {
            console.error(`Error obteniendo receta ${dto.recipeId}:`, err);
            return of({
              name: `Error cargando receta ID ${dto.recipeId}`,
              calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0,
              cantidad: dto.cantidad, recipeId: dto.recipeId
            });
          })
        );
      }
      // Fallback si no hay ni productId ni recipeId
      return of({ name: 'Item inválido', calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, cantidad: dto.cantidad });
    });
    
    return forkJoin(itemObservables);
  }
  
  /**
   * Obtiene el DailyLog para una fecha específica.
   * @param fecha Fecha para obtener el registro
   * @returns Observable que emite el DailyLog para esa fecha
   */
  getByDate(fecha: Date): Observable<DailyLog> {
    // Formatear fecha como YYYY-MM-DD
    const fechaFormatted = this.formatDateForBackend(fecha);
    
    const params = new HttpParams().set('fecha', fechaFormatted);
    
    console.log('DailyLogService - Solicitando log para fecha:', fechaFormatted);
    
    return this.http.get<DailyLog>(
      `${this.API}/por-fecha`,
      { headers: this.auth.getAuthHeaders(), params }
    ).pipe(
      tap(response => {
        console.log('DailyLogService - Respuesta del log diario:', response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error obteniendo DailyLog:', error);
        // Devolver un objeto vacío en caso de error (ej. 404 Not Found)
        const currentUserId = this.auth.getCurrentUserId();
        const emptyDailyLog: DailyLog = {
          userId: currentUserId || undefined,
          fecha: fecha.toISOString(),
          pesoDelDia: null,
          comidas: {
            desayuno: [],
            almuerzo: [],
            comida: [],
            merienda: [],
            cena: [],
            recena: []
          }
        };
        return of(emptyDailyLog);
      })
    );
  }

  /**
   * Obtiene el resumen nutricional para una fecha específica.
   * @param fecha Fecha para obtener el resumen
   * @returns Observable que emite el resumen nutricional
   */
  getSummary(fecha: Date): Observable<SummaryResponse> {
    // Formatear fecha como YYYY-MM-DD
    const fechaFormatted = this.formatDateForBackend(fecha);
    
    const params = new HttpParams().set('fecha', fechaFormatted);
    
    console.log('DailyLogService - Solicitando resumen para fecha:', fechaFormatted);
    
    return this.http.get<SummaryResponse>(
      `${this.API}/resumen`,
      { headers: this.auth.getAuthHeaders(), params }
    ).pipe(
      tap(response => {
        console.log('DailyLogService - Respuesta de resumen nutricional:', response);
      }),
      map(response => {
        // Asegurarse de que siempre devuelva un objeto completo incluso si está vacío
        return {
          consumido: response?.consumido || { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
          objetivo: response?.objetivo || { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
          diferencia: response?.diferencia || { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
        };
      }),
      catchError(error => {
        console.error('Error obteniendo resumen:', error);
        // Devolver un objeto vacío pero completo en caso de error
        const emptySummary: SummaryResponse = {
          consumido: { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
          objetivo: { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
          diferencia: { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
        };
        return of(emptySummary);
      })
    );
  }

  /**
   * Crea o actualiza un registro diario.
   * - Si log._id está presente, hará PUT /api/dailyLogs/:id
   * - Si no, hará POST /api/dailyLogs
   */
  save(log: Partial<DailyLog>): Observable<DailyLog> {
    const currentUserId = this.auth.getCurrentUserId();
    if (!currentUserId) {
      console.error('User ID no disponible. No se puede guardar el DailyLog.');
      return throwError(() => new Error('Usuario no autenticado o ID no disponible.'));
    }

    // Clonar el objeto para no modificar el original
    const logToSave: Partial<DailyLog> = { ...log };
    
    if (!logToSave.userId) logToSave.userId = currentUserId;
    
    // Formatear la fecha como YYYY-MM-DD si existe
    if (logToSave.fecha) {
      // Convertir a objeto Date si es string
      const fechaObj = typeof logToSave.fecha === 'string' 
        ? new Date(logToSave.fecha) 
        : logToSave.fecha as Date;
      
      // Convertir a formato YYYY-MM-DD
      logToSave.fecha = this.formatDateForBackend(fechaObj);
      
      console.log('DailyLogService - Fecha formateada para guardar:', logToSave.fecha);
    }
  
    // Si pesoDelDia es null y el validador del backend es .optional().isFloat({ gt: 0 }),
    // es mejor no enviar el campo
    if (logToSave.hasOwnProperty('pesoDelDia') && logToSave.pesoDelDia === null) {
      delete logToSave.pesoDelDia;
    }
  
    // Asegurar que todas las comidas existan como arrays vacíos
    if (logToSave.comidas) {
      const comidas = logToSave.comidas as any;
      if (!comidas.desayuno) comidas.desayuno = [];
      if (!comidas.almuerzo) comidas.almuerzo = [];
      if (!comidas.comida) comidas.comida = [];
      if (!comidas.merienda) comidas.merienda = [];
      if (!comidas.cena) comidas.cena = [];
      if (!comidas.recena) comidas.recena = [];
    }
  
    console.log('DailyLogService - Guardando registro diario:', JSON.stringify(logToSave));
  
    // Variable para almacenar la fecha original para notificaciones
    const originalDateObj = typeof log.fecha === 'string' 
      ? new Date(log.fecha) 
      : log.fecha as Date;

    if (logToSave._id) {
      return this.http.put<DailyLog>(
        `${this.API}/${logToSave._id}`,
        logToSave,
        { headers: this.auth.getAuthHeaders() }
      ).pipe(
        tap(() => {
          // Notificar actualización
          this.nutritionUpdateService.notifyNutritionUpdated(originalDateObj);
        })
      );
    }
    
    return this.http.post<DailyLog>(
      this.API,
      logToSave,
      { headers: this.auth.getAuthHeaders() }
    ).pipe(
      tap(() => {
        // Notificar actualización
        this.nutritionUpdateService.notifyNutritionUpdated(originalDateObj);
      })
    );
  }

  /**
   * Actualiza solo el peso del día para una fecha específica.
   * @param date Fecha para la que actualizar el peso
   * @param peso Nuevo valor de peso
   * @returns Observable que emite el DailyLog actualizado
   */
  updateWeight(date: Date, peso: number): Observable<DailyLog> {
    return this.getByDate(date).pipe(
      switchMap(dailyLog => {
        const currentUserId = this.auth.getCurrentUserId();
        if (!dailyLog.userId && currentUserId) {
          dailyLog.userId = currentUserId;
        } else if (!dailyLog.userId && !currentUserId) {
          return throwError(() => new Error('User ID no disponible para actualizar peso.'));
        }
        
        const updatedLog: Partial<DailyLog> = { ...dailyLog, pesoDelDia: peso };
        return this.save(updatedLog);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error actualizando peso:', error);
        const currentUserId = this.auth.getCurrentUserId();
        if (!currentUserId) return throwError(() => new Error('User ID no disponible para crear nuevo log de peso.'));
        
        // Formatear fecha como YYYY-MM-DD
        const fechaFormatted = this.formatDateForBackend(date);
        
        // Crear un nuevo registro sólo con el peso
        const newLog: Partial<DailyLog> = {
          fecha: fechaFormatted,
          pesoDelDia: peso,
          comidas: {
            desayuno: [],
            almuerzo: [],
            comida: [],
            merienda: [],
            cena: [],
            recena: []
          },
          userId: currentUserId
        };
        return this.save(newLog);
      })
    );
  }
  
  /**
   * Obtiene el historial de pesos.
   * @returns Observable que emite un array de pesos con sus fechas
   */
  getWeightHistory(): Observable<{fecha: string, peso: number}[]> {
    return this.http.get<{fecha: string, peso: number}[]>(
      `${environment.API_URL}/weight/historial`,
      { headers: this.auth.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error obteniendo historial de peso:', error);
        return of([]);
      })
    );
  }

  /**
   * Método auxiliar para formatear fechas como YYYY-MM-DD.
   * @param date Fecha a formatear
   * @returns String en formato YYYY-MM-DD
   */
  private formatDateForBackend(date: Date): string {
    // Asegurar que es Date
    const d = new Date(date);
    
    // Formatear como YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  getWeightWeeklyAverage(): Observable<{media: number | null, diasConDatos: number}> {
  return this.http.get<{media: number | null, diasConDatos: number}>(
    `${environment.API_URL}/weight/media-semanal`,
    { headers: this.auth.getAuthHeaders() }
  ).pipe(
    catchError(error => {
      console.error('Error obteniendo media semanal de peso:', error);
      return of({ media: null, diasConDatos: 0 });
    })
  );
}
  removeItemFromMeal(
    date: Date,
    mealType: string,
    itemId: string,
    isRecipe: boolean = false
  ): Observable<DailyLog> {
    return this.getByDate(date).pipe(
      switchMap(dailyLog => {
        // Obtener la lista de items para el tipo de comida
        const mealKey = mealType.toLowerCase() as keyof typeof dailyLog.comidas;
        const items = dailyLog.comidas[mealKey] || [];
        
        // Encontrar y eliminar el item
        const itemIndex = items.findIndex(item => 
          isRecipe ? item.recipeId === itemId : item.productId === itemId
        );
        
        if (itemIndex === -1) {
          return throwError(() => new Error(`Item ${itemId} no encontrado en ${mealType}`));
        }
        
        // Eliminar el item
        items.splice(itemIndex, 1);
        
        // Guardar el dailyLog actualizado
        return this.save(dailyLog);
      }),
      tap(() => {
        // Notificar que se ha actualizado la información nutricional
        this.nutritionUpdateService.notifyNutritionUpdated(date);
      })
    );
  }
}