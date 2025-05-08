import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service'; // Ajusta la ruta si es necesario

// Extiende UserProfile para incluir campos que podríamos necesitar (ejemplos)
export interface ExtendedUserProfile extends UserProfile {
  consumoActual?: {
    proteinas?: number;
    carbohidratos?: number;
    grasas?: number;
    calorias?: number; // Este sería el ideal para `caloriesConsumed`
  };
  pesoAnterior?: number;
  pesoHoy?: number;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss']
})
export class PerfilPage implements OnInit {
  profile: ExtendedUserProfile | null = null;
  loading = true;
  error: string | null = null;
  
  caloriesConsumed: number = 0; 
  caloriesPercentage: number = 0;
  caloriesGradient: string = 'conic-gradient(#e0e0e0 0% 100%)'; // Gris por defecto

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.getProfile().subscribe({
      next: (data: ExtendedUserProfile) => { // Especificar el tipo aquí
        this.profile = data;
        if (this.profile && this.profile.objetivosNutricionales) {
          const totalCaloriesGoal = this.profile.objetivosNutricionales['calorias'] || 0;
          
          // --- ¡¡¡ IMPORTANTE: ACTUALIZAR ESTA LÓGICA !!! ---
          // Debes obtener 'caloriesConsumed' de tus datos reales.
          // Ejemplo: si `profile.consumoActual.calorias` existe:
          this.caloriesConsumed = this.profile.consumoActual?.calorias || 1500; // Usando 1500 como fallback si no existe. CAMBIA ESTO.
          // --- FIN DE LA SECCIÓN IMPORTANTE ---

          if (totalCaloriesGoal > 0) {
            this.caloriesPercentage = Math.min((this.caloriesConsumed / totalCaloriesGoal) * 100, 100);
          } else {
            this.caloriesPercentage = 0;
          }
          this.updateCaloriesGradient();
        }
        // Simular datos de consumo y peso si no vienen del backend para demostración
        if (this.profile && !this.profile.consumoActual) {
            this.profile.consumoActual = { proteinas: 52, carbohidratos: 122, grasas: 12 };
        }
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

  updateCaloriesGradient() {
    const progressColor = 'var(--ion-color-warning)'; // Amarillo/Naranja de Ionic
    const bgColor = '#e9ecef'; // Un gris un poco más claro para el fondo del círculo
    const displayPercentage = Math.max(0, Math.min(this.caloriesPercentage, 100));
    this.caloriesGradient = `conic-gradient(${progressColor} 0% ${displayPercentage}%, ${bgColor} ${displayPercentage}% 100%)`;
  }

  logout() {
    this.auth.logout().subscribe({
      next: () => {
        console.log('Logout exitoso');
        this.router.navigate(['/auth/login']); // Ajusta a tu ruta de login
      },
      error: (err: any) => {
        console.error('Error en logout', err);
        // Considera usar ion-toast o ion-alert para mostrar errores al usuario
        alert('Error al cerrar sesión: ' + (err.error?.message || err.message || JSON.stringify(err)));
      }
    });
  }
}