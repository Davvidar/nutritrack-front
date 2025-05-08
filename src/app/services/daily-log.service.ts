// src/app/services/daily-log.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { throwError } from 'rxjs';
import { ProductService, Product } from './product.service'; // Importar ProductService y Product
import { environment } from 'src/environments/environment.prod';

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
  fecha: string | Date ; // ISO string
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
    private productService: ProductService // Inyectar ProductService
  ) {}
  
  /**
   * Obtiene el DailyLog completo para la fecha indicada.
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
              // dailyLog, // Puedes incluir el dailyLog original si lo necesitas en la UI
              comidas: resolvedComidas // Este objeto contiene los MealItem[] con detalles completos
            };
          })
        );
      })
    );
  }

  private transformMealItems(itemDTOs: MealItemDTO[]): Observable<MealItem[]> {
    if (!itemDTOs || itemDTOs.length === 0) {
      return of([]);
    }
    
    const itemObservables: Observable<MealItem>[] = itemDTOs.map(dto => {
      if (dto.productId) {
        return this.productService.getById(dto.productId).pipe(
          map((product: Product | null) => { // ProductService podría devolver null si no se encuentra
            if (!product) {
              return {
                name: `Producto ID ${dto.productId} no encontrado`,
                calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0,
                cantidad: dto.cantidad, productId: dto.productId
              };
            }
            const factor = dto.cantidad / 100; // Los nutrientes del producto son por 100g
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
        // TODO: Implementar lógica para RecipeService similar a ProductService
        return of({ name: 'Receta pendiente', calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, cantidad: dto.cantidad, recipeId: dto.recipeId });
      }
      // Fallback si no hay ni productId ni recipeId
      return of({ name: 'Item inválido', calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, cantidad: dto.cantidad });
    });
    
    return forkJoin(itemObservables);
  }
  
  getByDate(fecha: Date): Observable<DailyLog> {
    const params = new HttpParams().set('fecha', fecha.toISOString());
    
    return this.http.get<DailyLog>(
      `${this.API}/por-fecha`,
      { headers: this.auth.getAuthHeaders(), params }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error obteniendo DailyLog:', error);
        // Devolver un objeto vacío en caso de error (ej. 404 Not Found)
        // Es importante incluir el userId si se va a usar este objeto para crear uno nuevo.
        const currentUserId = this.auth.getCurrentUserId(); // Asumiendo que este método existe
        const emptyDailyLog: DailyLog = {
          userId: currentUserId || undefined, // Añadir userId si está disponible
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
   * Obtiene únicamente el resumen de consumido vs objetivo (calorías + macros).
   */
  getSummary(fecha: Date): Observable<SummaryResponse> {
    const params = new HttpParams().set('fecha', fecha.toISOString());
    
    return this.http.get<SummaryResponse>(
      `${this.API}/resumen`,
      { headers: this.auth.getAuthHeaders(), params }
    ).pipe(
      catchError(error => {
        console.error('Error obteniendo resumen:', error);
        // Devolver un objeto vacío en caso de error
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
    const currentUserId = this.auth.getCurrentUserId(); // Asumiendo que este método existe
    if (!currentUserId) {
      console.error('User ID no disponible. No se puede guardar el DailyLog.');
      return throwError(() => new Error('Usuario no autenticado o ID no disponible.'));
    }

    // Clonar el objeto para no modificar el original
    const logToSave: Partial<DailyLog> = { ...log };
    
    if (!logToSave.userId) logToSave.userId = currentUserId;
  
    // Aseguramos que la fecha esté en formato ISO
    if (logToSave.fecha && typeof logToSave.fecha === 'object') {
      logToSave.fecha = (logToSave.fecha as Date).toISOString();
    }

    // Si pesoDelDia es null, y el validador del backend es .optional().isFloat({ gt: 0 }),
    // es mejor no enviar el campo para que .optional() aplique.
    // El error del backend indica explícitamente "value: null" para pesoDelDia.
    if (logToSave.hasOwnProperty('pesoDelDia') && logToSave.pesoDelDia === null) {
      delete logToSave.pesoDelDia;
    }
  
    // Aseguramos que todas las comidas existan como arrays vacíos si no están definidas
    if (logToSave.comidas) {
      const comidas = logToSave.comidas as any;
      if (!comidas.desayuno) comidas.desayuno = [];
      if (!comidas.almuerzo) comidas.almuerzo = [];
      if (!comidas.comida) comidas.comida = [];
      if (!comidas.merienda) comidas.merienda = [];
      if (!comidas.cena) comidas.cena = [];
      if (!comidas.recena) comidas.recena = [];
    }
  
    console.log('Guardando registro diario:', JSON.stringify(logToSave));
  
    if (logToSave._id) {
      return this.http.put<DailyLog>(
        `${this.API}/${logToSave._id}`,
        logToSave,
        { headers: this.auth.getAuthHeaders() }
      );
    }
    return this.http.post<DailyLog>(
      this.API,
      logToSave,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  /**
   * Actualiza solo el peso del día
   */
  updateWeight(date: Date, peso: number): Observable<DailyLog> {
    return this.getByDate(date).pipe(
      switchMap(dailyLog => { // dailyLog aquí ya debería tener userId si getByDate lo maneja
        const currentUserId = this.auth.getCurrentUserId();
        if (!dailyLog.userId && currentUserId) {
          dailyLog.userId = currentUserId; // Asegurar userId si no vino de getByDate
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
        // Crear un nuevo registro sólo con el peso
        const newLog: Partial<DailyLog> = {
          fecha: date.toISOString(),
          pesoDelDia: peso,
          comidas: {
            desayuno: [],
            almuerzo: [],
            comida: [],
            merienda: [],
            cena: [],
            recena: []
          },
          userId: currentUserId // Asegurar userId al crear nuevo
        };
        return this.save(newLog);
      })
    );
  }
  
  /**
   * Obtiene el historial de pesos
   * Este método asume que existe un endpoint para historial de pesos
   * Si no existe, debería implementarse en el backend
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
}