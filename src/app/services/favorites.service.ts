// src/app/services/favorites.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService, UserProfile } from './auth.service';
import { environment } from 'src/environments/environment.prod';

export interface FavoriteItem {
  tipo: 'product' | 'recipe';
  refId: string;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private favorites = new BehaviorSubject<Set<string>>(new Set<string>());
  public favorites$ = this.favorites.asObservable();
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Inicializar favoritos cuando el servicio se carga
    this.loadFavoritesFromUser();
    
    // Suscribirse a cambios en el usuario
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadFavoritesFromUser(user);
      } else {
        this.favorites.next(new Set<string>());
      }
    });
  }
  
  /**
   * Carga los favoritos desde el usuario actual
   */
  private loadFavoritesFromUser(user?: UserProfile | null): void {
    const currentUser = user || this.authService.getUserData();
    if (currentUser && currentUser.favoritos && currentUser.favoritos.length > 0) {
      const favoritesSet = new Set<string>(
        currentUser.favoritos.map(fav => fav.refId.toString())
      );
      this.favorites.next(favoritesSet);
    } else {
      this.favorites.next(new Set<string>());
    }
  }
  
  /**
   * Verifica si un elemento está en favoritos
   */
  isFavorite(id: string): boolean {
    return this.favorites.value.has(id);
  }
  
  /**
   * Añade o elimina un favorito
   * @returns Observable<boolean> - true si fue añadido, false si fue eliminado
   */
 toggleFavorite(id: string, type: 'product' | 'recipe' = 'product'): Observable<boolean> {
  console.log(`Toggling favorite: ${id} (${type})`);
  
  const currentFavorites = this.favorites.value;
  const isCurrentlyFavorite = currentFavorites.has(id);
  
  console.log(`¿Es actualmente favorito?: ${isCurrentlyFavorite}`);
  
  // Actualizar localmente primero para una respuesta instantánea en UI
  const newFavorites = new Set(currentFavorites);
  
  if (isCurrentlyFavorite) {
    newFavorites.delete(id);
  } else {
    newFavorites.add(id);
  }
  
  this.favorites.next(newFavorites);
  
  // Obtener la lista completa de favoritos actual
  const user = this.authService.getUserData();
  if (!user) {
    console.error('No hay usuario autenticado');
    return of(false);
  }
  
  // Crear una copia de los favoritos actuales o inicializar si no existe
  let currentFavoritesArray = user.favoritos?.slice() || [];
  
  console.log('Favoritos actuales:', JSON.stringify(currentFavoritesArray));
  
  if (isCurrentlyFavorite) {
    // Eliminar el favorito
    const initialLength = currentFavoritesArray.length;
    
    currentFavoritesArray = currentFavoritesArray.filter(
      fav => !(fav.refId === id || fav.refId.toString() === id)
    );
    
    console.log(`Eliminado favorito: ${id}. Items eliminados: ${initialLength - currentFavoritesArray.length}`);
  } else {
    // Añadir el favorito (verificando que no exista ya)
    const existingIndex = currentFavoritesArray.findIndex(fav => 
      fav.refId === id || fav.refId.toString() === id
    );
    
    if (existingIndex === -1) {
      // No existe, añadir
      const newFavorite = { tipo: type, refId: id };
      currentFavoritesArray.push(newFavorite);
      console.log(`Añadido nuevo favorito:`, newFavorite);
    } else {
      console.log(`El favorito ya existe en el índice ${existingIndex}`);
    }
  }
  
  console.log('Favoritos actualizados a enviar:', JSON.stringify(currentFavoritesArray));
  
  // Guardar en el backend mediante la API dedicada de favoritos
  return this.http.put<{message: string, favoritos: FavoriteItem[]}>(
    `${this.authService['api']}/favorites`, // Usar la URL completa del endpoint específico
    { favoritos: currentFavoritesArray },
    { headers: this.authService.getAuthHeaders() }
  ).pipe(
    tap(response => {
      console.log('Respuesta del servidor para favoritos:', response);
      
      // Actualizar el usuario en localStorage con los favoritos actualizados
      const updatedUser = this.authService.getUserData();
      if (updatedUser) {
        updatedUser.favoritos = response.favoritos || currentFavoritesArray;
        this.authService['saveUserData'](updatedUser);
        this.loadFavoritesFromUser(updatedUser);
      }
    }),
    map(() => !isCurrentlyFavorite), // Retorna true si se añadió, false si se eliminó
    catchError(error => {
      console.error('Error al actualizar favoritos:', error);
      // Revertir cambio local en caso de error
      this.favorites.next(currentFavorites);
      throw error;
    })
  );
}
  /**
   * Guarda la lista de favoritos en el backend
   */
  private saveUserFavorites(favorites: FavoriteItem[]): Observable<UserProfile> {
    return this.authService.updateProfile({ favoritos: favorites }).pipe(
      tap(updatedUser => {
        // Actualizar el conjunto local de favoritos
        if (updatedUser && updatedUser.favoritos) {
          const favoritesSet = new Set<string>(
            updatedUser.favoritos.map(fav => fav.refId.toString())
          );
          this.favorites.next(favoritesSet);
        }
      }),
      catchError(error => {
        console.error('Error al guardar favoritos:', error);
        // Recargar el estado original desde el usuario actual
        this.loadFavoritesFromUser();
        throw error;
      })
    );
  }
  
  /**
   * Obtiene la lista completa de favoritos
   */
  getFavorites(): Observable<FavoriteItem[]> {
    const user = this.authService.getUserData();
    if (user && user.favoritos) {
      return of(user.favoritos);
    }
    
    // Si no hay usuario o favoritos, devolver array vacío
    return of([]);
  }
}