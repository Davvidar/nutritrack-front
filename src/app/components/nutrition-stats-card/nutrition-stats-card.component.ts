// src/app/components/nutrition-stats-card/nutrition-stats-card.component.ts
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

interface NutritionData {
  consumido: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };
  objetivo: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };
  diferencia: {
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };
}

@Component({
  selector: 'app-nutrition-stats-card',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-card *ngIf="nutritionData">
      <ion-card-header>
        <ion-card-title>Nutrición</ion-card-title>
        <ion-card-subtitle>{{ date | date: 'longDate':'':'es' }}</ion-card-subtitle>
      </ion-card-header>
      
      <ion-card-content>
        <div class="nutrition-grid">
          <!-- Calorías -->
          <div class="nutrition-item main">
            <div class="nutrition-header">
              <div class="icon calories">
                <ion-icon name="flame-outline"></ion-icon>
              </div>
              <div class="label">Calorías</div>
            </div>
            <div class="nutrition-content">
              <div class="value-container">
                <div class="consumed">{{ nutritionData.consumido.calorias || 0 }}</div>
                <div class="target">/ {{ nutritionData.objetivo.calorias || 0 }}</div>
              </div>
              <div class="progress-bar">
                <div class="progress" 
                    [style.width.%]="getProgressPercentage('calorias')"></div>
              </div>
            </div>
          </div>
          
          <!-- Proteínas -->
          <div class="nutrition-item">
            <div class="nutrition-header">
              <div class="icon protein">P</div>
              <div class="label">Proteínas</div>
            </div>
            <div class="nutrition-content">
              <div class="value-container">
                <div class="consumed">{{ nutritionData.consumido.proteinas || 0 }}g</div>
                <div class="target">/ {{ nutritionData.objetivo.proteinas || 0 }}g</div>
              </div>
              <div class="progress-bar">
                <div class="progress" 
                    [style.width.%]="getProgressPercentage('proteinas')"></div>
              </div>
            </div>
          </div>
          
          <!-- Carbohidratos -->
          <div class="nutrition-item">
            <div class="nutrition-header">
              <div class="icon carbs">C</div>
              <div class="label">Carbohidratos</div>
            </div>
            <div class="nutrition-content">
              <div class="value-container">
                <div class="consumed">{{ nutritionData.consumido.carbohidratos || 0 }}g</div>
                <div class="target">/ {{ nutritionData.objetivo.carbohidratos || 0 }}g</div>
              </div>
              <div class="progress-bar">
                <div class="progress" 
                    [style.width.%]="getProgressPercentage('carbohidratos')"></div>
              </div>
            </div>
          </div>
          
          <!-- Grasas -->
          <div class="nutrition-item">
            <div class="nutrition-header">
              <div class="icon fat">G</div>
              <div class="label">Grasas</div>
            </div>
            <div class="nutrition-content">
              <div class="value-container">
                <div class="consumed">{{ nutritionData.consumido.grasas || 0 }}g</div>
                <div class="target">/ {{ nutritionData.objetivo.grasas || 0 }}g</div>
              </div>
              <div class="progress-bar">
                <div class="progress" 
                    [style.width.%]="getProgressPercentage('grasas')"></div>
              </div>
            </div>
          </div>
        </div>
      </ion-card-content>
    </ion-card>
    
    <ion-card *ngIf="!nutritionData" class="empty-data">
      <ion-card-content>
        <ion-icon name="nutrition-outline"></ion-icon>
        <p>No hay datos nutricionales disponibles para esta fecha</p>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    ion-card {
      margin: 0;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    
    ion-card-header {
      padding-bottom: 8px;
    }
    
    ion-card-title {
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    ion-card-subtitle {
      font-size: 0.9rem;
    }
    
    .nutrition-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    
    .nutrition-item {
      display: flex;
      flex-direction: column;
      
      &.main {
        padding-bottom: 16px;
        border-bottom: 1px solid var(--ion-color-light-shade);
        margin-bottom: 8px;
      }
      
      .nutrition-header {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        
        .icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.8rem;
          margin-right: 8px;
          
          &.calories {
            background-color: #8c63d0;
          }
          
          &.protein {
            background-color: #5046c8;
          }
          
          &.carbs {
            background-color: #ff8c42;
          }
          
          &.fat {
            background-color: #d4ca3a;
          }
          
          ion-icon {
            font-size: 1rem;
          }
        }
        
        .label {
          font-size: 0.9rem;
          font-weight: 500;
        }
      }
      
      .nutrition-content {
        display: flex;
        flex-direction: column;
        
        .value-container {
          display: flex;
          align-items: baseline;
          margin-bottom: 4px;
          
          .consumed {
            font-size: 1.2rem;
            font-weight: 700;
            color: var(--ion-color-dark);
          }
          
          .target {
            font-size: 0.8rem;
            color: var(--ion-color-medium);
            margin-left: 4px;
          }
        }
        
        .progress-bar {
          height: 8px;
          background-color: var(--ion-color-light-shade);
          border-radius: 4px;
          overflow: hidden;
          
          .progress {
            height: 100%;
            background-color: var(--ion-color-primary);
            border-radius: 4px;
          }
        }
      }
    }
    
    .empty-data {
      text-align: center;
      padding: 24px;
      
      ion-icon {
        font-size: 48px;
        color: var(--ion-color-medium);
        margin-bottom: 16px;
      }
      
      p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--ion-color-medium);
      }
    }
    
    @media (min-width: 576px) {
      .nutrition-grid {
        grid-template-columns: repeat(3, 1fr);
        
        .nutrition-item.main {
          grid-column: 1 / -1;
        }
      }
    }
  `]
})
export class NutritionStatsCardComponent {
  @Input() nutritionData: NutritionData | null = null;
  @Input() date: Date = new Date();
  
  constructor() {}
  
  /**
   * Calcula el porcentaje de progreso para una métrica específica
   */
  getProgressPercentage(metric: 'calorias' | 'proteinas' | 'carbohidratos' | 'grasas'): number {
    if (!this.nutritionData || !this.nutritionData.objetivo) {
      return 0;
    }
    
    const consumed = this.nutritionData.consumido[metric] || 0;
    const target = this.nutritionData.objetivo[metric] || 1; // Evitar división por cero
    
    // Limitar a un máximo del 100%
    return Math.min(100, (consumed / target) * 100);
  }
}
