// src/app/components/weekly-weight-comparison/weekly-weight-comparison.component.ts - Con utilidades de fecha
import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { DailyLogService } from 'src/app/services/daily-log.service';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { Subscription } from 'rxjs';

// Utilidades de fecha integradas en el componente
class DateUtils {
  static toLocalDate(date: Date): Date {
    const localDate = new Date(date);
    localDate.setHours(0, 0, 0, 0);
    return localDate;
  }

  static isSameDay(date1: Date, date2: Date): boolean {
    if (!date1 || !date2) return false;
    const d1 = DateUtils.toLocalDate(date1);
    const d2 = DateUtils.toLocalDate(date2);
    return d1.getTime() === d2.getTime();
  }

  static getDateNDaysAgo(date: Date, days: number): Date {
    const result = DateUtils.toLocalDate(date);
    result.setDate(result.getDate() - days);
    return result;
  }

  static isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    const targetDate = DateUtils.toLocalDate(date);
    const start = DateUtils.toLocalDate(startDate);
    const end = DateUtils.toLocalDate(endDate);
    return targetDate >= start && targetDate <= end;
  }

  static fromDateString(dateStr: string): Date {
    const cleanStr = dateStr.split('_')[0]; // Limpiar timestamp si existe
    // Crear fecha desde string YYYY-MM-DD o ISO
    if (cleanStr.includes('-') && cleanStr.length === 10) {
      const [year, month, day] = cleanStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return DateUtils.toLocalDate(new Date(cleanStr));
  }
}

@Component({
  selector: 'app-weekly-weight-comparison',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './weekly-weight-comparison.component.html',
  styleUrls: ['./weekly-weight-comparison.component.scss']
})
export class WeeklyWeightComparisonComponent implements OnInit, OnDestroy {
  previousWeekAverage: number | null = null;
  currentWeekAverage: number | null = null;
  todayWeight: number | null = null;
  previousWeekDays: number = 0;
  currentWeekDays: number = 0;
  loading: boolean = false;

  private weightUpdateSubscription?: Subscription;

  constructor(
    private dailyLogService: DailyLogService,
    private nutritionUpdateService: NutritionUpdateService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    console.log('WeeklyWeightComparison: *** INICIALIZANDO COMPONENTE ***');
    this.loadWeeklyComparison();
    this.setupWeightUpdateSubscription();
  }

  ngOnDestroy() {
    console.log('WeeklyWeightComparison: *** DESTRUYENDO COMPONENTE ***');
    if (this.weightUpdateSubscription) {
      this.weightUpdateSubscription.unsubscribe();
    }
  }

  private setupWeightUpdateSubscription(): void {
    console.log('WeeklyWeightComparison: *** CONFIGURANDO SUSCRIPCIÓN A ACTUALIZACIONES DE PESO ***');
    
    this.weightUpdateSubscription = this.nutritionUpdateService.weightUpdated$
      .subscribe({
        next: (dateStr: string) => {
          console.log('WeeklyWeightComparison: *** RECIBIDA NOTIFICACIÓN DE PESO ***', dateStr);
          
          this.ngZone.run(() => {
            try {
              const updatedDate = DateUtils.fromDateString(dateStr);
              
              console.log('WeeklyWeightComparison: Fecha procesada:', {
                original: dateStr,
                fecha: updatedDate.toDateString(),
                fechaISO: updatedDate.toISOString()
              });

              if (this.shouldReloadForDate(updatedDate)) {
                console.log('WeeklyWeightComparison: *** FECHA RELEVANTE - RECARGANDO DATOS ***');
                this.loadWeeklyComparison();
              } else {
                console.log('WeeklyWeightComparison: Fecha no relevante para comparación semanal');
              }
            } catch (err) {
              console.error('WeeklyWeightComparison: Error al procesar notificación de peso:', err);
            }
          });
        },
        error: (err) => {
          console.error('WeeklyWeightComparison: Error en suscripción de peso:', err);
        }
      });
  }

