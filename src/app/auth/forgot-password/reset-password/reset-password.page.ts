import { Component, OnInit } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss']
})
export class ResetPasswordPage implements OnInit {
  resetForm: FormGroup;
  token: string = '';
  loading = false;
  passwordVisible = false;
  confirmPasswordVisible = false;
  resetSuccess = false;
  tokenError = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.checkPasswords });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
      } else {
        this.tokenError = true;
      }
    });
  }

  checkPasswords(group: FormGroup) {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { notMatching: true };
  }

  togglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility() {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  async onSubmit() {
    if (this.resetForm.invalid) return;

    this.loading = true;
    const loading = await this.loadingController.create({
      message: 'Restableciendo contraseña...',
      spinner: 'circular'
    });
    await loading.present();

    const newPassword = this.resetForm.get('newPassword')?.value;

    this.auth.resetPassword(this.token, newPassword).subscribe({
      next: () => {
        loading.dismiss();
        this.loading = false;
        this.resetSuccess = true;
        this.presentToast('Contraseña restablecida correctamente. Ya puedes iniciar sesión.', 'primary');
      },
      error: (err) => {
        loading.dismiss();
        this.loading = false;
        console.error('Error al restablecer contraseña:', err);
        
        // Si el token es inválido o expirado
        if (err.status === 400) {
          this.tokenError = true;
          this.presentToast('El enlace de restablecimiento ha expirado o no es válido. Por favor, solicita uno nuevo.', 'danger');
        } else {
          this.presentToast('Error al restablecer la contraseña. Por favor, intenta de nuevo.', 'danger');
        }
      }
    });
  }

  async presentToast(message: string, color: 'primary' | 'danger' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}