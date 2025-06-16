import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, merge } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Platform } from '@ionic/angular';
import { ConnectionStatus } from '@capacitor/network';

@Injectable({
  providedIn: 'root'
})
export class ConnectionService {
  private isOnlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$: Observable<boolean> = this.isOnlineSubject.asObservable();

  constructor(private platform: Platform) {
    // La inicialización se hace manualmente llamando initialize()
  }

  
  initialize() {
    this.initializeConnectionMonitoring();
  }

  private initializeConnectionMonitoring() {
    if (this.platform.is('hybrid')) {
      // Para dispositivos móviles (Capacitor)
      this.initializeCapacitorNetworkMonitoring();
    } else {
      // Para navegadores web
      this.initializeWebNetworkMonitoring();
    }
  }

  private initializeWebNetworkMonitoring() {
    // Escuchar eventos de conexión/desconexión del navegador
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));
    
    merge(online$, offline$)
      .pipe(startWith(navigator.onLine))
      .subscribe(isOnline => {
        this.updateConnectionStatus(isOnline);
      });
  }

  private async initializeCapacitorNetworkMonitoring() {
    try {
      // Importar dinámicamente el plugin de Network de Capacitor
      const { Network } = await import('@capacitor/network');
      
      // Obtener el estado inicial
      const status = await Network.getStatus();
      this.updateConnectionStatus(status.connected);
      
      // Escuchar cambios en el estado de la red
      Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        this.updateConnectionStatus(status.connected);
      });
    } catch (error) {
      console.warn('Network plugin no disponible, usando detección web:', error);
      this.initializeWebNetworkMonitoring();
    }
  }

  private updateConnectionStatus(isOnline: boolean) {
    if (this.isOnlineSubject.value !== isOnline) {
      this.isOnlineSubject.next(isOnline);
      console.log(`Estado de conexión cambiado: ${isOnline ? 'Conectado' : 'Desconectado'}`);
    }
  }

  /**
   * Obtiene el estado actual de la conexión
   */
  get isOnline(): boolean {
    return this.isOnlineSubject.value;
  }

  /**
   * Verifica manualmente el estado de la conexión
   */
  async checkConnection(): Promise<boolean> {
    if (this.platform.is('hybrid')) {
      try {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        this.updateConnectionStatus(status.connected);
        return status.connected;
      } catch (error) {
        console.warn('Error al verificar conexión:', error);
        return navigator.onLine;
      }
    } else {
      // Para web, verificar con una petición real
      try {
        const response = await fetch('/assets/icon/favicon.png', {
          method: 'HEAD',
          cache: 'no-cache'
        });
        const isOnline = response.ok;
        this.updateConnectionStatus(isOnline);
        return isOnline;
      } catch (error) {
        this.updateConnectionStatus(false);
        return false;
      }
    }
  }

  /**
   * Simula una pérdida de conexión (para testing)
   */
  simulateOffline() {
    this.updateConnectionStatus(false);
  }

  /**
   * Simula una recuperación de conexión (para testing)
   */
  simulateOnline() {
    this.updateConnectionStatus(true);
  }
}