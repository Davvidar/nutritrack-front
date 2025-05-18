import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService, RegisterData } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss']
})
export class RegisterPage {
  // Formulario original, pero ahora lo manejaremos por pasos
  registerForm = this.fb.group({
    nombre:   ['', Validators.required],
    apellido: ['', Validators.required],
    correo:   ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]], // Añadido para confirmar contraseña
    peso:     [null, [Validators.required, Validators.min(1)]],
    altura:   [null, [Validators.required, Validators.min(1)]],
    sexo:     ['', Validators.required],
    edad:     [null, [Validators.required, Validators.min(1)]],
    objetivo: ['', Validators.required],
    actividad:['', Validators.required]
  });

  // Control de pasos
  currentStep: number = 1;
  totalSteps: number = 5;
  
  // Descripciones para niveles de actividad
  activityDescriptions = {
    'sedentario': 'Poco o ningún movimiento físico, principalmente inactivo.',
    'ligero': 'Actividad ligera 1-3 días por semana.',
    'moderado': 'Actividad moderada 3-5 días por semana.',
    'activo': 'Actividad intensa 5-7 días por semana.',
    'muy activo': 'Actividad muy intensa o entrenamientos diarios.'
  };

  sexos = ['masculino', 'femenino'];
  objetivos = ['perder peso', 'mantenerse', 'ganar músculo'];
  actividades = ['sedentario','ligero','moderado','activo','muy activo'];
  
  // Control de visibilidad de contraseña
  passwordVisible: boolean = false;
  confirmPasswordVisible: boolean = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  // Método para verificar validación solo de los campos del paso actual
  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.registerForm.get('nombre')!.valid && 
               this.registerForm.get('apellido')!.valid && 
               this.registerForm.get('edad')!.valid;
      case 2:
        return this.registerForm.get('peso')!.valid && 
               this.registerForm.get('altura')!.valid && 
               this.registerForm.get('sexo')!.valid;
      case 3:
        return this.registerForm.get('actividad')!.valid;
        
      case 4:
          
        return this.registerForm.get('objetivo')!.valid;
        
      case 5:
      
        return this.registerForm.get('correo')!.valid && 
               this.registerForm.get('password')!.valid &&
               this.registerForm.get('confirmPassword')!.valid &&
               this.verifyPasswordsMatch();
      default:
        return false;
    }
  }

  // Verificar que las contraseñas coinciden
  verifyPasswordsMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  // Avanzar al siguiente paso
  nextStep(): void {
    if (this.isCurrentStepValid() && this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  // Retroceder al paso anterior
  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Alternar visibilidad de contraseña
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  // Alternar visibilidad de confirmación de contraseña
  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  // Obtener descripción de actividad
  getActivityDescription(activity: string): string {
    return this.activityDescriptions[activity as keyof typeof this.activityDescriptions] || '';
  }

  // Enviar formulario completo
  onSubmit(): void {
    if (this.registerForm.invalid || !this.verifyPasswordsMatch()) {
      return;
    }

    const form = this.registerForm.value;
    const data: RegisterData = {
      nombre:   form.nombre   || '',
      apellido: form.apellido || '',
      correo:   form.correo   || '',
      password: form.password || '',
      peso:     form.peso     || 0,
      altura:   form.altura   || 0,
      sexo:     (form.sexo    as RegisterData['sexo'])      || 'masculino',
      edad:     form.edad     || 0,
      objetivo: (form.objetivo as RegisterData['objetivo']) || 'perder peso',
      actividad:(form.actividad as RegisterData['actividad'])|| 'sedentario'
    };

    this.auth.register(data).subscribe({
      next: () => {
        alert('Activa tu cuenta en el correo para iniciar sesión.');
        this.router.navigate(['/auth/login']);
      },
      error: (err: any) => {
        console.error(err);
        alert(err.error?.message || 'Error al registrar usuario.');
      }
    });
  }
}