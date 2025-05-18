// src/app/components/metrics-summary/metrics-summary.component.ts
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

@Component({
  selector: 'app-metrics-summary',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './metrics-summary.component.html',
  styleUrls: ['./metrics-summary.component.scss']
})
export class MetricsSummaryComponent implements OnChanges {
  @Input() dailyGoals: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  @Input() currentConsumption: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

  // For the progress bar widths (capped at 100%)
  caloriesProgress: number = 0;
  proteinProgress: number = 0;
  carbsProgress: number = 0;
  fatProgress: number = 0;

  // Flags to indicate if the goal has been exceeded
  caloriesExceeded: boolean = false;
  proteinExceeded: boolean = false;
  carbsExceeded: boolean = false;
  fatExceeded: boolean = false;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    this.updateProgressAndExceededState();
  }

  private updateProgressAndExceededState() {
    // Calculate progress (capped at 100% for bar width)
    // Using (this.dailyGoals.nutrient || 1) to prevent division by zero if goal is 0.
    this.caloriesProgress = Math.min(100, (this.currentConsumption.calories / (this.dailyGoals.calories || 1)) * 100);
    this.proteinProgress = Math.min(100, (this.currentConsumption.protein / (this.dailyGoals.protein || 1)) * 100);
    this.carbsProgress = Math.min(100, (this.currentConsumption.carbs / (this.dailyGoals.carbs || 1)) * 100);
    this.fatProgress = Math.min(100, (this.currentConsumption.fat / (this.dailyGoals.fat || 1)) * 100);

    // Determine exceeded state: current consumption is greater than the goal.
    // If a goal is 0, any consumption will mark it as exceeded and turn the bar red and full.
    this.caloriesExceeded = this.currentConsumption.calories > this.dailyGoals.calories;
    this.proteinExceeded = this.currentConsumption.protein > this.dailyGoals.protein;
    this.carbsExceeded = this.currentConsumption.carbs > this.dailyGoals.carbs;
    this.fatExceeded = this.currentConsumption.fat > this.dailyGoals.fat;
  }
}