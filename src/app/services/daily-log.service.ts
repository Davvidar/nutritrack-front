// src/app/services/daily-log.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment.prod';

export interface MealItemDTO {
  productId: string;
  cantidad: number; // en gramos
}
export interface MealItem {
  name: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  cantidad: number; // Added property
}
export interface DailyLog {
  _id: string;
  fecha: string; // ISO string
  pesoDelDia?: number;
  comidas: Record<
    'desayuno' | 'almuerzo' | 'comida' | 'merienda' | 'cena' | 'recena',
    MealItemDTO[]
  >;
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
  private readonly API = environment.API_URL + '/dailyLogs';

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private headers(): HttpHeaders {
    return this.auth.getAuthHeaders();
  }

  /**
   * Obtiene el DailyLog completo para la fecha indicada.
   * Si no existe, la API debería devolver un objeto con todas las comidas vacías.
   */
  getByDate(fecha: Date): Observable<DailyLog> {
    const params = new HttpParams().set('fecha', fecha.toISOString());
    return this.http.get<DailyLog>(
      `${this.API}/por-fecha`,
      { headers: this.headers(), params }
    );
  }

  /**
   * Obtiene únicamente el resumen de consumido vs objetivo (calorías + macros).
   */
  getSummary(fecha: Date): Observable<SummaryResponse> {
    const params = new HttpParams().set('fecha', fecha.toISOString());
    return this.http.get<SummaryResponse>(
      `${this.API}/resumen`,
      { headers: this.headers(), params }
    );
  }

  /**
   * Crea o actualiza un registro diario.
   * - Si log._id está presente, hará PUT /api/dailyLogs/:id
   * - Si no, hará POST /api/dailyLogs
   */
  save(log: Partial<DailyLog>): Observable<DailyLog> {
    if (log._id) {
      return this.http.put<DailyLog>(
        `${this.API}/${log._id}`,
        log,
        { headers: this.headers() }
      );
    }
    return this.http.post<DailyLog>(
      this.API,
      log,
      { headers: this.headers() }
    );
  }
}
