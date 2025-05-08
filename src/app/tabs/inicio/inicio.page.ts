import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addDays, startOfWeek } from 'date-fns';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { ToastController } from '@ionic/angular';

import { WeekSliderComponent, WeekDay } from '../../components/week-slider/week-slider.component';
import { MetricsSummaryComponent, Macros } from '../../components/metrics-summary/metrics-summary.component';
import { MealAccordionComponent, MealItemInterface } from '../../components/meal-accordion/meal-accordion.component';

import { DailyLogService, MealItem, SummaryResponse } from '../../services/daily-log.service';
import { ProductService, Product } from '../../services/product.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Observable, forkJoin } from 'rxjs';
import { Recipe, RecipeService } from 'src/app/services/recipe.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [IonicModule, CommonModule, WeekSliderComponent, MetricsSummaryComponent, MealAccordionComponent],
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss']
})
export class InicioPage implements OnInit {
  week: WeekDay[] = [];
  baseMonday: Date = startOfWeek(new Date(), { weekStartsOn: 1 });
  meals = ['desayuno', 'almuerzo', 'comida', 'merienda', 'cena', 'recena'] as const;

  selectedDate: Date = new Date(); // O la fecha que estés manejando
  mealItems: {
    desayuno: MealItem[];
    almuerzo: MealItem[];
    comida: MealItem[];
    merienda: MealItem[];
    cena: MealItem[];
    recena: MealItem[];
  } = {
    desayuno: [],
    almuerzo: [],
    comida: [],
    merienda: [],
    cena: [],
    recena: []
  };

  dailyGoals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  currentConsumption: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  loading: boolean = false;

  constructor(
    private dailyLogService: DailyLogService,
    private productService: ProductService,
    private recipeService: RecipeService,
    private toastController: ToastController,
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

  ionViewWillEnter() {
    // Se ejecuta cada vez que la página está a punto de entrar en la vista.
    // Ideal para recargar datos.
    const activeDay = this.week.find(d => d.active);
    if (activeDay) {
      console.log('InicioPage: ionViewWillEnter - Recargando datos para:', activeDay.date);
      this.onDaySelected(activeDay); // Esto ya llama a loadDailyLog y loadSummary
    }
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
    this.dailyLogService.getDailyLogWithDetails(date).subscribe({
      next: (data: any) => {  // Añade tipado explícito
        // Asignar datos directamente sin peticiones adicionales
        if (data && data.comidas) {
          this.mealItems = data.comidas;
        }
      },
      error: (err: any) => {  // Añade tipado explícito
        console.error('Error al cargar el registro diario:', err);
        // Puedes mostrar un mensaje al usuario aquí
      }
    });
  }
  
  
  // Método auxiliar para mostrar mensajes de error
  async presentErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger'
    });
    toast.present();
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

  loadWeek(direction: 'prev' | 'next') {
    // Aquí actualizas baseMonday según la dirección
    this.baseMonday = addDays(this.baseMonday, direction === 'next' ? 7 : -7);
    this.buildWeek();
    this.onDaySelected(this.week[0]);
  }

  addMeal(meal: typeof this.meals[number]) {
    const activeDay = this.week.find(d => d.active);
    if (activeDay) {
      this.router.navigate(['/tabs/inicio/search'], { 
        queryParams: { 
          date: activeDay.date.toISOString(),
          meal: meal 
        } 
      });
    }
  }
}