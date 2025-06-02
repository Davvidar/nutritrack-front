// src/app/tabs/perfil/settingsPage/settings.page.ts - Actualizado con gestión de temas
import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, AlertController, LoadingController, ToastController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// Servicios
import { AuthService, UserProfile } from '../../../services/auth.service';


// Importar los componentes de modales existentes
import { ProfileEditModalComponent } from '../../../components/profile-edit-modal/profile-edit-modal.component';
import { NutritionGoalsModalComponent } from '../../../components/nutrition-goals-edit/nutrition-goals-edit.modal';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    IonicModule, 
    CommonModule, 
    FormsModule
  ],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss']
})
export class SettingsPage implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  

  
  constructor(
    private authService: AuthService,

    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController,
    private router: Router
  ) {}

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  ionViewWillEnter() {
    this.loadProfile();
  }



  loadProfile() {
    this.authService.getProfile().subscribe({
      next: (profileData: UserProfile) => {
        this.profile = profileData;
      },
      error: (err) => {
        console.error('Error cargando perfil', err);
        this.presentToast('No se pudo cargar tu perfil', 'danger');
      }
    });
  } 



  // =============================================================================
  // MÉTODOS EXISTENTES (sin cambios)
  // =============================================================================

  async openProfileEditModal() {
    if (!this.profile) {
      this.presentToast('No se pudo cargar la información del perfil', 'warning');
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
    }
  }

  async openNutritionGoalsModal() {
    if (!this.profile || !this.profile.objetivosNutricionales) {
      this.presentToast('No se pudieron cargar los objetivos nutricionales', 'warning');
      return;
    }

    const currentGoals = this.profile.objetivosNutricionales;

    const modal = await this.modalController.create({
      component: NutritionGoalsModalComponent,
      componentProps: {
        currentGoals: currentGoals
      },
      cssClass: 'nutrition-goals-modal'
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data) {
      console.log('Nuevos objetivos guardados:', data);
      
      this.authService.updateProfile({ objetivosNutricionales: data }).subscribe({
        next: (updatedProfile) => {
          this.profile = updatedProfile;
          this.presentToast('Objetivos nutricionales actualizados', 'primary');
        },
        error: (err) => {
          console.error('Error actualizando objetivos', err);
          this.presentToast('Error al actualizar objetivos', 'danger');
        }
      });
    }
  }

  async changePassword() {
    const alert = await this.alertController.create({
      header: 'Cambiar contraseña',
      inputs: [
        {
          name: 'currentPassword',
          type: 'password',
          placeholder: 'Contraseña actual',
          cssClass: 'password-input'
        },
        {
          name: 'newPassword',
          type: 'password',
          placeholder: 'Nueva contraseña',
          cssClass: 'password-input'
        },
        {
          name: 'confirmPassword',
          type: 'password',
          placeholder: 'Confirmar nueva contraseña',
          cssClass: 'password-input'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cambiar',
          handler: async (data) => {
            if (!data.currentPassword || !data.newPassword || !data.confirmPassword) {
              this.presentToast('Por favor, completa todos los campos', 'warning');
              return false;
            }

            if (data.newPassword !== data.confirmPassword) {
              this.presentToast('Las contraseñas nuevas no coinciden', 'warning');
              return false;
            }

            if (data.newPassword.length < 6) {
              this.presentToast('La contraseña debe tener al menos 6 caracteres', 'warning');
              return false;
            }

            const loading = await this.loadingController.create({
              message: 'Cambiando contraseña...',
              spinner: 'circular'
            });
            await loading.present();

            this.authService.changePassword(data.currentPassword, data.newPassword)
              .subscribe({
                next: () => {
                  loading.dismiss();
                  this.presentToast('Contraseña cambiada correctamente', 'primary');
                },
                error: (err) => {
                  loading.dismiss();
                  this.presentToast(
                    err.error?.message || 'Error al cambiar la contraseña',
                    'danger'
                  );
                }
              });
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'Borrar cuenta',
      message: 'Esta acción no se puede deshacer. Se eliminarán todos tus datos de forma permanente.',
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: 'Confirma tu contraseña',
          cssClass: 'password-input'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          cssClass: 'danger-button',
          handler: async (data) => {
            if (!data.password) {
              this.presentToast('Por favor, introduce tu contraseña', 'warning');
              return false;
            }

            const confirmAlert = await this.alertController.create({
              header: '¿Estás seguro?',
              message: 'Esta acción eliminará permanentemente tu cuenta y todos los datos asociados.',
              buttons: [
                {
                  text: 'No',
                  role: 'cancel'
                },
                {
                  text: 'Sí, eliminar mi cuenta',
                  cssClass: 'danger-button',
                  handler: async () => {
                    const loading = await this.loadingController.create({
                      message: 'Eliminando cuenta...',
                      spinner: 'circular'
                    });
                    await loading.present();

                    this.authService.deleteAccount(data.password)
                      .subscribe({
                        next: () => {
                          loading.dismiss();
                          this.presentToast('Cuenta eliminada correctamente', 'primary');
                          this.router.navigate(['/auth/login']);
                        },
                        error: (err) => {
                          loading.dismiss();
                          this.presentToast(
                            err.error?.message || 'Error al eliminar la cuenta',
                            'danger'
                          );
                        }
                      });
                  }
                }
              ]
            });

            await confirmAlert.present();
            return false;
          }
        }
      ]
    });

    await alert.present();
  }

  async logout() {
    const loading = await this.loadingController.create({
      message: 'Cerrando sesión...',
      spinner: 'circular'
    });
    await loading.present();

    this.authService.logout().subscribe({
      next: () => {
        loading.dismiss();
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        loading.dismiss();
        this.presentToast('Error al cerrar sesión', 'danger');
        console.error('Error en logout', err);
      }
    });
  }

  async presentToast(message: string, color: 'primary' | 'warning' | 'danger' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }


}