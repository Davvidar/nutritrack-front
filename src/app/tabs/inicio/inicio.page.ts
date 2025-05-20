import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { Observable, Subscription, forkJoin } from 'rxjs';
import { Recipe, RecipeService } from 'src/app/services/recipe.service';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { NutritionData, NutritionSummaryComponent } from 'src/app/components/nutrition-summary/nutrition-summary.component';
import { WeightTrackerComponent } from 'src/app/components/weight-tracker/weight-tracker.component';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [IonicModule, CommonModule, WeekSliderComponent, MetricsSummaryComponent, MealAccordionComponent, WeightTrackerComponent],
  templateUrl: './inicio.page.html',
  styleUrls: ['./inicio.page.scss']
})
export class InicioPage implements OnInit, OnDestroy {
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
  nutritionSummaryData: NutritionData | null = null;
  nutritionSubscription?: Subscription;


  constructor(
    private dailyLogService: DailyLogService,
    private productService: ProductService,
    private recipeService: RecipeService,
    private toastController: ToastController,
    private authService: AuthService,
    private router: Router,
    private nutritionUpdateService: NutritionUpdateService
  ) { }

  ngOnInit() {
    this.buildWeek();
    
    // Al inicio, seleccionamos el día actual o el primer día de la semana
    const todayObject = this.week.find(d => this.datesAreOnSameDay(d.date, new Date()));
    
    if (todayObject) {
      // Si el día actual está en la semana, lo seleccionamos
      this.authService.getProfile().subscribe((user: UserProfile) => {
        const obj = user.objetivosNutricionales || {} as any;
        this.dailyGoals = {
          calories: obj.calorias || 0,
          protein: obj.proteinas || 0,
          carbs: obj.carbohidratos || 0,
          fat: obj.grasas || 0
        };
        this.onDaySelected(todayObject);
      });
    } else if (this.week.length > 0) {
      // Si no, seleccionamos el primer día
      this.authService.getProfile().subscribe((user: UserProfile) => {
        const obj = user.objetivosNutricionales || {} as any;
        this.dailyGoals = {
          calories: obj.calorias || 0,
          protein: obj.proteinas || 0,
          carbs: obj.carbohidratos || 0,
          fat: obj.grasas || 0
        };
        this.onDaySelected(this.week[0]);
      });
    } else {
      console.warn("InicioPage: No se pudo determinar el día inicial a seleccionar.");
    }
    
    this.nutritionSubscription = this.nutritionUpdateService.nutritionUpdated$
      .subscribe({
        next: (dateStr: string) => {
          try {
            console.log('InicioPage: Actualizando por cambio en:', dateStr);
            const date = new Date(dateStr);
            if (this.datesAreOnSameDay(this.selectedDate, date)) { // Compara con this.selectedDate
              console.log('InicioPage: Recargando datos para fecha actual:', dateStr);
              this.loadSummary(this.selectedDate);
              this.loadDailyLog(this.selectedDate);
            }
          } catch (err) {
            console.error('InicioPage: Error al procesar actualización:', err);
          }
        },
        error: (err) => {
          console.error('InicioPage: Error en suscripción a actualizaciones:', err);
        }
      });
  }
  
  ngOnDestroy() {
    if (this.nutritionSubscription) {
      this.nutritionSubscription.unsubscribe();
    }
  }

  ionViewWillEnter() {
    // Se ejecuta cada vez que la página está a punto de entrar en la vista.
    // Recargar datos para el día seleccionado actualmente
    const activeDay = this.week.find(d => d.active);
    if (activeDay) {
      console.log('InicioPage: ionViewWillEnter - Recargando datos para:', activeDay.date);
      // No cambiamos la selección, solo recargamos los datos
      this.loadSummary(activeDay.date);
      this.loadDailyLog(activeDay.date);
    }
  }

