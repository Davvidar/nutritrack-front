// src/app/tabs/perfil/perfil.page.ts
import { Component, OnDestroy, OnInit, ViewChild, ChangeDetectorRef, NgZone } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NutritionSummaryComponent, NutritionData } from '../../components/nutrition-summary/nutrition-summary.component';
import { Macros } from '../../components/metrics-summary/metrics-summary.component';
import { Subscription } from 'rxjs';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { DailyLogService, SummaryResponse } from 'src/app/services/daily-log.service';
import { WeeklyWeightComparisonComponent } from 'src/app/components/weekly-weight-comparison/weekly-weight-comparison.component';
import { NutritionGoalsModalComponent } from 'src/app/components/nutrition-goals-edit/nutrition-goals-edit.modal';
import { ProfileEditModalComponent } from 'src/app/components/profile-edit-modal/profile-edit-modal.component';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    IonicModule, 
    CommonModule, 
    RouterModule, 
    NutritionSummaryComponent, 
    WeeklyWeightComparisonComponent
  ],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss']
})
export class PerfilPage implements OnInit, OnDestroy {
  // Referencia directa al componente
  @ViewChild(NutritionSummaryComponent) nutritionSummaryComponent?: NutritionSummaryComponent;

  profile: UserProfile | null = null;
  loading = true;
  error: string | null = null;

  // Datos de nutrición
  nutritionSummaryData: NutritionData | null = null;
  dailyGoals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  currentConsumption: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // Para el círculo de calorías en perfil
  caloriesConsumed: number = 0;
  caloriesPercentage: number = 0;
  caloriesGradient: string = 'conic-gradient(#e0e0e0 0% 100%)';
  today: Date = new Date();

  // Trigger para forzar actualizaciones del componente hijo
  forceUpdateTrigger: number = 0;

