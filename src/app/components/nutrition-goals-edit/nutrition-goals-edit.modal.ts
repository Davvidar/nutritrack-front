// src/app/modals/nutrition-goals-edit/nutrition-goals-edit.modal.ts
import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';

// Interfaz para los datos que el modal recibe y devuelve
export interface NutritionGoals {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

// Constantes para calorías por gramo de macronutriente
const KCAL_PER_GRAM_PROTEIN = 4;
const KCAL_PER_GRAM_CARBS = 4;
const KCAL_PER_GRAM_FAT = 9;

@Component({
  selector: 'app-nutrition-goals-edit',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './nutrition-goals-edit.component.html',
  styleUrls: ['./nutrition-goals-edit.component.scss']
})
export class NutritionGoalsModalComponent implements OnInit {
  // Recibe los objetivos actuales del componente padre
  @Input() currentGoals: NutritionGoals = {
    calorias: 2000, // Valor por defecto si no se pasa nada
    proteinas: 0,
    carbohidratos: 0,
    grasas: 0
  };

  goalsForm!: FormGroup; // Non-null assertion, se inicializa en ngOnInit
  loading: boolean = false; // Para el estado de carga del botón de guardar

  // Propiedades para la visualización de porcentajes de macros
  proteinPercentage: number = 0;
  carbsPercentage: number = 0;
  fatPercentage: number = 0;

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder,
    private toastCtrl: ToastController,
    private cdr: ChangeDetectorRef // Para forzar detección de cambios si es necesario
  ) {}

  ngOnInit() {
    this.initForm(); // Inicializar el formulario con los valores actuales
    this.updateMacroVisuals(); // Calcular porcentajes y actualizar la barra de progreso

    // Suscribirse a cambios en cualquier valor del formulario para recalcular
    this.goalsForm.valueChanges.subscribe(values => {
      if (this.goalsForm.valid) { // Solo recalcular si el formulario es válido para evitar cálculos con NaN
        this.updateMacroVisuals(values);
      }
    });
  }

  // Inicializa el FormGroup con validadores
  initForm() {
    this.goalsForm = this.fb.group({
      calorias: [
        this.currentGoals.calorias || 0,
        [Validators.required, Validators.min(800), Validators.max(10000)]
      ],
      proteinas: [
        this.currentGoals.proteinas || 0,
        [Validators.required, Validators.min(10), Validators.max(500)]
      ],
      carbohidratos: [
        this.currentGoals.carbohidratos || 0,
        [Validators.required, Validators.min(10), Validators.max(800)]
      ],
      grasas: [
        this.currentGoals.grasas || 0,
        [Validators.required, Validators.min(10), Validators.max(300)]
      ]
    });
  }

  // Actualiza los porcentajes de macros y la barra de progreso
  updateMacroVisuals(formValues?: NutritionGoals) {
    const values = formValues || this.goalsForm.value;
    const calorias = Number(values.calorias) || 0;
    const proteinasG = Number(values.proteinas) || 0;
    const carbohidratosG = Number(values.carbohidratos) || 0;
    const grasasG = Number(values.grasas) || 0;

    if (calorias > 0) {
      const proteinCals = proteinasG * KCAL_PER_GRAM_PROTEIN;
      const carbsCals = carbohidratosG * KCAL_PER_GRAM_CARBS;
      const fatCals = grasasG * KCAL_PER_GRAM_FAT;

      // Calcular porcentajes redondeados
      this.proteinPercentage = Math.round((proteinCals / calorias) * 100);
      this.carbsPercentage = Math.round((carbsCals / calorias) * 100);
      this.fatPercentage = Math.round((fatCals / calorias) * 100);

      // Ajuste para que la suma de porcentajes sea lo más cercana a 100% posible
      // debido al redondeo. Esto es opcional y puede ser complejo.
      // Por ahora, se dejan los valores redondeados.

    } else {
      this.proteinPercentage = 0;
      this.carbsPercentage = 0;
      this.fatPercentage = 0;
    }
    // Forzar detección de cambios para la barra de progreso
    this.cdr.detectChanges();
  }


  // Calcula macros en gramos a partir de calorías totales y porcentajes estándar
  calculateMacrosFromStandardPercentages() {
    const caloriesVal = this.goalsForm.get('calorias')?.value || 0;
    if (!this.goalsForm.get('calorias')?.valid || caloriesVal <= 0) {
      this.presentToast('Establece un objetivo de calorías válido primero (mín. 800 kcal).', 'warning');
      return;
    }
    // Usar una distribución balanceada por defecto (ej: 30P/45C/25F)
    this.updateMacrosFromDistribution(30, 45, 25, 'Macros distribuidos automáticamente.');
  }

