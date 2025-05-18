// src/app/tabs/inicio/product-detail/product-detail.page.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, LoadingController, ToastController, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProductService, Product } from '../../../services/product.service';
import { DailyLogService, DailyLog } from '../../../services/daily-log.service';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { AuthService } from '../../../services/auth.service';

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

  // Propiedad para verificar si el usuario es el propietario
  isOwner: boolean = false;
  currentUserId: string | null = null;

  private paramsSubscription: Subscription | undefined;
  private queryParamsSubscription: Subscription | undefined;

  editMode: boolean = false;
  currentQuantity: number = 0;

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

  constructor(
    private productService: ProductService,
    private dailyLogService: DailyLogService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private nutritionUpdateService: NutritionUpdateService,
    private authService: AuthService
  ) {
    // Obtener el ID del usuario actual
    this.currentUserId = this.authService.getCurrentUserId();
  }

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
    // Capturar parámetros para el modo edición
    if (params['editMode'] === 'true') {
      this.editMode = true;
    }
    if (params['currentQuantity']) {
      this.currentQuantity = Number(params['currentQuantity']);
      // Pre-establecer la cantidad para edición
      this.cantidad = this.currentQuantity;
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

        // Verificar si el usuario es el propietario del producto
        this.isOwner = product.userId === this.currentUserId;

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
      
      // Obtener la lista de comidas
      const mealKey = this.mealParam.toLowerCase() as keyof typeof dailyLog.comidas;
      
      // Si estamos en modo edición, buscar y actualizar el item existente
      if (this.editMode) {
        if (dailyLog.comidas && dailyLog.comidas[mealKey]) {
          // Buscar el ítem con el mismo productId
          const existingItemIndex = dailyLog.comidas[mealKey].findIndex(
            item => item.productId === this.productId
          );
          
          if (existingItemIndex !== -1) {
            // Actualizar la cantidad del ítem existente
            dailyLog.comidas[mealKey][existingItemIndex].cantidad = this.cantidad;
            
            // Guardar el dailyLog actualizado
            this.saveUpdatedDailyLog(dailyLog);
            return;
          }
        }
      }
      
      // Si no estamos en modo edición o no se encontró el ítem, crear uno nuevo
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
      if (!dailyLog.comidas[mealKey]) {
        dailyLog.comidas[mealKey] = [];
      }
      
      dailyLog.comidas[mealKey].push(newItem);

      // Guardar el dailyLog actualizado
      this.saveUpdatedDailyLog(dailyLog);
    },
    error: (err) => {
      console.error('Error al obtener el registro diario:', err);
      this.dismissLoading();
      this.presentErrorToast('Error al obtener registro diario');
    }
  });
}

private saveUpdatedDailyLog(dailyLog: DailyLog) {
  // Es posible que necesitemos asegurarnos de que la fecha esté en formato ISO string
  if (typeof dailyLog.fecha === 'object' && dailyLog.fecha instanceof Date) {
    dailyLog.fecha = dailyLog.fecha.toISOString();
  }

  console.log('DailyLog a guardar:', JSON.stringify(dailyLog));

  // Guardar el registro actualizado
  this.dailyLogService.save(dailyLog).subscribe({
    next: (response) => {
      console.log(`Producto ${this.editMode ? 'actualizado' : 'añadido'} correctamente:`, response);
      this.dismissLoading();
      this.presentToast(`Producto ${this.editMode ? 'actualizado' : 'añadido'} correctamente`);
      
      // Notificar la actualización directamente
      const dateObj = new Date(this.dateParam);
      this.nutritionUpdateService.notifyNutritionUpdated(dateObj);
      
      // Navegar de vuelta a la página de inicio
      this.router.navigate(['/tabs/inicio']);
    },
    error: (err) => {
      console.error('Error al guardar el registro diario:', err);
      if (err.error && err.error.errors && Array.isArray(err.error.errors)) {
        console.error('Detalles del error del backend:', err.error.errors);
      } else if (err.error) {
        console.error('Cuerpo del error del backend:', err.error);
      }
      this.dismissLoading();
      this.presentErrorToast('Error al guardar los cambios');
    }
  });
}


  // Función para editar el producto
  editProduct() {
    this.router.navigate(['/tabs/inicio/product', this.productId, 'edit'], {
      queryParams: {
        date: this.dateParam,
        meal: this.mealParam
      }
    });
  }

  // Función para eliminar el producto
  async deleteProduct() {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.',
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
    this.presentLoading();

    this.productService.delete(this.productId).subscribe({
      next: () => {
        this.dismissLoading();
        this.presentToast('Producto eliminado correctamente');
        // Navegar de vuelta a la búsqueda o al inicio
        this.router.navigate(['/tabs/inicio/search'], {
          queryParams: {
            date: this.dateParam,
            meal: this.mealParam
          }
        });
      },
      error: (err) => {
        console.error('Error al eliminar producto:', err);
        this.dismissLoading();
        this.presentErrorToast('Error al eliminar el producto');
      }
    });
  }

  async presentLoading() {
    const loading = await this.loadingController.create({
      message: 'Cargando...',
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
    this.router.navigate(['/tabs/inicio/search'], {
      queryParams: {
        date: this.dateParam,
        meal: this.mealParam
      }
    });
  }
}