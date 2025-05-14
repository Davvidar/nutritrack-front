// src/app/components/weight-tracker/weight-tracker.component.ts
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DailyLogService } from 'src/app/services/daily-log.service';

@Component({
  selector: 'app-weight-tracker',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './weight-tracker.component.html',
  styleUrls: ['./weight-tracker.component.scss']
})
export class WeightTrackerComponent implements OnInit, OnChanges {
  @Input() selectedDate: Date = new Date(); // Se inicializa, pero el padre debe pasarla

  currentWeight: number | null = null;
  newWeight: string = ''; // Usado para el input, tipo string para flexibilidad de entrada
  weightHistory: { fecha: string; peso: number }[] = [];
  showHistory: boolean = false;
  loading: boolean = false;
  editMode: boolean = false;

  constructor(
    private dailyLogService: DailyLogService,
    private toastController: ToastController,
    // ModalController no se usa en el código proporcionado, puedes quitarlo si no es necesario.
    // private modalController: ModalController
  ) {}

  ngOnInit() {
    // La carga inicial se maneja principalmente a través de ngOnChanges cuando selectedDate se establece
    // por primera vez desde el componente padre.
    // Sin embargo, si selectedDate ya tiene un valor válido al inicio (por su inicialización),
    // y no hay un cambio inicial detectado por ngOnChanges (raro pero posible en algunos escenarios),
    // una llamada a loadData aquí podría ser un seguro.
    // Pero tu actual `ngOnChanges` se disparará en el primer seteo del Input.
    if (this.isValidDate(this.selectedDate)) {
      this.loadData();
    } else {
      console.warn('WeightTrackerComponent: ngOnInit - selectedDate no es válida al inicio.', this.selectedDate);
      // Opcionalmente, inicializar selectedDate a new Date() si es null/undefined
      // this.selectedDate = new Date();
      // this.loadData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate']) {
      const dateChange = changes['selectedDate'];
      // Asegurarse de que la nueva fecha es válida
      if (this.isValidDate(dateChange.currentValue)) {
        this.selectedDate = new Date(dateChange.currentValue); // Asegurar que es una instancia de Date
        console.log('Fecha cambiada en weight-tracker y validada:', this.selectedDate);
        this.loadData();
        this.editMode = false; // Resetear modo edición al cambiar de fecha
        this.newWeight = '';   // Limpiar input
      } else {
        console.warn('WeightTrackerComponent: ngOnChanges - selectedDate recibida no es válida.', dateChange.currentValue);
        // Podrías decidir no cargar datos o usar una fecha por defecto
        // this.currentWeight = null;
        // this.newWeight = '';
      }
    }
  }

  private isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  loadData() {
    // Asegurar que selectedDate es válida antes de proceder
    if (!this.isValidDate(this.selectedDate)) {
      console.error('WeightTrackerComponent: loadData - No se puede cargar datos, selectedDate no es válida.', this.selectedDate);
      this.loading = false;
      this.currentWeight = null;
      this.newWeight = '';
      return;
    }
    this.loadTodayWeight();
    this.loadWeightHistory();
  }

