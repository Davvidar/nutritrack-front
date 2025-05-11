// src/app/tabs/inicio/product-detail/product-detail.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProductService, Product } from '../../../services/product.service';
import { DailyLogService, DailyLog } from '../../../services/daily-log.service';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';


@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './product-detail.page.html',
  styleUrls: ['./product-detail.page.scss']
})
export class ProductDetailPage implements OnInit, OnDestroy {
  product: Product | null = null;
  cantidad: number = 100; // Cantidad por defecto (en gramos)
  
  // Parámetros de la ruta
  productId: string = '';
  dateParam: string = '';
  mealParam: string = '';
  
  loading: boolean = true;
  error: string | null = null;
  showMoreInfo: boolean = false;

  private paramsSubscription: Subscription | undefined;
  private queryParamsSubscription: Subscription | undefined;

  // Propiedades calculadas basadas en la cantidad
  get caloriasTotales(): number {
    return this.product ? (this.product.calorias * this.cantidad) / 100 : 0;
  }

  get proteinasTotales(): number {
    return this.product ? (this.product.proteinas * this.cantidad) / 100 : 0;
  }

  get carbohidratosTotales(): number {
    return this.product ? (this.product.carbohidratos * this.cantidad) / 100 : 0;
  }

  get grasasTotales(): number {
    return this.product ? (this.product.grasas * this.cantidad) / 100 : 0;
  }

  // Opcional: cálculos para otros nutrientes si están disponibles
/*   get azucaresTotales(): number | null {
    return this.product && this.product.azucares ? (this.product.azucares * this.cantidad) / 100 : null;
  }

  get grasasSaturadasTotales(): number | null {
    return this.product && this.product.grasasSaturadas ? (this.product.grasasSaturadas * this.cantidad) / 100 : null;
  }

  get fibraTotales(): number | null {
    return this.product && this.product.fibra ? (this.product.fibra * this.cantidad) / 100 : null;
  } */

  constructor(
    private productService: ProductService,
    private dailyLogService: DailyLogService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private nutritionUpdateService: NutritionUpdateService //
  ) {}

  ngOnInit() {
    // Recuperar parámetros de la URL
    this.paramsSubscription = this.route.params.subscribe(params => {
      if (params['id']) {
        this.productId = params['id'];
        this.loadProduct();
      }
    });
    
    this.queryParamsSubscription = this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.dateParam = params['date'];
      }
      if (params['meal']) {
        this.mealParam = params['meal'];
      }
    });
  }

  ngOnDestroy() {
    if (this.paramsSubscription) {
      this.paramsSubscription.unsubscribe();
    }
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
    }
  }

  loadProduct() {
    this.loading = true;
    this.error = null;

    this.productService.getById(this.productId).subscribe({
      next: (product) => {
        this.product = product;
        this.loading = false;
        
        // Si el producto tiene una porción sugerida, usarla como cantidad por defecto
        if (product.porcion) {
          this.cantidad = product.porcion;
        }
      },
      error: (err) => {
        console.error('Error al cargar producto:', err);
        this.error = 'No se pudo cargar la información del producto';
        this.loading = false;
      }
    });
  }

  addToMeal() {
    if (!this.product || !this.dateParam || !this.mealParam) {
      let missingDataMessage = 'Faltan datos para añadir:';
      if (!this.product) missingDataMessage += ' Producto no cargado.';
      if (!this.dateParam) missingDataMessage += ' Fecha no especificada.';
      if (!this.mealParam) missingDataMessage += ' Comida no especificada.';
      console.error(missingDataMessage);
      this.presentErrorToast(missingDataMessage);
      return;
    }
    if (typeof this.cantidad !== 'number' || this.cantidad <= 0) {
      this.presentErrorToast('Por favor, introduce una cantidad válida (mayor que 0).');
      return;
    }
  
    // Mostrar un loading indicator
    this.presentLoading();
  
    // Primero, obtener el registro diario actual
    this.dailyLogService.getByDate(new Date(this.dateParam)).subscribe({
      next: (dailyLog: DailyLog) => {
        console.log('Registro diario obtenido:', dailyLog);
        
        // Crear un nuevo item para añadir
        const newItem = {
          productId: this.productId,
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
        
        dailyLog.comidas[mealKey].push(newItem);
  
        // Es posible que necesitemos asegurarnos de que la fecha esté en formato ISO string
        if (typeof dailyLog.fecha === 'object' && dailyLog.fecha instanceof Date) {
          dailyLog.fecha = dailyLog.fecha.toISOString();
        }

  
        console.log('DailyLog a guardar:', JSON.stringify(dailyLog));
  
        // Guardar el registro actualizado
        this.dailyLogService.save(dailyLog).subscribe({
            next: (response) => {
              console.log('Producto añadido correctamente:', response);
              this.dismissLoading();
              this.presentToast('Producto añadido correctamente');
              
              // Notificar la actualización directamente (redundante, pero asegura la actualización)
              const dateObj = new Date(this.dateParam);
              this.nutritionUpdateService.notifyNutritionUpdated(dateObj);
              
              // Navegar de vuelta a la página de inicio
              this.router.navigate(['/tabs/inicio']);
            },
          error: (err) => {
            console.error('Error al guardar el registro diario:', err);
            if (err.error && err.error.errors && Array.isArray(err.error.errors)) {
                console.error('Detalles del error del backend:', err.error.errors);
                // Podrías incluso mostrar el primer mensaje de error al usuario si es apropiado
                // this.errorMessage = err.error.errors[0].msg || 'Error desconocido del servidor.';
              } else if (err.error) {
                console.error('Cuerpo del error del backend:', err.error);
              }
            this.dismissLoading();
            this.presentErrorToast('Error al guardar los cambios');
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener el registro diario:', err);
        this.dismissLoading();
        this.presentErrorToast('Error al obtener registro diario');
      }
    });
  }
  async presentLoading() {
    const loading = await this.loadingController.create({
      message: 'Guardando...',
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

  // Función para mostrar/ocultar más información
  toggleMoreInfo() {
    this.showMoreInfo = !this.showMoreInfo;
  }

  // Función para volver a la página anterior
  goBack() {
    // this.location.back();
    this.router.navigate(['/tabs/inicio/search'], { 
      queryParams: { 
        date: this.dateParam,
        meal: this.mealParam 
      } 
    });
  }
}