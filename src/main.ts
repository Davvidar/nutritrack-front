import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideRouter } from '@angular/router';
import { addIcons } from 'ionicons';
import { logoGoogle, logoFacebook, arrowForward } from 'ionicons/icons';

import 'swiper/element/bundle';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

// Registrar iconos de marca
addIcons({
  'logo-google': logoGoogle,
  'logo-facebook': logoFacebook,
  'arrow-forward': arrowForward
});

bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular(),
    provideHttpClient(),
    provideRouter(routes)
  ]
}).catch(err => console.error(err));
