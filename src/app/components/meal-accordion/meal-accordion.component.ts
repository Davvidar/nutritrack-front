// src/app/components/meal-accordion/meal-accordion.component.ts
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface MealItem {
  name: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  cantidad: number;  // en gramos
}

@Component({
  selector: 'app-meal-accordion',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
  templateUrl: './meal-accordion.component.html',
  styleUrls: ['./meal-accordion.component.scss']
})
export class MealAccordionComponent implements OnChanges {
  /** Título de la comida (Desayuno, Almuerzo, etc.) */
  @Input() title: string = '';
  /** Lista de ítems de la comida */
  @Input() items: MealItem[] = [];
  /** Estado expandido/collapse */
  @Input() expanded: boolean = false;
  /** Fecha seleccionada, pasada desde InicioPage (para el queryParam) */
  @Input() parentDate!: Date;
  /** Evento que dispara la acción de añadir un ítem */
  @Output() addItem = new EventEmitter<void>();

  /** Totales calculados */
  totalCalories: number = 0;
  totalProtein: number = 0;
  totalCarbs: number = 0;
  totalFat: number = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.calculateTotals();
    }
  }

  private calculateTotals() {
    this.totalCalories = this.items.reduce((sum, item) => sum + item.calorias, 0);
    this.totalProtein  = this.items.reduce((sum, item) => sum + item.proteinas, 0);
    this.totalCarbs    = this.items.reduce((sum, item) => sum + item.carbohidratos, 0);
    this.totalFat      = this.items.reduce((sum, item) => sum + item.grasas, 0);
  }

  /** Alterna estado expandido */
  toggleExpanded() {
    this.expanded = !this.expanded;
  }

  /** Maneja click en "+": detiene propagación y emite evento */
  onAddClick(event: Event) {
    event.stopPropagation();
    // Desenfocamos el botón para que no quede con focus en la página oculta
    (event.target as HTMLElement).blur();
    this.addItem.emit();
  }
}