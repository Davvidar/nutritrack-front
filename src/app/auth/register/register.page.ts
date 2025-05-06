// src/app/auth/register.page.ts

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
  registerForm = this.fb.group({
    nombre:   ['', Validators.required],
    apellido: ['', Validators.required],
    correo:   ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    peso:     [null, [Validators.required, Validators.min(1)]],
    altura:   [null, [Validators.required, Validators.min(1)]],
    sexo:     ['', Validators.required],
    edad:     [null, [Validators.required, Validators.min(1)]],
    objetivo: ['', Validators.required],
    actividad:['', Validators.required]
  });

  sexos = ['masculino', 'femenino', 'otro'];
  objetivos = ['perder peso', 'mantenerse', 'ganar músculo'];
  actividades = ['sedentario','ligero','moderado','activo','muy activo'];

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (this.registerForm.invalid) {
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