  private nutritionSubscription?: Subscription;
  private profileSubscription?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private dailyLogService: DailyLogService,
    private nutritionUpdateService: NutritionUpdateService,
    private cdr: ChangeDetectorRef,
    private modalController: ModalController,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    console.log('PerfilPage: ngOnInit - Inicializando');
    this.initializeProfile();
    this.setupNutritionSubscription();
  }

  ngOnDestroy(): void {
    console.log('PerfilPage: ngOnDestroy - Limpiando suscripciones');
    if (this.nutritionSubscription) {
      this.nutritionSubscription.unsubscribe();
    }
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe();
    }
  }

  ionViewWillEnter(): void {
    console.log('PerfilPage: ionViewWillEnter - Recargando datos');
    // Recargar datos cada vez que entramos a la vista
    this.loadDailyNutritionSummary();
  }

  private initializeProfile(): void {
    console.log('PerfilPage: Inicializando perfil');
    this.loading = true;
    this.error = null;

    this.profileSubscription = this.auth.getProfile().subscribe({
      next: (profileData: UserProfile) => {
        console.log('PerfilPage: Perfil cargado:', profileData);
        this.profile = profileData;
        this.loadGoalsFromProfile(profileData);
        this.loadDailyNutritionSummary();
      },
      error: (err: any) => {
        console.error('PerfilPage: Error cargando perfil', err);
        this.error = 'No se pudo cargar tu perfil. Inténtalo de nuevo más tarde.';
        this.loading = false;
      }
    });
  }

  private loadGoalsFromProfile(profileData: UserProfile): void {
    if (profileData.objetivosNutricionales) {
      this.dailyGoals = {
        calories: profileData.objetivosNutricionales.calorias || 0,
        protein: profileData.objetivosNutricionales.proteinas || 0,
        carbs: profileData.objetivosNutricionales.carbohidratos || 0,
        fat: profileData.objetivosNutricionales.grasas || 0
      };
      console.log('PerfilPage: Objetivos cargados:', this.dailyGoals);
    }
  }

  private setupNutritionSubscription(): void {
    console.log('PerfilPage: Configurando suscripción a actualizaciones nutricionales');
    
    this.nutritionSubscription = this.nutritionUpdateService.nutritionUpdated$
      .subscribe({
        next: (dateStr: string) => {
          console.log('PerfilPage: *** RECIBIDA NOTIFICACIÓN DE ACTUALIZACIÓN ***', dateStr);
          
          try {
            const updatedDate = new Date(dateStr);
            const today = new Date();

            console.log('PerfilPage: Comparando fechas:', {
              hoy: today.toDateString(),
              actualizada: updatedDate.toDateString(),
              sonIguales: this.datesAreOnSameDay(today, updatedDate)
            });

            if (this.datesAreOnSameDay(today, updatedDate)) {
              console.log('PerfilPage: *** FECHA COINCIDE - RECARGANDO DATOS ***');
              
              // Ejecutar en la zona de Angular para asegurar detección de cambios
              this.ngZone.run(() => {
                this.loadDailyNutritionSummary();
              });
            }
          } catch (err) {
            console.error('PerfilPage: Error al procesar notificación:', err);
          }
        },
        error: (err) => {
          console.error('PerfilPage: Error en suscripción:', err);
        }
      });
  }

  private loadDailyNutritionSummary(): void {
    console.log('PerfilPage: *** CARGANDO RESUMEN NUTRICIONAL ***');
    
    if (!this.profile) {
      console.log("PerfilPage: Perfil no disponible, omitiendo carga");
      this.loading = false;
      return;
    }

    const today = new Date();
    console.log('PerfilPage: Solicitando resumen para:', today.toISOString());

    this.dailyLogService.getSummary(today).subscribe({
      next: (summary: SummaryResponse) => {
        console.log('PerfilPage: *** RESUMEN NUTRICIONAL RECIBIDO ***', summary);
        this.processSummaryData(summary);
      },
      error: (err) => {
        console.error('PerfilPage: Error al cargar resumen nutricional:', err);
        this.handleSummaryError();
      }
    });
  }

  private processSummaryData(summary: SummaryResponse): void {
    console.log('PerfilPage: *** PROCESANDO DATOS DE RESUMEN ***');
    
    // Actualizar consumo actual
    const newConsumption = {
      calories: summary.consumido?.calorias || 0,
      protein: summary.consumido?.proteinas || 0,
      carbs: summary.consumido?.carbohidratos || 0,
      fat: summary.consumido?.grasas || 0
    };

    console.log('PerfilPage: Nuevo consumo:', newConsumption);
    console.log('PerfilPage: Consumo anterior:', this.currentConsumption);

    // Verificar si realmente cambió
    const hasChanged = JSON.stringify(newConsumption) !== JSON.stringify(this.currentConsumption);
    console.log('PerfilPage: ¿Los datos cambiaron?', hasChanged);

    this.currentConsumption = newConsumption;

    // Crear un objeto completamente nuevo con timestamp para forzar detección
    const timestamp = Date.now();
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

    // Incrementar trigger para forzar actualización
    this.forceUpdateTrigger = timestamp;

    console.log('PerfilPage: *** DATOS ACTUALIZADOS ***', {
      nutritionSummaryData: this.nutritionSummaryData,
      forceUpdateTrigger: this.forceUpdateTrigger
    });

    // Actualizar círculo de calorías
    this.updateCaloriesData();
    this.loading = false;

    // Forzar detección de cambios múltiples veces para asegurar que se actualice
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.cdr.detectChanges();
      if (this.nutritionSummaryComponent) {
        this.nutritionSummaryComponent.forceUpdate();
      }
    }, 100);

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 500);
  }

  private handleSummaryError(): void {
    console.log('PerfilPage: Manejando error de resumen');
    this.error = 'No se pudo cargar el resumen nutricional.';
    
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

    this.forceUpdateTrigger = Date.now();
    this.loading = false;
    this.cdr.detectChanges();
  }

  private updateCaloriesData(): void {
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
  }

  private updateCaloriesGradient(): void {
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

  // Método público para forzar actualización manual
  refreshData(): void {
    console.log('PerfilPage: *** ACTUALIZACIÓN MANUAL SOLICITADA ***');
    this.loadDailyNutritionSummary();
  }

  // Métodos de UI
  async openNutritionGoalsModal() {
    const currentGoalsFromProfile = this.profile?.objetivosNutricionales || {
      calorias: 2000,
      proteinas: 100,
      carbohidratos: 250,
      grasas: 70
    };

    const modal = await this.modalController.create({
      component: NutritionGoalsModalComponent,
      componentProps: {
        currentGoals: currentGoalsFromProfile
      }
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      console.log('PerfilPage: Nuevos objetivos guardados:', data);
      this.updateNutritionGoals(data);
    }
  }

  private updateNutritionGoals(nutritionGoals: any) {
    this.loading = true;
    
    const updateData = {
      objetivosNutricionales: nutritionGoals
    };
    
    this.auth.updateProfile(updateData).subscribe({
      next: (updatedProfile) => {
        this.profile = updatedProfile;
        this.loadGoalsFromProfile(updatedProfile);
        this.loadDailyNutritionSummary();
        console.log('PerfilPage: Objetivos nutricionales actualizados');
      },
      error: (err) => {
        console.error('PerfilPage: Error al actualizar objetivos:', err);
        this.loading = false;
      }
    });
  }

  // Métodos de navegación
  async editProfile(): Promise<void> {
    if (!this.profile) {
      console.error('PerfilPage: No hay perfil para editar');
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
      this.profile = data;
      this.initializeProfile();
    }
  }

  openSettings(): void {
    this.router.navigate(['tabs/perfil/settings']);
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        console.log('PerfilPage: Logout exitoso');
        this.router.navigate(['/auth/login']);
      },
      error: (err: any) => {
        console.error('PerfilPage: Error en logout', err);
        alert('Error al cerrar sesión: ' + (err.error?.message || err.message || JSON.stringify(err)));
      }
    });
  }
}