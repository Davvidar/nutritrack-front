// src/app/tabs/perfil/perfil.page.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { NutritionSummaryComponent, NutritionData } from '../../components/nutrition-summary/nutrition-summary.component';
import { Subscription } from 'rxjs';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { DailyLogService, SummaryResponse } from 'src/app/services/daily-log.service';


/* export interface ExtendedUserProfile extends UserProfile {
  consumoActual?: {
    proteinas?: number;
    carbohidratos?: number;
    grasas?: number;
    calorias?: number;
  };
  pesoAnterior?: number;
  pesoHoy?: number;
} */



@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, NutritionSummaryComponent],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss']
})


export class PerfilPage implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  loading = true;
  error: string | null = null;
  nutritionSummaryData: NutritionData | null = null;
  
  caloriesConsumed: number = 0; 
  caloriesPercentage: number = 0;
  caloriesGradient: string = 'conic-gradient(#e0e0e0 0% 100%)'; // Gris por defecto
  today: Date = new Date();

  private nutritionSubscription?: Subscription;
  private profileSubscription?: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router,
    private dailyLogService: DailyLogService,
    private nutritionUpdateService: NutritionUpdateService
  ) {}

  ngOnInit(): void {
    this.loadProfileAndNutrition(); // Cargar perfil y luego la nutrición del día

    this.nutritionSubscription = this.nutritionUpdateService.nutritionUpdated$
      .subscribe({
        next: (dateStr: string) => {
          try {
            console.log('PerfilPage: Notificación de actualización recibida para fecha:', dateStr);
            const updatedDate = new Date(this.nutritionUpdateService.formatDateFromYYYYMMDD(dateStr)); // Necesitarás este método en el servicio
            const today = new Date();

            if (this.datesAreOnSameDay(today, updatedDate)) {
              console.log('PerfilPage: Fecha de actualización corresponde a hoy, recargando datos nutricionales.');
              this.loadDailyNutritionSummary(); // Solo recargar el resumen nutricional
            } else {
              console.log('PerfilPage: Fecha de actualización no es hoy, no se recargan datos para el perfil.');
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
  loadProfile(): void {
    this.auth.getProfile().subscribe({
      next: (profileData: UserProfile) => {
        this.profile = profileData;
        
        // Simular datos de peso si no vienen del backend para demostración
        if (this.profile && this.profile.peso && !this.profile.pesoAnterior) {
            this.profile.pesoAnterior = this.profile.peso - 0.4;
            this.profile.pesoHoy = this.profile.peso - 0.1;
        }
        
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error cargando perfil', err);
        this.error = 'No se pudo cargar tu perfil. Inténtalo de nuevo más tarde.';
        this.loading = false;
      }
    });
  }

  loadProfileAndNutrition(): void {
    this.loading = true;
    this.error = null; // Resetea error

    this.profileSubscription = this.auth.getProfile().subscribe({
      next: (profileData: UserProfile) => {
        this.profile = profileData;
        // Una vez que el perfil está cargado, carga el resumen nutricional
        this.loadDailyNutritionSummary();
        // Los datos de peso simulados deben estar aquí si dependen solo del perfil
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

  loadDailyNutritionSummary(): void {
    // No establecer loading = true aquí si es una recarga en segundo plano,
    // a menos que quieras mostrar un spinner específico para la sección de nutrición.
    // Si el perfil ya está cargado, no necesitamos un spinner global.
    if (!this.profile) {
        console.log("PerfilPage: Perfil no cargado aún, omitiendo carga de resumen nutricional.");
        this.loading = false; // Asegura que el loading se detenga si el perfil falló antes
        return;
    }

    const today = new Date();
    this.dailyLogService.getSummary(today).subscribe({
      next: (summary: SummaryResponse) => {
        // Mapea SummaryResponse a NutritionData
        this.nutritionSummaryData = {
          consumido: summary.consumido || { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
          objetivo: summary.objetivo || { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
          diferencia: summary.diferencia || { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
        };
        console.log('PerfilPage: Datos de resumen nutricional cargados/actualizados:', this.nutritionSummaryData);

        // Actualiza el círculo de calorías si todavía está en perfil.page.html
        this.caloriesConsumed = this.nutritionSummaryData.consumido.calorias;
        if (this.profile?.objetivosNutricionales?.calorias && this.profile.objetivosNutricionales.calorias > 0) {
          this.caloriesPercentage = Math.min(
            (this.caloriesConsumed / this.profile.objetivosNutricionales.calorias) * 100,
            100
          );
        } else {
          this.caloriesPercentage = 0;
        }
        this.updateCaloriesGradient();
        this.loading = false; // Detener loading después de que todo esté cargado/actualizado
      },
      error: (err) => {
        console.error('PerfilPage: Error al cargar el resumen nutricional diario', err);
        this.error = 'No se pudo cargar el resumen nutricional.';
        // Es importante inicializar nutritionSummaryData para evitar errores en la plantilla
        this.nutritionSummaryData = {
          consumido: { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
          objetivo: { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 },
          diferencia: { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
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
}