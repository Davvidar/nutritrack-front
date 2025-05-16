// src/app/components/weekly-weight-average/weekly-weight-average.component.ts
import { Component, OnInit, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { DailyLogService } from 'src/app/services/daily-log.service';
import { UserProfile } from 'src/app/services/auth.service';

@Component({
  selector: 'app-weekly-weight-average',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './weekly-weight-average.component.html',
  styleUrls: ['./weekly-weight-average.component.scss'],
})
export class WeeklyWeightAverageComponent implements OnInit {
  @Input() profile: UserProfile | null = null;
  @Input() weightStartDate: Date = new Date(new Date().setMonth(new Date().getMonth() - 2));
  
  weeklyAverage: number | null = null;
  dataDays: number = 0;
  loading: boolean = false;

  constructor(private dailyLogService: DailyLogService) {}

  ngOnInit() {
    this.loadWeeklyAverage();
  }

  loadWeeklyAverage() {
    this.loading = true;
    this.dailyLogService.getWeightWeeklyAverage().subscribe({
      next: (data) => {
        this.weeklyAverage = data.media;
        this.dataDays = data.diasConDatos;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando media semanal:', err);
        this.loading = false;
      }
    });
  }

  getWeightChange(): number | null {
    if (!this.profile) return null;
    const actual = this.profile.pesoHoy || this.profile.peso || 0;
    const inicial = this.profile.pesoAnterior || this.profile.peso || 0;
    return actual - inicial;
  }
}