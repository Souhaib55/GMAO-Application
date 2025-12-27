import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InterventionService } from '../interventions/services/intervention.service';
import { DemandeIntervention } from '../../core/models';
import { InterventionDetailModalComponent } from './intervention-detail-modal/intervention-detail-modal.component';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  interventions: DemandeIntervention[];
}

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, RouterModule, InterventionDetailModalComponent],
  template: `
    <div class="planning-container">
      <!-- Header with Title -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div>
            <h1 class="page-title">Planning des Interventions</h1>
            <p class="page-subtitle">Calendrier et planification des interventions</p>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Total</div>
            <div class="stat-value">{{ monthlyStats.total }}</div>
          </div>
        </div>

        <div class="stat-card stat-nouveau">
          <div class="stat-icon-wrapper">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Nouveau</div>
            <div class="stat-value">{{ monthlyStats.nouveau }}</div>
          </div>
        </div>

        <div class="stat-card stat-encours">
          <div class="stat-icon-wrapper">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">En cours</div>
            <div class="stat-value">{{ monthlyStats.enCours }}</div>
          </div>
        </div>

        <div class="stat-card stat-termine">
          <div class="stat-icon-wrapper">
            <svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="9 12 12 15 16 10"></polyline>
            </svg>
          </div>
          <div class="stat-content">
            <div class="stat-label">Terminé</div>
            <div class="stat-value">{{ monthlyStats.termine }}</div>
          </div>
        </div>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Chargement du planning...</p>
      </div>

      <div *ngIf="!loading" class="calendar-wrapper">
        <!-- Calendar Header with Month Navigation -->
        <div class="calendar-header-bar">
          <h2 class="month-title">{{ currentMonthYear }}</h2>
          <div class="month-navigation">
            <button class="nav-btn" (click)="previousMonth()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button class="today-btn" (click)="goToToday()">Aujourd'hui</button>
            <button class="nav-btn" (click)="nextMonth()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>

        <div class="calendar-card">
          <div class="calendar">
            <div class="calendar-weekdays">
              <div class="weekday-name">LUN</div>
              <div class="weekday-name">MAR</div>
              <div class="weekday-name">MER</div>
              <div class="weekday-name">JEU</div>
              <div class="weekday-name">VEN</div>
              <div class="weekday-name">SAM</div>
              <div class="weekday-name">DIM</div>
            </div>
            
            <div class="calendar-grid">
              <div
                *ngFor="let day of calendarDays"
                class="calendar-day"
                [class.other-month]="!day.isCurrentMonth"
                [class.today]="day.isToday"
                [class.has-interventions]="day.interventions.length > 0"
              >
                <div class="day-number">{{ day.date.getDate() }}</div>
                <div class="day-interventions" *ngIf="day.interventions.length > 0">
                  <div
                    *ngFor="let intervention of day.interventions.slice(0, 2)"
                    class="intervention-badge"
                    [class.status-a-traiter]="getStatusClass(intervention) === 'a-traiter'"
                    [class.status-en-cours]="getStatusClass(intervention) === 'en-cours'"
                    [class.status-realisee]="getStatusClass(intervention) === 'realisee'"
                    [class.status-cloturee]="getStatusClass(intervention) === 'cloturee'"
                    [class.status-annulee]="getStatusClass(intervention) === 'annulee'"
                    (click)="openInterventionDetail(intervention)"
                    [title]="intervention.titre"
                  >
                    <span class="intervention-dot"></span>
                    <span class="intervention-text">{{ intervention.titre | slice:0:15 }}{{ intervention.titre.length > 15 ? '...' : '' }}</span>
                    <button 
                      class="intervention-remove" 
                      *ngIf="canRemoveFromCalendar(intervention)"
                      (click)="removeFromCalendar(intervention, $event)"
                      title="Supprimer du calendrier"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  <div
                    *ngIf="day.interventions.length > 2"
                    class="more-badge"
                    (click)="showAllInterventionsForDay(day.date)"
                  >
                    +{{ day.interventions.length - 2 }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <app-intervention-detail-modal
      *ngIf="selectedIntervention"
      [intervention]="selectedIntervention"
      (closed)="closeInterventionDetail()"
      (updated)="onInterventionUpdated()"
    ></app-intervention-detail-modal>
  `,
  styles: [`
    .planning-container {
      padding: 24px;
      background: #f5f6fa;
      min-height: 100vh;
    }

    /* Page Header - Blue Gradient Bar Style */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding: 24px 32px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #2563eb 100%);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      width: 52px;
      height: 52px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      backdrop-filter: blur(4px);
    }

    .page-title {
      font-size: 26px;
      font-weight: 700;
      color: white;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .page-subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.85);
      margin: 4px 0 0 0;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      border: 1px solid #e2e8f0;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: #e2e8f0;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .stat-card.stat-nouveau::before { background: #8b5cf6; }
    .stat-card.stat-encours::before { background: #f59e0b; }
    .stat-card.stat-termine::before { background: #10b981; }

    .stat-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      flex-shrink: 0;
    }

    .stat-card:first-child .stat-icon-wrapper {
      background: #dbeafe;
      color: #3b82f6;
    }

    .stat-card.stat-nouveau .stat-icon-wrapper {
      background: #f3e8ff;
      color: #8b5cf6;
    }

    .stat-card.stat-encours .stat-icon-wrapper {
      background: #fef3c7;
      color: #f59e0b;
    }

    .stat-card.stat-termine .stat-icon-wrapper {
      background: #d1fae5;
      color: #10b981;
    }

    .stat-icon {
      width: 24px;
      height: 24px;
    }

    .stat-content {
      flex: 1;
    }

    .stat-label {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1;
    }

    /* Calendar Wrapper */
    .calendar-wrapper {
      background: white;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }

    /* Calendar Header Bar */
    .calendar-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid #e2e8f0;
      background: #fafbfc;
    }

    .month-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin: 0;
    }

    .month-navigation {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: white;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      color: #64748b;
    }

    .nav-btn:hover {
      background: #f8fafc;
      border-color: #3b82f6;
      color: #3b82f6;
    }

    .nav-btn svg {
      width: 16px;
      height: 16px;
    }

    .today-btn {
      padding: 6px 16px;
      border-radius: 8px;
      background: white;
      border: 1px solid #e2e8f0;
      font-size: 14px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;
    }

    .today-btn:hover {
      background: #3b82f6;
      border-color: #3b82f6;
      color: white;
    }

    /* Calendar */
    .calendar-card {
      padding: 0;
    }

    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid #e2e8f0;
      background: #fafbfc;
    }

    .weekday-name {
      padding: 12px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-left: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }

    .calendar-day {
      min-height: 120px;
      padding: 8px;
      border-right: 1px solid #e2e8f0;
      border-top: 1px solid #e2e8f0;
      background: white;
      position: relative;
      transition: background 0.2s;
    }

    .calendar-day:hover {
      background: #f8fafc;
    }

    .calendar-day.other-month {
      background: #fafbfc;
    }

    .calendar-day.other-month .day-number {
      color: #cbd5e1;
    }

    .calendar-day.today {
      background: #eff6ff;
    }

    .calendar-day.today .day-number {
      background: #3b82f6;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
    }

    .day-number {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
    }

    .day-interventions {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .intervention-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border-left: 3px solid transparent;
    }

    .intervention-badge:hover {
      transform: translateX(2px);
    }

    /* A traiter - Blue (new/pending) */
    .intervention-badge.status-a-traiter {
      background: #dbeafe;
      color: #1e40af;
      border-left-color: #3b82f6;
    }

    /* En cours - Orange (in progress) */
    .intervention-badge.status-en-cours {
      background: #fef3c7;
      color: #92400e;
      border-left-color: #f59e0b;
    }

    /* Réalisée - Orange-red (completed, awaiting validation) */
    .intervention-badge.status-realisee {
      background: #ffedd5;
      color: #c2410c;
      border-left-color: #f97316;
    }

    /* Cloturée - Green (closed/validated) */
    .intervention-badge.status-cloturee {
      background: #d1fae5;
      color: #065f46;
      border-left-color: #10b981;
    }

    /* Annulée - Red (cancelled) */
    .intervention-badge.status-annulee {
      background: #fee2e2;
      color: #991b1b;
      border-left-color: #ef4444;
    }

    .intervention-badge {
      position: relative;
    }

    .intervention-remove {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.2s ease;
      color: white;
      padding: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    .intervention-badge:hover .intervention-remove {
      opacity: 1;
    }

    .intervention-remove:hover {
      background: #dc2626;
      transform: scale(1.1);
    }

    .intervention-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }

    .intervention-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .more-badge {
      padding: 4px 8px;
      background: #f1f5f9;
      color: #64748b;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .more-badge:hover {
      background: #e2e8f0;
      color: #475569;
    }

    /* Loading State */
    .loading-state {
      background: white;
      border-radius: 12px;
      padding: 60px;
      text-align: center;
      color: #64748b;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f1f5f9;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .planning-container {
        padding: 16px;
      }

      .page-header h1 {
        font-size: 24px;
      }

      .header-icon {
        width: 40px;
        height: 40px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .calendar-day {
        min-height: 100px;
        padding: 6px;
      }

      .day-number {
        font-size: 12px;
      }

      .intervention-badge {
        font-size: 10px;
        padding: 3px 6px;
      }
    }

    @media (max-width: 480px) {
      .stats-bar {
        grid-template-columns: 1fr;
      }

      .calendar-day {
        min-height: 80px;
      }

      .intervention-item {
        padding: 4px 6px;
        font-size: 10px;
      }

      .more-interventions {
        font-size: 10px;
        padding: 4px 6px;
      }
    }

    .stat-item {
      text-align: center;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
    }
  `]
})
export class PlanningComponent implements OnInit {
  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  interventions: DemandeIntervention[] = [];
  loading = false;
  selectedIntervention: DemandeIntervention | null = null;
  private readonly REMOVED_KEY = 'calendar_removed_interventions';

