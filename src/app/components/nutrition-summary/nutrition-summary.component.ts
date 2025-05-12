// src/app/components/nutrition-summary/nutrition-summary.component.ts
import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef, DoCheck, ElementRef } from '@angular/core';
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
  // Usar Default para evitar problemas de detección
  changeDetection: ChangeDetectionStrategy.Default
})
export class NutritionSummaryComponent implements OnChanges, DoCheck {
  @Input() nutritionData: NutritionData | null = null;
  @Input() date: Date = new Date();
  @Input() updateId: number = 0;
  
  caloriesProgress: number = 0;
  proteinProgress: number = 0;
  carbsProgress: number = 0;
  fatProgress: number = 0;
  
  // Identificador único para debug
  instanceId: number = Math.floor(Math.random() * 10000);
  
  constructor(
    public cdr: ChangeDetectorRef,
    private el: ElementRef
  ) {
    console.log(`NutritionSummary #${this.instanceId} - Creado`);
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    console.log(`NutritionSummary #${this.instanceId} - ngOnChanges:`, changes);
    
    // Si cambió nutritionData, actualizar las barras
    if (changes['nutritionData']) {
      this.updateProgressBars();
      console.log(`NutritionSummary #${this.instanceId} - Barras actualizadas después de cambio en nutritionData`);
    }
  }
  
  // Implementación agresiva de detección de cambios
  ngDoCheck(): void {
    // Verificar si debe actualizar, pero no hacerlo en cada ciclo para evitar rendimiento pobre
    if (this.nutritionData && 
        !this._lastCheckedData || 
        JSON.stringify(this._lastCheckedData) !== JSON.stringify(this.nutritionData)) {
      
      console.log(`NutritionSummary #${this.instanceId} - ngDoCheck: Detectado cambio en los datos`);
      this.updateProgressBars();
      this._lastCheckedData = JSON.parse(JSON.stringify(this.nutritionData));
    }
  }
  
  // Almacenar último valor para comparación
  private _lastCheckedData: any = null;
  
  // Hacerlo público para actualizar desde fuera
  updateProgressBars(): void {
    console.log(`NutritionSummary #${this.instanceId} - updateProgressBars con datos:`, this.nutritionData);
    
    if (!this.nutritionData) {
      this.caloriesProgress = 0;
      this.proteinProgress = 0;
      this.carbsProgress = 0;
      this.fatProgress = 0;
      return;
    }

    const consumido = this.nutritionData.consumido || { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 };
    const objetivo = this.nutritionData.objetivo || { calorias: 1, proteinas: 1, carbohidratos: 1, grasas: 1 };

    this.caloriesProgress = objetivo.calorias > 0 
      ? Math.min(100, (Math.max(0, consumido.calorias) / objetivo.calorias) * 100) 
      : 0;
      
    this.proteinProgress = objetivo.proteinas > 0 
      ? Math.min(100, (Math.max(0, consumido.proteinas) / objetivo.proteinas) * 100) 
      : 0;
      
    this.carbsProgress = objetivo.carbohidratos > 0 
      ? Math.min(100, (Math.max(0, consumido.carbohidratos) / objetivo.carbohidratos) * 100) 
      : 0;
      
    this.fatProgress = objetivo.grasas > 0 
      ? Math.min(100, (Math.max(0, consumido.grasas) / objetivo.grasas) * 100) 
      : 0;
      
    console.log(`NutritionSummary #${this.instanceId} - Progreso calculado:`, {
      caloriesProgress: this.caloriesProgress,
      proteinProgress: this.proteinProgress,
      carbsProgress: this.carbsProgress,
      fatProgress: this.fatProgress
    });
    
    // Forzar la detección de cambios
    this.cdr.detectChanges();
  }
  
  // Métodos getter para la plantilla
  getConsumedCalories(): number { 
    return this.nutritionData?.consumido?.calorias || 0; 
  }
  
  getTargetCalories(): number { 
    return this.nutritionData?.objetivo?.calorias || 0; 
  }
  
  getRemainingCalories(): number {
    return Math.max(0, (this.nutritionData?.objetivo?.calorias || 0) - (this.nutritionData?.consumido?.calorias || 0));
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