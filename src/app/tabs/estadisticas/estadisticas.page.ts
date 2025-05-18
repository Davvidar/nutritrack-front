// src/app/tabs/estadisticas/estadisticas.page.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { DailyLogService } from '../../services/daily-log.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Importar componentes necesarios
import { WeightChartComponent } from '../../components/weight-chart/weight-chart.component';
import { NutritionStatsCardComponent } from '../../components/nutrition-stats-card/nutrition-stats-card.component';

// Registrar componentes de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [
    IonicModule, 
    CommonModule, 
    FormsModule,
    WeightChartComponent,
    NutritionStatsCardComponent
  ],
  templateUrl: './estadisticas.page.html',
  styleUrls: ['./estadisticas.page.scss']
})
export class EstadisticasPage implements OnInit {
  // Variables para el calendario
  currentMonth: Date = new Date();
  calendarDays: {date: Date, hasData: boolean, weight?: number}[] = [];
  selectedDate: Date = new Date();
  monthName: string = '';
  
  // Variables para estadísticas
  userProfile: UserProfile | null = null;
  weightData: {fecha: string, peso: number}[] = [];
  nutritionData: any = null;
  
  // Variables de estado
  loading: boolean = false;
  error: string | null = null;
  
  // Referencia a los gráficos
  @ViewChild('weightChart', { static: false }) weightChartRef!: ElementRef;
  
  constructor(
    private dailyLogService: DailyLogService,
    private authService: AuthService,
    private toastController: ToastController
  ) {}
  
  ngOnInit() {
    this.loadUserProfile();
    this.initCalendar();
    this.loadWeightHistory();
    this.loadNutritionData(this.selectedDate);
  }
  
  ngAfterViewInit() {
    // El gráfico se inicializará después en el componente hijo
  }
  
  /**
   * Carga el perfil del usuario
   */
  loadUserProfile() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.userProfile = profile;
      },
      error: (err) => {
        console.error('Error al cargar perfil de usuario:', err);
      }
    });
  }
  
  /**
   * Inicializa el calendario para el mes actual
   */
  initCalendar() {
    this.monthName = format(this.currentMonth, 'MMMM yyyy', { locale: es });
    this.generateCalendarDays();
  }
  
  /**
   * Genera los días del calendario para el mes actual
   */
  generateCalendarDays() {
    this.calendarDays = [];
    
    // Obtener el primer día del mes
    const firstDayOfMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    
    // Obtener el último día del mes
    const lastDayOfMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
    
    // Obtener el día de la semana del primer día (0 = Domingo, 1 = Lunes, etc.)
    let dayOfWeek = firstDayOfMonth.getDay();
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajustar para empezar en lunes (0 = Lunes)
    
    // Añadir días anteriores al mes actual para completar la semana
    for (let i = dayOfWeek; i > 0; i--) {
      const date = new Date(firstDayOfMonth);
      date.setDate(date.getDate() - i);
      this.calendarDays.push({ 
        date, 
        hasData: false // Estos días podrían actualizarse después si tienen datos
      });
    }
    
    // Añadir los días del mes actual
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), i);
      this.calendarDays.push({ 
        date, 
        hasData: false // Se actualizará después
      });
    }
    
    // Completar la última semana si es necesario
    const remainingDays = 7 - (this.calendarDays.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(lastDayOfMonth);
        date.setDate(date.getDate() + i);
        this.calendarDays.push({ 
          date, 
          hasData: false
        });
      }
    }
    
    // Ahora, marcar los días que tienen datos
    this.markDaysWithData();
  }
  
  /**
   * Marca los días que tienen datos registrados
   */
  markDaysWithData() {
    // Aquí deberíamos consultar al servicio para saber qué días tienen datos
    // Por simplicidad, asumimos que solo hay datos para algunos días
    
    // Esta lógica debe reemplazarse con datos reales de tu API
    this.dailyLogService.getWeightHistory().subscribe({
      next: (history) => {
        // Marcar días con datos de peso
        history.forEach(entry => {
          const entryDate = new Date(entry.fecha);
          
          // Buscar este día en nuestro calendario
          const calendarDay = this.calendarDays.find(day => 
            day.date.getDate() === entryDate.getDate() &&
            day.date.getMonth() === entryDate.getMonth() &&
            day.date.getFullYear() === entryDate.getFullYear()
          );
          
          if (calendarDay) {
            calendarDay.hasData = true;
            calendarDay.weight = entry.peso;
          }
        });
      }
    });
  }
  
  /**
   * Avanza al mes siguiente
   */
  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.initCalendar();
  }
  
  /**
   * Retrocede al mes anterior
   */
  prevMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.initCalendar();
  }
  
  /**
   * Selecciona un día en el calendario
   */
  selectDate(date: Date) {
    this.selectedDate = new Date(date);
    this.loadNutritionData(this.selectedDate);
  }
  
  /**
   * Carga el historial de peso
   */
  loadWeightHistory() {
    this.loading = true;
    
    this.dailyLogService.getWeightHistory().subscribe({
      next: (history) => {
        this.weightData = history.sort((a, b) => 
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar historial de peso:', err);
        this.loading = false;
        this.presentToast('Error al cargar historial de peso');
      }
    });
  }
  
  /**
   * Carga los datos nutricionales para una fecha específica
   */
  loadNutritionData(date: Date) {
    this.loading = true;
    
    this.dailyLogService.getSummary(date).subscribe({
      next: (data) => {
        this.nutritionData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar datos nutricionales:', err);
        this.loading = false;
        this.presentToast('Error al cargar datos nutricionales');
      }
    });
  }
  
  /**
   * Determina si una fecha es hoy
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }
  
  /**
   * Determina si una fecha es la seleccionada
   */
  isSelected(date: Date): boolean {
    return date.getDate() === this.selectedDate.getDate() &&
           date.getMonth() === this.selectedDate.getMonth() &&
           date.getFullYear() === this.selectedDate.getFullYear();
  }
  
  /**
   * Formatea una fecha para mostrar
   */
  formatDate(date: Date): string {
    return format(date, 'dd MMM yyyy');
  }
  
  /**
   * Muestra un toast con un mensaje
   */
  async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'danger') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
