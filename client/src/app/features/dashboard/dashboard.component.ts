import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { InterventionService } from '../interventions/services/intervention.service';
import { DashboardService, DashboardStatsResponse } from './dashboard.service';
import { AuthService } from '../../core/services/auth.service';
import { UserInfo } from '../../core/models';

interface DashboardStats {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  loading: boolean;
}

interface ChartData {
  labels: string[];
  values: number[];
  colors: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: UserInfo | null = null;
  userRole: string = '';
  stats: DashboardStats[] = [
    {
      label: 'Interventions Aujourd\'hui',
      value: 0,
      icon: 'calendar',
      color: 'primary',
      loading: true
    },
    {
      label: 'En Cours',
      value: 0,
      icon: 'clock',
      color: 'warning',
      loading: true
    },
    {
      label: 'Terminées',
      value: 0,
      icon: 'check',
      color: 'success',
      loading: true
    },
    {
      label: 'Urgent',
      value: 0,
      icon: 'alert',
      color: 'error',
      loading: true
    }
  ];

  // Dashboard data
  dashboardData: DashboardStatsResponse | null = null;
  recentInterventions: any[] = [];
  monthlyChartData: ChartData | null = null;
  urgenceChartData: ChartData | null = null;
  statusChartData: ChartData | null = null;
  loading = true;

  quickActions = [
    {
      label: 'Nouvelle Intervention',
      icon: 'plus',
      route: '/interventions/new',
      color: 'primary'
    },
    {
      label: 'Voir Équipements',
      icon: 'equipment',
      route: '/equipment',
      color: 'secondary'
    },
    {
      label: 'Chat GMAO',
      icon: 'chat',
      route: '/chat',
      color: 'info'
    },
    {
      label: 'Ressources',
      icon: 'resources',
      route: '/resources',
      color: 'success'
    }
  ];

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

    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;

    // Load today's intervention count
    this.interventionService.getTodayCount().subscribe({
      next: (count) => {
        this.stats[0].value = count;
        this.stats[0].loading = false;
      },
      error: () => {
        this.stats[0].loading = false;
      }
    });

    // Load comprehensive dashboard stats
    this.dashboardService.getDashboardStats().subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.updateStatsFromData(data);
        this.recentInterventions = data.recentInterventions;
        this.prepareChartData(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.loading = false;
      }
    });
  }

  updateStatsFromData(data: DashboardStatsResponse): void {
    // Update stats cards
    this.stats[1].value = data.interventionStats.enCours;
    this.stats[1].loading = false;
    
    this.stats[2].value = data.interventionStats.terminee;
    this.stats[2].loading = false;
    
    // Calculate urgent from urgence data
    const urgentCount = data.urgenceData
      .filter(u => u.libelle.toLowerCase().includes('haute') || u.libelle.toLowerCase().includes('urgent'))
      .reduce((sum, u) => sum + u.count, 0);
    this.stats[3].value = urgentCount;
    this.stats[3].loading = false;
  }

  prepareChartData(data: DashboardStatsResponse): void {
    // Status distribution chart
    this.statusChartData = {
      labels: ['En Attente', 'En Cours', 'Terminée', 'Annulée'],
      values: [
        data.interventionStats.enAttente,
        data.interventionStats.enCours,
        data.interventionStats.terminee,
        data.interventionStats.annulee
      ],
      colors: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444']
    };

    // Monthly trend chart
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    this.monthlyChartData = {
      labels: data.monthlyData.map(m => `${monthNames[m.month - 1]}`),
      values: data.monthlyData.map(m => m.count),
      colors: data.monthlyData.map(() => '#3b82f6')
    };

    // Urgence distribution chart
    this.urgenceChartData = {
      labels: data.urgenceData.map(u => u.libelle),
      values: data.urgenceData.map(u => u.count),
      colors: data.urgenceData.map(u => {
        const libelle = u.libelle.toLowerCase();
        if (libelle.includes('haute') || libelle.includes('urgent')) return '#ef4444';
        if (libelle.includes('moyenne') || libelle.includes('normal')) return '#f59e0b';
        return '#10b981';
      })
    };
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  // Chart helper methods
  getChartHeight(value: number, maxValue: number): number {
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }

  getMaxValue(values: number[]): number {
    return Math.max(...values, 1);
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getFullYear()}`;
  }

  getStatusClass(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('attente') || statusLower.includes('traiter')) return 'status-pending';
    if (statusLower.includes('cours')) return 'status-in-progress';
    if (statusLower.includes('réalisée') || statusLower.includes('realisee')) return 'status-realized';
    if (statusLower.includes('clotur') || statusLower.includes('clôtur')) return 'status-completed';
    if (statusLower.includes('annul')) return 'status-cancelled';
    return 'status-default';
  }

  // Role-based visibility
  isSuperviseur(): boolean {
    return this.userRole === 'Superviseur';
  }

  isTechnicien(): boolean {
    return this.userRole === 'Technicien' || this.userRole === 'Utilisateur';
  }

  isDemandeur(): boolean {
    return this.userRole === 'Demandeur';
  }

  getTotalInterventions(): number {
    if (!this.dashboardData) return 0;
    const stats = this.dashboardData.interventionStats;
    return stats.enAttente + stats.enCours + stats.terminee + stats.annulee;
  }
}