  // CORREGIDO: Lógica de fechas más robusta usando utilidades
  private shouldReloadForDate(updatedDate: Date): boolean {
    const today = DateUtils.toLocalDate(new Date());
    const updatedLocalDate = DateUtils.toLocalDate(updatedDate);
    
    console.log('WeeklyWeightComparison: Verificando si debe recargar:', {
      fechaActualizada: updatedLocalDate.toDateString(),
      fechaHoy: today.toDateString(),
      esHoy: DateUtils.isSameDay(updatedLocalDate, today)
    });

    // Calcular el rango: desde 3 semanas atrás hasta HOY (sin incluir mañana)
    const threeWeeksAgo = DateUtils.getDateNDaysAgo(today, 21);
    
    console.log('WeeklyWeightComparison: Rango de fechas relevantes:', {
      desde: threeWeeksAgo.toDateString(),
      hasta: today.toDateString(),
      fechaActualizada: updatedLocalDate.toDateString()
    });

    // Verificar si está en el rango (desde 3 semanas atrás hasta hoy inclusive)
    const isInRange = DateUtils.isDateInRange(updatedLocalDate, threeWeeksAgo, today);
    
    console.log('WeeklyWeightComparison: ¿Debe recargar?', isInRange);
    return isInRange;
  }

  loadWeeklyComparison() {
    console.log('WeeklyWeightComparison: *** CARGANDO COMPARACIÓN SEMANAL ***');
    this.loading = true;
    this.cdr.detectChanges();
    
    this.dailyLogService.getWeeklyWeightComparison().subscribe({
      next: (data) => {
        console.log('WeeklyWeightComparison: *** DATOS RECIBIDOS ***', data);
        
        this.ngZone.run(() => {
          // Crear nuevas referencias para forzar detección de cambios
          this.previousWeekAverage = data.previousWeekAverage !== null ? Number(data.previousWeekAverage) : null;
          this.currentWeekAverage = data.currentWeekAverage !== null ? Number(data.currentWeekAverage) : null;
          this.todayWeight = data.todayWeight !== null ? Number(data.todayWeight) : null;
          this.previousWeekDays = Number(data.previousWeekDays || 0);
          this.currentWeekDays = Number(data.currentWeekDays || 0);
          this.loading = false;
          
          console.log('WeeklyWeightComparison: *** DATOS ACTUALIZADOS ***', {
            previousWeek: this.previousWeekAverage,
            currentWeek: this.currentWeekAverage,
            today: this.todayWeight,
            previousDays: this.previousWeekDays,
            currentDays: this.currentWeekDays
          });
          
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('WeeklyWeightComparison: Error cargando comparación semanal:', err);
        
        this.ngZone.run(() => {
          this.loading = false;
          this.previousWeekAverage = null;
          this.currentWeekAverage = null;
          this.todayWeight = null;
          this.previousWeekDays = 0;
          this.currentWeekDays = 0;
          this.cdr.detectChanges();
        });
      }
    });
  }

  getWeeklyChange(): number | null {
    if (this.currentWeekAverage !== null && this.previousWeekAverage !== null) {
      return Number((this.currentWeekAverage - this.previousWeekAverage).toFixed(1));
    }
    return null;
  }

  getTodayVsWeekChange(): number | null {
    if (this.todayWeight !== null && this.currentWeekAverage !== null) {
      return Number((this.todayWeight - this.currentWeekAverage).toFixed(1));
    }
    return null;
  }

  formatWeight(weight: number | null): string {
    return weight !== null ? weight.toFixed(1) : '--';
  }

  formatChange(change: number | null): string {
    if (change === null) return '';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}`;
  }

  public forceRefresh(): void {
    console.log('WeeklyWeightComparison: *** ACTUALIZACIÓN FORZADA ***');
    this.loadWeeklyComparison();
  }
}