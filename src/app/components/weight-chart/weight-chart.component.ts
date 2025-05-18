// src/app/components/weight-chart/weight-chart.component.ts
import { Component, OnInit, Input, ElementRef, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartTypeRegistry } from 'chart.js';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

@Component({
  selector: 'app-weight-chart',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <div class="chart-container">
      <canvas #weightChartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      height: 250px;
      width: 100%;
    }
  `]
})
export class WeightChartComponent implements OnInit, OnChanges {
  @Input() weightData: { fecha: string, peso: number }[] = [];
  @ViewChild('weightChartCanvas') weightChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  private chart: Chart | undefined;
  
  constructor() {}
  
  ngOnInit() {
    // Inicialización básica
  }
  
  ngAfterViewInit() {
    // Crear el gráfico después de que la vista esté inicializada
    this.createChart();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    // Actualizar el gráfico cuando cambian los datos
    if (changes['weightData'] && !changes['weightData'].firstChange && this.chart) {
      this.updateChart();
    }
  }
  
  private createChart() {
    if (!this.weightChartCanvas || this.weightData.length === 0) {
      return;
    }
    
    const ctx = this.weightChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Preparar datos para el gráfico
    const labels = this.weightData.map(entry => 
      format(parseISO(entry.fecha), 'd MMM', { locale: es })
    );
    
    const weights = this.weightData.map(entry => entry.peso);
    
    // Calcular valores mínimos y máximos para el eje Y
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const padding = Math.max(1, (maxWeight - minWeight) * 0.1); // 10% de padding o al menos 1 kg
    
    // Configuración del gráfico
    const config: ChartConfiguration<keyof ChartTypeRegistry, number[], string> = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Peso (kg)',
          data: weights,
          borderColor: '#6ab04c', // Color principal de la app
          backgroundColor: 'rgba(106, 176, 76, 0.1)', // Color principal con transparencia
          borderWidth: 2,
          pointBackgroundColor: '#6ab04c',
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.2, // Línea ligeramente curva
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return `Peso: ${context.parsed.y} kg`;
              }
            }
          },
          legend: {
            display: false // Ocultar leyenda
          }
        },
        scales: {
          x: {
            grid: {
              display: false // Ocultar líneas de cuadrícula X
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 10
              }
            }
          },
          y: {
            min: Math.max(0, minWeight - padding), // Evitar valores negativos
            max: maxWeight + padding,
            ticks: {
              stepSize: 1,
              callback: function(value) {
                return value + ' kg';
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    };
    
    // Crear el gráfico
    this.chart = new Chart(ctx, config);
  }
  
  private updateChart() {
    if (!this.chart || !this.weightData.length) {
      return;
    }
    
    // Actualizar datos
    const labels = this.weightData.map(entry => 
      format(parseISO(entry.fecha), 'd MMM', { locale: es })
    );
    
    const weights = this.weightData.map(entry => entry.peso);
    
    // Calcular valores mínimos y máximos para el eje Y
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const padding = Math.max(1, (maxWeight - minWeight) * 0.1);
    
    // Actualizar labels y datos
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = weights;
    
    // Actualizar escala Y
    if (this.chart.options && this.chart.options.scales && this.chart.options.scales['y']) {
      this.chart.options.scales['y'].min = Math.max(0, minWeight - padding);
      this.chart.options.scales['y'].max = maxWeight + padding;
    }
    
    this.chart.update();
  }
}