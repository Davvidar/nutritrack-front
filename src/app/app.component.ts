// src/app/app.component.ts
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { register } from 'swiper/element/bundle';
register();
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonicModule, RouterModule],
  // <-- cambia aquí:
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `
})
export class AppComponent {}
