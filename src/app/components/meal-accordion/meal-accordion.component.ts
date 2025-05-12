// src/app/components/meal-accordion/meal-accordion.component.ts
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { MealItem } from 'src/app/services/daily-log.service';



export interface MealItemInterface extends MealItem { }

@Component({
  selector: 'app-meal-accordion',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, DatePipe],
  templateUrl: './meal-accordion.component.html',
  styleUrls: ['./meal-accordion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MealAccordionComponent implements OnChanges {
  /** Título de la comida (Desayuno, Almuerzo, etc.) */
  @Input() title: string = '';
  /** Lista de ítems de la comida */
  @Input() items: MealItemInterface[] = [];

  /** Fecha seleccionada, pasada desde InicioPage (para el queryParam) */
  @Input() parentDate: Date = new Date();
  /** Evento que dispara la acción de añadir un ítem */
  @Output() addItem = new EventEmitter<void>();

  @Output() itemClick = new EventEmitter<MealItemInterface>();

  @Output() removeItem = new EventEmitter<MealItemInterface>();

  /** Bandera que indica si el acordeón está expandido o no */


  expanded: boolean = false;
  totalCalories: number = 0;
  totalProtein: number = 0;
  totalCarbs: number = 0;
  totalFat: number = 0

  constructor ( private cdr: ChangeDetectorRef ) { }

  /** Método de ciclo de vida que se ejecuta al inicializar el componente */

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      console.log(`MealAccordion ${this.title} - items actualizados:`, this.items);
      this.calculateTotals();
      this.cdr.markForCheck(); // Asegura que la vista se actualice
    }
  }

  private calculateTotals() {
    this.totalCalories = this.items.reduce((sum, item) => sum + item.calorias, 0);
    this.totalProtein = this.items.reduce((sum, item) => sum + item.proteinas, 0);
    this.totalCarbs = this.items.reduce((sum, item) => sum + item.carbohidratos, 0);
    this.totalFat = this.items.reduce((sum, item) => sum + item.grasas, 0);
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

  onItemClick(item: MealItemInterface, event: Event): void {
    // Prevenir que el evento se propague al contenedor
    event.stopPropagation();
    // Emitimos solo el item, no el evento
    this.itemClick.emit(item);
  }
  onRemoveClick(item: MealItemInterface, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.removeItem.emit(item);
  }
}