import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import {provideAnimations} from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { addIcons } from 'ionicons';
import { logoGoogle, logoFacebook, arrowForward } from 'ionicons/icons';
import { enableProdMode, importProvidersFrom } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { environment } from './environments/environment';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { AuthInterceptor } from './app/interceptors/auth.interceptor';
import { TokenRefreshInterceptor } from './app/interceptors/token-refresh.interceptor';


import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LOCALE_ID } from '@angular/core';

registerLocaleData(localeEs);


if (environment.production) {
  enableProdMode();
}
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
    provideAnimations(),
    importProvidersFrom(IonicModule.forRoot()),
    provideRouter(routes),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenRefreshInterceptor,
      multi: true
    },
    {
      provide: LOCALE_ID,
      useValue: 'es'
    }
  ]
}).catch(err => console.error(err));
