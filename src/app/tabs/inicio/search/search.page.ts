import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { ProductService, Product } from '../../../services/product.service';
import { RecipeService, Recipe } from '../../../services/recipe.service';
import { DailyLogService, MealItemDTO } from '../../../services/daily-log.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss']
})
export class SearchPage implements OnInit {
  searchQuery: string = '';
  segment: 'todos' | 'tuyos' | 'recetas' = 'todos';

  products: Product[] = [
    { _id: '1', nombre: 'Nombre producto', calorias: 600, proteinas: 10, carbohidratos: 70, grasas: 24 },
    { _id: '2', nombre: 'Nombre producto', calorias: 600, proteinas: 10, carbohidratos: 70, grasas: 24 },
    { _id: '3', nombre: 'Nombre producto', calorias: 600, proteinas: 10, carbohidratos: 70, grasas: 24 },
    { _id: '4', nombre: 'Nombre producto', calorias: 600, proteinas: 10, carbohidratos: 70, grasas: 24 },
    { _id: '5', nombre: 'Nombre producto', calorias: 600, proteinas: 10, carbohidratos: 70, grasas: 24 },
    { _id: '6', nombre: 'Nombre producto', calorias: 600, proteinas: 10, carbohidratos: 70, grasas: 24 }
  ];
  recipes: Recipe[] = [];
  filteredItems: Array<Product | Recipe> = [];
  
  // Parámetros de la ruta
  dateParam: string = '';
  mealParam: string = 'Desayuno';
  
  loading: boolean = false;
  error: string | null = null;
  selectedPortion: number = 100; // Porción por defecto en gramos

  constructor(
    private productService: ProductService,
    private recipeService: RecipeService,
    private dailyLogService: DailyLogService,
    private router: Router,
    private route: ActivatedRoute
  ) {}
  
  hasKey(obj: any, key: string): boolean {
    return obj && obj.hasOwnProperty(key);
  }
  
  ngOnInit() {
    // Recuperar parámetros de la URL
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.dateParam = params['date'];
      }
      if (params['meal']) {
        this.mealParam = params['meal'];
      }
      console.log('Parámetros recibidos:', { date: this.dateParam, meal: this.mealParam });
    });
    
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  loadData() {
    this.loading = false;
    this.error = null;
    
    // Para esta demo, usamos datos estáticos en lugar de cargar desde el servicio
    this.filteredItems = this.products;
  }
  
  private loadProducts() {
    this.loading = true;
    this.products = [];
    this.filteredItems = [];
    
    // Simulamos la carga de datos para la demo
    setTimeout(() => {
      this.filteredItems = this.products;
      this.loading = false;
    }, 500);
  }
  
  private loadRecipes() {
    this.loading = true;
    this.recipes = [];
    this.filteredItems = [];
    
    // Simulamos la carga de datos para la demo
    setTimeout(() => {
      this.filteredItems = [];
      this.loading = false;
    }, 500);
  }

  onSearchChange() {
    this.applyFilter();
  }

  onSegmentChange(event: any) {
    this.segment = event.detail.value;
    if (this.segment === 'todos' || this.segment === 'tuyos') {
      this.filteredItems = this.products;
    } else {
      this.filteredItems = [];
    }
  }

  private applyFilter() {
    const query = this.searchQuery.trim().toLowerCase();
    
    if (this.segment === 'recetas') {
      this.filteredItems = [];
    } else {
      this.filteredItems = this.products.filter(p =>
        p.nombre.toLowerCase().includes(query)
      );
    }
  }

  onScanBarcode() {
    // Aquí se implementaría la funcionalidad del escáner de códigos de barras
    console.log('Función de escanear código de barras');
  }

  goToCreateProduct() {
    this.router.navigate(['/tabs/inicio/create-product'], { 
      queryParams: { 
        date: this.dateParam,
        meal: this.mealParam
      } 
    });
  }

  onSelect(item: Product | Recipe) {
    console.log('Item seleccionado:', item);
  }
}