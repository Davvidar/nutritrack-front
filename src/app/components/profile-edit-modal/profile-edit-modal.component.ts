// src/app/components/profile-edit-modal/profile-edit-modal.component.ts - Versión Mejorada

import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-profile-edit-modal',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './profile-edit-modal.component.html',
  styleUrls: ['./profile-edit-modal.component.scss']
})
export class ProfileEditModalComponent implements OnInit {
  @Input() profile!: UserProfile;
  
  profileForm!: FormGroup;
  loading = false;
  error: string | null = null;
  
  // Opciones para selects con labels amigables
  sexos = ['masculino', 'femenino'];
  objetivos = ['perder peso', 'mantenerse', 'ganar músculo'];
  actividades = ['sedentario', 'ligero', 'moderado', 'activo', 'muy activo'];
  
  // Labels amigables para los selects
  private sexoLabels = {
    'masculino': 'Masculino',
    'femenino': 'Femenino'
  };
  
  private objetivoLabels = {
    'perder peso': 'Perder peso',
    'mantenerse': 'Mantener peso',
    'ganar músculo': 'Ganar músculo'
  };
  
  private actividadLabels = {
    'sedentario': 'Sedentario (poco o ningún ejercicio)',
    'ligero': 'Ligero (ejercicio ligero 1-3 días/semana)',
    'moderado': 'Moderado (ejercicio moderado 3-5 días/semana)',
    'activo': 'Activo (ejercicio fuerte 6-7 días/semana)',
    'muy activo': 'Muy activo (ejercicio muy fuerte, trabajo físico)'
  };
  
  // Para detectar cambios en datos biométricos
  originalBiometricData: { 
    peso: number; 
    altura: number; 
    edad: number; 
    sexo: string; 
    actividad: string; 
    objetivo: string;
  } = {
    peso: 0,
    altura: 0,
    edad: 0,
    sexo: '',
    actividad: '',
    objetivo: ''
  };

