import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addDays, startOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface WeekDay {
  date: Date;
  letter: string;
  active: boolean;
}

@Component({
  selector: 'app-week-slider',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './week-slider.component.html',
  styleUrls: ['./week-slider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeekSliderComponent implements OnInit {
  @Input() week: WeekDay[] = [];
  
  @Output() dayChange = new EventEmitter<WeekDay>();
  @Output() weekChange = new EventEmitter<'prev' | 'next'>();
  
  // Estado interno para controlar el swipe
  private isDragging = false;
  private startX = 0;
  private threshold = 50; // Umbral para considerar un swipe
  
  // Para las animaciones de slide
  animationClass: string = '';
  
  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // No vamos a seleccionar automáticamente ningún día al inicializar
    // Simplemente verificamos si hay alguna información válida en el input
    if (!this.week || this.week.length === 0) {
      console.warn('No valid week data provided to WeekSliderComponent');
    }
  }
  
  // Cuando cambia el input week, asegurarnos de actualizar la vista
  ngOnChanges() {
    // Forzar la detección de cambios
    this.cdr.detectChanges();
  }
  
  // Cuando se hace click en un día
  onDayClick(day: WeekDay) {
    // Verificar que no estemos en medio de un swipe
    if (this.isDragging) return;
    
    // Ahora solo emitimos el evento para que el componente padre lo maneje
    this.dayChange.emit(day);
  }
  
  // Cambiar a la semana anterior con animación
  prevWeek() {
    // Aplicar clase de animación
    this.animationClass = 'swiping-prev';
    // Permitir que la animación se ejecute
    setTimeout(() => {
      // Emitir el evento
      this.weekChange.emit('prev');
      // Quitar la clase de animación después
      setTimeout(() => {
        this.animationClass = '';
        this.cdr.detectChanges();
      }, 300); // Tiempo de la animación en SCSS
    }, 50); // Pequeño delay para asegurar que la clase se aplica
  }
  
  // Cambiar a la semana siguiente con animación
  nextWeek() {
    // Aplicar clase de animación
    this.animationClass = 'swiping-next';
    // Permitir que la animación se ejecute
    setTimeout(() => {
      // Emitir el evento
      this.weekChange.emit('next');
      // Quitar la clase de animación después
      setTimeout(() => {
        this.animationClass = '';
        this.cdr.detectChanges();
      }, 300); // Tiempo de la animación en SCSS
    }, 50); // Pequeño delay para asegurar que la clase se aplica
  }
  
  // Gestión del swipe para móviles
  onTouchStart(event: TouchEvent) {
    this.isDragging = true;
    this.startX = event.touches[0].clientX;
  }
  
  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;
    
    const currentX = event.touches[0].clientX;
    const diff = currentX - this.startX;
    
    // Opcional: Añadir animación durante el arrastre
    // Esto se haría con CSS transform
  }
  
  onTouchEnd(event: TouchEvent) {
    if (!this.isDragging) return;
    
    const currentX = event.changedTouches[0].clientX;
    const diff = currentX - this.startX;
    
    if (Math.abs(diff) > this.threshold) {
      if (diff > 0) {
        // Swipe a la derecha -> semana anterior
        this.prevWeek();
      } else {
        // Swipe a la izquierda -> semana siguiente
        this.nextWeek();
      }
    }
    
    this.isDragging = false;
  }
  
  // Método para formatear la fecha para mostrar rangos en formato"
  formatWeekRange(): string {
    if (!this.week || this.week.length === 0) return '';
    
    const firstDay = this.week[0].date;
    const lastDay = this.week[this.week.length - 1].date;
    
    // Si los días están en el mismo mes
    if (firstDay.getMonth() === lastDay.getMonth()) {
      return `${format(firstDay, 'MMMM', { locale: es })}`;
    }
    
    // Si están en diferentes meses
    return `${format(firstDay, 'd MMM', { locale: es })} - ${format(lastDay, 'd MMM', { locale: es })}`;
  }
  
  // Utilidades para comparar fechas
  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
  
  isToday(date: Date): boolean {
    const today = new Date();
    return this.isSameDay(date, today);
  }
}