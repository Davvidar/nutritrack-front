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
  @Input() selectedDate: Date = new Date();
  
  currentWeight: number | null = null;
  newWeight: string = '';
  weightHistory: { fecha: string; peso: number }[] = [];
  showHistory: boolean = false;
  loading: boolean = false;
  editMode: boolean = false;
  
  constructor(
    private dailyLogService: DailyLogService,
    private toastController: ToastController,
    private modalController: ModalController
  ) {}
  
  ngOnInit() {
    this.loadData();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedDate']) {
      console.log('Fecha cambiada en weight-tracker:', this.selectedDate);
      this.loadData();
      // Resetear el modo de edición cuando cambia la fecha
      this.editMode = false;
      this.newWeight = '';
    }
  }
  
  loadData() {
    this.loadTodayWeight();
    this.loadWeightHistory();
  }
  
  loadTodayWeight() {
    console.log('Cargando peso para fecha:', this.selectedDate);
    this.loading = true;
    
    this.dailyLogService.getByDate(this.selectedDate).subscribe({
      next: (dailyLog) => {
        console.log('DailyLog recibido:', dailyLog);
        this.currentWeight = dailyLog.pesoDelDia || null;
        if (this.currentWeight) {
          this.newWeight = this.currentWeight.toString();
        } else {
          this.newWeight = '';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando peso del día:', err);
        this.currentWeight = null;
        this.newWeight = '';
        this.loading = false;
      }
    });
  }
  
  loadWeightHistory() {
    this.dailyLogService.getWeightHistory().subscribe({
      next: (history) => {
        // Ordenar por fecha descendente y tomar los últimos registros
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
    const weightValue = parseFloat(this.newWeight);
    
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
        this.loadWeightHistory(); // Recargar historial
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
    if (!this.editMode) {
      // Si cancelamos, restaurar el valor original
      this.newWeight = this.currentWeight ? this.currentWeight.toString() : '';
    }
  }
  
  toggleHistory() {
    this.showHistory = !this.showHistory;
  }
  
  formatDateHeader(): string {
    const today = new Date();
    if (this.isSameDay(this.selectedDate, today)) {
      return 'Peso de hoy';
    } else {
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                     'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return `Peso del ${this.selectedDate.getDate()} de ${meses[this.selectedDate.getMonth()]}`;
    }
  }
  
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (this.isSameDay(date, today)) {
      return 'Hoy';
    } else if (this.isSameDay(date, yesterday)) {
      return 'Ayer';
    } else {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return `${dias[date.getDay()]}, ${date.getDate()} ${meses[date.getMonth()]}`;
    }
  }
  
  getWeightChange(currentWeight: number, index: number): number | null {
    if (index < this.weightHistory.length - 1) {
      const previousWeight = this.weightHistory[index + 1].peso;
      return currentWeight - previousWeight;
    }
    return null;
  }
  
  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
  
  // Método helper para el template
  isSelectedDate(dateString: string): boolean {
    const date = new Date(dateString);
    return this.isSameDay(date, this.selectedDate);
  }
  
  async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}