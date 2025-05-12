// src/app/tabs/perfil/perfil.page.ts
import { Component, OnDestroy, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NutritionSummaryComponent, NutritionData } from '../../components/nutrition-summary/nutrition-summary.component';
import { MetricsSummaryComponent, Macros } from '../../components/metrics-summary/metrics-summary.component';
import { Subscription } from 'rxjs';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { DailyLogService, SummaryResponse } from 'src/app/services/daily-log.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, NutritionSummaryComponent, MetricsSummaryComponent],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss']
})
export class PerfilPage implements OnInit, OnDestroy {
  // Referencia directa al componente
  @ViewChild(NutritionSummaryComponent) nutritionSummaryComponent?: NutritionSummaryComponent;
  
  profile: UserProfile | null = null;
  loading = true;
  error: string | null = null;
  
  // Control para forzar recreación del componente
  showNutritionSummary: boolean = true;
  
  // Ambos formatos de datos
  nutritionSummaryData: NutritionData | null = null;
  dailyGoals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  currentConsumption: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  
  // Para el círculo de calorías en perfil
  caloriesConsumed: number = 0; 
  caloriesPercentage: number = 0;
  caloriesGradient: string = 'conic-gradient(#e0e0e0 0% 100%)';
  today: Date = new Date();

  private nutritionSubscription?: Subscription;
  private profileSubscription?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private dailyLogService: DailyLogService,
    private nutritionUpdateService: NutritionUpdateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProfileAndNutrition();

