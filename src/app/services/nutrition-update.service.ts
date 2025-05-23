// src/app/services/nutrition-update.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class NutritionUpdateService implements OnDestroy {
    // Usar BehaviorSubject para que los nuevos suscriptores reciban el último valor
    private nutritionUpdatedSource = new BehaviorSubject<string>(this.formatDateToYYYYMMDD(new Date()));

    // Aplicar solo distinctUntilChanged para evitar duplicados, pero sin throttle para inmediatez
    nutritionUpdated$ = this.nutritionUpdatedSource.pipe(
        distinctUntilChanged() // Solo emitir si es diferente al último valor
    );

    private isDisposed: boolean = false;

    constructor() {
        console.log('NutritionUpdateService: *** SERVICIO INICIALIZADO ***');
    }

    notifyNutritionUpdated(date: Date): void {
        if (this.isDisposed) {
            console.log('NutritionUpdateService: Servicio ya disposed, ignorando notificación');
            return;
        }

        try {
            const dateStr = this.formatDateToYYYYMMDD(date);
            console.log('NutritionUpdateService: *** EMITIENDO NOTIFICACIÓN ***', {
                fecha: dateStr,
                fechaOriginal: date.toISOString(),
                timestamp: new Date().toISOString()
            });
            
            // Emitir inmediatamente
            this.nutritionUpdatedSource.next(dateStr);
            
            // Log para confirmar que se emitió
            console.log('NutritionUpdateService: *** NOTIFICACIÓN EMITIDA EXITOSAMENTE ***');
        } catch (err) {
            console.error('NutritionUpdateService: *** ERROR AL EMITIR NOTIFICACIÓN ***', err);
        }
    }

    public formatDateToYYYYMMDD(date: Date): string {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    public formatDateFromYYYYMMDD(dateStr: string): Date {
        const parts = dateStr.split('-');
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }

    ngOnDestroy(): void {
        this.dispose();
    }

    dispose(): void {
        if (this.isDisposed) return;

        try {
            console.log('NutritionUpdateService: *** LIMPIANDO RECURSOS ***');
            this.isDisposed = true;
            this.nutritionUpdatedSource.complete();
        } catch (err) {
            console.error('NutritionUpdateService: Error al limpiar recursos:', err);
        }
    }

    // Método para debugging - obtener el último valor emitido
    getLastEmittedValue(): string {
        return this.nutritionUpdatedSource.value;
    }

    // Método para forzar una emisión inmediata (útil para debugging)
    forceEmit(date?: Date): void {
        const dateToEmit = date || new Date();
        console.log('NutritionUpdateService: *** FORZANDO EMISIÓN ***', dateToEmit);
        this.notifyNutritionUpdated(dateToEmit);
    }
}