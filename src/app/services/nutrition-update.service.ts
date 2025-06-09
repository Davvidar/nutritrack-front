// src/app/services/nutrition-update.service.ts - Versión mejorada
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { distinctUntilChanged, debounceTime } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class NutritionUpdateService implements OnDestroy {
    // Usar BehaviorSubject para que los nuevos suscriptores reciban el último valor
    private nutritionUpdatedSource = new BehaviorSubject<string>(this.formatDateToYYYYMMDD(new Date()));
    
    // MEJORADO: BehaviorSubject para actualizaciones de peso con debounce para evitar spam
    private weightUpdatedSource = new BehaviorSubject<string>(this.formatDateToYYYYMMDD(new Date()));

    // Observable para nutrición con distinctUntilChanged
    nutritionUpdated$ = this.nutritionUpdatedSource.pipe(
        distinctUntilChanged() // Solo emitir si es diferente al último valor
    );

    // MEJORADO: Observable para peso con debounce muy corto para evitar duplicados
    weightUpdated$ = this.weightUpdatedSource.pipe(
        distinctUntilChanged(),
        debounceTime(100) // Esperar 100ms para evitar duplicados rápidos
    );

    private isDisposed: boolean = false;

    constructor() {
        console.log('NutritionUpdateService: *** SERVICIO INICIALIZADO CON SOPORTE DE PESO MEJORADO ***');
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
            
            console.log('NutritionUpdateService: *** NOTIFICACIÓN NUTRICIONAL EMITIDA EXITOSAMENTE ***');
        } catch (err) {
            console.error('NutritionUpdateService: *** ERROR AL EMITIR NOTIFICACIÓN NUTRICIONAL ***', err);
        }
    }

    // MEJORADO: Método para notificar actualizaciones de peso con mejor logging
    notifyWeightUpdated(date: Date): void {
        if (this.isDisposed) {
            console.log('NutritionUpdateService: Servicio ya disposed, ignorando notificación de peso');
            return;
        }

        try {
            const dateStr = this.formatDateToYYYYMMDD(date);
            const currentValue = this.weightUpdatedSource.value;
            
            console.log('NutritionUpdateService: *** EMITIENDO NOTIFICACIÓN DE PESO ***', {
                fecha: dateStr,
                fechaOriginal: date.toISOString(),
                timestamp: new Date().toISOString(),
                valorAnterior: currentValue,
                esIgualAlAnterior: currentValue === dateStr
            });
            
            // Verificar si realmente es un valor nuevo
            if (currentValue === dateStr) {
                console.log('NutritionUpdateService: *** VALOR DUPLICADO DETECTADO - FORZANDO EMISIÓN ***');
                // Para forzar la emisión aunque sea el mismo valor, agregamos un timestamp
                const timestampedValue = `${dateStr}_${Date.now()}`;
                this.weightUpdatedSource.next(timestampedValue);
                
                // Inmediatamente después, emitir el valor correcto
                setTimeout(() => {
                    this.weightUpdatedSource.next(dateStr);
                }, 50);
            } else {
                // Emitir normalmente
                this.weightUpdatedSource.next(dateStr);
            }
            
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
        // MEJORADO: Manejar valores con timestamp
        const cleanDateStr = dateStr.split('_')[0]; // Remover timestamp si existe
        const parts = cleanDateStr.split('-');
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

    // MEJORADO: Método para debugging con limpieza de timestamp
    getLastEmittedWeightValue(): string {
        const value = this.weightUpdatedSource.value;
        return value.split('_')[0]; // Remover timestamp si existe
    }

    // Método para forzar una emisión inmediata nutricional (útil para debugging)
    forceEmitNutrition(date?: Date): void {
        const dateToEmit = date || new Date();
        console.log('NutritionUpdateService: *** FORZANDO EMISIÓN NUTRICIONAL ***', dateToEmit);
        this.notifyNutritionUpdated(dateToEmit);
    }

    // MEJORADO: Método para forzar una emisión inmediata de peso
    forceEmitWeight(date?: Date): void {
        const dateToEmit = date || new Date();
        console.log('NutritionUpdateService: *** FORZANDO EMISIÓN DE PESO ***', dateToEmit);
        this.notifyWeightUpdated(dateToEmit);
    }

    // NUEVO: Método para debugging - contar suscriptores
    getSubscriberCounts(): { nutrition: number; weight: number } {
        return {
            nutrition: (this.nutritionUpdatedSource as any).observers?.length || 0,
            weight: (this.weightUpdatedSource as any).observers?.length || 0
        };
    }
}