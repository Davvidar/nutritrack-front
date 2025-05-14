import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService, Product } from '../../../services/product.service';
import { RecipeService, Recipe } from '../../../services/recipe.service';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { firstValueFrom } from 'rxjs';
import { IngredientSelectorModal } from 'src/app/components/ingredient-selector/ingredient-selector.modal';

@Component({
    selector: 'app-create-recipe',
    standalone: true,
    imports: [IonicModule, CommonModule, ReactiveFormsModule],
    templateUrl: './create-recipe.page.html',
    styleUrls: ['./create-recipe.page.scss']
})
export class CreateRecipePage implements OnInit {
    recipeForm: FormGroup;
    dateParam: string = '';
    mealParam: string = '';
    isEditMode: boolean = false;
    recipeId: string = '';
    
    // Para búsqueda de ingredientes
    searchQuery: string = '';
    availableProducts: Product[] = [];
    searchingProducts: boolean = false;
    
    constructor(
        private fb: FormBuilder,
        private productService: ProductService,
        private recipeService: RecipeService,
        private router: Router,
        private route: ActivatedRoute,
        private toastController: ToastController,
        private loadingController: LoadingController,
        private modalController: ModalController,
        private nutritionUpdateService: NutritionUpdateService
    ) {
        this.recipeForm = this.fb.group({
            nombre: ['', Validators.required],
            ingredientes: this.fb.array([], Validators.required),
            pesoFinal: ['', [Validators.required, Validators.min(1)]],
            // Los valores nutricionales se calcularán automáticamente
            calorias: [0],
            proteinas: [0],
            carbohidratos: [0],
            grasas: [0],
            azucares: [0],
            grasasSaturadas: [0],
            fibra: [0]
        });
    }

    ngOnInit() {
        // Obtener parámetros de la URL
        this.route.queryParams.subscribe(params => {
            if (params['date']) {
                this.dateParam = params['date'];
            }
            if (params['meal']) {
                this.mealParam = params['meal'];
            }
        });
        
        // Verificar si estamos en modo edición
        this.route.params.subscribe(params => {
            if (params['id']) {
                this.isEditMode = true;
                this.recipeId = params['id'];
                this.loadRecipe();
            }
        });
    }
    
    ionViewWillEnter() {
        // Verificar si hay un ingrediente seleccionado en localStorage
        const selectedIngredient = localStorage.getItem('selectedIngredient');
        if (selectedIngredient) {
            const product = JSON.parse(selectedIngredient) as Product;
            this.addIngredientToForm(product);
            // Limpiar el localStorage
            localStorage.removeItem('selectedIngredient');
        }
    }
    
    get ingredientes() {
        return this.recipeForm.get('ingredientes') as FormArray;
    }
    
    async loadRecipe() {
        const loading = await this.loadingController.create({
            message: 'Cargando receta...',
            spinner: 'circular'
        });
        await loading.present();

        try {
            const recipe = await firstValueFrom(this.recipeService.getById(this.recipeId));
            
            // Cargar los datos básicos
            this.recipeForm.patchValue({
                nombre: recipe.nombre,
                pesoFinal: recipe.pesoFinal,
                calorias: recipe.calorias,
                proteinas: recipe.proteinas,
                carbohidratos: recipe.carbohidratos,
                grasas: recipe.grasas,
                azucares: recipe.azucares,
                grasasSaturadas: recipe.grasasSaturadas,
                fibra: recipe.fibra
            });
            
            // Cargar ingredientes
            for (const ingredient of recipe.ingredientes) {
                try {
                    // Extraer el ID del producto correctamente
                    let productId: string;
                    
                    // Si productId es un objeto poblado del backend
                    if (typeof ingredient.productId === 'object' && ingredient.productId !== null) {
                        productId = (ingredient.productId as any)._id || ingredient.productId.toString();
                    } else {
                        productId = ingredient.productId as string;
                    }
                    
                    console.log('Cargando producto con ID:', productId);
                    
                    const product = await firstValueFrom(this.productService.getById(productId));
                    
                    if (product) {
                        this.addIngredientToForm(product, ingredient.cantidad);
                    }
                } catch (error) {
                    console.error('Error al cargar ingrediente:', error);
                    this.presentErrorToast(`Error al cargar un ingrediente`);
                }
            }
            
            loading.dismiss();
        } catch (err) {
            console.error('Error al cargar receta:', err);
            loading.dismiss();
            this.presentErrorToast('Error al cargar la receta');
            this.router.navigate(['/tabs/inicio']);
        }
    }
    
  addIngredient() {
        this.modalController.create({
            component: IngredientSelectorModal,
            componentProps: {
                dateParam: this.dateParam,
                mealParam: this.mealParam
            }
        }).then(modal => {
            modal.present();
            modal.onDidDismiss().then((data) => {
                if (data.data) {
                    const product = data.data as Product;
                    this.addIngredientToForm(product);
                }
            });
        });
    }
    
    
    addIngredientToForm(product: Product, cantidad: number = 100) {
        const ingredientGroup = this.fb.group({
            productId: [product._id, Validators.required],
            cantidad: [cantidad, [Validators.required, Validators.min(1)]],
            // Campos adicionales para mostrar en la UI
            productName: [product.nombre],
            productBrand: [product.marca || ''],
            // Info nutricional del producto (por 100g)
            productNutrition: [{
                calorias: product.calorias,
                proteinas: product.proteinas,
                carbohidratos: product.carbohidratos,
                grasas: product.grasas,
                azucares: product.azucares,
                grasasSaturadas: product.grasasSaturadas,
                fibra: product.fibra
            }]
        });
        
        this.ingredientes.push(ingredientGroup);
        this.calculateTotalNutrition();
    }
    