  private buildWeek() {
    // Crear un nuevo array en lugar de modificar el existente
    const newWeek = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(this.baseMonday, i);
      newWeek.push({ 
        date: new Date(date), // Importante: crear nueva instancia de Date
        letter: date.toLocaleString('es-ES', { weekday: 'narrow' }), 
        active: false 
      });
    }
    // Asignar el nuevo array, no modificar el existente
    this.week = newWeek;
  }

  onDaySelected(day: WeekDay) {
    // Crear un nuevo array con nuevos objetos para forzar detección de cambios
    // Marcamos como activo solo el día seleccionado
    this.week = this.week.map(d => {
      const isActive = d.date.toDateString() === day.date.toDateString();
      return {
        ...d,
        active: isActive
      };
    });
    
    this.selectedDate = new Date(day.date);
    this.loadSummary(day.date);
    this.loadDailyLog(day.date);
  }

  private loadDailyLog(date: Date) {
    // Opcional: activar loading aquí también
    this.loading = true;
    
    this.dailyLogService.getDailyLogWithDetails(date).subscribe({
      next: (data: any) => {
        console.log('Datos de comidas actualizados:', data);
        
        // Asignar datos directamente
        if (data && data.comidas) {
          this.mealItems = data.comidas;
        } else {
          // Restablecer a valores por defecto si no hay datos
          this.mealItems = {
            desayuno: [],
            almuerzo: [],
            comida: [],
            merienda: [],
            cena: [],
            recena: []
          };
        }
        
        // Desactivar loading
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar el registro diario:', err);
        this.presentErrorToast('Error al cargar datos del día');
        this.loading = false;
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
    // Establecer loading si no está ya activo
    if (!this.loading) this.loading = true;
    
    this.dailyLogService.getSummary(date).subscribe({
      next: (res: SummaryResponse) => {
        console.log('Datos de resumen nutricional recibidos:', res);
        
        if (res) {
          // Crear un objeto completamente nuevo para la actualización
          this.currentConsumption = {
            calories: res.consumido?.calorias || 0,
            protein: res.consumido?.proteinas || 0,
            carbs: res.consumido?.carbohidratos || 0,
            fat: res.consumido?.grasas || 0
          };
  
          if (res.objetivo) {
            this.dailyGoals = {
              calories: res.objetivo.calorias || 0,
              protein: res.objetivo.proteinas || 0,
              carbs: res.objetivo.carbohidratos || 0,
              fat: res.objetivo.grasas || 0
            };
          }
  
          // Crear un objeto completamente nuevo para forzar la detección de cambios
          this.nutritionSummaryData = {
            consumido: {
              calorias: this.currentConsumption.calories,
              proteinas: this.currentConsumption.protein,
              carbohidratos: this.currentConsumption.carbs,
              grasas: this.currentConsumption.fat
            },
            objetivo: {
              calorias: this.dailyGoals.calories,
              proteinas: this.dailyGoals.protein,
              carbohidratos: this.dailyGoals.carbs,
              grasas: this.dailyGoals.fat
            },
            diferencia: {
              calorias: (this.dailyGoals.calories || 0) - (this.currentConsumption.calories || 0),
              proteinas: (this.dailyGoals.protein || 0) - (this.currentConsumption.protein || 0),
              carbohidratos: (this.dailyGoals.carbs || 0) - (this.currentConsumption.carbs || 0),
              grasas: (this.dailyGoals.fat || 0) - (this.currentConsumption.fat || 0),
            }
          };
          
          console.log('Nuevos datos de nutritionSummaryData:', this.nutritionSummaryData);
        } else {
          // Resetear completamente si no hay datos
          this.currentConsumption = { calories: 0, protein: 0, carbs: 0, fat: 0 };
          this.nutritionSummaryData = null;
        }
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar resumen nutricional:', err);
        this.nutritionSummaryData = null;
        this.currentConsumption = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        this.loading = false;
      }
    });
  }

  // Actualizado para no cambiar el día seleccionado al cambiar de semana
  loadWeek(direction: 'prev' | 'next') {
    // Determinar qué día de la semana está seleccionado actualmente
    let selectedDayIndex = -1;
    
    // Guardar la referencia del día activo antes de cambiar la semana
    const activeDay = this.week.find(d => d.active);
    if (activeDay) {
      // Determinar el índice del día activo (0-6, donde 0 es lunes)
      const activeDayOfWeek = activeDay.date.getDay();
      // Convertir de 0-6 (Do-Sa) a 0-6 (Lu-Do)
      selectedDayIndex = (activeDayOfWeek === 0) ? 6 : activeDayOfWeek - 1;
    }
    
    // Actualizar la semana base
    this.baseMonday = addDays(this.baseMonday, direction === 'next' ? 7 : -7);
    this.buildWeek();
    
    // Si había un día seleccionado, seleccionar el mismo día de la semana
    if (selectedDayIndex >= 0 && selectedDayIndex < this.week.length) {
      this.onDaySelected(this.week[selectedDayIndex]);
    } else {
      // Si no había un día seleccionado, no hacer nada (no seleccionar nada)
      // Esto permite que el usuario elija explícitamente qué día quiere ver
    }
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
  
  private datesAreOnSameDay(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate();
  }

  onMealItemClick(itemm: MealItem, mealType: string): void {
    console.log('Item clicked:', itemm, 'in meal:', mealType);

    if (itemm.productId) {
      // Si es un producto, navegar a la página de detalle del producto
      this.router.navigate(['/tabs/inicio/product', itemm.productId], {
        queryParams: {
          date: this.selectedDate.toISOString(),
          meal: mealType,
          editMode: 'true',
          currentQuantity: itemm.cantidad
        }
      });
    } else if (itemm.recipeId) {
      // Si es una receta, navegar a la página de detalle de la receta
      this.router.navigate(['/tabs/inicio/recipe', itemm.recipeId], {
        queryParams: {
          date: this.selectedDate.toISOString(),
          meal: mealType,
          editMode: 'true',
          currentQuantity: itemm.cantidad
        }
      });
    }
  }

  onRemoveMealItem(item: MealItem, mealType: string) {
    // Confirmar eliminación
    if (!confirm(`¿Quieres eliminar ${item.name} de tu ${mealType}?`)) {
      return;
    }
    
    this.loading = true;
    
    const activeDay = this.week.find(d => d.active);
    if (!activeDay) {
      this.loading = false;
      return;
    }
    
    // Verificar si es el último elemento de la comida
    const mealKey = mealType.toLowerCase() as keyof typeof this.mealItems;
    const isLastItem = this.mealItems[mealKey]?.length === 1;
    
    // Usar el servicio dailyLogService para eliminar el item
    this.dailyLogService.removeItemFromMeal(
      activeDay.date,
      mealType,
      item.productId || item.recipeId || '',
      !!item.recipeId
    ).subscribe({
      next: () => {
        console.log('Item eliminado correctamente');
        
        // Caso especial: Si era el último elemento, hacemos una recarga completa
        if (isLastItem) {
          console.log('Era el último elemento - haciendo recarga completa');
          
          // 1. Resetear completamente los datos
          this.currentConsumption = { calories: 0, protein: 0, carbs: 0, fat: 0 };
          
          // 2. Forzar la recreación completa del objeto nutritionSummaryData
          this.nutritionSummaryData = {
            consumido: { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
            objetivo: { 
              calorias: this.dailyGoals.calories, 
              proteinas: this.dailyGoals.protein,
              carbohidratos: this.dailyGoals.carbs,
              grasas: this.dailyGoals.fat
            },
            diferencia: {
              calorias: this.dailyGoals.calories,
              proteinas: this.dailyGoals.protein,
              carbohidratos: this.dailyGoals.carbs,
              grasas: this.dailyGoals.fat
            }
          };
          
          // 3. Actualizar la estructura de comidas
          this.mealItems[mealKey] = [];
        }
        
        // 4. Recargar datos con un pequeño delay para asegurar que el objeto anterior
        // ya ha sido renderizado y el cambio será detectado
        setTimeout(() => {
          // Forzar recargas completas
          this.loadDailyLog(activeDay.date);
          this.loadSummary(activeDay.date);
          this.loading = false;
        }, 50);
        
        this.presentSuccessToast(`${item.name} eliminado de ${mealType}`);
      },
      error: (err) => {
        console.error('Error al eliminar item:', err);
        this.presentErrorToast('No se pudo eliminar el elemento');
        this.loading = false;
      }
    });
  }
  
  // Añadir este método para mostrar mensajes de éxito
  async presentSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 1500,
      position: 'bottom',
      color: 'success'
    });
    toast.present();
  }
}