import { Component, OnInit } from '@angular/core';
import { IonicModule, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RecipeService, Recipe } from '../../../services/recipe.service';
import { ProductService, Product } from '../../../services/product.service';
import { DailyLogService, DailyLog } from '../../../services/daily-log.service';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { AuthService } from '../../../services/auth.service';

interface EnrichedIngredient {
  productId: string;
  cantidad: number;
  product?: Product;
}

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.scss']
})
export class RecipeDetailPage implements OnInit {
  recipe: Recipe | null = null;
  enrichedIngredients: EnrichedIngredient[] = [];
  cantidad: number = 100; // Cantidad por defecto (en gramos)
  
  // Parámetros de la ruta
  recipeId: string = '';
  dateParam: string = '';
  mealParam: string = '';
  
  // Control de estados
  loading: boolean = true;
  error: string | null = null;
  showIngredients: boolean = false;
  isOwner: boolean = false;
  currentUserId: string | null = null;

  // Propiedades calculadas basadas en la cantidad
  get caloriasTotales(): number {
    if (!this.recipe) return 0;
    const proportion = this.cantidad / this.recipe.pesoFinal;
    return Math.round(this.recipe.calorias * proportion);
  }

  get proteinasTotales(): number {
    if (!this.recipe) return 0;
    const proportion = this.cantidad / this.recipe.pesoFinal;
    return Math.round(this.recipe.proteinas * proportion);
  }

  get carbohidratosTotales(): number {
    if (!this.recipe) return 0;
    const proportion = this.cantidad / this.recipe.pesoFinal;
    return Math.round(this.recipe.carbohidratos * proportion);
  }

  get grasasTotales(): number {
    if (!this.recipe) return 0;
    const proportion = this.cantidad / this.recipe.pesoFinal;
    return Math.round(this.recipe.grasas * proportion);
  }

  constructor(
    private recipeService: RecipeService,
    private productService: ProductService,
    private dailyLogService: DailyLogService,
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private nutritionUpdateService: NutritionUpdateService,
    private authService: AuthService
  ) {
    this.currentUserId = this.authService.getCurrentUserId();
  }

  ngOnInit() {
    // Recuperar parámetros de la URL
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.recipeId = params['id'];
        this.loadRecipe();
      }
    });
    
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.dateParam = params['date'];
      }
      if (params['meal']) {
        this.mealParam = params['meal'];
      }
    });
  }

  loadRecipe() {
    this.loading = true;
    this.error = null;

    this.recipeService.getById(this.recipeId).pipe(
      switchMap(recipe => {
        this.recipe = recipe;
        this.cantidad = Math.round(recipe.pesoFinal / 2); // Por defecto, mitad del peso final
        
        // Verificar si el usuario es el propietario
        this.isOwner = recipe.userId === this.currentUserId;
        
        // Cargar los detalles de los productos para los ingredientes
        if (recipe.ingredientes && recipe.ingredientes.length > 0) {
          const productObservables = recipe.ingredientes.map(ingredient => {
            // Extraer el ID del producto correctamente
            const productId = typeof ingredient.productId === 'object' 
              ? (ingredient.productId as any)._id || ingredient.productId.toString()
              : ingredient.productId;
            
            console.log('Cargando producto con ID:', productId);
            
            return this.productService.getById(productId).pipe(
              map(product => ({
                productId: productId,
                cantidad: ingredient.cantidad,
                product: product
              }))
            );
          });
          return forkJoin(productObservables);
        }
        return of([]);
      })
    ).subscribe({
      next: (enrichedIngredients) => {
        this.enrichedIngredients = enrichedIngredients;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar receta:', err);
        this.error = 'No se pudo cargar la información de la receta';
        this.loading = false;
      }
    });
  }

  // El resto del código permanece igual...
  addToMeal() {
    if (!this.recipe || !this.dateParam || !this.mealParam) {
      console.error('Faltan datos para añadir a la comida');
      return;
    }

    // Mostrar loading
    this.presentLoading('Añadiendo receta...');

    // Primero, obtener el registro diario actual
    this.dailyLogService.getByDate(new Date(this.dateParam)).subscribe({
      next: (dailyLog: DailyLog) => {
        // Crear un nuevo item para añadir
        const newItem = {
          recipeId: this.recipeId,
          cantidad: this.cantidad
        };

        // Si el registro no tiene comidas inicializadas
        if (!dailyLog.comidas) {
          dailyLog.comidas = {
            desayuno: [],
            almuerzo: [],
            comida: [],
            merienda: [],
            cena: [],
            recena: []
          };
        }

        // Añadir el item a la comida correspondiente
        const mealKey = this.mealParam.toLowerCase() as keyof typeof dailyLog.comidas;
        if (!dailyLog.comidas[mealKey]) {
          dailyLog.comidas[mealKey] = [];
        }
        
        dailyLog.comidas[mealKey].push(newItem as any);

        // Guardar el registro actualizado
        this.dailyLogService.save(dailyLog).subscribe({
          next: (response) => {
            console.log('Receta añadida correctamente:', response);
            this.dismissLoading();
            this.presentToast('Receta añadida correctamente');
            
            // Notificar la actualización de nutrición
            const dateObj = new Date(this.dateParam);
            this.nutritionUpdateService.notifyNutritionUpdated(dateObj);
            
            // Navegar de vuelta a la página de inicio
            this.router.navigate(['/tabs/inicio']);
          },
          error: (err) => {
            console.error('Error al guardar:', err);
            this.dismissLoading();
            this.presentErrorToast('Error al añadir la receta');
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener el registro diario:', err);
        this.dismissLoading();
        this.presentErrorToast('Error al obtener el registro diario');
      }
    });
  }

  editRecipe() {
    this.router.navigate(['/tabs/inicio/recipe', this.recipeId, 'edit'], {
      queryParams: {
        date: this.dateParam,
        meal: this.mealParam
      }
    });
  }

  async deleteRecipe() {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que deseas eliminar esta receta? Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: () => {
            this.confirmDelete();
          }
        }
      ]
    });

    await alert.present();
  }

  private confirmDelete() {
    this.presentLoading('Eliminando receta...');

    this.recipeService.delete(this.recipeId).subscribe({
      next: () => {
        this.dismissLoading();
        this.presentToast('Receta eliminada correctamente');
        // Navegar de vuelta a la búsqueda o al inicio
        this.router.navigate(['/tabs/inicio/search'], {
          queryParams: {
            date: this.dateParam,
            meal: this.mealParam
          }
        });
      },
      error: (err) => {
        console.error('Error al eliminar receta:', err);
        this.dismissLoading();
        this.presentErrorToast('Error al eliminar la receta');
      }
    });
  }

  // Función para mostrar/ocultar los ingredientes
  toggleIngredients() {
    this.showIngredients = !this.showIngredients;
  }

  // Función para volver a la página anterior
  goBack() {
    this.router.navigate(['/tabs/inicio/search'], { 
      queryParams: { 
        date: this.dateParam,
        meal: this.mealParam 
      } 
    });
  }

  // Utilidades
  async presentLoading(message: string = 'Cargando...') {
    const loading = await this.loadingController.create({
      message,
      spinner: 'circular'
    });
    await loading.present();
  }

  async dismissLoading() {
    await this.loadingController.dismiss();
  }

  async presentToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success'
    });
    await toast.present();
  }

  async presentErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
      buttons: [{
        text: 'OK',
        role: 'cancel'
      }]
    });
    await toast.present();
  }
}