    removeIngredient(index: number) {
        this.ingredientes.removeAt(index);
        this.calculateTotalNutrition();
    }
    
    calculateTotalNutrition() {
        let totalNutrition = {
            calorias: 0,
            proteinas: 0,
            carbohidratos: 0,
            grasas: 0,
            azucares: 0,
            grasasSaturadas: 0,
            fibra: 0
        };
        
        this.ingredientes.controls.forEach(control => {
            const ingredient = control.value;
            const cantidad = ingredient.cantidad / 100; // Factor para calcular basado en la cantidad
            const nutrition = ingredient.productNutrition;
            
            totalNutrition.calorias += (nutrition.calorias || 0) * cantidad;
            totalNutrition.proteinas += (nutrition.proteinas || 0) * cantidad;
            totalNutrition.carbohidratos += (nutrition.carbohidratos || 0) * cantidad;
            totalNutrition.grasas += (nutrition.grasas || 0) * cantidad;
            totalNutrition.azucares += (nutrition.azucares || 0) * cantidad;
            totalNutrition.grasasSaturadas += (nutrition.grasasSaturadas || 0) * cantidad;
            totalNutrition.fibra += (nutrition.fibra || 0) * cantidad;
        });
        
        // Actualizar el formulario con los valores calculados
        this.recipeForm.patchValue({
            calorias: Math.round(totalNutrition.calorias),
            proteinas: Math.round(totalNutrition.proteinas),
            carbohidratos: Math.round(totalNutrition.carbohidratos),
            grasas: Math.round(totalNutrition.grasas),
            azucares: Math.round(totalNutrition.azucares),
            grasasSaturadas: Math.round(totalNutrition.grasasSaturadas),
            fibra: Math.round(totalNutrition.fibra)
        });
    }
    
    async onSubmit() {
        if (this.recipeForm.invalid) {
            // Marcar todos los campos como tocados para mostrar errores
            Object.keys(this.recipeForm.controls).forEach(key => {
                const control = this.recipeForm.get(key);
                control?.markAsTouched();
            });
            
            this.presentToast('Por favor, completa todos los campos requeridos', 'danger');
            return;
        }
        
        const loading = await this.loadingController.create({
            message: this.isEditMode ? 'Actualizando receta...' : 'Guardando receta...',
            spinner: 'circular'
        });
        await loading.present();
        
        const formValue = this.recipeForm.value;
        
        // Preparar los ingredientes para el backend
        const ingredientesFormateados = formValue.ingredientes.map((ing: any) => ({
            productId: ing.productId,
            cantidad: parseFloat(ing.cantidad)
        }));
        
        const recipeData = {
            nombre: formValue.nombre,
            ingredientes: ingredientesFormateados,
            pesoFinal: parseFloat(formValue.pesoFinal),
            calorias: parseFloat(formValue.calorias),
            proteinas: parseFloat(formValue.proteinas),
            carbohidratos: parseFloat(formValue.carbohidratos),
            grasas: parseFloat(formValue.grasas),
            azucares: formValue.azucares ? parseFloat(formValue.azucares) : undefined,
            grasasSaturadas: formValue.grasasSaturadas ? parseFloat(formValue.grasasSaturadas) : undefined,
            fibra: formValue.fibra ? parseFloat(formValue.fibra) : undefined
        };
        
        const saveOperation = this.isEditMode 
            ? this.recipeService.update(this.recipeId, recipeData)
            : this.recipeService.create(recipeData);
        
        saveOperation.subscribe({
            next: (savedRecipe) => {
                loading.dismiss();
                this.presentToast(this.isEditMode ? 'Receta actualizada correctamente' : 'Receta creada correctamente', 'success');
                
                // Si hay parámetros de fecha y comida, navegar a la página de detalle
                if (this.dateParam && this.mealParam) {
                    this.router.navigate(['/tabs/inicio/recipe', savedRecipe._id], {
                        queryParams: {
                            date: this.dateParam,
                            meal: this.mealParam
                        }
                    });
                } else {
                    // Sino, volver a la búsqueda
                    this.router.navigate(['/tabs/inicio/search']);
                }
            },
            error: (err) => {
                loading.dismiss();
                console.error('Error al guardar receta:', err);
                this.presentErrorToast('Error al guardar la receta');
            }
        });
    }
    
    async presentToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
        const toast = await this.toastController.create({
            message,
            duration: 2000,
            position: 'bottom',
            color
        });
        await toast.present();
    }
    
    async presentErrorToast(message: string) {
        const toast = await this.toastController.create({
            message,
            duration: 3000,
            position: 'bottom',
            color: 'danger'
        });
        await toast.present();
    }
}

function ionViewWillEnter() {
    throw new Error('Function not implemented.');
}
