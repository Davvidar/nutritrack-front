// nutrition-summary.component.ts
import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core'; // Quitar OnInit, OnDestroy si no hay subscripción
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
// import { Subscription } from 'rxjs'; // No necesario si no hay subscripción
// import { NutritionUpdateService } from '../../services/nutrition-update.service'; // No necesario

export interface MacroValues { // Mantener si se usa internamente
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export interface NutritionData { // Mantener para el @Input
  consumido: MacroValues;
  objetivo: MacroValues;
  diferencia: MacroValues;
}

@Component({
  selector: 'app-nutrition-summary',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './nutrition-summary.component.html',
  styleUrls: ['./nutrition-summary.component.scss']
})
export class NutritionSummaryComponent implements OnChanges { // Quitar OnInit, OnDestroy
  @Input() nutritionData: NutritionData | null = null;
  @Input() date: Date = new Date(); // Quitar si 'date' no se usa activamente dentro del componente para lógica

  // @Input() date: Date = new Date(); // Quitar si 'date' no se usa activamente dentro del componente para lógica

  caloriesProgress: number = 0;
  proteinProgress: number = 0;
  carbsProgress: number = 0;
  fatProgress: number = 0;

  // private nutritionSubscription?: Subscription; // Quitar

  constructor(/* private nutritionUpdateService: NutritionUpdateService */) {} // Quitar servicio

  // ngOnInit(): void { // Quitar si no hay subscripción
    // this.nutritionSubscription = this.nutritionUpdateService.nutritionUpdated$
    //   .subscribe(...);
  // }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['nutritionData'] && this.nutritionData) { // Asegurar que nutritionData no sea null
      try {
        console.log('NutritionSummaryComponent - Datos recibidos (ngOnChanges):', this.nutritionData);
        this.updateProgressBars();
      } catch (err) {
        console.error('NutritionSummaryComponent: Error al actualizar barras con nuevos datos:', err);
      }
    }
  }

  // ngOnDestroy(): void { // Quitar si no hay subscripción
    // if (this.nutritionSubscription) {
    //   this.nutritionSubscription.unsubscribe();
    // }
  // }

  private updateProgressBars(): void {
    if (!this.nutritionData) {
      // Si los datos son null, resetea las barras de progreso a 0
      this.caloriesProgress = 0;
      this.proteinProgress = 0;
      this.carbsProgress = 0;
      this.fatProgress = 0;
      return;
    }

    const consumido = this.nutritionData.consumido || { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 };
    const objetivo = this.nutritionData.objetivo || { calorias: 1, proteinas: 1, carbohidratos: 1, grasas: 1 }; // Objetivos no deben ser 0 para evitar división por cero

    this.caloriesProgress = objetivo.calorias > 0 ? Math.min(100, (Math.max(0, consumido.calorias) / objetivo.calorias) * 100) : 0;
    this.proteinProgress = objetivo.proteinas > 0 ? Math.min(100, (Math.max(0, consumido.proteinas) / objetivo.proteinas) * 100) : 0;
    this.carbsProgress = objetivo.carbohidratos > 0 ? Math.min(100, (Math.max(0, consumido.carbohidratos) / objetivo.carbohidratos) * 100) : 0;
    this.fatProgress = objetivo.grasas > 0 ? Math.min(100, (Math.max(0, consumido.grasas) / objetivo.grasas) * 100) : 0;
  }

  // Los métodos get... son buenos para la plantilla.
  getConsumedCalories(): number { return this.nutritionData?.consumido?.calorias || 0; }
  getTargetCalories(): number { return this.nutritionData?.objetivo?.calorias || 0; }
  getRemainingCalories(): number {
    return Math.max(0, (this.nutritionData?.objetivo?.calorias || 0) - (this.nutritionData?.consumido?.calorias || 0));
  }
  getConsumedProtein(): number { return this.nutritionData?.consumido?.proteinas || 0; }
  getTargetProtein(): number { return this.nutritionData?.objetivo?.proteinas || 0; }
  getConsumedCarbs(): number { return this.nutritionData?.consumido?.carbohidratos || 0; }
  getTargetCarbs(): number { return this.nutritionData?.objetivo?.carbohidratos || 0; }
  getConsumedFat(): number { return this.nutritionData?.consumido?.grasas || 0; }
  getTargetFat(): number { return this.nutritionData?.objetivo?.grasas || 0; }
}