// src/app/tabs/inicio/create-product/create-product.page.ts
import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ProductService } from '../../../services/product.service';
import { NutritionUpdateService } from 'src/app/services/nutrition-update.service';

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
    private nutritionUpdateService: NutritionUpdateService
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
    });
  }

  async onScanBarcode() {
    // Simular un escaneo de código de barras 
    // Aquí idealmente usaríamos un plugin como BarcodeScanner
    alert('Funcionalidad de escaneo de código de barras en desarrollo');
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
        this.presentToast('Producto creado correctamente', 'success');
        
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
        this.presentToast('Error al crear el producto', 'danger');
      }
    });
  }

  async presentToast(message: string, color: 'success' | 'danger' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}