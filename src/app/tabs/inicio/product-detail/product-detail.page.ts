// src/app/tabs/inicio/product-detail/product-detail.page.ts
import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { ProductService, Product } from '../../../services/product.service';
import { DailyLogService, DailyLog } from '../../../services/daily-log.service';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './product-detail.page.html',
  styleUrls: ['./product-detail.page.scss']
})
export class ProductDetailPage implements OnInit {
  product: Product | null = null;
  cantidad: number = 100; // Cantidad por defecto (en gramos)
  
  // Parámetros de la ruta
  productId: string = '';
  dateParam: string = '';
  mealParam: string = '';
  
  loading: boolean = true;
  error: string | null = null;
  showMoreInfo: boolean = false;

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
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Recuperar parámetros de la URL
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.productId = params['id'];
        this.loadProduct();
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
      console.error('Faltan datos para añadir a la comida');
      return;
    }

    // Primero, obtener el registro diario actual
    this.dailyLogService.getByDate(new Date(this.dateParam)).subscribe({
      next: (dailyLog: DailyLog) => {
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

        // Guardar el registro actualizado
        this.dailyLogService.save(dailyLog).subscribe({
          next: () => {
            console.log('Producto añadido correctamente');
            // Navegar de vuelta a la página de inicio
            this.router.navigate(['/tabs/inicio']);
          },
          error: (err) => {
            console.error('Error al guardar el registro diario:', err);
            // Mostrar mensaje de error
          }
        });
      },
      error: (err) => {
        console.error('Error al obtener el registro diario:', err);
        // Mostrar mensaje de error
      }
    });
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