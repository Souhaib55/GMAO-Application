import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InterventionService } from '../interventions/services/intervention.service';
import { DemandeIntervention } from '../../core/models';
import { InterventionDetailModalComponent } from './intervention-detail-modal/intervention-detail-modal.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  interventions: DemandeIntervention[];
}

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, RouterModule, InterventionDetailModalComponent, PageHeaderComponent],
  template: `
    <div class="planning-container">
      <!-- Header with Title -->
      <app-page-header icon="calendar" title="Planning des interventions" subtitle="Calendrier et planification des interventions">

      </app-page-header>

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

    <div class="day-overlay" *ngIf="dayDetail" (click)="dayDetail = null">
      <div class="day-panel" role="dialog" (click)="$event.stopPropagation()">
        <div class="day-panel-head">
          <div>
            <h3>{{ dayDetail.date | date:'EEEE d MMMM yyyy':'':'fr' }}</h3>
            <p>{{ dayDetail.items.length }} intervention{{ dayDetail.items.length > 1 ? 's' : '' }}</p>
          </div>
          <button class="day-close" (click)="dayDetail = null" title="Fermer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <ul class="day-list">
          <li *ngFor="let i of dayDetail.items" (click)="openFromDayList(i)"
              [ngClass]="'status-' + getStatusClass(i)">
            <span class="intervention-dot"></span>
            <div class="day-item-main">
              <b>{{ i.titre }}</b>
              <small>{{ i.equipement?.designation || 'Sans équipement' }}</small>
            </div>
            <span class="day-item-status">{{ i.status?.statut }}</span>
          </li>
        </ul>
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
      width: 100%;
    }

    /* Page header: title on the page, primary action on the right */
    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-icon {
      display: none;
    }

    .page-title {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.015em;
      color: var(--text);
    }

    .page-subtitle {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .btn-new {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 14px;
      background: var(--primary-600);
      color: #fff;
      border: 1px solid var(--primary-600);
      border-radius: var(--radius);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.15s ease;
      text-decoration: none;
      white-space: nowrap;
    }

    .btn-new:hover {
      background: var(--primary-700);
      border-color: var(--primary-700);
      color: #fff;
    }

    .btn-icon {
      font-size: 18px;
      font-weight: 400;
      line-height: 1;
      margin-top: -2px;
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
      border-radius: var(--radius-lg);
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      border: 1px solid var(--gray-200);
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
      background: var(--gray-200);
    }

    .stat-card:hover {
      transform: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .stat-card.stat-nouveau::before { background: var(--violet); }
    .stat-card.stat-encours::before { background: var(--warning); }
    .stat-card.stat-termine::before { background: var(--success); }

    .stat-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--gray-50);
      flex-shrink: 0;
    }

    .stat-card:first-child .stat-icon-wrapper {
      background: var(--primary-100);
      color: var(--primary-600);
    }

    .stat-card.stat-nouveau .stat-icon-wrapper {
      background: var(--violet-light);
      color: var(--violet);
    }

    .stat-card.stat-encours .stat-icon-wrapper {
      background: var(--warning-light);
      color: var(--warning);
    }

    .stat-card.stat-termine .stat-icon-wrapper {
      background: var(--success-light);
      color: var(--success);
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
      color: var(--gray-500);
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 600;
      color: var(--gray-800);
      line-height: 1;
    }

    /* Calendar Wrapper */
    .calendar-wrapper {
      background: white;
      border-radius: var(--radius-lg);
      border: 1px solid var(--gray-200);
      overflow: hidden;
      box-shadow: var(--card-shadow);
    }

    /* Calendar Header Bar */
    .calendar-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 24px;
      border-bottom: 1px solid var(--gray-200);
      background: var(--gray-50);
    }

    .month-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--gray-800);
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
      border-radius: var(--radius);
      background: white;
      border: 1px solid var(--gray-200);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      color: var(--gray-500);
    }

    .nav-btn:hover {
      background: var(--gray-50);
      border-color: var(--primary-600);
      color: var(--primary-600);
    }

    .nav-btn svg {
      width: 16px;
      height: 16px;
    }

    .today-btn {
      padding: 6px 16px;
      border-radius: var(--radius);
      background: white;
      border: 1px solid var(--gray-200);
      font-size: 14px;
      font-weight: 500;
      color: var(--gray-600);
      cursor: pointer;
      transition: all 0.2s;
    }

    .today-btn:hover {
      background: var(--primary-600);
      border-color: var(--primary-600);
      color: white;
    }

    /* Calendar */
    .calendar-card {
      padding: 0;
    }

    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-bottom: 1px solid var(--gray-200);
      background: var(--gray-50);
    }

    .weekday-name {
      padding: 12px;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: var(--gray-500);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      border-left: 1px solid var(--gray-200);
      border-bottom: 1px solid var(--gray-200);
    }

    .calendar-day {
      min-height: 120px;
      padding: 8px;
      border-right: 1px solid var(--gray-200);
      border-top: 1px solid var(--gray-200);
      background: white;
      position: relative;
      transition: background 0.2s;
    }

    .calendar-day:hover {
      background: var(--gray-50);
    }

    .calendar-day.other-month {
      background: var(--gray-50);
    }

    .calendar-day.other-month .day-number {
      color: var(--gray-300);
    }

    .calendar-day.today {
      background: var(--primary-50);
    }

    .calendar-day.today .day-number {
      background: var(--primary-600);
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    .day-number {
      font-size: 14px;
      font-weight: 600;
      color: var(--gray-800);
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
      background: var(--primary-100);
      color: var(--primary-800);
      border-left-color: var(--primary-600);
    }

    /* En cours - Orange (in progress) */
    .intervention-badge.status-en-cours {
      background: var(--warning-light);
      color: var(--warning-text);
      border-left-color: var(--warning);
    }

    /* Réalisée - Orange-red (completed, awaiting validation) */
    .intervention-badge.status-realisee {
      background: var(--accent-50);
      color: var(--accent-700);
      border-left-color: var(--accent-500);
    }

    /* Cloturée - Green (closed/validated) */
    .intervention-badge.status-cloturee {
      background: var(--success-light);
      color: var(--success-text);
      border-left-color: var(--success);
    }

    /* Annulée - Red (cancelled) */
    .intervention-badge.status-annulee {
      background: var(--error-light);
      color: var(--error-text);
      border-left-color: var(--error);
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
      background: var(--error);
      border: 2px solid white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.2s ease;
      color: white;
      padding: 0;
      box-shadow: 0 1px 3px rgba(21, 26, 34, 0.12);
    }

    .intervention-badge:hover .intervention-remove {
      opacity: 1;
    }

    .intervention-remove:hover {
      background: var(--error-dark);
      transform: none;
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
      background: var(--gray-100);
      color: var(--gray-500);
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .more-badge:hover {
      background: var(--gray-200);
      color: var(--gray-600);
    }

    /* Day list opened from the "+N" badge */
    .day-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(15, 23, 42, 0.4);
      display: grid; place-items: center; padding: 16px;
    }
    .day-panel {
      width: 100%; max-width: 460px; max-height: 80vh;
      display: flex; flex-direction: column;
      background: #fff; border-radius: 12px;
      box-shadow: 0 20px 48px -12px rgba(15, 23, 42, 0.35);
    }
    .day-panel-head {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding: 18px 20px 14px; border-bottom: 1px solid var(--gray-200);
    }
    .day-panel-head h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text); text-transform: capitalize; }
    .day-panel-head p { margin: 2px 0 0; font-size: 13px; color: var(--text-secondary); }
    .day-close {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--gray-200);
      background: #fff; color: var(--gray-500); display: grid; place-items: center; cursor: pointer;
    }
    .day-close:hover { background: var(--gray-50); color: var(--gray-700); }
    .day-list { list-style: none; margin: 0; padding: 8px; overflow-y: auto; }
    .day-list li {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 8px; cursor: pointer;
    }
    .day-list li:hover { background: var(--gray-50); }
    .day-item-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .day-item-main b { font-size: 14px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .day-item-main small { font-size: 12.5px; color: var(--text-secondary); }
    .day-item-status { font-size: 12px; font-weight: 500; white-space: nowrap; }
    .day-list li.status-a-traiter { color: var(--primary-600); }
    .day-list li.status-en-cours { color: var(--warning); }
    .day-list li.status-realisee { color: var(--accent-600); }
    .day-list li.status-cloturee { color: var(--success); }
    .day-list li.status-annulee { color: var(--error); }

    /* Loading State */
    .loading-state {
      background: white;
      border-radius: var(--radius-lg);
      padding: 60px;
      text-align: center;
      color: var(--gray-500);
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 2.5px solid var(--primary-100);
      border-top-color: var(--primary-600);
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      will-change: transform;
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
        padding: 0;
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
      background: var(--gray-50);
      border-radius: var(--radius);
    }

    .stat-value {
      font-size: 32px;
      font-weight: 600;
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

    /* ---- Status-board KPI strip (replaces tinted icon cards) ---- */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0;
      margin-bottom: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .stats-grid .stat-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 14px 18px 16px;
      background: transparent;
      border: 0;
      border-left: 1px solid var(--border);
      border-radius: 0;
      box-shadow: none;
      transform: none;
    }

    .stats-grid .stat-card:first-child {
      border-left: 0;
    }

    .stats-grid .stat-icon {
      width: 8px;
      height: 8px;
      margin-top: 6px;
      border-radius: 2px;
      flex-shrink: 0;
    }


    .stats-grid .stat-content {
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
    }

    .stats-grid .stat-label {
      margin: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .stats-grid .stat-value {
      font-variant-numeric: tabular-nums;
      font-size: 26px;
      font-weight: 500;
      line-height: 1;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }

    /* ---- Row actions: neutral until hovered, red only for delete ---- */
    .action-buttons .btn-action,
    .action-buttons .btn-action.btn-view,
    .action-buttons .btn-action.btn-edit,
    .action-buttons .btn-action.btn-action-danger {
      width: 32px;
      height: 32px;
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius);
      color: var(--gray-500);
    }

    .action-buttons .btn-action svg {
      width: 17px;
      height: 17px;
    }

    .action-buttons .btn-action.btn-view:hover,
    .action-buttons .btn-action.btn-edit:hover {
      background: var(--gray-100);
      color: var(--gray-900);
    }

    .action-buttons .btn-action.btn-action-danger:hover {
      background: var(--error-light);
      color: var(--error);
    }

    .status-badge {
      white-space: nowrap;
    }

    /* Planning markup: label before value, icon inside a wrapper */
    .stats-grid .stat-icon-wrapper {
      width: 8px;
      height: 8px;
      margin-top: 6px;
      border-radius: 2px;
      flex-shrink: 0;
    }


    .stats-grid .stat-content {
      flex-direction: column;
    }

    .stats-grid .stat-card::before,
    .stats-grid .stat-card::after {
      display: none;
    }

    /* ---- KPI cards: separate cards, label + figure, tinted icon chip ---- */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
      background: transparent;
      border: 0;
      border-radius: 0;
      overflow: visible;
    }

    .stats-grid .stat-card,
    .stats-grid .stat-card:first-child {
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--card-shadow);
      transform: none;
      transition: box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .stats-grid .stat-card:hover {
      border-color: var(--gray-300);
      box-shadow: var(--card-shadow-hover);
    }

    .stats-grid .stat-icon,
    .stats-grid .stat-icon-wrapper {
      order: 2;
      width: 40px;
      height: 40px;
      margin: 0;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      border-radius: 10px;
    }

    .stats-grid .stat-icon svg,
    .stats-grid .stat-icon-wrapper .stat-icon {
      display: block;
      width: 20px;
      height: 20px;
      background: transparent !important;
    }

    .stats-grid .stat-content {
      display: flex;
      flex-direction: column-reverse;
      gap: 10px;
      min-width: 0;
    }

    .stats-grid .stat-label {
      margin: 0;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .stats-grid .stat-value,
    .stats-grid .stat-card .stat-number {
      font-variant-numeric: tabular-nums;
      font-size: 28px;
      font-weight: 500;
      line-height: 1;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }

    .table-wrapper,
    .table-container {
      border-radius: 12px;
      box-shadow: var(--card-shadow);
    }

    /* Planning markup has the label before the value */
    .stats-grid .stat-card .stat-content {
      flex-direction: column;
    }
  `]
})
export class PlanningComponent implements OnInit {
  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  interventions: DemandeIntervention[] = [];
  loading = false;
  selectedIntervention: DemandeIntervention | null = null;
  dayDetail: { date: Date; items: DemandeIntervention[] } | null = null;
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

