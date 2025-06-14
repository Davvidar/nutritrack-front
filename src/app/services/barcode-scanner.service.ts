// src/app/services/barcode-scanner.service.ts - VERSIÓN CORREGIDA
import { Injectable } from '@angular/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class BarcodeScannerService {
  private scannerElement: HTMLElement | null = null;
  private originalBodyBackground: string = '';
  private originalAppBackground: string = '';

  constructor(private platform: Platform) {}

  async startScan(): Promise<string | null> {
    try {
      // Verificar si estamos en una plataforma nativa
      if (!this.platform.is('capacitor')) {
        console.log('El escáner solo funciona en dispositivos móviles');
        return null;
      }

      // Verificar permisos
      const allowed = await this.checkPermission();
      if (!allowed) {
        return null;
      }

      // **NUEVO: Guardar y quitar fondos antes de iniciar**
      this.saveOriginalBackgrounds();
      this.makeBackgroundsTransparent();

      // Hacer el background transparente
      await BarcodeScanner.hideBackground();
      
      // Añadir clases para ocultar la UI
      document.querySelector('body')?.classList.add('scanner-active');
      document.querySelector('ion-app')?.classList.add('scanner-active');
      
      // Ocultar elementos específicos si es necesario
      const ionContents = document.querySelectorAll('ion-content');
      ionContents.forEach(content => content.classList.add('scanner-hidden'));
      
      // Crear y mostrar la UI del escáner
      await this.createScannerUI();

      // Iniciar el escaneo
      const result = await BarcodeScanner.startScan();

      // Limpiar UI
      this.cleanup();

      if (result.hasContent) {
        return result.content;
      }

      return null;
    } catch (err) {
      console.error('Error durante el escaneo:', err);
      this.cleanup();
      throw err;
    }
  }

  async stopScan(): Promise<void> {
    try {
      await BarcodeScanner.stopScan();
      await BarcodeScanner.showBackground();
      this.cleanup();
    } catch (err) {
      console.error('Error al detener el escáner:', err);
    }
  }

  private cleanup(): void {
    this.removeScannerUI();
    
    // Remover clases CSS
    document.querySelector('body')?.classList.remove('scanner-active');
    document.querySelector('ion-app')?.classList.remove('scanner-active');
    
    const ionContents = document.querySelectorAll('ion-content');
    ionContents.forEach(content => content.classList.remove('scanner-hidden'));
    
    // Restaurar elementos ocultos
    this.showAllPageElements();
    
    // **NUEVO: Restaurar fondos originales**
    this.restoreOriginalBackgrounds();
  }

  /**
   * **NUEVO MÉTODO: Guarda los fondos originales**
   */
  private saveOriginalBackgrounds(): void {
    const body = document.querySelector('body') as HTMLElement;
    const app = document.querySelector('ion-app') as HTMLElement;
    
    if (body) {
      this.originalBodyBackground = body.style.backgroundColor || 
        getComputedStyle(body).backgroundColor;
    }
    
    if (app) {
      this.originalAppBackground = app.style.backgroundColor || 
        getComputedStyle(app).backgroundColor;
    }
    
    console.log('Fondos originales guardados:', {
      body: this.originalBodyBackground,
      app: this.originalAppBackground
    });
  }

  /**
   * **NUEVO MÉTODO: Hace los fondos transparentes para mostrar la cámara**
   */
  private makeBackgroundsTransparent(): void {
    const body = document.querySelector('body') as HTMLElement;
    const app = document.querySelector('ion-app') as HTMLElement;
    
    if (body) {
      body.style.setProperty('background-color', 'transparent', 'important');
      body.style.setProperty('background', 'transparent', 'important');
    }
    
    if (app) {
      app.style.setProperty('background-color', 'transparent', 'important');
      app.style.setProperty('background', 'transparent', 'important');
    }
    
    console.log('Fondos configurados como transparentes');
  }

  /**
   * **NUEVO MÉTODO: Restaura los fondos originales**
   */
  private restoreOriginalBackgrounds(): void {
    const body = document.querySelector('body') as HTMLElement;
    const app = document.querySelector('ion-app') as HTMLElement;
    
    if (body) {
      body.style.removeProperty('background-color');
      body.style.removeProperty('background');
    }
    
    if (app) {
      app.style.removeProperty('background-color');
      app.style.removeProperty('background');
    }
    
    console.log('Fondos originales restaurados');
  }

  private async checkPermission(): Promise<boolean> {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });

      if (status.granted) {
        return true;
      }

      if (status.denied) {
        console.log('Permiso de cámara denegado');
        return false;
      }

      if (status.neverAsked) {
        const newStatus = await BarcodeScanner.checkPermission({ force: true });
        if (newStatus.granted) {
          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('Error verificando permisos:', err);
      return false;
    }
  }

  private async createScannerUI(): Promise<void> {
    // Primero, ocultar todos los elementos de la página
    this.hideAllPageElements();
    
    // Crear el overlay del escáner
    this.scannerElement = document.createElement('div');
    this.scannerElement.className = 'scanner-ui';
    
    this.scannerElement.innerHTML = `
      <div class="scanner-container">
        <div class="scanner-header">
          <ion-button fill="clear" color="light" class="close-scanner">
            <ion-icon name="close" slot="icon-only"></ion-icon>
          </ion-button>
          <div class="scanner-title">Escanear código de barras</div>
        </div>
        <div class="scanner-area">
          <div class="scanner-frame">
            <div class="scanner-line"></div>
          </div>
          <div class="scanner-instructions">
            Coloca el código de barras dentro del recuadro
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.scannerElement);

    // Añadir evento para cerrar el escáner
    const closeButton = this.scannerElement.querySelector('.close-scanner');
    closeButton?.addEventListener('click', () => {
      this.stopScan();
    });
  }

  private hideAllPageElements(): void {
    // Ocultar todos los elementos principales de Ionic
    const elements = [
      'ion-router-outlet',
      'ion-page',
      'ion-header',
      'ion-content',
      'ion-footer',
      'ion-tab-bar',
      'ion-tabs',
      '.tabs-inner',
      'app-week-slider',
      'app-metrics-summary',
      'app-meal-accordion',
      '.meals-container'
    ];

    elements.forEach(selector => {
      const nodeList = document.querySelectorAll(selector);
      nodeList.forEach(element => {
        (element as HTMLElement).style.setProperty('display', 'none', 'important');
      });
    });
  }

  private showAllPageElements(): void {
    // Restaurar todos los elementos principales de Ionic
    const elements = [
      'ion-router-outlet',
      'ion-page',
      'ion-header',
      'ion-content',
      'ion-footer',
      'ion-tab-bar',
      'ion-tabs',
      '.tabs-inner',
      'app-week-slider',
      'app-metrics-summary',
      'app-meal-accordion',
      '.meals-container'
    ];

    elements.forEach(selector => {
      const nodeList = document.querySelectorAll(selector);
      nodeList.forEach(element => {
        (element as HTMLElement).style.removeProperty('display');
      });
    });
  }

  private removeScannerUI(): void {
    if (this.scannerElement) {
      this.scannerElement.remove();
      this.scannerElement = null;
    }
  }
}