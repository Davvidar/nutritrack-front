// src/app/tabs/inicio/product-edit/product-edit.page.ts
import { Component, OnInit } from '@angular/core';
import { IonicModule, LoadingController, ToastController, Platform, AlertController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { ProductService, Product } from '../../../services/product.service';
import { BarcodeScannerService } from '../../../services/barcode-scanner.service';

@Component({
  selector: 'app-product-edit',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './product-edit.page.html',
  styleUrls: ['./product-edit.page.scss']
})
export class ProductEditPage implements OnInit {
  productId: string = '';
  productForm = this.fb.group({
    nombre: ['', Validators.required],
    marca: [''],
    codigoBarras: [''],
    calorias: [0, [Validators.required, Validators.min(0)]],
    proteinas: [0, [Validators.required, Validators.min(0)]],
    carbohidratos: [0, [Validators.required, Validators.min(0)]],
    grasas: [0, [Validators.required, Validators.min(0)]],
    azucares: [null as number | null, Validators.min(0)],
    grasasSaturadas: [null as number | null, Validators.min(0)],
    fibra: [null as number | null, Validators.min(0)],
    sal: [null as number | null, Validators.min(0)],
    porcion: [null as number | null, Validators.min(0)]
  });

  loading: boolean = false;
  product: Product | null = null;

  // Parámetros de la query
  dateParam: string = '';
  mealParam: string = '';

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private platform: Platform,
    private alertController: AlertController,
    private barcodeScannerService: BarcodeScannerService
  ) {}

  ngOnInit() {
    // Obtener el ID del producto
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.productId = params['id'];
        this.loadProduct();
      }
    });

    // Obtener los parámetros de query
    this.route.queryParams.subscribe(params => {
      if (params['date']) {
        this.dateParam = params['date'];
      }
      if (params['meal']) {
        this.mealParam = params['meal'];
      }
    });
  }

  ionViewWillLeave() {
    // Asegurarse de que el escáner se detiene cuando salimos de la página
    BarcodeScanner.stopScan();
  }

  loadProduct() {
    this.loading = true;
    this.productService.getById(this.productId).subscribe({
      next: (product) => {
        this.product = product;
        // Patch value manejando los posibles undefined
        this.productForm.patchValue({
          nombre: product.nombre,
          marca: product.marca || '',
          codigoBarras: product.codigoBarras || '',
          calorias: product.calorias,
          proteinas: product.proteinas,
          carbohidratos: product.carbohidratos,
          grasas: product.grasas,
          azucares: product.azucares ?? null,
          grasasSaturadas: product.grasasSaturadas ?? null,
          fibra: product.fibra ?? null,
          sal: product.sal ?? null,
          porcion: product.porcion ?? null
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar producto:', err);
        this.loading = false;
        this.presentErrorToast('Error al cargar el producto');
        this.router.navigate(['/tabs/inicio']);
      }
    });
  }

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
        
        // Verificar si otro producto ya usa este código
        await this.checkBarcodeInUse(barcode);
      } else {
        console.log('Escaneo cancelado o sin resultado');
      }
    } catch (err) {
      console.error('Error durante el escaneo:', err);
      this.presentErrorToast('Error al escanear el código de barras');
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

  // Verificar si el código de barras ya está en uso por otro producto
  async checkBarcodeInUse(barcode: string) {
    const loading = await this.presentLoading();

    this.productService.getByBarcode(barcode).subscribe({
      next: (existingProduct) => {
        loading.dismiss();
        
        // Si el producto encontrado es el mismo que estamos editando, todo bien
        if (existingProduct._id === this.productId) {
          // Actualizar el formulario con el código escaneado
          this.productForm.patchValue({
            codigoBarras: barcode
          });
          this.presentToast('Código de barras actualizado');
        } else {
          // Si es otro producto, mostrar alerta
          this.presentBarcodeInUseAlert(existingProduct, barcode);
        }
      },
      error: (err) => {
        loading.dismiss();
        
        if (err.status === 404) {
          // El código no está en uso, podemos usarlo
          this.productForm.patchValue({
            codigoBarras: barcode
          });
          this.presentToast('Código de barras actualizado');
        } else {
          console.error('Error verificando código:', err);
          this.presentErrorToast('Error al verificar el código');
        }
      }
    });
  }

  // Alerta cuando el código ya está en uso
  async presentBarcodeInUseAlert(product: Product, barcode: string) {
    const alert = await this.alertController.create({
      header: 'Código en uso',
      message: `Este código de barras ya está asignado al producto "${product.nombre}". ¿Deseas continuar de todos modos?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Continuar',
          handler: () => {
            this.productForm.patchValue({
              codigoBarras: barcode
            });
          }
        }
      ]
    });

    await alert.present();
  }

  async onSubmit() {
    if (this.productForm.invalid) {
      this.presentErrorToast('Por favor, completa todos los campos requeridos');
      return;
    }

    const loading = await this.presentLoading();

    const formValue = this.productForm.value;
    
    // Preparar los datos para enviar
    const updatedProduct: Partial<Product> = {
      nombre: formValue.nombre || '',
      marca: formValue.marca || undefined,
      codigoBarras: formValue.codigoBarras || undefined,
      calorias: formValue.calorias || 0,
      proteinas: formValue.proteinas || 0,
      carbohidratos: formValue.carbohidratos || 0,
      grasas: formValue.grasas || 0,
      // Para campos opcionales, convertir null a undefined
      azucares: formValue.azucares ?? undefined,
      grasasSaturadas: formValue.grasasSaturadas ?? undefined,
      fibra: formValue.fibra ?? undefined,
      sal: formValue.sal ?? undefined,
      porcion: formValue.porcion ?? undefined
    };

    this.productService.update(this.productId, updatedProduct).subscribe({
      next: () => {
        loading.dismiss();
        this.presentToast('Producto actualizado correctamente');
        this.goBack();
      },
      error: (err) => {
        console.error('Error al actualizar producto:', err);
        loading.dismiss();
        
        // Verificar si es un error de código de barras duplicado
        if (err.error?.message?.includes('duplicate key') && err.error?.message?.includes('codigoBarras')) {
          this.presentErrorToast('Ya existe otro producto con este código de barras');
        } else {
          this.presentErrorToast('Error al actualizar el producto');
        }
      }
    });
  }

  goBack() {
    this.router.navigate(['/tabs/inicio/product', this.productId], {
      queryParams: {
        date: this.dateParam,
        meal: this.mealParam
      }
    });
  }

  cancel() {
    this.goBack();
  }

  async presentLoading() {
    const loading = await this.loadingController.create({
      message: 'Guardando cambios...',
      spinner: 'circular'
    });
    await loading.present();
    return loading;
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
      color: 'danger'
    });
    await toast.present();
  }
}