  /** A workflow step was done in the panel: the panel stays open (it reloads itself), the calendar refreshes. */
  onInterventionUpdated(): void {
    this.loadInterventions();
  }

  showAllInterventionsForDay(date: Date): void {
    this.dayDetail = { date, items: this.getInterventionsForDay(date) };
  }

  openFromDayList(intervention: DemandeIntervention): void {
    this.dayDetail = null;
    this.openInterventionDetail(intervention);
  }

  loadInterventions(): void {
    this.loading = true;
    
    // The displayed month plus the days of the neighbouring months shown in the grid
    const y = this.currentDate.getFullYear(), m = this.currentDate.getMonth();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.interventionService.getCalendar(iso(new Date(y, m, -6)), iso(new Date(y, m + 1, 7))).subscribe({
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

  /** A planned job sits on its planned date; a breakdown on the day it was declared. */
  planningDate(intervention: DemandeIntervention): Date {
    const planned = (intervention as any).datePlanifiee as string | null | undefined;
    return planned ? new Date(planned.length === 10 ? planned + 'T00:00:00' : planned) : new Date(intervention.dateCreation);
  }

  getInterventionsForDay(date: Date): DemandeIntervention[] {
    return this.interventions.filter(intervention => {
      const interventionDate = this.planningDate(intervention);
      return (
        interventionDate.getDate() === date.getDate() &&
        interventionDate.getMonth() === date.getMonth() &&
        interventionDate.getFullYear() === date.getFullYear()
      );
    }); // the cell shows two, the "+N" badge opens the full list
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
      const date = this.planningDate(intervention);
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
