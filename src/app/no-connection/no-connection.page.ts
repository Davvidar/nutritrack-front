import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConnectionService } from '../services/connection.service';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-no-connection',
  templateUrl: './no-connection.page.html',
  styleUrls: ['./no-connection.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class NoConnectionPage implements OnInit, OnDestroy {
  private connectionSubscription?: Subscription;
  private retryAttempts = 0;
  private maxRetryAttempts = 3;
  public isRetrying = false;

  constructor(
    public connectionService: ConnectionService,
    private router: Router
  ) {}

  ngOnInit() {
    // Suscribirse a cambios en el estado de conexión
    this.connectionSubscription = this.connectionService.isOnline$.subscribe(isOnline => {
      if (isOnline) {
        // Si se recupera la conexión, redirigir a la página principal
        console.log('Conexión recuperada, redirigiendo...');
        this.router.navigate(['/tabs/inicio'], { replaceUrl: true });
      }
    });
  }

  ngOnDestroy() {
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
  }

  async retryConnection() {
    if (this.isRetrying) return;
    
    this.isRetrying = true;
    this.retryAttempts++;
    
    try {
      console.log(`Intento de reconexión ${this.retryAttempts}/${this.maxRetryAttempts}`);
      
      // Verificar conexión
      const isConnected = await this.connectionService.checkConnection();
      
      if (isConnected) {
        console.log('Conexión exitosa!');
        this.router.navigate(['/tabs/inicio'], { replaceUrl: true });
      } else {
        console.log('Sin conexión detectada');
        
        if (this.retryAttempts >= this.maxRetryAttempts) {
          console.log('Máximo número de intentos alcanzado');
          this.retryAttempts = 0; // Resetear para permitir más intentos después
        }
      }
    } catch (error) {
      console.error('Error al verificar conexión:', error);
    } finally {
      // Delay para mostrar el estado de "reintentando"
      setTimeout(() => {
        this.isRetrying = false;
      }, 1000);
    }
  }

  get canRetry(): boolean {
    return !this.isRetrying;
  }

  get retryButtonText(): string {
    if (this.isRetrying) {
      return 'Verificando...';
    }
    return this.retryAttempts > 0 ? `Reintentar (${this.retryAttempts}/${this.maxRetryAttempts})` : 'Reintentar Conexión';
  }
}