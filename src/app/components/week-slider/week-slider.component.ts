import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, OnChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addDays } from 'date-fns';
import { register } from 'swiper/element/bundle';

// Registrar Swiper
register();

export interface WeekDay {
  letter: string;
  date: Date;
  active: boolean;
}

@Component({
  selector: 'app-week-slider',
  standalone: true,
  imports: [IonicModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Necesario para elementos web personalizados
  templateUrl: './week-slider.component.html',
  styleUrls: ['./week-slider.component.scss']
})
export class WeekSliderComponent implements AfterViewInit, OnChanges {
  @Input() week: WeekDay[] = [];
  @Output() dayChange = new EventEmitter<WeekDay>();
  @Output() weekChange = new EventEmitter<'next' | 'prev'>();
  
  @ViewChild('swiperElement') swiperElement!: ElementRef;
  
  monthTitle = '';
  today = new Date();
  
  // Días de la semana en español
  diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  mesEnEspanol = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  
  // Mantener semanas adyacentes
  prevWeek: WeekDay[] = [];
  nextWeek: WeekDay[] = [];
  
  constructor() {}
  
  ngAfterViewInit() {
    // Generar semanas adyacentes
    this.updateAdjacentWeeks();
    
    // Configurar Swiper después de que la vista se ha inicializado
    if (this.swiperElement?.nativeElement) {
      const swiperEl = this.swiperElement.nativeElement;
      
      // Configurar opciones de Swiper
      Object.assign(swiperEl, {
        slidesPerView: 1,
        initialSlide: 1,
        speed: 300,
        allowTouchMove: true
      });
      
      // Inicializar Swiper
      swiperEl.initialize();
      
      // Agregar evento para detectar cambio de slide
      swiperEl.addEventListener('slidechange', (event: any) => {
        const activeIndex = event.detail[0].activeIndex;
        
        if (activeIndex === 0) {
          // Si se desliza a la izquierda (semana anterior)
          this.weekChange.emit('prev');
        } else if (activeIndex === 2) {
          // Si se desliza a la derecha (semana siguiente)
          this.weekChange.emit('next');
        }
        
        // Reiniciar al slide central
        setTimeout(() => {
          swiperEl.swiper.slideTo(1, 0);
        }, 50);
      });
    }
    
    this.updateMonthTitle();
  }
  
  ngOnChanges() {
    // Actualizar semanas adyacentes cuando cambia la semana principal
    this.updateAdjacentWeeks();
  }
  
  // Actualizar las semanas previa y siguiente
  updateAdjacentWeeks() {
    if (this.week && this.week.length > 0) {
      this.prevWeek = this.generatePreviousWeek(this.week[0].date);
      this.nextWeek = this.generateNextWeek(this.week[0].date);
    }
  }
  
  selectDay(day: WeekDay) {
    // Solo seleccionar días en la semana actual
    this.week.forEach(d => d.active = d.date.toDateString() === day.date.toDateString());
    this.dayChange.emit(day);
    this.updateMonthTitle();
  }
  
  updateMonthTitle() {
    const activeDay = this.week.find(d => d.active);
    if (activeDay) {
      // Formatear el mes y año en español
      const mes = this.mesEnEspanol[activeDay.date.getMonth()];
      const anio = activeDay.date.getFullYear();
      this.monthTitle = `${mes} ${anio}`;
    }
  }
  
  generatePreviousWeek(fecha: Date): WeekDay[] {
    const result: WeekDay[] = [];
    const firstDay = new Date(fecha);
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(firstDay, -7 + i);
      result.push({
        date,
        // Usar nuestro array de días en español
        letter: this.diasSemana[date.getDay() === 0 ? 6 : date.getDay() - 1],
        active: false
      });
    }
    
    return result;
  }
  
  generateNextWeek(fecha: Date): WeekDay[] {
    const result: WeekDay[] = [];
    const firstDay = new Date(fecha);
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(firstDay, 7 + i);
      result.push({
        date,
        // Usar nuestro array de días en español
        letter: this.diasSemana[date.getDay() === 0 ? 6 : date.getDay() - 1],
        active: false
      });
    }
    
    return result;
  }
  
  datesAreOnSameDay(first: Date, second: Date): boolean {
    return first.getDate() === second.getDate() && 
           first.getMonth() === second.getMonth() && 
           first.getFullYear() === second.getFullYear();
  }
}