// src/app/tabs/perfil/perfil.page.ts
import { Component, OnDestroy, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NutritionSummaryComponent, NutritionData } from '../../components/nutrition-summary/nutrition-summary.component';
import { MetricsSummaryComponent, Macros } from '../../components/metrics-summary/metrics-summary.component';
import { Subscription } from 'rxjs';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { DailyLogService, SummaryResponse } from 'src/app/services/daily-log.service';
import { WeeklyWeightAverageComponent } from 'src/app/components/weekly-weight-average/weekly-weight-average.component';
import { NutritionGoalsModalComponent  } from 'src/app/components/nutrition-goals-edit/nutrition-goals-edit.modal';
import { ProfileEditModalComponent } from 'src/app/components/profile-edit-modal/profile-edit-modal.component';
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule,  NutritionSummaryComponent, MetricsSummaryComponent, WeeklyWeightAverageComponent],
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

  weightStartDate = new Date(new Date().setMonth(new Date().getMonth() - 2));

  private nutritionSubscription?: Subscription;
  private profileSubscription?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private dailyLogService: DailyLogService,
    private nutritionUpdateService: NutritionUpdateService,
    private cdr: ChangeDetectorRef,
    private modalController: ModalController
  ) { }

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

async openNutritionGoalsModal() {
  // Asume que 'this.profile.objetivosNutricionales' tiene los datos actuales
  const currentGoalsFromProfile = this.profile?.objetivosNutricionales || {
    calorias: 2000, // Valores por defecto si no existen
    proteinas: 100,
    carbohidratos: 250,
    grasas: 70
  };

  const modal = await this.modalController.create({
    component: NutritionGoalsModalComponent,
    componentProps: {
      currentGoals: currentGoalsFromProfile // <--- Aquí pasas los datos actuales
    },
    // ... otras opciones del modal como cssClass, breakpoints ...
  });

  await modal.present();

  const { data, role } = await modal.onWillDismiss();
  if (role === 'confirm' && data) {
    console.log('Nuevos objetivos guardados:', data);
    // Aquí actualizas los objetivos del usuario en tu servicio/backend
    // y refrescas la UI de la página de perfil si es necesario.
  }
}



  // Método para actualizar objetivos nutricionales en el backend
  private updateNutritionGoals(nutritionGoals: any) {
    this.loading = true;
    
    // Preparar datos para la actualización
    const updateData = {
      objetivosNutricionales: nutritionGoals
    };
    
    this.auth.updateProfile(updateData).subscribe({
      next: (updatedProfile) => {
        // Actualizar el perfil local
        this.profile = updatedProfile;
        
        // Actualizar los valores de dailyGoals para el componente de métricas
        this.dailyGoals = {
          calories: nutritionGoals.calorias || 0,
          protein: nutritionGoals.proteinas || 0,
          carbs: nutritionGoals.carbohidratos || 0,
          fat: nutritionGoals.grasas || 0
        };
        
        // Actualizar también nutritionSummaryData
        if (this.nutritionSummaryData) {
          this.nutritionSummaryData = {
            ...this.nutritionSummaryData,
            objetivo: {
              calorias: nutritionGoals.calorias || 0,
              proteinas: nutritionGoals.proteinas || 0,
              carbohidratos: nutritionGoals.carbohidratos || 0,
              grasas: nutritionGoals.grasas || 0
            },
            diferencia: {
              calorias: (nutritionGoals.calorias || 0) - (this.nutritionSummaryData.consumido?.calorias || 0),
              proteinas: (nutritionGoals.proteinas || 0) - (this.nutritionSummaryData.consumido?.proteinas || 0),
              carbohidratos: (nutritionGoals.carbohidratos || 0) - (this.nutritionSummaryData.consumido?.carbohidratos || 0),
              grasas: (nutritionGoals.grasas || 0) - (this.nutritionSummaryData.consumido?.grasas || 0)
            }
          };
        }
        
        // Forzar actualización de la interfaz
        this.refreshData();
        
        // Notificar éxito
        // Podríamos usar un toast aquí
        console.log('Objetivos nutricionales actualizados con éxito');
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al actualizar objetivos nutricionales:', err);
        // Notificar error
        // Podríamos usar un toast aquí
        this.loading = false;
      }
    });
  }

  getWeightChange(): number | null {
    if (!this.profile) return null;
    const actual = this.profile.pesoHoy || this.profile.peso || 0;
    const inicial = this.profile.pesoAnterior || this.profile.peso || 0;
    return actual - inicial;
  }

  getTargetWeight(): number {
    if (!this.profile) return 0;

    // Lógica para determinar peso objetivo
    // Se puede calcular basado en el objetivo del usuario, IMC, etc.
    const currentWeight = this.profile.peso || 0;

    if (this.profile.objetivo === 'perder peso') {
      return Math.round((currentWeight * 0.9) * 10) / 10; // 10% menos
    } else if (this.profile.objetivo === 'ganar músculo') {
      return Math.round((currentWeight * 1.05) * 10) / 10; // 5% más
    } else {
      return currentWeight; // Mantener peso
    }
  }
  getWeightRemaining(): number | null {
    if (!this.profile) return null;

    const targetWeight = this.getTargetWeight();
    const currentWeight = this.profile.pesoHoy || this.profile.peso || 0;

    // Si objetivo es perder peso, será negativo
    // Si objetivo es ganar, será positivo
    const remaining = targetWeight - currentWeight;

    // Devolver valor absoluto redondeado a 1 decimal
    return Math.abs(Math.round(remaining * 10) / 10);
  }

  // Método para ir a la pantalla de edición de perfil
   async editProfile(): Promise<void> {
    if (!this.profile) {
      console.error('No hay perfil para editar');
      return;
    }

    const modal = await this.modalController.create({
      component: ProfileEditModalComponent,
      componentProps: {
        profile: this.profile
      },
      cssClass: 'profile-edit-modal'
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data) {
      // Actualizar perfil local si recibimos datos del modal
      this.profile = data;
      
      // Recargar la información para actualizar la UI
      this.loadProfileAndNutrition();
    }
  }


  // Método para abrir configuración
  openSettings(): void {
    // Abrir configuración
    console.log('Abrir configuración');
    // this.router.navigate(['/configuracion']);
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