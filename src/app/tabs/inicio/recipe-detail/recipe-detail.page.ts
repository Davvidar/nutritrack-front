import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RecipeService, Recipe, Ingredient } from '../../../services/recipe.service';
import { ProductService, Product } from '../../../services/product.service';
import { DailyLogService, DailyLog } from '../../../services/daily-log.service';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { ToastController } from '@ionic/angular';


@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.scss']
})
export class RecipeDetailPage implements OnInit {
  recipe: Recipe | null = null;
  ingredients: { name: string; cantidad: number }[] = [];
  cantidad: number = 100; // Cantidad por defecto (en gramos)
  
  // Parámetros de la ruta
  recipeId: string = '';
  dateParam: string = '';
  mealParam: string = '';
  
  loading: boolean = true;
  error: string | null = null;
  showIngredients: boolean = false;

  // Propiedades calculadas basadas en la cantidad
  get caloriasTotales(): number {
    if (!this.recipe) return 0;
    const proportion = this.cantidad / this.recipe.pesoFinal;
    return this.recipe.calorias * proportion;
  }

  get proteinasTotales(): number {
    if (!this.recipe) return 0;
    const proportion = this.cantidad / this.recipe.pesoFinal;
    return this.recipe.proteinas * proportion;
  }

  get carbohidratosTotales(): number {
    if (!this.recipe) return 0;
    const proportion = this.cantidad / this.recipe.pesoFinal;
    return this.recipe.carbohidratos * proportion;
  }

  get grasasTotales(): number {
    if (!this.recipe) return 0;
    const proportion = this.cantidad / this.recipe.pesoFinal;
    return this.recipe.grasas * proportion;
  }

  constructor(
    private recipeService: RecipeService,
    private productService: ProductService,
    private dailyLogService: DailyLogService,
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private nutritionUpdateService: NutritionUpdateService

  ) {}

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
        
        // Cargar los nombres de los productos para los ingredientes
        if (recipe.ingredientes && recipe.ingredientes.length > 0) {
          const productObservables = recipe.ingredientes.map(ingredient => 
            this.productService.getById(ingredient.productId).pipe(
              map(product => ({
                name: product.nombre,
                cantidad: ingredient.cantidad
              }))
            )
          );
          return forkJoin(productObservables);
        }
        return of([]);
      })
    ).subscribe({
      next: (ingredientDetails) => {
        this.ingredients = ingredientDetails;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar receta:', err);
        this.error = 'No se pudo cargar la información de la receta';
        this.loading = false;
      }
    });
  }

  addToMeal() {
    if (!this.recipe || !this.dateParam || !this.mealParam) {
      console.error('Faltan datos para añadir a la comida');
      return;
    }

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
              console.log('Producto añadido correctamente:', response);
              // Remove the call to dismissLoading as it is not defined
          //    this.presentToast('Producto añadido correctamente');
              
              // Notificar la actualización directamente (redundante, pero asegura la actualización)
              const dateObj = new Date(this.dateParam);
              this.nutritionUpdateService.notifyNutritionUpdated(dateObj);
              
              // Navegar de vuelta a la página de inicio
              this.router.navigate(['/tabs/inicio']);
            },
        });
      },
      error: (err) => {
        console.error('Error al obtener el registro diario:', err);
        // Mostrar mensaje de error
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
}