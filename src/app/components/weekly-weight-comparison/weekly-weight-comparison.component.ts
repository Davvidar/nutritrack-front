// src/app/components/weekly-weight-comparison/weekly-weight-comparison.component.ts - Actualizado
import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { DailyLogService } from 'src/app/services/daily-log.service';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { Subscription } from 'rxjs';

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

  // Nueva suscripción para cambios de peso
  private weightUpdateSubscription?: Subscription;

  constructor(
    private dailyLogService: DailyLogService,
    private nutritionUpdateService: NutritionUpdateService // Agregado
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

  // Nuevo: Configurar suscripción a actualizaciones de peso
  private setupWeightUpdateSubscription(): void {
    console.log('WeeklyWeightComparison: *** CONFIGURANDO SUSCRIPCIÓN A ACTUALIZACIONES DE PESO ***');
    
    this.weightUpdateSubscription = this.nutritionUpdateService.weightUpdated$
      .subscribe({
        next: (dateStr: string) => {
          console.log('WeeklyWeightComparison: *** RECIBIDA NOTIFICACIÓN DE PESO ***', dateStr);
          
          try {
            const updatedDate = new Date(dateStr);
            const today = new Date();

            console.log('WeeklyWeightComparison: Comparando fechas:', {
              hoy: today.toDateString(),
              actualizada: updatedDate.toDateString(),
              sonIguales: this.datesAreOnSameDay(today, updatedDate)
            });

            // Si el peso actualizado es de hoy O está dentro de las semanas que estamos monitoreando, recargar
            if (this.shouldReloadForDate(updatedDate)) {
              console.log('WeeklyWeightComparison: *** FECHA RELEVANTE - RECARGANDO DATOS ***');
              this.loadWeeklyComparison();
            } else {
              console.log('WeeklyWeightComparison: Fecha no relevante, no recargando');
            }
          } catch (err) {
            console.error('WeeklyWeightComparison: Error al procesar notificación de peso:', err);
          }
        },
        error: (err) => {
          console.error('WeeklyWeightComparison: Error en suscripción de peso:', err);
        }
      });
  }

  // Determinar si la fecha actualizada afecta nuestros datos
  private shouldReloadForDate(updatedDate: Date): boolean {
    const today = new Date();
    
    // Si es hoy, definitivamente recargar
    if (this.datesAreOnSameDay(updatedDate, today)) {
      return true;
    }

    // Calcular el rango de fechas que nos interesan (últimas 2 semanas)
    const currentWeekStart = this.getWeekStart(today);
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    // Si la fecha está dentro de las últimas 2 semanas, recargar
    return updatedDate >= previousWeekStart && updatedDate <= today;
  }

  // Obtener el inicio de la semana (lunes)
  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    const dayOfWeek = weekStart.getDay();
    const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    weekStart.setDate(weekStart.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  private datesAreOnSameDay(first: Date, second: Date): boolean {
    if (!first || !second) return false;
    return first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate();
  }

  loadWeeklyComparison() {
    console.log('WeeklyWeightComparison: *** CARGANDO COMPARACIÓN SEMANAL ***');
    this.loading = true;
    
    this.dailyLogService.getWeeklyWeightComparison().subscribe({
      next: (data) => {
        console.log('WeeklyWeightComparison: *** DATOS RECIBIDOS ***', data);
        
        this.previousWeekAverage = data.previousWeekAverage;
        this.currentWeekAverage = data.currentWeekAverage;
        this.todayWeight = data.todayWeight;
        this.previousWeekDays = data.previousWeekDays;
        this.currentWeekDays = data.currentWeekDays;
        this.loading = false;
        
        console.log('WeeklyWeightComparison: *** DATOS ACTUALIZADOS ***', {
          previousWeek: this.previousWeekAverage,
          currentWeek: this.currentWeekAverage,
          today: this.todayWeight
        });
      },
      error: (err) => {
        console.error('WeeklyWeightComparison: Error cargando comparación semanal:', err);
        this.loading = false;
      }
    });
  }

  // Calcular diferencia entre semana actual y anterior
  getWeeklyChange(): number | null {
    if (this.currentWeekAverage !== null && this.previousWeekAverage !== null) {
      return this.currentWeekAverage - this.previousWeekAverage;
    }
    return null;
  }

  // Calcular diferencia entre peso de hoy y media semanal actual
  getTodayVsWeekChange(): number | null {
    if (this.todayWeight !== null && this.currentWeekAverage !== null) {
      return this.todayWeight - this.currentWeekAverage;
    }
    return null;
  }

  // Formatear peso con 1 decimal
  formatWeight(weight: number | null): string {
    return weight !== null ? weight.toFixed(1) : '--';
  }

  // Formatear cambio con signo y 1 decimal
  formatChange(change: number | null): string {
    if (change === null) return '';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}`;
  }

  // Método público para forzar actualización (útil para debugging)
  public forceRefresh(): void {
    console.log('WeeklyWeightComparison: *** ACTUALIZACIÓN FORZADA ***');
    this.loadWeeklyComparison();
  }
}