  constructor(
    private modalController: ModalController,
    private fb: FormBuilder,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {
    this.initForm();
    this.storeBiometricData();
  }
  
  private initForm() {
    this.profileForm = this.fb.group({
      nombre: [this.profile.nombre, [Validators.required, Validators.minLength(2)]],
      apellido: [this.profile.apellido, [Validators.required, Validators.minLength(2)]],
      peso: [this.profile.peso, [Validators.required, Validators.min(30), Validators.max(300)]],
      altura: [this.profile.altura, [Validators.required, Validators.min(100), Validators.max(250)]],
      edad: [this.profile.edad, [Validators.required, Validators.min(12), Validators.max(120)]],
      sexo: [this.profile.sexo, [Validators.required]],
      actividad: [this.profile.actividad, [Validators.required]],
      objetivo: [this.profile.objetivo, [Validators.required]]
    });
  }
  
  private storeBiometricData() {
    this.originalBiometricData = {
      peso: this.profile.peso,
      altura: this.profile.altura,
      edad: this.profile.edad,
      sexo: this.profile.sexo,
      actividad: this.profile.actividad,
      objetivo: this.profile.objetivo
    };
  }
  
  // Métodos de validación
  hasPersonalErrors(): boolean {
    const nombre = this.profileForm.get('nombre');
    const apellido = this.profileForm.get('apellido');
    
    return !!(
      (nombre?.touched && nombre?.invalid) ||
      (apellido?.touched && apellido?.invalid)
    );
  }
  
    hasBiometricErrors(): boolean {
    const peso = this.profileForm.get('peso');
    const altura = this.profileForm.get('altura');
    const edad = this.profileForm.get('edad');
    const sexo = this.profileForm.get('sexo');
    
    return !!(
      (peso?.touched && peso?.invalid) ||
      (altura?.touched && altura?.invalid) ||
      (edad?.touched && edad?.invalid) ||
      (sexo?.touched && sexo?.invalid)
    );
  }
  
  hasGoalsErrors(): boolean {
    const objetivo = this.profileForm.get('objetivo');
    const actividad = this.profileForm.get('actividad');
    
    return !!(
      (objetivo?.touched && objetivo?.invalid) ||
      (actividad?.touched && actividad?.invalid)
    );
  }
  

  hasBiometricDataChanged(): boolean {
    const currentForm = this.profileForm.value;
    
    return currentForm.peso !== this.originalBiometricData.peso ||
           currentForm.altura !== this.originalBiometricData.altura ||
           currentForm.edad !== this.originalBiometricData.edad ||
           currentForm.sexo !== this.originalBiometricData.sexo ||
           currentForm.actividad !== this.originalBiometricData.actividad ||
           currentForm.objetivo !== this.originalBiometricData.objetivo;
  }
  
  async onSubmit() {
    if (this.profileForm.invalid) {
      await this.presentToast('Por favor, completa correctamente todos los campos obligatorios', 'warning');
      this.markFormGroupTouched(this.profileForm);
      return;
    }
    
    const formValue = this.profileForm.value;
    
    // Verificar si cambiaron datos biométricos
    if (this.hasBiometricDataChanged()) {
      const shouldRecalculate = await this.askForRecalculation();
      await this.saveProfile(formValue, shouldRecalculate);
    } else {
      await this.saveProfile(formValue, false);
    }
  }
  
  private async saveProfile(profileData: any, recalculateObjectives: boolean) {
    const loading = await this.loadingController.create({
      message: 'Guardando cambios...',
      spinner: 'crescent'
    });
    await loading.present();
    
    try {
      
      const updateData: Partial<UserProfile> = { ...profileData };   
      
      if (!recalculateObjectives) {
        updateData.objetivosNutricionales = this.profile.objetivosNutricionales;
        console.log('Enviando con objetivos actuales mantenidos:', updateData.objetivosNutricionales);
      } else {
        console.log('Enviando SIN objetivosNutricionales para activar recálculo automático');
      }
      
      console.log('Datos que se envían al backend:', updateData);
      
      const updatedProfile = await this.authService.updateProfile(updateData).toPromise();
      
      await loading.dismiss();
      
      if (recalculateObjectives) {
        await this.presentToast('Perfil actualizado y objetivos recalculados correctamente', 'success');
      } else {
        await this.presentToast('Perfil actualizado correctamente', 'success');
      }
      
      this.modalController.dismiss(updatedProfile);
      
    } catch (err: any) {
      await loading.dismiss();
      console.error('Error al actualizar perfil:', err);
      this.error = 'Error al actualizar el perfil. Por favor, inténtalo de nuevo.';
      await this.presentToast(this.error, 'danger');
    }
  }
  
  async askForRecalculation(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.alertController.create({
        header: 'Recalcular objetivos',
        message: 'Has cambiado datos que afectan a tus objetivos nutricionales. ¿Quieres recalcular automáticamente tus objetivos de calorías y macronutrientes?',
        cssClass: 'custom-alert',
        buttons: [
          {
            text: 'No, mantener actuales',
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
              console.log('Usuario eligió NO recalcular objetivos');
              resolve(false);
            }
          },
          {
            text: 'Sí, recalcular',
            cssClass: 'primary',
            handler: () => {
              console.log('Usuario eligió SÍ recalcular objetivos');
              resolve(true);
            }
          }
        ]
      }).then(alert => alert.present());
    });
  }
  
  // Método para obtener etiquetas amigables
  getSexoLabel(sexo: string): string {
    return this.sexoLabels[sexo as keyof typeof this.sexoLabels] || sexo;
  }
  
  getObjetivoLabel(objetivo: string): string {
    return this.objetivoLabels[objetivo as keyof typeof this.objetivoLabels] || objetivo;
  }
  
  getActividadLabel(actividad: string): string {
    return this.actividadLabels[actividad as keyof typeof this.actividadLabels] || actividad;
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control && typeof control === 'object' && 'controls' in control) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
  
  async presentToast(message: string, color: 'primary' | 'success' | 'warning' | 'danger' = 'primary') {
    const iconMap = {
      primary: 'information-circle',
      success: 'checkmark-circle',
      warning: 'warning',
      danger: 'alert-circle'
    };
    
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      icon: iconMap[color],
      buttons: [
        {
          text: 'OK',
          role: 'cancel'
        }
      ]
    });
    await toast.present();
  }
  
  dismiss() {
    this.modalController.dismiss();
  }

  private isValidWeight(weight: number): boolean {
    return weight >= 30 && weight <= 300;
  }
  
  private isValidHeight(height: number): boolean {
    return height >= 100 && height <= 250;
  }
  
  private isValidAge(age: number): boolean {
    return age >= 12 && age <= 120;
  }
}