// src/app/tabs/inicio/create-product/create-product.page.ts
import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController, LoadingController, Platform, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { ProductService } from '../../../services/product.service';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';
import { BarcodeScannerService } from '../../../services/barcode-scanner.service';

@Component({
  selector: 'app-create-product',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './create-product.page.html',
  styleUrls: ['./create-product.page.scss']
})
export class CreateProductPage implements OnInit {
  productForm: FormGroup;
  dateParam: string = '';
  mealParam: string = '';
  showMore: boolean = false;

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private nutritionUpdateService: NutritionUpdateService,
    private platform: Platform,
    private alertController: AlertController,
    private barcodeScannerService: BarcodeScannerService
  ) {
    this.productForm = this.fb.group({
      nombre: ['', Validators.required],
      marca: [''],
      codigoBarras: [''],
      calorias: ['', [Validators.required, Validators.min(0)]],
      proteinas: ['', [Validators.required, Validators.min(0)]],
      carbohidratos: ['', [Validators.required, Validators.min(0)]],
      grasas: ['', [Validators.required, Validators.min(0)]],
      azucares: [''],
      grasasSaturadas: [''],
      fibra: [''],
      porcion: ['']
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.dateParam = params['date'];
      }
      if (params['meal']) {
        this.mealParam = params['meal'];
      }
      // Si viene con un código de barras desde la búsqueda, rellenar el campo
      if (params['barcode']) {
        this.productForm.patchValue({
          codigoBarras: params['barcode']
        });
      }
    });
  }

  ionViewWillLeave() {
    // Asegurarse de que el escáner se detiene cuando salimos de la página
    BarcodeScanner.stopScan();
  }

  async onScanBarcode() {
    try {
      // Verificar si estamos en una plataforma nativa
      if (!this.platform.is('capacitor')) {
        await this.presentToast('El escáner solo funciona en dispositivos móviles', 'warning');
        return;
      }

      // Usar el servicio para escanear
      const barcode = await this.barcodeScannerService.startScan();
      
      if (barcode) {
        console.log('Código escaneado:', barcode);
        
        // Actualizar el formulario con el código escaneado
        this.productForm.patchValue({
          codigoBarras: barcode
        });
        
        await this.presentToast('Código de barras capturado correctamente', 'primary');
        
        // Opcional: Verificar si el producto ya existe
        await this.checkExistingProduct(barcode);
      } else {
        console.log('Escaneo cancelado o sin resultado');
      }
    } catch (err) {
      console.error('Error durante el escaneo:', err);
      this.presentToast('Error al escanear el código de barras', 'danger');
    }
  }

  // Verificar permisos de cámara
  async checkPermission(): Promise<boolean> {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });

      if (status.granted) {
        return true;
      }

      if (status.denied) {
        await this.presentToast('Por favor, habilita el permiso de cámara en la configuración de la app', 'warning');
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

  // Verificar si el producto ya existe
  async checkExistingProduct(barcode: string) {
    const loading = await this.loadingController.create({
      message: 'Verificando código de barras...',
      spinner: 'circular'
    });
    await loading.present();

    this.productService.getByBarcode(barcode).subscribe({
      next: (product) => {
        loading.dismiss();
        // Si el producto ya existe, preguntar al usuario qué hacer
        this.presentExistingProductAlert(product);
      },
      error: (err) => {
        loading.dismiss();
        if (err.status === 404) {
          // El producto no existe, todo bien
          console.log('Producto nuevo, continuar con la creación');
        } else {
          console.error('Error verificando producto:', err);
        }
      }
    });
  }

  // Alerta cuando el producto ya existe
  async presentExistingProductAlert(product: any) {
    const alert = await this.alertController.create({
      header: 'Producto existente',
      message: `Ya existe un producto con este código de barras: ${product.nombre}. ¿Qué deseas hacer?`,
      buttons: [
        {
          text: 'Ver producto',
          handler: () => {
            this.router.navigate(['/tabs/inicio/product', product._id], {
              queryParams: {
                date: this.dateParam,
                meal: this.mealParam
              }
            });
          }
        },
        {
          text: 'Continuar creando',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  toggleMoreInfo() {
    this.showMore = !this.showMore;
  }

  async onSubmit() {
    if (this.productForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.productForm.controls).forEach(key => {
        const control = this.productForm.get(key);
        control?.markAsTouched();
      });
      
      this.presentToast('Por favor, completa correctamente los campos obligatorios', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Guardando producto...',
      spinner: 'circular'
    });
    await loading.present();

    // Obtener valores del formulario
    const formValue = this.productForm.value;
    
    // Filtrar campos opcionales vacíos para que no se envíen como cadenas vacías
    const productData: any = {
      nombre: formValue.nombre,
      calorias: parseFloat(formValue.calorias),
      proteinas: parseFloat(formValue.proteinas),
      carbohidratos: parseFloat(formValue.carbohidratos),
      grasas: parseFloat(formValue.grasas)
    };

    // Añadir campos opcionales solo si tienen un valor
    if (formValue.marca) productData.marca = formValue.marca;
    if (formValue.codigoBarras) productData.codigoBarras = formValue.codigoBarras;
    if (formValue.azucares) productData.azucares = parseFloat(formValue.azucares);
    if (formValue.grasasSaturadas) productData.grasasSaturadas = parseFloat(formValue.grasasSaturadas);
    if (formValue.fibra) productData.fibra = parseFloat(formValue.fibra);
    if (formValue.porcion) productData.porcion = parseFloat(formValue.porcion);

    // Guardar el producto
    this.productService.create(productData).subscribe({
      next: (createdProduct) => {
        loading.dismiss();
        this.presentToast('Producto creado correctamente', 'primary');
        
        // Si hay parámetros de fecha y comida, navegar a la página de detalle del producto
        if (this.dateParam && this.mealParam) {
          this.router.navigate(['/tabs/inicio/product', createdProduct._id], {
            queryParams: {
              date: this.dateParam,
              meal: this.mealParam
            }
          });
        } else {
          // Sino, volver a la página de búsqueda
          this.router.navigate(['/tabs/inicio/search']);
        }
      },
      error: (err) => {
        loading.dismiss();
        console.error('Error al crear producto:', err);
        
        // Verificar si es un error de código de barras duplicado
        if (err.error?.message?.includes('duplicate key') && err.error?.message?.includes('codigoBarras')) {
          this.presentToast('Ya existe un producto con este código de barras', 'danger');
        } else {
          this.presentToast('Error al crear el producto', 'danger');
        }
      }
    });
  }

  async presentToast(message: string, color: 'primary' | 'danger' | 'warning' = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}