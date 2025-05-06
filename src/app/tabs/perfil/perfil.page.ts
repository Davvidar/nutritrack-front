import { Component, OnInit } from '@angular/core';
import { IonicModule }     from '@ionic/angular';
import { CommonModule }    from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss']
})
export class PerfilPage implements OnInit {
  profile: UserProfile | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.getProfile().subscribe({
      next: data => {
        this.profile = data;
        this.loading = false;
      },
      error: err => {
        console.error('Error cargando perfil', err);
        this.error = 'No se pudo cargar tu perfil.';
        this.loading = false;
      }
    });
  }

logout() {
    this.auth.logout().subscribe({
      next: () => {
        console.log('Logout exitoso');
        this.router.navigate(['/auth/login']);
      },
      error: err => {
        console.error('Error en logout', err);
        alert('Error al cerrar sesión: ' + (err.error?.message || err.message || JSON.stringify(err)));
      }
    });
  }
}
