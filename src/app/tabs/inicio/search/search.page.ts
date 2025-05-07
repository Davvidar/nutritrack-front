import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { ProductService, Product } from '../../../services/product.service';
import { RecipeService, Recipe } from '../../../services/recipe.service';

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

  products: Product[] = [];
  recipes: Recipe[] = [];
  filteredItems: Array<Product | Recipe> = [];
  
  // Parámetros de la ruta
  dateParam: string = '';
  mealParam: string = '';
  
  loading: boolean = true;
  error: string | null = null;

  constructor(
    private productService: ProductService,
    private recipeService: RecipeService,
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
    this.loading = true;
    this.error = null;
    
    if (this.segment === 'recetas') {
      this.loadRecipes();
    } else {
      this.loadProducts();
    }
  }
  
  private loadProducts() {
    this.loading = true;
    this.products = [];
    this.filteredItems = [];
    
    this.productService.getAll(this.segment === 'tuyos').subscribe({
      next: (products) => {
        this.products = products;
        this.filteredItems = products;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.error = 'No se pudieron cargar los productos';
        this.loading = false;
      }
    });
  }
  
  private loadRecipes() {
    this.loading = true;
    this.recipes = [];
    this.filteredItems = [];
    
    this.recipeService.getAll().subscribe({
      next: (recipes) => {
        this.recipes = recipes;
        this.filteredItems = recipes;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar recetas:', err);
        this.error = 'No se pudieron cargar las recetas';
        this.loading = false;
      }
    });
  }

  onSearchChange() {
    this.applyFilter();
  }

  onSegmentChange(event: any) {
    this.segment = event.detail.value;
    this.loadData();
  }

  private applyFilter() {
    const query = this.searchQuery.trim().toLowerCase();
    
    if (this.segment === 'recetas') {
      this.filteredItems = this.recipes.filter(r => 
        r.nombre.toLowerCase().includes(query)
      );
    } else {
      this.filteredItems = this.products.filter(p =>
        p.nombre.toLowerCase().includes(query) || 
        (p.marca && p.marca.toLowerCase().includes(query))
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
    // Determinar si es producto o receta basado en la estructura
    const isProduct = 'carbohidratos' in item;
    
    if (isProduct) {
      this.router.navigate(['/tabs/inicio/product', item._id], {
        queryParams: {
          date: this.dateParam,
          meal: this.mealParam
        }
      });
    } else {
      // Implementar navegación a detalle de receta cuando esté disponible
      console.log('Navegar a detalle de receta:', item);
    }
  }
}