import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { IonicModule, GestureController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface WeekDay {
  letter: string;
  date: Date;
  active: boolean;
}

@Component({
  selector: 'app-week-slider',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './week-slider.component.html',
  styleUrls: ['./week-slider.component.scss']
})
export class WeekSliderComponent implements AfterViewInit {
  @Input() week: WeekDay[] = [];
  @Output() dayChange = new EventEmitter<WeekDay>();
  @Output() weekChange = new EventEmitter<'next' | 'prev'>();
  
  @ViewChild('weekSlider') weekSlider!: ElementRef;
  
  monthTitle = '';
  
  constructor(private gestureCtrl: GestureController) {}
  
  ngAfterViewInit() {
    this.setupGestures();
  /*   this.updateMonthTitle(); */
  }
  
  selectDay(day: WeekDay) {
    this.dayChange.emit(day);
  /*   this.updateMonthTitle(); */
  }
  
/*   updateMonthTitle() {
    const activeDay = this.week.find(d => d.active);
    if (activeDay) {
      this.monthTitle = format(activeDay.date, 'MMMM yyyy', { locale: es, timeZone: 'UTC',  });
    }
  } */
  
  setupGestures() {
    const element = this.weekSlider.nativeElement;
    let startX: number;
    let endX: number;
    
    const gesture = this.gestureCtrl.create({
      el: element,
      threshold: 15,
      gestureName: 'week-swipe',
      onStart: (ev) => {
        startX = ev.startX;
      },
      onMove: (ev) => {
        endX = ev.currentX;
      },
      onEnd: () => {
        const diff = endX - startX;
        if (Math.abs(diff) > 100) {
          if (diff > 0) {
            // Swipe right - previous week
            this.weekChange.emit('prev');
          } else {
            // Swipe left - next week
            this.weekChange.emit('next');
          }
        /*   this.updateMonthTitle(); */
        }
      }
    });
    
    gesture.enable();
  }
}