  // Métodos para aplicar distribuciones predefinidas
  setBalancedDistribution() {
    this.updateMacrosFromDistribution(30, 45, 25, 'Distribución balanceada aplicada.');
  }

  setHighProteinDistribution() {
    this.updateMacrosFromDistribution(40, 35, 25, 'Distribución alta en proteína aplicada.');
  }

  setLowCarbDistribution() {
    this.updateMacrosFromDistribution(35, 25, 40, 'Distribución baja en carbohidratos aplicada.');
  }

  setHighCarbDistribution() {
    this.updateMacrosFromDistribution(25, 55, 20, 'Distribución alta en carbohidratos aplicada.');
  }

  

  // Lógica central para actualizar macros desde porcentajes
  private updateMacrosFromDistribution(proteinPct: number, carbsPct: number, fatPct: number, successMessage: string) {
    const caloriesVal = this.goalsForm.get('calorias')?.value || 0;
    if (!this.goalsForm.get('calorias')?.valid || caloriesVal <= 0) {
      this.presentToast('Establece un objetivo de calorías válido primero (mín. 800 kcal).', 'warning');
      return;
    }

    const proteinCals = caloriesVal * (proteinPct / 100);
    const carbsCals = caloriesVal * (carbsPct / 100);
    const fatCals = caloriesVal * (fatPct / 100);

    this.goalsForm.patchValue({
      proteinas: Math.round(proteinCals / KCAL_PER_GRAM_PROTEIN),
      carbohidratos: Math.round(carbsCals / KCAL_PER_GRAM_CARBS),
      grasas: Math.round(fatCals / KCAL_PER_GRAM_FAT)
    });
    // this.updateMacroVisuals(); // Se llamará automáticamente por valueChanges
    this.presentToast(successMessage, 'primary');
  }


  // Cierra el modal sin devolver datos
  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  // Envía el formulario
  async onSubmit() {
    if (this.goalsForm.invalid) {
      // Marcar todos los campos como "touched" para mostrar errores de validación
      Object.values(this.goalsForm.controls).forEach(control => {
        control.markAsTouched();
      });
      this.presentToast('Por favor, corrige los errores en el formulario.', 'danger');
      return;
    }

    const totalPercentage = this.proteinPercentage + this.carbsPercentage + this.fatPercentage;
    // Permitir un pequeño margen (ej. 98-102%) debido al redondeo de gramos a calorías y luego a porcentaje
    if (totalPercentage < 98 || totalPercentage > 102) {
      const confirmOverride = await this.presentAlertConfirm(
        'Distribución de Macros',
        `La suma de los porcentajes de macros es ${totalPercentage}%. ¿Deseas continuar igualmente?`
      );
      if (!confirmOverride) {
        return;
      }
    }

    this.loading = true; // Activar spinner en el botón

    const updatedGoals: NutritionGoals = {
      calorias: Number(this.goalsForm.value.calorias),
      proteinas: Number(this.goalsForm.value.proteinas),
      carbohidratos: Number(this.goalsForm.value.carbohidratos),
      grasas: Number(this.goalsForm.value.grasas)
    };

    // Simular un pequeño delay para el feedback visual
    setTimeout(() => {
      this.loading = false;
      this.modalCtrl.dismiss(updatedGoals, 'confirm'); // Devolver los datos actualizados
    }, 300);
  }

  // Helper para mostrar Toasts
  async presentToast(message: string, color: 'primary' | 'warning' | 'danger' = 'primary', duration: number = 2500) {
    const toast = await this.toastCtrl.create({
      message,
      duration: duration,
      position: 'bottom',
      color: color,
      cssClass: 'custom-toast' // Para estilos adicionales si es necesario
    });
    await toast.present();
  }

  // Helper para mostrar un Alert de confirmación
  async presentAlertConfirm(header: string, message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.toastCtrl.create({ // Usando ToastController para un alert simple, o puedes usar AlertController
        header: header,
        message: message,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => {
              resolve(false);
            }
          }, {
            text: 'Continuar',
            handler: () => {
              resolve(true);
            }
          }
        ]
      });
      // Si usas AlertController:
      // const alert = await this.alertController.create({ header, message, buttons: [...] });
      await alert.present();
    });
  }
}
