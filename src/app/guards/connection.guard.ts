import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { ConnectionService } from '../services/connection.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ConnectionGuard implements CanActivate {

  constructor(
    private connectionService: ConnectionService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return this.connectionService.isOnline$.pipe(
      map(isOnline => {
        if (!isOnline) {
          console.log('Sin conexión detectada, redirigiendo a página de sin conexión');
          this.router.navigate(['/no-connection'], { replaceUrl: true });
          return false;
        }
        return true;
      }),
      catchError(error => {
        console.error('Error en ConnectionGuard:', error);
        // En caso de error, asumir que no hay conexión
        this.router.navigate(['/no-connection'], { replaceUrl: true });
        return of(false);
      })
    );
  }
}