// src/app/tabs/inicio/search/search.page.ts
import { Component, OnInit } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
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
  
  // Estado de error y carga genérico
  loading: boolean = false;
  error: string | null = null;
  
  // Propiedades nuevas para paginación
  pageSize: number = 10;
  currentPage: number = 0;
  totalItems: number = 0;
  hasMoreItems: boolean = false;
  
  // Estado de carga para diferentes secciones
  loadingSearch: boolean = false;
  loadingMore: boolean = false;
  
  constructor(
    private productService: ProductService,
    private recipeService: RecipeService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}
  
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
    
    this.loadData(true);
  }

  ionViewWillEnter() {
    this.loadData(true);
  }

  // Versión optimizada de loadData con paginación
  loadData(reset: boolean = false) {
    if (reset) {
      this.currentPage = 0;
      this.filteredItems = [];
    }
    
    this.error = null;
    this.loadingSearch = true;
    
    // Mostrar loading spinner
    this.presentLoading();
    
    if (this.segment === 'recetas') {
      this.loadRecipes(reset);
    } else {
      this.loadProducts(reset);
    }
  }
  
  private loadProducts(reset: boolean) {
    const isMisProducts = this.segment === 'tuyos';
    
    this.productService.searchProducts(
      this.searchQuery, 
      isMisProducts,
      false
    ).subscribe({
      next: (response: Product[]) => {
        this.dismissLoading();
        this.loadingSearch = false;
        
        // Manejar respuesta paginada
        const items = response;
        const total = items.length;
        
        if (reset) {
          this.filteredItems = items;
        } else {
          this.filteredItems = [...this.filteredItems, ...items];
        }
        
        // Actualizar metadatos de paginación
        this.totalItems = total;
        this.hasMoreItems = items.length === this.pageSize;
        this.loading = false;
      },
      error: (err) => {
        this.dismissLoading();
        this.loadingSearch = false;
        this.loading = false;
        console.error('Error al cargar productos:', err);
        this.error = 'No se pudieron cargar los productos';
        this.presentErrorToast('Error al cargar productos');
      }
    });
  }
  
  private loadRecipes(reset: boolean) {
    this.recipeService.getAll().subscribe({
      next: (recipes) => {
        this.dismissLoading();
        this.loadingSearch = false;
        
        // Extraer solo los datos relevantes para la paginación
        const startIndex = this.currentPage * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageItems = recipes.slice(startIndex, endIndex);
        
        if (reset) {
          this.filteredItems = pageItems;
        } else {
          this.filteredItems = [...this.filteredItems, ...pageItems];
        }
        
        // Actualizar metadatos de paginación
        this.totalItems = recipes.length;
        this.hasMoreItems = endIndex < recipes.length;
        this.loading = false;
      },
      error: (err) => {
        this.dismissLoading();
        this.loadingSearch = false;
        this.loading = false;
        console.error('Error al cargar recetas:', err);
        this.error = 'No se pudieron cargar las recetas';
        this.presentErrorToast('Error al cargar recetas');
      }
    });
  }

  onSearchChange() {
    // Al cambiar la búsqueda, recargamos los datos con el filtro actualizado
    this.loadData(true);
  }

  onSegmentChange(event: any) {
    this.segment = event.detail.value;
    this.loadData(true);
  }

  onScanBarcode() {
    // Aquí se implementaría la funcionalidad del escáner de códigos de barras
    console.log('Función de escanear código de barras');
    // En el futuro, integrar con un plugin como BarcodeScanner
    this.presentToast('Funcionalidad de escáner en desarrollo');
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
    console.log('Seleccionado item:', item);
    
    // Determinar si es producto o receta basado en la estructura
    const isProduct = this.isProduct(item);
    
    if (isProduct) {
      this.router.navigate(['/tabs/inicio/product', item._id], {
        queryParams: {
          date: this.dateParam,
          meal: this.mealParam
        }
      });
    } else {
      // Navegar a detalle de receta
      this.router.navigate(['/tabs/inicio/recipe', item._id], {
        queryParams: {
          date: this.dateParam,
          meal: this.mealParam
        }
      });
    }
  }
  
  // Método para TypeGuard
  isProduct(item: any): item is Product {
    return 'marca' in item;
  }

  // Cargar más items (paginación)
  loadMore() {
    if (this.hasMoreItems && !this.loadingMore) {
      this.loadingMore = true;
      this.currentPage++;
      this.loadData(false);
    }
  }
  
  // Método para actualizar cuando el usuario llegue al final de la lista
  onIonInfinite(event: any) {
    if (this.hasMoreItems) {
      this.loadMore();
      // Usar setTimeout para dar tiempo a que se completen las operaciones asíncronas
      setTimeout(() => {
        event.target.complete();
      }, 1000);
    } else {
      event.target.complete();
      if (this.filteredItems.length > 0) {
        this.presentToast('No hay más resultados disponibles');
      }
    }
  }
  
  // Toast informativo
  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom'
    });
    toast.present();
  }
  
  // Mostrar loading spinner
  async presentLoading() {
    const loading = await this.loadingController.create({
      message: 'Cargando...',
      spinner: 'circular',
      duration: 10000 // Timeout por si algo falla
    });
    await loading.present();
  }
  
  // Ocultar loading spinner
  async dismissLoading() {
    try {
      await this.loadingController.dismiss().catch(() => {});
    } catch (err) {
      console.log('Error al cerrar loading, posiblemente ya cerrado');
    }
  }
  
  // Mostrar mensajes de error
  async presentErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });
    toast.present();
  }
  
  // Método para refrescar los datos manualmente (pull-to-refresh)
  doRefresh(event: any) {
    this.loadData(true);
    
    // Cerrar el refresher después de recibir datos o después de un tiempo
    setTimeout(() => {
      event.target.complete();
    }, 2000);
  }
  
  // Método para obtener el mensaje de resultados
  getResultsMessage(): string {
    if (this.filteredItems.length === 0) {
      return 'No se encontraron resultados';
    }
    
    return `Mostrando ${this.filteredItems.length} de ${this.totalItems} resultados`;
  }
}