  monthlyStats = {
    total: 0,
    nouveau: 0,
    enCours: 0,
    termine: 0,
    urgent: 0
  };

  // Get removed intervention IDs from localStorage
  private getRemovedInterventions(): number[] {
    const stored = localStorage.getItem(this.REMOVED_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  // Add intervention ID to removed list in localStorage
  private addRemovedIntervention(id: number): void {
    const removed = this.getRemovedInterventions();
    if (!removed.includes(id)) {
      removed.push(id);
      localStorage.setItem(this.REMOVED_KEY, JSON.stringify(removed));
    }
  }

  get currentMonthYear(): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  constructor(private interventionService: InterventionService) {}

  ngOnInit(): void {
    this.loadInterventions();
  }

  openInterventionDetail(intervention: DemandeIntervention): void {
    this.selectedIntervention = intervention;
  }

  closeInterventionDetail(): void {
    this.selectedIntervention = null;
  }

  onInterventionUpdated(): void {
    this.closeInterventionDetail();
    this.loadInterventions();
  }

  showAllInterventionsForDay(date: Date): void {
    // Could implement a day detail view showing all interventions
    console.log('Show all interventions for:', date);
  }

  loadInterventions(): void {
    this.loading = true;
    
    // Load all interventions for the current month
    this.interventionService.getInterventions(1, 1000).subscribe({
      next: (result) => {
        // Filter out interventions that were removed from calendar
        const removedIds = this.getRemovedInterventions();
        this.interventions = result.data.filter(
          i => !removedIds.includes(i.idDemandeIntervention)
        );
        this.generateCalendar();
        this.calculateMonthlyStats();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Adjust to start on Monday (0 = Sunday, 1 = Monday, etc.)
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    // Calculate start date (include previous month days)
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDay);

    this.calendarDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const dayInterventions = this.getInterventionsForDay(date);

      this.calendarDays.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        interventions: dayInterventions
      });
    }
  }

  getInterventionsForDay(date: Date): DemandeIntervention[] {
    return this.interventions.filter(intervention => {
      const interventionDate = new Date(intervention.dateCreation);
      return (
        interventionDate.getDate() === date.getDate() &&
        interventionDate.getMonth() === date.getMonth() &&
        interventionDate.getFullYear() === date.getFullYear()
      );
    }).slice(0, 3); // Show max 3 interventions
  }

  getStatusClass(intervention: DemandeIntervention): string {
    const status = intervention.status?.statut?.toLowerCase() || '';
    const statusId = intervention.status?.id;

    // Check by status ID first (most reliable)
    if (statusId === 1) return 'a-traiter';     // A traiter
    if (statusId === 2) return 'en-cours';      // En cours
    if (statusId === 3) return 'realisee';      // Réalisée
    if (statusId === 4) return 'cloturee';      // Cloturée
    if (statusId === 5) return 'annulee';       // Annulée

    // Fallback to status name check
    if (status.includes('traiter')) return 'a-traiter';
    if (status.includes('cours')) return 'en-cours';
    if (status.includes('réalisée') || status.includes('realisee')) return 'realisee';
    if (status.includes('clôturée') || status.includes('cloturee')) return 'cloturee';
    if (status.includes('annulée') || status.includes('annulee')) return 'annulee';

    return 'a-traiter';
  }

  isUrgent(intervention: DemandeIntervention): boolean {
    return intervention.urgence?.libelle?.toLowerCase().includes('urgent') || false;
  }

  formatTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  previousMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.loadInterventions();
  }

