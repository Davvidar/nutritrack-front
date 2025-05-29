import { Component, Input, OnInit } from '@angular/core';
import { IonicModule, ModalController, ToastController, AlertController } from '@ionic/angular';
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
  
  // Opciones para selects
  sexos = ['masculino', 'femenino', 'otro'];
  objetivos = ['perder peso', 'mantenerse', 'ganar músculo'];
  actividades = ['sedentario', 'ligero', 'moderado', 'activo', 'muy activo'];
  
  // Para detectar cambios en datos biométricos
  originalBiometricData: { peso: number; altura: number; edad: number; sexo: string; actividad: string; objetivo: string } = {
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
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.initForm();
    this.storeBiometricData();
  }
  
  private initForm() {
    this.profileForm = this.fb.group({
      nombre: [this.profile.nombre, Validators.required],
      apellido: [this.profile.apellido, Validators.required],
      peso: [this.profile.peso, [Validators.required, Validators.min(30), Validators.max(300)]],
      altura: [this.profile.altura, [Validators.required, Validators.min(100), Validators.max(250)]],
      edad: [this.profile.edad, [Validators.required, Validators.min(12), Validators.max(120)]],
      sexo: [this.profile.sexo, Validators.required],
      objetivo: [this.profile.objetivo, Validators.required],
      actividad: [this.profile.actividad, Validators.required]
    });
  }
  
  private storeBiometricData() {
    // Guardar valores originales para comparar después
    this.originalBiometricData = {
      peso: this.profile.peso,
      altura: this.profile.altura,
      edad: this.profile.edad,
      sexo: this.profile.sexo,
      actividad: this.profile.actividad,
      objetivo: this.profile.objetivo
    };
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
      this.presentToast('Por favor, completa correctamente todos los campos obligatorios', 'warning');
      return;
    }
    
    const formValue = this.profileForm.value;
    
    // Verificar si cambiaron datos biométricos
    if (this.hasBiometricDataChanged()) {
      // Preguntar si quiere recalcular objetivos nutricionales
      const shouldRecalculate = await this.askForRecalculation();
      
      this.saveProfile(formValue, shouldRecalculate);
    } else {
      // Si no cambiaron datos biométricos, guardar sin recalcular
      this.saveProfile(formValue, false);
    }
  }
  
  private async saveProfile(profileData: any, recalculateObjectives: boolean) {
    this.loading = true;
    
    // Crear objeto con datos a actualizar
    const updateData: Partial<UserProfile> = {
      ...profileData
    };
    
    // Si no queremos recalcular, enviamos explícitamente null para que el backend no recalcule
    if (!recalculateObjectives) {
      updateData.objetivosNutricionales = this.profile.objetivosNutricionales;
    }
    
    this.authService.updateProfile(updateData).subscribe({
      next: (updatedProfile) => {
        this.loading = false;
        this.presentToast('Perfil actualizado correctamente', 'primary');
        this.modalController.dismiss(updatedProfile);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al actualizar perfil:', err);
        this.error = 'Error al actualizar el perfil. Por favor, inténtalo de nuevo.';
        this.presentToast(this.error, 'danger');
      }
    });
  }
  
  async askForRecalculation(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.alertController.create({
        header: 'Recalcular objetivos',
        message: 'Has cambiado datos que afectan a tus objetivos nutricionales. ¿Quieres recalcular tus objetivos automáticamente?',
        buttons: [
          {
            text: 'No',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: 'Sí',
            handler: () => resolve(true)
          }
        ]
      }).then(alert => alert.present());
    });
  }
  
  async presentToast(message: string, color: 'primary' | 'danger' | 'warning' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
  
  dismiss() {
    this.modalController.dismiss();
  }
}