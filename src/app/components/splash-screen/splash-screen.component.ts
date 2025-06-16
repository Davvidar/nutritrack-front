// src/app/components/splash-screen/splash-screen.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.scss'],
  animations: [
    trigger('fadeInOut', [
      state('in', style({ opacity: 1 })),
      transition('void => *', [
        style({ opacity: 0 }),
        animate('800ms ease-in', style({ opacity: 1 }))
      ]),
      transition('* => void', [
        animate('500ms ease-out', style({ opacity: 0 }))
      ])
    ]),
    trigger('logoAnimation', [
      state('in', style({ transform: 'scale(1) translateY(0)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'scale(0.3) translateY(-50px)', opacity: 0 }),
        animate('1000ms 300ms ease-out', keyframes([
          style({ transform: 'scale(0.3) translateY(-50px)', opacity: 0, offset: 0 }),
          style({ transform: 'scale(1.1) translateY(-10px)', opacity: 0.8, offset: 0.7 }),
          style({ transform: 'scale(1) translateY(0)', opacity: 1, offset: 1 })
        ]))
      ])
    ]),
    trigger('textAnimation', [
      state('in', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'translateY(30px)', opacity: 0 }),
        animate('800ms 600ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('progressAnimation', [
      state('in', style({ transform: 'translateY(0)', opacity: 1 })),
      transition('void => *', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('600ms 1000ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),

  ]
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  animationState = 'in';
  progress = 0;
  loadingText = 'Iniciando NutriTrack...';
  
  private progressInterval?: number;
  private textInterval?: number;

  private loadingMessages = [
    'Iniciando NutriTrack...',
    'Verificando autenticación...',
    'Cargando perfil de usuario...',
    'Sincronizando datos...',
    '¡Ya casi está listo!'
  ];

  private currentMessageIndex = 0;

  ngOnInit() {
    this.startProgressAnimation();
    this.startTextAnimation();
  }

  ngOnDestroy() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    if (this.textInterval) {
      clearInterval(this.textInterval);
    }
  }

  private startProgressAnimation() {
    this.progressInterval = window.setInterval(() => {
      if (this.progress < 100) {
        // Progreso más realista con diferentes velocidades
        if (this.progress < 30) {
          this.progress += Math.random() * 8 + 2; // Inicio rápido
        } else if (this.progress < 70) {
          this.progress += Math.random() * 4 + 1; // Medio más lento
        } else if (this.progress < 95) {
          this.progress += Math.random() * 2 + 0.5; // Final muy lento
        } else {
          this.progress = Math.min(this.progress + 0.2, 100);
        }
        
        this.progress = Math.min(this.progress, 100);
      }
    }, 150);
  }

  private startTextAnimation() {
    this.textInterval = window.setInterval(() => {
      this.currentMessageIndex = (this.currentMessageIndex + 1) % this.loadingMessages.length;
      this.loadingText = this.loadingMessages[this.currentMessageIndex];
    }, 1500);
  }

  // Método para completar el progreso externamente
  completeProgress() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    this.progress = 100;
    this.loadingText = '¡Listo!';
  }

  // Método para iniciar animación de salida
  startExitAnimation() {
    this.animationState = 'out';
  }
}