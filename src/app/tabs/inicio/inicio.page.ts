import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addDays, startOfWeek } from 'date-fns';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { WeekSliderComponent, WeekDay } from '../../components/week-slider/week-slider.component';
import { MetricsSummaryComponent, Macros } from '../../components/metrics-summary/metrics-summary.component';
import { MealAccordionComponent, MealItem } from '../../components/meal-accordion/meal-accordion.component';

import { DailyLogService, DailyLog, SummaryResponse } from '../../services/daily-log.service';
import { ProductService, Product } from '../../services/product.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Observable, forkJoin as rxjsForkJoin } from 'rxjs';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [IonicModule, CommonModule, WeekSliderComponent, MetricsSummaryComponent, MealAccordionComponent],
  templateUrl: './inicio.page.html'
})
export class InicioPage implements OnInit {
  week: WeekDay[] = [];
  baseMonday: Date = startOfWeek(new Date(), { weekStartsOn: 1 });
  meals = ['desayuno', 'almuerzo', 'comida', 'merienda', 'cena', 'recena'] as const;

  mealItems: Record<typeof this.meals[number], MealItem[]> = {
    desayuno: [], almuerzo: [], comida: [], merienda: [], cena: [], recena: []
  };

  dailyGoals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  currentConsumption: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  constructor(
    private dailyLogService: DailyLogService,
    private productService: ProductService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.buildWeek();
    const today = this.week.find(d => d.date.toDateString() === new Date().toDateString()) || this.week[0];
    // Cargar objetivos desde perfil usuario
    this.authService.getProfile().subscribe((user: UserProfile) => {
      const obj = user.objetivosNutricionales || {} as any;
      this.dailyGoals = {
        calories: obj.calorias || 0,
        protein: obj.proteinas || 0,
        carbs: obj.carbohidratos || 0,
        fat: obj.grasas || 0
      };
      // Tras cargar objetivos, cargar día y métricas
      this.onDaySelected(today);
    });
  }

  private buildWeek() {
    this.week = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(this.baseMonday, i);
      this.week.push({ date, letter: date.toLocaleString('es-ES', { weekday: 'narrow' }), active: false });
    }
  }

  onDaySelected(day: WeekDay) {
    this.week.forEach(d => d.active = d.date.toDateString() === day.date.toDateString());
    this.loadSummary(day.date);
    this.loadDailyLog(day.date);
  }

  private loadDailyLog(date: Date) {
    this.dailyLogService.getByDate(date).subscribe((log: DailyLog) => {
      this.meals.forEach(meal => {
        const itemsDTO = log.comidas[meal] || [];
        if (itemsDTO.length) {
          const observables = itemsDTO.map(dto =>
            this.productService.getById(dto.productId).pipe(
              map((p: Product) => ({
                name: p.nombre,
                calorias: (p.calorias * dto.cantidad) / 100,
                proteinas: (p.proteinas * dto.cantidad) / 100,
                carbohidratos: (p.carbohidratos * dto.cantidad) / 100,
                grasas: (p.grasas * dto.cantidad) / 100,
                cantidad: dto.cantidad
              }))
            )
          );
          rxjsForkJoin(observables).subscribe((items: MealItem[]) => this.mealItems[meal] = items);
        } else {
          this.mealItems[meal] = [];
        }
      });
    });
  }

  private loadSummary(date: Date) {
    this.dailyLogService.getSummary(date).subscribe((res: SummaryResponse) => {
      if (res.consumido) {
        this.currentConsumption = {
          calories: res.consumido.calorias,
          protein: res.consumido.proteinas,
          carbs: res.consumido.carbohidratos,
          fat: res.consumido.grasas
        };
      }
      // Actualiza objetivos solo si vienen en la respuesta
      if (res.objetivo) {
        this.dailyGoals = {
          calories: res.objetivo.calorias,
          protein: res.objetivo.proteinas,
          carbs: res.objetivo.carbohidratos,
          fat: res.objetivo.grasas
        };
      }
    });
  }

  loadWeek(dir: 'prev' | 'next') {
    this.baseMonday = addDays(this.baseMonday, dir === 'next' ? 7 : -7);
    this.buildWeek();
    this.onDaySelected(this.week[0]);
  }

  addMeal(meal: typeof this.meals[number]) {
    const dateISO = this.week.find(d => d.active)!.date.toISOString();
    this.router.navigate(['/search'], { queryParams: { date: dateISO, meal } });
  }
}

function forkJoin(observables: Observable<{ name: string; calorias: number; proteinas: number; carbohidratos: number; grasas: number; cantidad: number; }>[]) {
  throw new Error('Function not implemented.');
}

