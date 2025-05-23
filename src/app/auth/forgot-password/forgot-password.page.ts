import { Component } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss']
})
export class ForgotPasswordPage {
  requestForm = this.fb.group({
    correo: ['', [Validators.required, Validators.email]]
  });

  loading = false;
  requestSent = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  async onSubmit() {
    if (this.requestForm.invalid) return;

    const correo = this.requestForm.get('correo')!.value!;
    this.loading = true;

    const loading = await this.loadingController.create({
      message: 'Enviando solicitud...',
      spinner: 'circular'
    });
    await loading.present();

    this.auth.requestPasswordReset(correo).subscribe({
      next: () => {
        loading.dismiss();
        this.loading = false;
        this.requestSent = true;
        this.presentToast('Se ha enviado un email con instrucciones para restablecer tu contraseña.', 'success');
      },
      error: (err) => {
        loading.dismiss();
        this.loading = false;
        console.error('Error al solicitar restablecimiento:', err);
        this.presentToast('Error al procesar tu solicitud. Por favor, intenta de nuevo.', 'danger');
      }
    });
  }

  async presentToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  backToLogin() {
    this.router.navigate(['/auth/login']);
  }
}