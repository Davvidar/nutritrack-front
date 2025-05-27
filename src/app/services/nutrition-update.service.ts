// src/app/services/nutrition-update.service.ts - Versión extendida
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class NutritionUpdateService implements OnDestroy {
    // Usar BehaviorSubject para que los nuevos suscriptores reciban el último valor
    private nutritionUpdatedSource = new BehaviorSubject<string>(this.formatDateToYYYYMMDD(new Date()));
    
    // Nuevo: BehaviorSubject para actualizaciones de peso
    private weightUpdatedSource = new BehaviorSubject<string>(this.formatDateToYYYYMMDD(new Date()));

    // Aplicar solo distinctUntilChanged para evitar duplicados, pero sin throttle para inmediatez
    nutritionUpdated$ = this.nutritionUpdatedSource.pipe(
        distinctUntilChanged() // Solo emitir si es diferente al último valor
    );

    // Nuevo: Observable para actualizaciones de peso
    weightUpdated$ = this.weightUpdatedSource.pipe(
        distinctUntilChanged()
    );

    private isDisposed: boolean = false;

    constructor() {
        console.log('NutritionUpdateService: *** SERVICIO INICIALIZADO CON SOPORTE DE PESO ***');
    }

    notifyNutritionUpdated(date: Date): void {
        if (this.isDisposed) {
            console.log('NutritionUpdateService: Servicio ya disposed, ignorando notificación nutricional');
            return;
        }

        try {
            const dateStr = this.formatDateToYYYYMMDD(date);
            console.log('NutritionUpdateService: *** EMITIENDO NOTIFICACIÓN NUTRICIONAL ***', {
                fecha: dateStr,
                fechaOriginal: date.toISOString(),
                timestamp: new Date().toISOString()
            });
            
            // Emitir inmediatamente
            this.nutritionUpdatedSource.next(dateStr);
            
            // Log para confirmar que se emitió
            console.log('NutritionUpdateService: *** NOTIFICACIÓN NUTRICIONAL EMITIDA EXITOSAMENTE ***');
        } catch (err) {
            console.error('NutritionUpdateService: *** ERROR AL EMITIR NOTIFICACIÓN NUTRICIONAL ***', err);
        }
    }

    // Nuevo: Método para notificar actualizaciones de peso
    notifyWeightUpdated(date: Date): void {
        if (this.isDisposed) {
            console.log('NutritionUpdateService: Servicio ya disposed, ignorando notificación de peso');
            return;
        }

        try {
            const dateStr = this.formatDateToYYYYMMDD(date);
            console.log('NutritionUpdateService: *** EMITIENDO NOTIFICACIÓN DE PESO ***', {
                fecha: dateStr,
                fechaOriginal: date.toISOString(),
                timestamp: new Date().toISOString()
            });
            
            // Emitir inmediatamente
            this.weightUpdatedSource.next(dateStr);
            
            // Log para confirmar que se emitió
            console.log('NutritionUpdateService: *** NOTIFICACIÓN DE PESO EMITIDA EXITOSAMENTE ***');
        } catch (err) {
            console.error('NutritionUpdateService: *** ERROR AL EMITIR NOTIFICACIÓN DE PESO ***', err);
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
            this.weightUpdatedSource.complete();
        } catch (err) {
            console.error('NutritionUpdateService: Error al limpiar recursos:', err);
        }
    }

    // Método para debugging - obtener el último valor emitido
    getLastEmittedNutritionValue(): string {
        return this.nutritionUpdatedSource.value;
    }

    // Nuevo: Método para debugging - obtener el último valor de peso emitido
    getLastEmittedWeightValue(): string {
        return this.weightUpdatedSource.value;
    }

    // Método para forzar una emisión inmediata nutricional (útil para debugging)
    forceEmitNutrition(date?: Date): void {
        const dateToEmit = date || new Date();
        console.log('NutritionUpdateService: *** FORZANDO EMISIÓN NUTRICIONAL ***', dateToEmit);
        this.notifyNutritionUpdated(dateToEmit);
    }

    // Nuevo: Método para forzar una emisión inmediata de peso (útil para debugging)
    forceEmitWeight(date?: Date): void {
        const dateToEmit = date || new Date();
        console.log('NutritionUpdateService: *** FORZANDO EMISIÓN DE PESO ***', dateToEmit);
        this.notifyWeightUpdated(dateToEmit);
    }
}