    this.nutritionSubscription = this.nutritionUpdateService.nutritionUpdated$
      .subscribe({
        next: (dateStr: string) => {
          try {
            console.log('PerfilPage: Notificación de actualización recibida para fecha:', dateStr);
            const updatedDate = new Date(dateStr);
            const today = new Date();

            if (this.datesAreOnSameDay(today, updatedDate)) {
              console.log('PerfilPage: Fecha de actualización corresponde a hoy, recargando datos nutricionales');
              
              // Estrategia 1: Destruir temporalmente el componente
              this.showNutritionSummary = false;
              
              // Recargar los datos
              this.loadDailyNutritionSummary();
              
              // Recrear el componente después de un breve retraso
              setTimeout(() => {
                this.showNutritionSummary = true;
                
                // Estrategia 2: Forzar detección de cambios después de recrear
                setTimeout(() => {
                  this.forceNutritionSummaryUpdate();
                }, 100);
              }, 50);
            }
          } catch (err) {
            console.error('PerfilPage: Error al procesar notificación de actualización:', err);
          }
        },
        error: (err) => {
          console.error('PerfilPage: Error en suscripción a NutritionUpdateService:', err);
        }
      });
  }

  loadProfileAndNutrition(): void {
    this.loading = true;
    this.error = null;

    this.profileSubscription = this.auth.getProfile().subscribe({
      next: (profileData: UserProfile) => {
        this.profile = profileData;
        
        // Cargar objetivos desde el perfil
        if (profileData.objetivosNutricionales) {
          this.dailyGoals = {
            calories: profileData.objetivosNutricionales.calorias || 0,
            protein: profileData.objetivosNutricionales.proteinas || 0,
            carbs: profileData.objetivosNutricionales.carbohidratos || 0,
            fat: profileData.objetivosNutricionales.grasas || 0
          };
        }
        
        // Una vez que el perfil está cargado, carga el resumen nutricional
        this.loadDailyNutritionSummary();
        
        // Los datos de peso simulados
        if (this.profile && this.profile.peso) {
            if (this.profile.pesoAnterior === undefined) this.profile.pesoAnterior = this.profile.peso - 0.4;
            if (this.profile.pesoHoy === undefined) this.profile.pesoHoy = this.profile.peso - 0.1;
        }
      },
      error: (err: any) => {
        console.error('Error cargando perfil', err);
        this.error = 'No se pudo cargar tu perfil. Inténtalo de nuevo más tarde.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.nutritionSubscription) {
      this.nutritionSubscription.unsubscribe();
    }
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
    }
  }

  // Método para forzar actualización del componente hijo directamente
  forceNutritionSummaryUpdate(): void {
    if (this.nutritionSummaryComponent) {
      console.log('Actualizando componente nutrition-summary directamente');
      
      // Establecer datos directamente en el componente
      this.nutritionSummaryComponent.nutritionData = this.nutritionSummaryData;
      
      // Forzar actualización de las barras
      this.nutritionSummaryComponent.updateProgressBars();
      
      // Detectar cambios
      this.nutritionSummaryComponent.cdr.detectChanges();
    } else {
      console.log('El componente nutrition-summary no está disponible para actualización directa');
    }
    
    // También forzar detección de cambios en este componente
    this.cdr.detectChanges();
  }

  loadDailyNutritionSummary(): void {
    if (!this.profile) {
      console.log("PerfilPage: Perfil no cargado aún, omitiendo carga de resumen nutricional");
      this.loading = false;
      return;
    }

    const today = new Date();
    this.dailyLogService.getSummary(today).subscribe({
      next: (summary: SummaryResponse) => {
        console.log('PerfilPage: Recibidos datos de resumen nutricional:', summary);
        
        // Actualizar los datos en formato metrics-summary (nuestra fuente de verdad)
        this.currentConsumption = {
          calories: summary.consumido?.calorias || 0,
          protein: summary.consumido?.proteinas || 0,
          carbs: summary.consumido?.carbohidratos || 0,
          fat: summary.consumido?.grasas || 0
        };
        
        // Crear un nuevo objeto para nutrition-summary (importante: nuevo objeto, no modificar el existente)
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
            calorias: this.dailyGoals.calories - this.currentConsumption.calories,
            proteinas: this.dailyGoals.protein - this.currentConsumption.protein,
            carbohidratos: this.dailyGoals.carbs - this.currentConsumption.carbs,
            grasas: this.dailyGoals.fat - this.currentConsumption.fat
          }
        };
        
        console.log('PerfilPage: Datos de nutritionSummaryData actualizados:', JSON.stringify(this.nutritionSummaryData));
        
        // También actualizar datos para el círculo de calorías
        this.caloriesConsumed = this.currentConsumption.calories;
        if (this.dailyGoals.calories > 0) {
          this.caloriesPercentage = Math.min(
            (this.caloriesConsumed / this.dailyGoals.calories) * 100,
            100
          );
        } else {
          this.caloriesPercentage = 0;
        }
        
        this.updateCaloriesGradient();
        this.loading = false;
        
        // Intentar actualizar el componente directamente si está disponible
        setTimeout(() => {
          this.forceNutritionSummaryUpdate();
        }, 50);
      },
      error: (err) => {
        console.error('PerfilPage: Error al cargar el resumen nutricional diario', err);
        this.error = 'No se pudo cargar el resumen nutricional.';
        
        // Resetear a valores por defecto
        this.currentConsumption = { calories: 0, protein: 0, carbs: 0, fat: 0 };
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
        
        this.loading = false;
      }
    });
  }

  updateCaloriesGradient(): void {
    const progressColor = 'var(--ion-color-warning)';
    const bgColor = '#e9ecef';
    const displayPercentage = Math.max(0, Math.min(this.caloriesPercentage, 100));
    this.caloriesGradient = `conic-gradient(${progressColor} 0% ${displayPercentage}%, ${bgColor} ${displayPercentage}% 100%)`;
  }

  private datesAreOnSameDay(first: Date, second: Date): boolean {
    if (!first || !second) return false;
    return first.getFullYear() === second.getFullYear() &&
           first.getMonth() === second.getMonth() &&
           first.getDate() === second.getDate();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        console.log('Logout exitoso');
        this.router.navigate(['/auth/login']);
      },
      error: (err: any) => {
        console.error('Error en logout', err);
        alert('Error al cerrar sesión: ' + (err.error?.message || err.message || JSON.stringify(err)));
      }
    });
  }
  
  refreshData(): void {
    // Estrategia combinada: destruir, recargar, recrear y actualizar
    this.showNutritionSummary = false;
    
    setTimeout(() => {
      this.loadDailyNutritionSummary();
      
      setTimeout(() => {
        this.showNutritionSummary = true;
        
        setTimeout(() => {
          this.forceNutritionSummaryUpdate();
        }, 100);
      }, 50);
    }, 0);
  }
}