  nextMonth(): void {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.loadInterventions();
  }

  goToToday(): void {
    this.currentDate = new Date();
    this.loadInterventions();
  }

  calculateMonthlyStats(): void {
    const monthInterventions = this.interventions.filter(intervention => {
      const date = new Date(intervention.dateCreation);
      return (
        date.getMonth() === this.currentDate.getMonth() &&
        date.getFullYear() === this.currentDate.getFullYear()
      );
    });

    this.monthlyStats = {
      total: monthInterventions.length,
      nouveau: monthInterventions.filter(i => this.getStatusClass(i) === 'a-traiter').length,
      enCours: monthInterventions.filter(i => this.getStatusClass(i) === 'en-cours').length,
      termine: monthInterventions.filter(i => this.getStatusClass(i) === 'realisee' || this.getStatusClass(i) === 'cloturee').length,
      urgent: monthInterventions.filter(i => this.isUrgent(i)).length
    };
  }

  // Check if intervention can be removed from calendar (cancelled or closed)
  canRemoveFromCalendar(intervention: DemandeIntervention): boolean {
    const statusClass = this.getStatusClass(intervention);
    return statusClass === 'annulee' || statusClass === 'cloturee';
  }

  // Remove intervention from calendar view only (does not delete from database)
  removeFromCalendar(intervention: DemandeIntervention, event: Event): void {
    event.stopPropagation();
    
    // Save to localStorage for persistence
    this.addRemovedIntervention(intervention.idDemandeIntervention);
    
    // Remove from local calendar view
    this.interventions = this.interventions.filter(
      i => i.idDemandeIntervention !== intervention.idDemandeIntervention
    );
    
    // Regenerate calendar
    this.generateCalendar();
    this.calculateMonthlyStats();
  }
}
