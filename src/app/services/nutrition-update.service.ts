import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { throttleTime, distinctUntilChanged } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class NutritionUpdateService implements OnDestroy {
    // Usar Subject en lugar de BehaviorSubject
    private nutritionUpdatedSource = new Subject<string>();

    // Aplicar operadores para controlar el flujo de eventos
    nutritionUpdated$ = this.nutritionUpdatedSource.pipe(
        // Convertir fecha a string YYYY-MM-DD para comparar más fácilmente
        distinctUntilChanged(), // Solo emitir si es diferente al último valor
        throttleTime(1000)     // Limitar a una actualización por segundo
    );

    private lastUpdateTime: number = 0;
    private isDisposed: boolean = false;

    constructor() {
        console.log('NutritionUpdateService: Inicializado con protección mejorada');
    }

    notifyNutritionUpdated(date: Date): void {
        if (this.isDisposed) return;

        const now = Date.now();
        try {
            const dateStr = this.formatDateToYYYYMMDD(date); // Usa este método
            console.log('NutritionUpdateService: Notificando actualización para:', dateStr);
            this.lastUpdateTime = Date.now();
            this.nutritionUpdatedSource.next(dateStr); // Emite YYYY-MM-DD
        } catch (err) {
            console.error('NutritionUpdateService: Error al emitir actualización:', err);
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
        // Los meses en el constructor de Date son 0-indexados
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }

    ngOnDestroy(): void {
        this.dispose();
    }

    dispose(): void {
        if (this.isDisposed) return;

        try {
            console.log('NutritionUpdateService: Limpiando recursos');
            this.isDisposed = true;
            this.nutritionUpdatedSource.complete();
        } catch (err) {
            console.error('NutritionUpdateService: Error al limpiar recursos:', err);
        }
    }

}