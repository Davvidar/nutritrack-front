// src/app/components/nutrition-summary/nutrition-summary.component.ts
import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

export interface MacroValues {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

export interface NutritionData {
  consumido: MacroValues;
  objetivo: MacroValues;
  diferencia: MacroValues;
}

@Component({
  selector: 'app-nutrition-summary',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './nutrition-summary.component.html',
  styleUrls: ['./nutrition-summary.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default // Cambiar a Default para asegurar detección
})
export class NutritionSummaryComponent implements OnInit, OnChanges, OnDestroy {
  @Input() nutritionData: NutritionData | null = null;
  @Input() date: Date = new Date();
  @Input() forceUpdateTrigger: number = 0; // Trigger para forzar actualizaciones
  
  caloriesProgress: number = 0;
  proteinProgress: number = 0;
  carbsProgress: number = 0;
  fatProgress: number = 0;
  
  // Identificador único para debug
  instanceId: number = Math.floor(Math.random() * 10000);
  
  // Último estado conocido para comparación
  private lastNutritionDataString: string = '';
  
  constructor(
    public cdr: ChangeDetectorRef
  ) {
    console.log(`NutritionSummary #${this.instanceId} - Creado`);
  }
  
  ngOnInit(): void {
    console.log(`NutritionSummary #${this.instanceId} - ngOnInit con datos:`, this.nutritionData);
    this.updateProgressBars();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    console.log(`NutritionSummary #${this.instanceId} - ngOnChanges:`, changes);
    
    let shouldUpdate = false;
    
    // Verificar cambios en nutritionData
    if (changes['nutritionData']) {
      const currentDataString = JSON.stringify(this.nutritionData);
      console.log(`NutritionSummary #${this.instanceId} - Comparando datos:`, {
        anterior: this.lastNutritionDataString,
        actual: currentDataString,
        sonIguales: this.lastNutritionDataString === currentDataString
      });
      
      if (currentDataString !== this.lastNutritionDataString) {
        this.lastNutritionDataString = currentDataString;
        shouldUpdate = true;
        console.log(`NutritionSummary #${this.instanceId} - Datos cambiaron realmente`);
      }
    }
    
    // Verificar trigger de actualización forzada
    if (changes['forceUpdateTrigger']) {
      console.log(`NutritionSummary #${this.instanceId} - Trigger de actualización forzada:`, this.forceUpdateTrigger);
      shouldUpdate = true;
    }
    
    if (shouldUpdate) {
      console.log(`NutritionSummary #${this.instanceId} - Actualizando barras de progreso`);
      this.updateProgressBars();
      
      // Forzar detección de cambios
      setTimeout(() => {
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }, 0);
    }
  }
  
  ngOnDestroy(): void {
    console.log(`NutritionSummary #${this.instanceId} - Destruido`);
  }
  
  // Método público para actualizaciones manuales
  public forceUpdate(): void {
    console.log(`NutritionSummary #${this.instanceId} - Forzando actualización manual`);
    this.updateProgressBars();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
  
  private updateProgressBars(): void {
    console.log(`NutritionSummary #${this.instanceId} - updateProgressBars iniciado con:`, this.nutritionData);
    
    if (!this.nutritionData) {
      console.log(`NutritionSummary #${this.instanceId} - Sin datos, reseteando barras`);
      this.resetProgressBars();
      return;
    }

    const consumido = this.nutritionData.consumido || { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 };
    const objetivo = this.nutritionData.objetivo || { calorias: 1, proteinas: 1, carbohidratos: 1, grasas: 1 };

    // Calcular progreso
    this.caloriesProgress = this.calculateProgress(consumido.calorias, objetivo.calorias);
    this.proteinProgress = this.calculateProgress(consumido.proteinas, objetivo.proteinas);
    this.carbsProgress = this.calculateProgress(consumido.carbohidratos, objetivo.carbohidratos);
    this.fatProgress = this.calculateProgress(consumido.grasas, objetivo.grasas);
      
    console.log(`NutritionSummary #${this.instanceId} - Progreso calculado:`, {
      caloriesProgress: this.caloriesProgress,
      proteinProgress: this.proteinProgress,
      carbsProgress: this.carbsProgress,
      fatProgress: this.fatProgress,
      consumido: consumido,
      objetivo: objetivo
    });
  }
  
  private calculateProgress(consumed: number, target: number): number {
    if (!target || target <= 0) return 0;
    const progress = (Math.max(0, consumed) / target) * 100;
    return Math.min(100, Math.max(0, progress));
  }
  
  private resetProgressBars(): void {
    this.caloriesProgress = 0;
    this.proteinProgress = 0;
    this.carbsProgress = 0;
    this.fatProgress = 0;
    console.log(`NutritionSummary #${this.instanceId} - Barras reseteadas`);
  }
  
  // Métodos getter para la plantilla
  getConsumedCalories(): number { 
    return this.nutritionData?.consumido?.calorias || 0; 
  }
  
  getTargetCalories(): number { 
    return this.nutritionData?.objetivo?.calorias || 0; 
  }
  
  getRemainingCalories(): number {
    const target = this.getTargetCalories();
    const consumed = this.getConsumedCalories();
    return Math.max(0, target - consumed);
  }
  
  getConsumedProtein(): number { 
    return this.nutritionData?.consumido?.proteinas || 0; 
  }
  
  getTargetProtein(): number { 
    return this.nutritionData?.objetivo?.proteinas || 0; 
  }
  
  getConsumedCarbs(): number { 
    return this.nutritionData?.consumido?.carbohidratos || 0; 
  }
  
  getTargetCarbs(): number { 
    return this.nutritionData?.objetivo?.carbohidratos || 0; 
  }
  
  getConsumedFat(): number { 
    return this.nutritionData?.consumido?.grasas || 0; 
  }
  
  getTargetFat(): number { 
    return this.nutritionData?.objetivo?.grasas || 0; 
  }
}