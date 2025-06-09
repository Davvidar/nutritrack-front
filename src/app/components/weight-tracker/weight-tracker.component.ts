// src/app/components/weight-tracker/weight-tracker.component.ts - Actualizado
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DailyLogService } from 'src/app/services/daily-log.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-weight-tracker',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './weight-tracker.component.html',
  styleUrls: ['./weight-tracker.component.scss'],
  animations: [
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ]),
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class WeightTrackerComponent implements OnInit, OnChanges {
  @Input() selectedDate: Date = new Date();

  currentWeight: number | null = null;
  newWeight: string = '';
  weeklyHistory: { fecha: string; peso: number }[] = [];
  loading: boolean = false;
  editMode: boolean = false;
  isExpanded: boolean = false;

  constructor(
    private dailyLogService: DailyLogService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    if (this.isValidDate(this.selectedDate)) {
      this.loadData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate']) {
      const dateChange = changes['selectedDate'];
      if (this.isValidDate(dateChange.currentValue)) {
        this.selectedDate = new Date(dateChange.currentValue);
        this.loadData();
        this.editMode = false;
        this.newWeight = '';
        // Colapsar cuando cambiamos de fecha
        this.isExpanded = false;
      }
    }
  }

  private isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    if (this.isExpanded && this.weeklyHistory.length === 0) {
      this.loadWeeklyHistory();
    }
  }

  toggleEditMode(event?: Event) {
    if (event) {
      event.stopPropagation(); // Prevenir que se expanda/colapse
    }
    this.editMode = !this.editMode;
    if (this.editMode) {
      this.newWeight = this.currentWeight ? this.currentWeight.toString() : '';
    }
  }

  loadData() {
    this.loadTodayWeight();
    if (this.isExpanded) {
      this.loadWeeklyHistory();
    }
  }

  loadTodayWeight() {
    this.loading = true;
    this.currentWeight = null;
    this.newWeight = '';

    this.dailyLogService.getByDate(this.selectedDate).subscribe({
      next: (dailyLog) => {
        if (dailyLog && dailyLog.pesoDelDia !== undefined && dailyLog.pesoDelDia !== null) {
          this.currentWeight = dailyLog.pesoDelDia;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando peso del día:', err);
        this.loading = false;
      }
    });
  }

  loadWeeklyHistory() {
    const startDate = new Date(this.selectedDate);
    startDate.setDate(startDate.getDate() - 6); // 7 días atrás

    this.dailyLogService.getWeightHistory().subscribe({
      next: (history) => {
        // Filtrar solo los últimos 7 días
        this.weeklyHistory = history
          .filter(entry => {
            const entryDate = new Date(entry.fecha);
            return entryDate >= startDate && entryDate <= this.selectedDate;
          })
          .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
      },
      error: (err) => {
        console.error('Error cargando historial de peso:', err);
      }
    });
  }

  saveWeight() {
    if (!this.isValidDate(this.selectedDate)) {
      this.presentToast('Error: La fecha seleccionada no es válida.', 'danger');
      return;
    }

    const weightString = String(this.newWeight);
    const weightValue = parseFloat(weightString.replace(',', '.'));

    if (isNaN(weightValue) || weightValue <= 0) {
      this.presentToast('Por favor, introduce un peso válido', 'warning');
      return;
    }

    this.loading = true;
    console.log('WeightTracker: *** GUARDANDO PESO ***', {
      fecha: this.selectedDate,
      peso: weightValue
    });

    this.dailyLogService.updateWeight(this.selectedDate, weightValue).subscribe({
      next: (response) => {
        console.log('WeightTracker: *** PESO GUARDADO EXITOSAMENTE ***', response);
        
        // Actualizar estado local
        this.currentWeight = weightValue;
        this.editMode = false;
        this.loading = false;
        
        // *** REMOVIDO: No emitir notificación aquí, el servicio ya lo hace ***
        // this.nutritionUpdateService.notifyWeightUpdated(this.selectedDate);
        
        // Recargar historial y mostrar mensaje de éxito
        this.loadWeeklyHistory();
        this.presentToast('Peso actualizado correctamente', 'primary');
      },
      error: (err) => {
        console.error('WeightTracker: Error guardando peso:', err);
        this.presentToast('Error al guardar el peso', 'danger');
        this.loading = false;
      }
    });
  }

  formatDateHeader(): string {
    if (!this.isValidDate(this.selectedDate)) return 'Peso';
    
    const today = new Date();
    if (this.isSameDay(this.selectedDate, today)) {
      return 'Peso de hoy';
    } else {
      return `Peso del ${this.selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
    }
  }

  formatShortDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    
    if (this.isSameDay(date, today)) {
      return 'Hoy';
    }
    
    const dayNames = ['Dom','Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dayNames[date.getDay()];
  }

  isToday(dateString: string): boolean {
    return this.isSameDay(new Date(dateString), new Date());
  }

  getChange(entry: { fecha: string; peso: number }): number | null {
    const index = this.weeklyHistory.indexOf(entry);
    if (index > 0) {
      const previousEntry = this.weeklyHistory[index - 1];
      return entry.peso - previousEntry.peso;
    }
    return null;
  }

  getAbsoluteValue(value: number | null): number {
    return value !== null ? Math.abs(value) : 0;
  }

  getChangeAbsolute(entry: { fecha: string; peso: number }): number {
    const change = this.getChange(entry);
    return change !== null ? Math.abs(change) : 0;
  }
  
  isSameDay(date1: Date, date2: Date): boolean {
    if (!this.isValidDate(date1) || !this.isValidDate(date2)) {
      return false;
    }
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  async presentToast(message: string, color: 'primary' | 'danger' | 'warning' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}