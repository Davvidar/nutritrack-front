// src/app/modals/nutrition-goals-edit/nutrition-goals-edit.modal.ts
import { Component, OnInit, Input } from '@angular/core';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

export interface NutritionGoals {
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}

@Component({
  selector: 'app-nutrition-goals-edit',
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
  templateUrl: './nutrition-goals-edit.modal.html',
  styleUrls: ['./nutrition-goals-edit.modal.scss']
})
export class NutritionGoalsEditModal implements OnInit {
  @Input() currentGoals: NutritionGoals = {
    calorias: 0,
    proteinas: 0,
    carbohidratos: 0,
    grasas: 0
  };

  goalsForm!: FormGroup;
  loading: boolean = false;
  
  // Para mostrar porcentajes de macros
  proteinPercentage: number = 0;
  carbsPercentage: number = 0;
  fatPercentage: number = 0;
  
  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.initForm();
    this.updatePercentages();
    
    // Suscribirse a cambios en el formulario para actualizar porcentajes
    this.goalsForm.valueChanges.subscribe(() => {
      this.updatePercentages();
    });
  }

  initForm() {
    this.goalsForm = this.fb.group({
      calorias: [this.currentGoals.calorias || 0, [Validators.required, Validators.min(800), Validators.max(10000)]],
      proteinas: [this.currentGoals.proteinas || 0, [Validators.required, Validators.min(10), Validators.max(500)]],
      carbohidratos: [this.currentGoals.carbohidratos || 0, [Validators.required, Validators.min(10), Validators.max(800)]],
      grasas: [this.currentGoals.grasas || 0, [Validators.required, Validators.min(10), Validators.max(300)]]
    });
  }

  updatePercentages() {
    const formValues = this.goalsForm.value;
    const calorias = formValues.calorias || 0;
    
    if (calorias > 0) {
      // Calorías por gramo: proteínas (4), carbohidratos (4), grasas (9)
      const proteinCals = (formValues.proteinas || 0) * 4;
      const carbsCals = (formValues.carbohidratos || 0) * 4;
      const fatCals = (formValues.grasas || 0) * 9;
      
      this.proteinPercentage = Math.round((proteinCals / calorias) * 100);
      this.carbsPercentage = Math.round((carbsCals / calorias) * 100);
      this.fatPercentage = Math.round((fatCals / calorias) * 100);
    } else {
      this.proteinPercentage = 0;
      this.carbsPercentage = 0;
      this.fatPercentage = 0;
    }
  }

  calculateFromPercentages() {
    const caloriesVal = this.goalsForm.get('calorias')?.value || 0;
    
    if (caloriesVal <= 0) {
      this.presentToast('Establece primero las calorías totales', 'warning');
      return;
    }
    
    // Distribución estándar: 30% proteínas, 45% carbohidratos, 25% grasas
    const proteinCals = caloriesVal * 0.30;
    const carbsCals = caloriesVal * 0.45;
    const fatCals = caloriesVal * 0.25;
    
    // Convertir a gramos (dividiendo por calorías por gramo)
    const proteinGrams = Math.round(proteinCals / 4);
    const carbsGrams = Math.round(carbsCals / 4);
    const fatGrams = Math.round(fatCals / 9);
    
    // Actualizar el formulario
    this.goalsForm.patchValue({
      proteinas: proteinGrams,
      carbohidratos: carbsGrams,
      grasas: fatGrams
    });
    
    this.updatePercentages();
    this.presentToast('Macros calculados automáticamente', 'success');
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async presentToast(message: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  onSubmit() {
    if (this.goalsForm.invalid) {
      // Marcar todos los campos como tocados para mostrar errores
      Object.keys(this.goalsForm.controls).forEach(key => {
        this.goalsForm.get(key)?.markAsTouched();
      });
      
      this.presentToast('Por favor, corrige los errores en el formulario', 'danger');
      return;
    }
    
    const totalPercentage = this.proteinPercentage + this.carbsPercentage + this.fatPercentage;
    if (totalPercentage < 95 || totalPercentage > 105) {
      this.presentToast(`La distribución de macros suma ${totalPercentage}%. Debería estar cerca del 100%.`, 'warning');
      return;
    }
    
    this.loading = true;
    
    // Devolver los valores del formulario al componente padre
    const updatedGoals: NutritionGoals = {
      calorias: this.goalsForm.value.calorias,
      proteinas: this.goalsForm.value.proteinas,
      carbohidratos: this.goalsForm.value.carbohidratos,
      grasas: this.goalsForm.value.grasas
    };
    
    // Simular un pequeño retraso para mostrar el estado de carga
    setTimeout(() => {
      this.loading = false;
      this.modalCtrl.dismiss(updatedGoals);
    }, 500);
  }

  // Método para actualizar macros basado en la distribución de porcentajes
  onUpdateMacroDistribution(proteinPct: number, carbsPct: number, fatPct: number) {
    const caloriesVal = this.goalsForm.get('calorias')?.value || 0;
    
    if (caloriesVal <= 0) {
      this.presentToast('Establece primero las calorías totales', 'warning');
      return;
    }
    
    // Calcular las calorías para cada macro
    const proteinCals = caloriesVal * (proteinPct / 100);
    const carbsCals = caloriesVal * (carbsPct / 100);
    const fatCals = caloriesVal * (fatPct / 100);
    
    // Convertir a gramos
    const proteinGrams = Math.round(proteinCals / 4);
    const carbsGrams = Math.round(carbsCals / 4);
    const fatGrams = Math.round(fatCals / 9);
    
    // Actualizar el formulario
    this.goalsForm.patchValue({
      proteinas: proteinGrams,
      carbohidratos: carbsGrams,
      grasas: fatGrams
    });
    
    this.updatePercentages();
  }

  // Métodos para presets de distribución de macros
  setBalancedDistribution() {
    this.onUpdateMacroDistribution(30, 45, 25);
    this.presentToast('Distribución balanceada aplicada', 'success');
  }
  
  setHighProteinDistribution() {
    this.onUpdateMacroDistribution(40, 30, 30);
    this.presentToast('Distribución alta en proteínas aplicada', 'success');
  }
  
  setLowCarbDistribution() {
    this.onUpdateMacroDistribution(35, 25, 40);
    this.presentToast('Distribución baja en carbohidratos aplicada', 'success');
  }
}