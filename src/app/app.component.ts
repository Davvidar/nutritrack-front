// src/app/app.component.ts
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { register } from 'swiper/element/bundle';
import { StatusBar } from '@capacitor/status-bar';
register();
StatusBar.setOverlaysWebView({ overlay: false });
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonicModule, RouterModule],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {}
