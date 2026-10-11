import { Component, OnInit } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { RouterModule } from '@angular/router';
import { InterventionService } from '../interventions/services/intervention.service';
import { DashboardService, DashboardStatsResponse, KpiResponse } from './dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

registerLocaleData(localeFr, 'fr');

interface DashboardStats {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  loading: boolean;
}

interface PerformanceTile {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  definition: string;
  tone?: 'good' | 'warn' | 'bad';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: UserInfo | null = null;
  userRole = '';
  today = new Date();

  stats: DashboardStats[] = [
    { label: 'Créées aujourd\'hui', value: 0, icon: 'calendar', color: 'primary', loading: true },
    { label: 'En cours', value: 0, icon: 'clock', color: 'warning', loading: true },
    { label: 'Terminées', value: 0, icon: 'check', color: 'success', loading: true },
    { label: 'Urgentes', value: 0, icon: 'alert', color: 'error', loading: true }
  ];

  readonly periods = [
    { days: 7, label: '7 j' },
    { days: 30, label: '30 j' },
    { days: 90, label: '90 j' },
    { days: 365, label: '12 mois' }
  ];
  period = 30;

  dashboardData: DashboardStatsResponse | null = null;
  recentInterventions: any[] = [];
  kpi: KpiResponse | null = null;
  kpiLoading = true;
  kpiError = false;

