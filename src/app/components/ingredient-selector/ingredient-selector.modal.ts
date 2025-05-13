import { Component, OnInit } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-ingredient-selector',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Seleccionar ingrediente</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <ion-searchbar
        [(ngModel)]="searchQuery"
        (ionInput)="onSearch()"
        placeholder="Buscar productos...">
      </ion-searchbar>
      
      <ion-list>
        <ion-item
          *ngFor="let product of filteredProducts"
          button
          (click)="selectProduct(product)">
          <ion-label>
            <h2>{{ product.nombre }}</h2>
            <p>{{ product.marca || 'Sin marca' }}</p>
            <p>
              <small>
                {{ product.calorias }} kcal | 
                P: {{ product.proteinas }}g | 
                C: {{ product.carbohidratos }}g | 
                G: {{ product.grasas }}g
              </small>
            </p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [`
    ion-searchbar {
      padding: 16px;
    }
    
    ion-item {
      --padding-start: 16px;
    }
  `]
})
export class IngredientSelectorModal implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchQuery: string = '';
  
  constructor(
    private modalController: ModalController,
    private productService: ProductService
  ) {}
  
  ngOnInit() {
    this.loadProducts();
  }
  
  loadProducts() {
    this.productService.getAll().subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
      }
    });
  }
  
  onSearch() {
    const query = this.searchQuery.toLowerCase().trim();
    
    if (!query) {
      this.filteredProducts = this.products;
      return;
    }
    
    this.filteredProducts = this.products.filter(product => 
      product.nombre.toLowerCase().includes(query) ||
      (product.marca && product.marca.toLowerCase().includes(query))
    );
  }
  
  selectProduct(product: Product) {
    this.modalController.dismiss(product);
  }
  
  dismiss() {
    this.modalController.dismiss();
  }
}