  loadTodayWeight() {
    console.log('Cargando peso para fecha:', this.selectedDate);
    this.loading = true;
    this.currentWeight = null; // Resetear antes de cargar
    this.newWeight = '';

    this.dailyLogService.getByDate(this.selectedDate).subscribe({
      next: (dailyLog) => {
        console.log('DailyLog recibido:', dailyLog);
        if (dailyLog && dailyLog.pesoDelDia !== undefined && dailyLog.pesoDelDia !== null) {
          this.currentWeight = dailyLog.pesoDelDia;
          this.newWeight = this.currentWeight.toString();
        } else {
          this.currentWeight = null;
          this.newWeight = '';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando peso del día:', err);
        this.currentWeight = null;
        this.newWeight = '';
        this.loading = false;
        // Opcional: this.presentToast('Error al cargar el peso del día', 'danger');
      }
    });
  }

  loadWeightHistory() {
    // Asegurar que selectedDate es válida antes de proceder
     if (!this.isValidDate(this.selectedDate)) {
      console.error('WeightTrackerComponent: loadWeightHistory - No se puede cargar historial, selectedDate no es válida.', this.selectedDate);
      return;
    }
    this.dailyLogService.getWeightHistory().subscribe({ // Asumo que getWeightHistory no depende de selectedDate
      next: (history) => {
        this.weightHistory = history
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          .slice(0, 30); // Últimos 30 registros
      },
      error: (err) => {
        console.error('Error cargando historial de peso:', err);
      }
    });
  }

  saveWeight() {
    // Asegurar que selectedDate es válida antes de proceder
    if (!this.isValidDate(this.selectedDate)) {
      console.error('WeightTrackerComponent: saveWeight - No se puede guardar, selectedDate no es válida.', this.selectedDate);
      this.presentToast('Error: La fecha seleccionada no es válida.', 'danger');
      return;
    }

    const weightValue = parseFloat(this.newWeight.replace(',', '.')); // Reemplazar coma por punto para parseo

    if (isNaN(weightValue) || weightValue <= 0) {
      this.presentToast('Por favor, introduce un peso válido', 'warning');
      return;
    }

    this.loading = true;
    this.dailyLogService.updateWeight(this.selectedDate, weightValue).subscribe({
      next: () => {
        this.currentWeight = weightValue;
        this.editMode = false;
        this.presentToast('Peso actualizado correctamente', 'success');
        this.loadWeightHistory(); // Recargar historial para reflejar el cambio si aplica
        this.loading = false;
      },
      error: (err) => {
        console.error('Error guardando peso:', err);
        this.presentToast('Error al guardar el peso', 'danger');
        this.loading = false;
      }
    });
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    if (this.editMode) {
      // Al entrar en modo edición, si hay un peso actual, lo ponemos en el input
      this.newWeight = this.currentWeight ? this.currentWeight.toString() : '';
    } else {
      // Si cancelamos (salimos de editMode sin guardar), podríamos querer limpiar newWeight
      // o restaurarlo al valor de currentWeight si el guardado no se hizo.
      // Tu código actual ya lo limpia en ngOnChanges o al cargar.
    }
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
  }

  formatDateHeader(): string {
    if (!this.isValidDate(this.selectedDate)) return 'Peso'; // Fallback

    const today = new Date();
    if (this.isSameDay(this.selectedDate, today)) {
      return 'Peso de hoy';
    } else {
      // Intl.DateTimeFormat es más robusto para formateo de fechas localizado
      return `Peso del ${this.selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    if (!this.isValidDate(date)) return 'Fecha inválida';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.isSameDay(date, today)) {
      return 'Hoy';
    } else if (this.isSameDay(date, yesterday)) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  }

  getWeightChange(currentEntryWeight: number, index: number): number | null {
    if (index < this.weightHistory.length - 1) {
      const previousWeight = this.weightHistory[index + 1].peso;
      // Asegurarse de que ambos son números
      if (typeof currentEntryWeight === 'number' && typeof previousWeight === 'number') {
        return currentEntryWeight - previousWeight;
      }
    }
    return null;
  }

  isSameDay(date1: Date, date2: Date): boolean {
    // Asegurarse de que ambas son fechas válidas antes de comparar
    if (!this.isValidDate(date1) || !this.isValidDate(date2)) {
      return false;
    }
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  isSelectedDate(dateString: string): boolean {
    const date = new Date(dateString);
    if (!this.isValidDate(date) || !this.isValidDate(this.selectedDate)) {
      return false;
    }
    return this.isSameDay(date, this.selectedDate);
  }

  async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2500, // Un poco más de duración
      position: 'bottom',
      color,
      buttons: [{ text: 'Cerrar', role: 'cancel' }] // Botón para cerrar manualmente
    });
    await toast.present();
  }
}