  constructor(
    private authService: AuthService,
    private interventionService: InterventionService,
    private dashboardService: DashboardService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.userRole = user?.role || '';
    });
    this.loadCards();
    this.loadKpis();
  }

  // ---------------------------------------------------------------- loading

  private loadCards(): void {
    this.interventionService.getTodayCount().subscribe({
      next: count => { this.stats[0].value = count; this.stats[0].loading = false; },
      error: () => this.stats[0].loading = false
    });

    this.dashboardService.getDashboardStats().subscribe({
      next: data => {
        this.dashboardData = data;
        this.recentInterventions = data.recentInterventions;
        this.stats[1].value = data.interventionStats.enCours;
        this.stats[2].value = data.interventionStats.terminee;
        this.stats[3].value = data.urgenceData
          .filter(u => /haut|urgent|crit/i.test(u.libelle))
          .reduce((sum, u) => sum + u.count, 0);
        this.stats.slice(1).forEach(s => s.loading = false);
      },
      error: () => this.stats.slice(1).forEach(s => s.loading = false)
    });
  }

  loadKpis(): void {
    this.kpiLoading = true;
    this.kpiError = false;
    this.dashboardService.getKpis(this.period).subscribe({
      next: data => { this.kpi = data; this.kpiLoading = false; },
      error: () => { this.kpiError = true; this.kpiLoading = false; }
    });
  }

  setPeriod(days: number): void {
    if (this.period === days) return;
    this.period = days;
    this.loadKpis();
  }

  get periodLabel(): string {
    return this.period === 365 ? 'sur 12 mois' : `sur ${this.period} jours`;
  }

  // ---------------------------------------------------------------- tiles

  get performanceTiles(): PerformanceTile[] {
    const s = this.kpi?.summary;
    const m = this.dashboardData?.machineStats;
    if (!s) return [];

    const tiles: PerformanceTile[] = [];
    if (this.isSuperviseur() && m) {
      tiles.push({
        label: 'Machines à l\'arrêt',
        value: `${m.arretees}`,
        unit: `/ ${m.total}`,
        hint: 'en ce moment',
        definition: 'Machines faisant l\'objet d\'une demande corrective encore ouverte.',
        tone: m.arretees === 0 ? 'good' : m.pourcentageArretees > 10 ? 'bad' : 'warn'
      });
      tiles.push({
        label: 'Disponibilité du parc',
        value: this.fmt(s.availability, 1),
        unit: '%',
        hint: this.periodLabel,
        definition: '1 − heures d\'arrêt / (nombre de machines × heures de la période).',
        tone: s.availability >= 95 ? 'good' : s.availability >= 90 ? 'warn' : 'bad'
      });
    }
    tiles.push({
      label: 'MTTR',
      value: this.fmtHours(s.mttrHours),
      hint: 'temps moyen de réparation',
      definition: 'Durée moyenne entre la prise en charge par le technicien et la fin des travaux.'
    });
    tiles.push({
      label: 'Délai de prise en charge',
      value: this.fmtHours(s.responseHours),
      hint: 'déclaration → démarrage',
      definition: 'Temps moyen entre la déclaration d\'une demande et son acceptation par un technicien.',
      tone: s.responseHours == null ? undefined : s.responseHours <= 4 ? 'good' : s.responseHours <= 24 ? 'warn' : 'bad'
    });
    if (this.isSuperviseur()) {
      tiles.push({
        label: 'MTBF',
        value: this.fmtHours(s.mtbfHours),
        hint: 'temps moyen entre pannes',
        definition: '(Machines × heures de la période − heures d\'arrêt) / nombre de pannes.'
      });
      tiles.push({
        label: 'Heures d\'arrêt',
        value: this.fmt(s.downtimeHours, 0),
        unit: 'h',
        hint: `${s.breakdowns} panne${s.breakdowns > 1 ? 's' : ''} ${this.periodLabel}`,
        definition: 'Cumul des durées d\'arrêt machine (de la déclaration à la réparation) sur la période.'
      });
    }
    tiles.push({
      label: 'Taux de réalisation',
      value: this.fmt(s.completionRate, 0),
      unit: s.completionRate == null ? '' : '%',
      hint: `${s.created} demande${s.created > 1 ? 's' : ''} ${this.periodLabel}`,
      definition: 'Part des demandes de la période qui sont réalisées ou clôturées (hors annulées).'
    });
    tiles.push({
      label: 'Part du préventif',
      value: this.fmt(s.preventiveShare, 0),
      unit: s.preventiveShare == null ? '' : '%',
      hint: 'objectif courant : ≥ 30 %',
      definition: 'Part des interventions préventives parmi toutes les demandes de la période.',
      tone: s.preventiveShare == null ? undefined : s.preventiveShare >= 30 ? 'good' : 'warn'
    });
    return tiles;
  }

  // ---------------------------------------------------------------- helpers

  fmt(value: number | null | undefined, digits: number): string {
    if (value == null) return '—';
    return value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  fmtHours(hours: number | null | undefined): string {
    if (hours == null) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 48) return `${this.fmt(hours, 1)} h`;
    return `${this.fmt(hours / 24, 1)} j`;
  }

  width(value: number, max: number): number {
    return max > 0 ? Math.max(2, (value / max) * 100) : 0;
  }

  maxOf<T>(items: T[] | undefined, pick: (item: T) => number): number {
    return items && items.length ? Math.max(...items.map(pick), 1) : 1;
  }

  lineMax = (x: { downtimeHours: number }) => x.downtimeHours;
  paretoMax = (x: { count: number }) => x.count;
  trendMax = (x: { created: number; closed: number }) => Math.max(x.created, x.closed);
  agingMax = (x: { count: number }) => x.count;

  /** Causes that make up the first 80 % of breakdowns. */
  isVitalFew(index: number): boolean {
    const pareto = this.kpi?.pareto ?? [];
    if (index === 0) return true;
    return (pareto[index - 1]?.cumulative ?? 100) < 80;
  }

  getGreeting(): string {
    return new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir';
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  getStatusClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('traiter') || s.includes('attente')) return 'status-pending';
    if (s.includes('cours')) return 'status-in-progress';
    if (s.includes('réalisée') || s.includes('realisee')) return 'status-realized';
    if (s.includes('clotur') || s.includes('clôtur')) return 'status-completed';
    if (s.includes('annul')) return 'status-cancelled';
    return 'status-default';
  }

  isSuperviseur(): boolean {
    return this.userRole === 'Superviseur';
  }
}
