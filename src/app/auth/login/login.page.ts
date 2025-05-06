import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  loginForm = this.fb.group({
    correo:   ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  // para toggle de visibilidad de contraseña
  passwordType: 'password' | 'text' = 'password';
  passwordIcon = 'eye-off-outline';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  togglePasswordVisibility() {
    if (this.passwordType === 'password') {
      this.passwordType = 'text';
      this.passwordIcon = 'eye-outline';
    } else {
      this.passwordType = 'password';
      this.passwordIcon = 'eye-off-outline';
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
  
    const correo   = this.loginForm.get('correo')!.value!;
    const password = this.loginForm.get('password')!.value!;
    console.log('🐞 Lanzando login con:', { correo, password });
  
    this.auth.login({ correo, password }).subscribe({
      next: ({ token, user }) => {
        console.log('✅ Login OK, token:', token, 'user:', user);
        this.auth.saveToken(token);
        this.router.navigate(['/tabs/inicio']);
      },
      error: (err: any) => {
        console.error('❌ Error en login:', err);
        alert('Error de login: ' + (err.error?.message || err.message || JSON.stringify(err)));
      }
    });
  }
  
}
