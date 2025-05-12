// src/app/tabs/inicio/product-edit/product-edit.page.ts
import { Component, OnInit } from '@angular/core';
import { IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService, Product } from '../../../services/product.service';

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
    private toastController: ToastController
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
        this.presentErrorToast('Error al actualizar el producto');
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