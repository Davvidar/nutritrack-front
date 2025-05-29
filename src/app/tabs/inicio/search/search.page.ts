import { Component, OnInit } from '@angular/core';
import { IonicModule, LoadingController, ToastController, Platform, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';

import { ProductService, Product } from '../../../services/product.service';
import { RecipeService, Recipe } from '../../../services/recipe.service';
import { BarcodeScannerService } from '../../../services/barcode-scanner.service';
import { AuthService } from '../../../services/auth.service';
import { OpenFoodFactsService } from '../../../services/open-food-facts.service';
import { FavoritesService } from '../../../services/favorites.service';

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

  // Arrays completos de datos
  allProducts: Product[] = [];
  allRecipes: Recipe[] = [];
  
  // Arrays paginados para mostrar
  localFilteredItems: Array<Product | Recipe> = [];
  filteredItems: Array<Product | Recipe> = []; // Mantener por compatibilidad
  
  // Parámetros de la ruta
  dateParam: string = '';
  mealParam: string = '';
  
  // Estado de error y carga genérico
  loading: boolean = false;
  error: string | null = null;
  
  // Propiedades para paginación
  pageSize: number = 10;
  currentPage: number = 0;
  totalItems: number = 0;
  hasMoreItems: boolean = false;
  
  // Estado de carga para diferentes secciones
  loadingSearch: boolean = false;
  loadingMore: boolean = false;
  
  // Open Food Facts
  openFoodFactsResults: any[] = [];
  showOpenFoodFactsResults: boolean = true;
  searchingOpenFoodFacts: boolean = false;
  
  // Búsquedas recientes y filtros
  recentSearches: string[] = ['Pollo', 'Arroz', 'Pasta', 'Yogur', 'Manzana'];
  activeFilter: 'all' | 'local' | 'recipes' | 'favorites' = 'all';
  favorites: Set<string> = new Set();

  filteredRecipes: Recipe[] = [];
  
  // Timeout para debounce de búsqueda
  searchTimeout: any = null;
  returnToRecipe: string | null = null

  constructor(
    private productService: ProductService,
    private recipeService: RecipeService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private platform: Platform,
    private alertController: AlertController,
    private barcodeScannerService: BarcodeScannerService,
    private openFoodFactsService: OpenFoodFactsService,
    private authService: AuthService,
    private favoritesService: FavoritesService
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
      if (params['returnTo'] === 'create-recipe' && params['recipeId']) {
        this.returnToRecipe = params['recipeId'];
      }
      console.log('Parámetros recibidos:', { date: this.dateParam, meal: this.mealParam });
    });

    this.loadData(true);
    this.loadUserFavorites();
  }

  private loadUserFavorites(): void {
    // Suscribirse al observable de favoritos del servicio
    this.favoritesService.favorites$.subscribe(favoritesSet => {
      this.favorites = favoritesSet;
    });
  }

  ionViewWillEnter() {
    this.loadData(true);
  }

  ionViewWillLeave() {
    this.barcodeScannerService.stopScan();
  }

  // Método para limpiar búsqueda
  clearSearch(): void {
    this.searchQuery = '';
    this.onSearchChange();
  }

  // Método para establecer filtro
  setFilter(filter: 'all' | 'local' | 'recipes' | 'favorites'): void {
    this.activeFilter = filter;
    
    // Actualizar el segmento basado en el filtro
    switch (filter) {
      case 'local':
        this.segment = 'tuyos';
        break;
      case 'recipes':
        this.segment = 'recetas';
        break;
      default:
        this.segment = 'todos';
    }
    
    this.loadData(true);
  }

  // Método para volver atrás
  goBack(): void {
    this.router.navigate(['/tabs/inicio']);
  }

  // Verificar si es favorito
  isFavorite(item: Product): boolean {
    return this.favoritesService.isFavorite(item._id);
  }

  // Alternar favorito
  toggleFavorite(event: Event, item: Product): void {
    event.stopPropagation();
    
    // Usar el servicio de favoritos para toggle y guardar en backend
    const loading = this.presentLoading('Actualizando favoritos...');
    
    this.favoritesService.toggleFavorite(item._id, 'product').subscribe({
      next: (added) => {
        loading.then(loader => loader.dismiss());
        this.presentToast(added ? 'Añadido a favoritos' : 'Eliminado de favoritos');
        
        // Si estamos en la vista de favoritos, actualizar la lista
        if (this.activeFilter === 'favorites') {
          this.loadData(true);
        }
      },
      error: (err) => {
        loading.then(loader => loader.dismiss());
        console.error('Error al actualizar favoritos:', err);
        this.presentErrorToast('Error al actualizar favoritos');
      }
    });
  }

  // Importar producto de Open Food Facts
  importProduct(event: Event, item: any): void {
    event.stopPropagation();
    this.importProductFromOpenFoodFacts(item);
  }

  // Cargar datos
  loadData(reset: boolean = false) {
    if (reset) {
      this.currentPage = 0;
      this.localFilteredItems = [];
      this.allProducts = [];
      this.allRecipes = [];
    }

    this.error = null;
    this.loadingSearch = true;

    if (this.activeFilter === 'recipes' || this.segment === 'recetas') {
      this.loadRecipes(reset);
    } else if (this.activeFilter === 'favorites') {
      this.loadFavorites(reset);
    } else {
      this.loadProducts(reset);
    }
  }

  private loadProducts(reset: boolean) {
    const isMisProducts = this.activeFilter === 'local' || this.segment === 'tuyos';

    this.productService.searchProducts(
      this.searchQuery,
      isMisProducts,
      false
    ).subscribe({
      next: (response: Product[]) => {
        this.loadingSearch = false;
        
        // Almacenar todos los productos
        this.allProducts = response;
        this.totalItems = response.length;
        
        // Paginar los resultados
        this.paginateResults(reset);
      },
      error: (err) => {
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
        this.loadingSearch = false;
        
        // Filtrar por búsqueda si hay query
        let filteredRecipes = recipes;
        if (this.searchQuery) {
          const query = this.searchQuery.toLowerCase();
          filteredRecipes = recipes.filter(recipe => 
            recipe.nombre.toLowerCase().includes(query)
          );
        }
        
        // Almacenar todas las recetas
        this.allRecipes = filteredRecipes;
        this.totalItems = filteredRecipes.length;
        
        // Paginar los resultados
        this.paginateResults(reset);
      },
      error: (err) => {
        this.loadingSearch = false;
        this.loading = false;
        console.error('Error al cargar recetas:', err);
        this.error = 'No se pudieron cargar las recetas';
        this.presentErrorToast('Error al cargar recetas');
      }
    });
  }

  private loadFavorites(reset: boolean) {
    // Obtener primero la lista de IDs favoritos
    this.favoritesService.getFavorites().subscribe({
      next: (favoriteItems) => {
        // Filtrar solo productos favoritos
        const productFavorites = favoriteItems.filter(fav => fav.tipo === 'product');
        const productIds = productFavorites.map(fav => fav.refId);
        
        if (productIds.length === 0) {
          this.loadingSearch = false;
          this.allProducts = [];
          this.totalItems = 0;
          this.paginateResults(reset);
          return;
        }
        
        // Cargar los productos favoritos
        this.productService.getAll().subscribe({
          next: (products) => {
            this.loadingSearch = false;
            
            // Filtrar solo los productos que están en favoritos
            const favoriteProducts = products.filter(product => 
              productIds.includes(product._id)
            );
            
            // Aplicar búsqueda si hay query
            let filteredProducts = favoriteProducts;
            if (this.searchQuery) {
              const query = this.searchQuery.toLowerCase();
              filteredProducts = favoriteProducts.filter(product => 
                product.nombre.toLowerCase().includes(query) || 
                (product.marca && product.marca.toLowerCase().includes(query))
              );
            }
            
            this.allProducts = filteredProducts;
            this.totalItems = filteredProducts.length;
            this.paginateResults(reset);
          },
          error: (err) => {
            this.loadingSearch = false;
            this.loading = false;
            console.error('Error al cargar favoritos:', err);
            this.error = 'No se pudieron cargar los favoritos';
            this.presentErrorToast('Error al cargar favoritos');
          }
        });
      },
      error: (err) => {
        this.loadingSearch = false;
        this.loading = false;
        console.error('Error al obtener lista de favoritos:', err);
        this.error = 'No se pudieron cargar los favoritos';
        this.presentErrorToast('Error al cargar favoritos');
      }
    });
  }

  private paginateResults(reset: boolean) {
    const items = this.activeFilter === 'recipes' || this.segment === 'recetas' 
      ? this.allRecipes 
      : this.allProducts;
    
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    const pageItems = items.slice(startIndex, endIndex);
    
    if (reset) {
      this.localFilteredItems = pageItems;
    } else {
      this.localFilteredItems = [...this.localFilteredItems, ...pageItems];
    }
    
    // Mantener compatibilidad
    this.filteredItems = this.localFilteredItems;
    
    // Actualizar estado de paginación
    this.hasMoreItems = endIndex < items.length;
    this.loading = false;
    this.loadingMore = false;
  }

  // Manejar cambio de búsqueda
  onSearchChange() {
    // Cancelar búsqueda anterior
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Aplicar debounce
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 0;
      this.loadData(true);

      // Buscar en Open Food Facts si hay query y no estamos en filtro local
      if (this.searchQuery.trim() && this.activeFilter !== 'local' && this.activeFilter !== 'recipes') {
        this.searchOpenFoodFacts();
      } else {
        this.openFoodFactsResults = [];
      }
    }, 300); // 300ms de debounce
  }

  // RESTO DE LOS MÉTODOS NO CAMBIAN...
  // Buscar en Open Food Facts
  searchOpenFoodFacts() {
    if (!navigator.onLine) {
      console.log('No hay conexión a internet para buscar en Open Food Facts');
      this.openFoodFactsResults = [];
      return;
    }

    this.searchingOpenFoodFacts = true;
    this.openFoodFactsResults = [];

    this.openFoodFactsService.searchByText(this.searchQuery, 1, 20).subscribe({
      next: (results) => {
        this.searchingOpenFoodFacts = false;
        this.openFoodFactsResults = results;
      },
      error: (err) => {
        console.error('Error buscando en Open Food Facts:', err);
        this.searchingOpenFoodFacts = false;
        this.openFoodFactsResults = [];

        if (!navigator.onLine) {
          this.presentToast('No hay conexión a internet para buscar en Open Food Facts', 'warning');
        }
      }
    });
  }

  // Manejar selección de item
  onSelect(item: Product | Recipe | any) {
    console.log('Seleccionado item:', item);

    if (this.returnToRecipe && this.isProduct(item)) {
      // Guardar temporalmente el producto seleccionado
      localStorage.setItem('selectedIngredient', JSON.stringify(item));
      
      // Navegar de vuelta a la página de creación de receta
      const route = this.returnToRecipe === 'new' 
        ? '/tabs/inicio/create-recipe'
        : `/tabs/inicio/recipe/${this.returnToRecipe}/edit`;
      
      this.router.navigate([route], {
        queryParams: {
          date: this.dateParam,
          meal: this.mealParam
        }
      });
      return;
    }
    // Si es un producto de Open Food Facts
    if (item.isFromOpenFoodFacts) {
      this.presentOpenFoodFactsProductOptions(item);
      return;
    }

    // Determinar si es producto o receta
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

  // TypeGuard para producto
  isProduct(item: any): item is Product {
    return 'marca' in item;
  }

  // Crear nuevo producto
  goToCreateProduct() {
    this.router.navigate(['/tabs/inicio/create-product'], {
      queryParams: {
        date: this.dateParam,
        meal: this.mealParam
      }
    });
  }

  // Scroll infinito
  onIonInfinite(event: any) {
    if (this.hasMoreItems && !this.loadingMore) {
      this.loadingMore = true;
      this.currentPage++;
      
      // Paginar más resultados
      this.paginateResults(false);
      
      // Completar el evento
      setTimeout(() => {
        event.target.complete();
        if (!this.hasMoreItems) {
          event.target.disabled = true;
        }
      }, 500);
    } else {
      event.target.complete();
      event.target.disabled = true;
    }
  }
  
  async prepareScanner() {
    try {
      // Verificar permisos de cámara
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        console.log('Permisos de cámara concedidos');
      } else if (status.denied) {
        // Si está denegado, intentar solicitar permiso
        const newStatus = await BarcodeScanner.checkPermission({ force: true });
        if (!newStatus.granted) {
          this.presentErrorToast('Se requiere permiso de cámara para escanear códigos de barras');
        }
      }
    } catch (err) {
      console.error('Error al preparar escáner:', err);
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });

      if (status.granted) {
        return true;
      }

      if (status.denied) {
        await this.presentErrorToast('Por favor, habilita el permiso de cámara en la configuración de la app');
        return false;
      }

      if (status.neverAsked) {
        const newStatus = await BarcodeScanner.checkPermission({ force: true });
        if (newStatus.granted) {
          return true;
        }
      }

      if (status.restricted || status.unknown) {
        return false;
      }

      return false;
    } catch (err) {
      console.error('Error verificando permisos:', err);
      return false;
    }
  }


  // Escáner de código de barras
  async onScanBarcode() {
    try {
      // Verificar si estamos en una plataforma nativa
      if (!this.platform.is('capacitor')) {
        await this.presentToast('El escáner solo funciona en dispositivos móviles');
        return;
      }

      // Usar el servicio para escanear
      const barcode = await this.barcodeScannerService.startScan();
      
      if (barcode) {
        console.log('Código escaneado:', barcode);
        await this.handleBarcodeResult(barcode);
      } else {
        console.log('Escaneo cancelado o sin resultado');
      }
    } catch (err) {
      console.error('Error durante el escaneo:', err);
      this.presentErrorToast('Error al escanear el código de barras');
    }
  }

  // Manejar resultado del código de barras
  async handleBarcodeResult(barcode: string) {
  const loading = await this.presentLoading();

  try {
    // 1. Buscar primero en la base de datos local
    this.productService.getByBarcode(barcode).subscribe({
      next: (product) => {
        loading.dismiss();
        // Si se encuentra el producto, navegar a su página de detalle
        this.router.navigate(['/tabs/inicio/product', product._id], {
          queryParams: {
            date: this.dateParam,
            meal: this.mealParam
          }
        });
        this.presentToast('Producto encontrado');
      },
      error: (err) => {
        // 2. Si no se encuentra en la base local (404), buscar en OpenFoodFacts
        if (err.status === 404) {
          // Verificar si hay conexión a internet
          if (!navigator.onLine) {
            loading.dismiss();
            this.presentErrorToast('No hay conexión a internet para buscar en OpenFoodFacts');
            this.presentNotFoundAlert(barcode);
            return;
          }

          // Buscar en OpenFoodFacts
          this.openFoodFactsService.searchByBarcode(barcode).subscribe({
            next: (result) => {
              loading.dismiss();
              
              if (result) {
                // Si se encuentra en OpenFoodFacts, mostrar opciones al usuario
                const productData = this.openFoodFactsService.convertToLocalProduct(result);
                this.presentOpenFoodFactsProductAlert(productData, barcode);
              } else {
                // No se encontró en ninguna fuente
                this.presentNotFoundAlertWithCreateOption(barcode);
              }
            },
            error: (openFoodFactsError) => {
              loading.dismiss();
              console.error('Error buscando en OpenFoodFacts:', openFoodFactsError);
              // Si hay error consultando OpenFoodFacts, ofrecer creación manual
              this.presentNotFoundAlert(barcode);
            }
          });
        } else {
          loading.dismiss();
          this.presentErrorToast('Error al buscar el producto');
        }
      }
    });
  } catch (err) {
    loading.dismiss();
    console.error('Error procesando código de barras:', err);
    this.presentErrorToast('Error al procesar el código de barras');
  }
}
  
  async presentNotFoundAlert(barcode: string) {
    const alert = await this.alertController.create({
      header: 'Producto no encontrado',
      message: `No se encontró ningún producto con el código ${barcode}. ¿Deseas crear uno nuevo?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Crear producto',
          handler: () => {
            this.router.navigate(['/tabs/inicio/create-product'], {
              queryParams: {
                date: this.dateParam,
                meal: this.mealParam,
                barcode: barcode // Pasar el código como parámetro
              }
            });
          }
        }
      ]
    });

    await alert.present();
  }

  // Alertas de Open Food Facts
  async presentOpenFoodFactsProductAlert(productData: any, barcode: string) {
    const alert = await this.alertController.create({
      header: 'Producto encontrado',
      subHeader: 'Open Food Facts',
      message: `Se encontró "${productData.nombre}" de ${productData.marca || 'marca desconocida'}. ¿Deseas importar este producto?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Ver detalles',
          handler: () => {
            this.presentProductDetailsModal(productData);
          }
        },
        {
          text: 'Importar',
          handler: () => {
            this.importProductFromOpenFoodFacts(productData);
          }
        }
      ]
    });

    await alert.present();
  }

  async presentOpenFoodFactsProductOptions(productData: any) {
    const alert = await this.alertController.create({
      header: productData.nombre,
      subHeader: productData.marca || 'Sin marca',
      message: 'Este producto viene de Open Food Facts. ¿Qué deseas hacer?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Ver información',
          handler: () => {
            this.presentProductDetailsModal(productData);
          }
        },
        {
          text: 'Importar y añadir',
          handler: () => {
            this.importAndAddProduct(productData);
          }
        }
      ]
    });

    await alert.present();
  }

  async presentProductDetailsModal(productData: any) {
    const alert = await this.alertController.create({
      header: productData.nombre,
      subHeader: productData.marca || 'Sin marca',
      message: `
        Información nutricional por 100g:
        - Calorías: ${productData.calorias} kcal
        - Proteínas: ${productData.proteinas}g
        - Carbohidratos: ${productData.carbohidratos}g
        - Grasas: ${productData.grasas}g
        ${productData.azucares !== undefined ? `- Azúcares: ${productData.azucares}g` : ''}
        ${productData.fibra !== undefined ? `- Fibra: ${productData.fibra}g` : ''}
        ${productData.sal !== undefined ? `- Sal: ${productData.sal}g` : ''}
      `,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Importar',
          handler: () => {
            this.importProductFromOpenFoodFacts(productData);
          }
        }
      ]
    });

    await alert.present();
  }

  async importProductFromOpenFoodFacts(productData: any) {
    const loading = await this.presentLoading('Importando producto...');

    const productToCreate = { ...productData };
    delete productToCreate._id;
    delete productToCreate.isFromOpenFoodFacts;
    delete productToCreate.imagenUrl;

    this.productService.create(productToCreate).subscribe({
      next: (createdProduct) => {
        loading.dismiss();
        this.presentToast('Producto importado correctamente');

        this.router.navigate(['/tabs/inicio/product', createdProduct._id], {
          queryParams: {
            date: this.dateParam,
            meal: this.mealParam
          }
        });
      },
      error: (err) => {
        loading.dismiss();
        console.error('Error al importar producto:', err);

        if (err.error?.message?.includes('duplicate key') && err.error?.message?.includes('codigoBarras')) {
          this.presentErrorToast('Este producto ya existe en tu base de datos');
        } else {
          this.presentErrorToast('Error al importar el producto');
        }
      }
    });
  }

  async importAndAddProduct(productData: any) {
    const loading = await this.presentLoading('Importando producto...');

    const productToCreate = { ...productData };
    delete productToCreate._id;
    delete productToCreate.isFromOpenFoodFacts;
    delete productToCreate.imagenUrl;

    this.productService.create(productToCreate).subscribe({
      next: (createdProduct) => {
        loading.dismiss();
        this.presentToast('Producto importado correctamente');

        this.router.navigate(['/tabs/inicio/product', createdProduct._id], {
          queryParams: {
            date: this.dateParam,
            meal: this.mealParam
          }
        });
      },
      error: (err) => {
        loading.dismiss();
        console.error('Error al importar producto:', err);

        if (err.error?.message?.includes('duplicate key') && err.error?.message?.includes('codigoBarras')) {
          // Si ya existe, buscar el producto local y navegar a él
          this.productService.getByBarcode(productData.codigoBarras).subscribe({
            next: (existingProduct) => {
              this.presentToast('Este producto ya existe en tu base de datos');
              this.router.navigate(['/tabs/inicio/product', existingProduct._id], {
                queryParams: {
                  date: this.dateParam,
                  meal: this.mealParam
                }
              });
            },
            error: () => {
              this.presentErrorToast('Error al importar el producto');
            }
          });
        } else {
          this.presentErrorToast('Error al importar el producto');
        }
      }
    });
  }

 async presentNotFoundAlertWithCreateOption(barcode: string) {
  const alert = await this.alertController.create({
    header: 'Producto no encontrado',
    message: `No se encontró ningún producto con el código ${barcode} ni en tu base de datos ni en OpenFoodFacts. ¿Deseas crear uno nuevo?`,
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Crear producto',
        handler: () => {
          this.router.navigate(['/tabs/inicio/create-product'], {
            queryParams: {
              date: this.dateParam,
              meal: this.mealParam,
              barcode: barcode
            }
          });
        }
      }
    ]
  });

  await alert.present();
}

  // Utilidades
  async presentToast(message: string, color: 'primary' | 'warning' | 'danger' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
      cssClass: 'custom-toast',
      buttons: [
        {
          icon: 'close',
          role: 'cancel',
          handler: () => {
            console.log('Toast dismissed');
          }
        }
      ]
    });
    await toast.present();
  }

  async presentLoading(message: string = 'Cargando...') {
    const loading = await this.loadingController.create({
      message,
      spinner: 'circular',
      duration: 10000
    });
    await loading.present();
    return loading;
  }

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

  // Track by functions
  trackByFn(index: number, item: any): string {
    return item._id || item.codigoBarras || index.toString();
  }

  trackByOpenFoodFacts(index: number, item: any): string {
    return item.codigoBarras || item._id || `off-${index}`;
  }

  goToCreateRecipe() {
    this.router.navigate(['/tabs/inicio/create-recipe'], {
      queryParams: {
        date: this.dateParam,
        meal: this.mealParam
      }
    });
  }
  
  onSelectRecipe(recipe: Recipe) {
    this.router.navigate(['/tabs/inicio/recipe', recipe._id], {
      queryParams: {
        date: this.dateParam,
        meal: this.mealParam
      }
    });
  }
  
  editRecipe(event: Event, recipe: Recipe) {
    event.stopPropagation();
    this.router.navigate(['/tabs/inicio/recipe', recipe._id, 'edit'], {
      queryParams: {
        date: this.dateParam,
        meal: this.mealParam
      }
    });
  }
  
  duplicateRecipe(event: Event, recipe: Recipe) {
    event.stopPropagation();
    
    // Crear una copia de la receta
    const recipeData = {
      nombre: `${recipe.nombre} (copia)`,
      ingredientes: recipe.ingredientes,
      pesoFinal: recipe.pesoFinal,
      calorias: recipe.calorias,
      proteinas: recipe.proteinas,
      carbohidratos: recipe.carbohidratos,
      grasas: recipe.grasas,
      azucares: recipe.azucares,
      grasasSaturadas: recipe.grasasSaturadas,
      fibra: recipe.fibra
    };
    
    this.recipeService.create(recipeData).subscribe({
      next: (newRecipe) => {
        this.presentToast('Receta duplicada correctamente');
        this.loadData(true); // Recargar la lista
      },
      error: (err) => {
        console.error('Error al duplicar receta:', err);
        this.presentErrorToast('Error al duplicar la receta');
      }
    });
  }
  
  trackByRecipe(index: number, recipe: Recipe): string {
    return recipe._id;
  }
}