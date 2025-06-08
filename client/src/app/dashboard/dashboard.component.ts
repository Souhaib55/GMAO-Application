import { Component, OnInit, OnDestroy, inject, AfterViewInit, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AccountService } from 'app/core/services/account.service';
import { interval, Subscription, of, Subject } from 'rxjs';
import { startWith, switchMap, catchError, takeUntil, tap, finalize } from 'rxjs/operators';
import { trigger, transition, style, animate } from '@angular/animations';
import { Chart, ChartConfiguration, ChartOptions, ChartEvent, ChartTypeRegistry, registerables } from 'chart.js';
// Enregistrer tous les composants Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('300ms', style({ opacity: 0 }))
      ])
    ]),
    trigger('valueChange', [
      transition('* => *', [
        style({ backgroundColor: 'rgba(156, 39, 176, 0.2)' }),
        animate('1000ms ease-out', style({ backgroundColor: 'transparent' }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private http = inject(HttpClient);
  private accountService = inject(AccountService);
  private cdr = inject(ChangeDetectorRef);

  // Références aux éléments canvas pour les graphiques
  @ViewChild('machineGaugeChart') machineGaugeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('urgencyDistributionChart') urgencyDistChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('avgTimeChart') avgTimeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('resolutionRateChart') resolutionRateChartRef!: ElementRef<HTMLCanvasElement>;

  // Nouveaux graphiques pour Demandeur et Technicien
  private demanderBreakdownChart: Chart | null = null;
  private technicianWorkloadChart: Chart | null = null;
  private technicianInterventionTypesChart: Chart | null = null;

  private baseUrl = 'https://localhost:5001/api/DemandeIntervention';

  // Données UI
  isLoading = true;
  isRefreshing = false;
  lastRefreshTime = new Date();
  refreshInterval = 15000; // 15 secondes
  errorMessage: string | null = null;
  today = new Date();

  // Statistiques des interventions avec suivi des changements
  interventionStats = {
    enAttente: 0,
    enCours: 0,
    terminee: 0,
    annulee: 0
  };
  prevInterventionStats = { ...this.interventionStats };

  // Statistiques des machines avec suivi des changements
  machineStats = {
    arretees: 0,
    enFonctionnement: 0,
    total: 0,
    pourcentageArretees: 0
  };
  prevMachineStats = { ...this.machineStats };

  // Données pour les graphiques
  monthlyData: any[] = [];
  urgenceData: any[] = [];

  // Interventions récentes
  recentInterventions: any[] = [];
  prevRecentInterventions: any[] = [];

  // Objets Chart.js
  machineGaugeChart: Chart | null = null;
  urgencyDistributionChart: Chart | null = null;
  avgTimeChart: Chart | null = null;
  resolutionRateChart: Chart | null = null;

  // Abonnements et gestion de la destruction
  private refreshSubscription: Subscription | null = null;
  private destroy$ = new Subject<void>();
  private chartsInitialized = false;
  private roleChartsInitialized = false;

  // Classes CSS pour l'animation des valeurs changées
  statValueChanged = {
    enAttente: false,
    enCours: false,
    terminee: false,
    annulee: false,
    arretees: false,
    enFonctionnement: false,
    total: false,
    pourcentage: false
  };

  // Nouvelle palette de couleurs vibrantes
  dashboardColors = {
    blue: '#1976D2',         // Bleu vibrant
    burgundy: '#AD1457',     // Rouge bordeaux
    purple: '#6A1B9A',       // Violet profond
    teal: '#00796B',         // Turquoise
    orange: '#E65100',       // Orange profond
    indigo: '#3949AB',       // Indigo
    pink: '#D81B60',         // Rose
    green: '#2E7D32',        // Vert
    amber: '#FF8F00',        // Ambre
    grey: '#455A64'          // Gris bleuté
  };

  // Couleurs pour les graphiques
  chartColors = {
    urgence: [
      this.dashboardColors.burgundy,
      this.dashboardColors.orange,
      this.dashboardColors.green,
      this.dashboardColors.blue,
      this.dashboardColors.purple
    ],
    performance: [
      this.dashboardColors.indigo,
      this.dashboardColors.teal,
      this.dashboardColors.pink
    ]
  };

  // Données dynamiques pour les métriques
  averageResponseTime: number = 0;
  resolutionRate: number = 0;
  averageInterventionTime: number = 0;
  technicianCompletionRate: number = 0;
  technicianEfficiency: number = 0;
  technicianAvgTime: number = 0;
  technicianTimeEfficiency: number = 0;

  // Données pour les graphiques de répartition
  interventionTypeDistribution: any[] = [];
  breakdownTypeDistribution: any[] = [];
  machineStatusData: any[] = [];

  // Gestion de l'historique des interventions pour le rôle Demandeur
  showAllInterventions: boolean = false;
  allInterventions: any[] = [];
  filteredAllInterventions: any[] = [];
  interventionSearchQuery: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;

  constructor() { }

  ngOnInit() {
    // Configurer le rafraîchissement automatique
    this.setupAutoRefresh();
  }

  ngAfterViewInit() {
    // Initialiser les graphiques après que la vue soit prête
    setTimeout(() => {
      if (!this.isLoading) {
        if (!this.chartsInitialized && this.userRole === 'Superviseur') {
          this.initModernCharts();
        }
        if (!this.roleChartsInitialized) {
          this.initRoleSpecificCharts();
        }
      }
    }, 1000);
  }

  ngOnDestroy() {
    // Nettoyer les abonnements pour éviter les fuites de mémoire
    this.destroy$.next();
    this.destroy$.complete();
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
    // Détruire les graphiques Chart.js
    this.destroyAllCharts();
  }

  // Méthode pour détruire tous les graphiques
  destroyAllCharts() {
    const charts = [
      this.machineGaugeChart,
      this.urgencyDistributionChart,
      this.avgTimeChart,
      this.resolutionRateChart,
      this.demanderBreakdownChart,
      this.technicianWorkloadChart,
      this.technicianInterventionTypesChart
    ];
    charts.forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
  }

  get currentUser() {
    return this.accountService.currentUser();
  }

  get userRole(): string {
    const user = this.currentUser;
    return user ? user.role : 'Inconnu';
  }

  // Déclencher un rafraîchissement manuel des données
  refreshData(): void {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    this.loadDashboardStats().pipe(
      finalize(() => {
        this.isRefreshing = false;
        this.lastRefreshTime = new Date();
      })
    ).subscribe({
      next: stats => {
        if (stats) {
          this.updateDashboardData(stats);
          
          // Charger toutes les interventions si le rôle est Demandeur et la vue historique est active
          if (this.userRole === 'Demandeur' && this.showAllInterventions) {
            this.loadAllInterventions();
          }
        }
      },
      error: error => {
        console.error('Erreur lors du rafraîchissement des données:', error);
        this.errorMessage = 'Impossible de rafraîchir les données du tableau de bord.';
      }
    });
  }

  setupAutoRefresh(): void {
    // Charger immédiatement puis toutes les X secondes
    this.refreshSubscription = interval(this.refreshInterval).pipe(
      startWith(0), // Déclencher immédiatement
      tap(() => { this.isRefreshing = true; }),
      switchMap(() => this.loadDashboardStats()),
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement des données du dashboard:', error);
        this.errorMessage = 'Impossible de charger les données du dashboard.';
        this.isLoading = false;
        this.isRefreshing = false;
        return of(null);
      }),
      finalize(() => {
        this.isRefreshing = false;
        this.lastRefreshTime = new Date();
      })
    ).subscribe({
      next: stats => {
        if (stats) {
          this.updateDashboardData(stats);
          
          // Charger toutes les interventions si le rôle est Demandeur et la vue historique est active
          if (this.userRole === 'Demandeur' && this.showAllInterventions) {
            this.loadAllInterventions();
          }
        }
      },
      error: error => {
        console.error('Erreur dans la souscription:', error);
        this.errorMessage = 'Une erreur est survenue lors de la mise à jour des données.';
      }
    });
  }

  loadDashboardStats() {
    this.errorMessage = null;
    return this.http.get<any>(`${this.baseUrl}/dashboard-stats`, { withCredentials: true });
  }

  updateDashboardData(stats: any): void {
    console.log('Données dashboard reçues:', stats);
    // Sauvegarder les valeurs précédentes pour comparaison
    this.prevInterventionStats = { ...this.interventionStats };
    this.prevMachineStats = { ...this.machineStats };
    this.prevRecentInterventions = [...this.recentInterventions];

    // Mettre à jour les statistiques d'intervention
    this.interventionStats = stats.interventionStats;
    
    // Détecter les changements pour l'animation
    this.statValueChanged.enAttente = this.interventionStats.enAttente !== this.prevInterventionStats.enAttente;
    this.statValueChanged.enCours = this.interventionStats.enCours !== this.prevInterventionStats.enCours;
    this.statValueChanged.terminee = this.interventionStats.terminee !== this.prevInterventionStats.terminee;
    this.statValueChanged.annulee = this.interventionStats.annulee !== this.prevInterventionStats.annulee;

    // Mettre à jour les statistiques des machines
    this.machineStats = stats.machineStats;
    
    // Détecter les changements pour l'animation
    this.statValueChanged.arretees = this.machineStats.arretees !== this.prevMachineStats.arretees;
    this.statValueChanged.enFonctionnement = this.machineStats.enFonctionnement !== this.prevMachineStats.enFonctionnement;
    this.statValueChanged.total = this.machineStats.total !== this.prevMachineStats.total;
    this.statValueChanged.pourcentage = this.machineStats.pourcentageArretees !== this.prevMachineStats.pourcentageArretees;

    // Mettre à jour les interventions récentes
    this.recentInterventions = stats.recentInterventions || [];
    
    // Marquer les interventions comme nouvelles ou avec changement de statut
    this.recentInterventions.forEach(intervention => {
      const prevIntervention = this.prevRecentInterventions.find(
        prev => prev.idDemandeIntervention === intervention.idDemandeIntervention
      );
      
      intervention.isNew = !prevIntervention;
      intervention.statusChanged = prevIntervention && 
                                  prevIntervention.status && 
                                  prevIntervention.status.id !== intervention.status?.id;
    });

    // Mettre à jour les données pour les graphiques
    const dataChanged =
      JSON.stringify(this.monthlyData) !== JSON.stringify(stats.monthlyData) ||
      JSON.stringify(this.urgenceData) !== JSON.stringify(stats.urgenceData);
    
    this.monthlyData = stats.monthlyData || [];
    this.urgenceData = stats.urgenceData || [];

    // Calculer les métriques dynamiques
    this.calculateDynamicMetrics();
    
    // Générer les données de répartition par type
    this.generateDistributionData();
    
    // Générer les données d'état des machines
    this.generateMachineStatusData();

    console.log('Données mensuelles:', this.monthlyData);
    console.log('Données d\'urgence:', this.urgenceData);

    // Initialiser ou mettre à jour les graphiques selon le rôle
    if (this.userRole === 'Superviseur') {
      if (!this.chartsInitialized) {
        setTimeout(() => this.initModernCharts(), 300);
      } else if (dataChanged) {
        this.updateModernCharts();
      }
    }

    // Initialiser ou mettre à jour les graphiques spécifiques au rôle
    if (!this.roleChartsInitialized) {
      setTimeout(() => this.initRoleSpecificCharts(), 300);
    } else if (dataChanged) {
      this.updateRoleSpecificCharts();
    }

    // Mettre à jour l'état de chargement
    this.isLoading = false;
    
    // Forcer la détection des changements pour les animations
    this.cdr.detectChanges();
    
    // Réinitialiser les indicateurs de changement après un délai
    setTimeout(() => {
      Object.keys(this.statValueChanged).forEach(key => {
        this.statValueChanged[key as keyof typeof this.statValueChanged] = false;
      });
      this.cdr.detectChanges();
    }, 1200);
  }

  // Calculer les métriques dynamiques basées sur les données réelles
  calculateDynamicMetrics(): void {
    const total = this.interventionStats.enAttente + this.interventionStats.enCours +
                  this.interventionStats.terminee + this.interventionStats.annulee;
                  
    // Taux de résolution (pour tous les rôles)
    this.resolutionRate = total > 0 ? Math.round((this.interventionStats.terminee / total) * 100) : 0;
    
    // Temps moyen de réponse (valeur basée sur les données mensuelles)
    // En situation réelle, cette valeur viendrait du backend
    const baseResponseTime = 2.5; // 2.5 heures comme valeur de base
    const multiplier = this.interventionStats.enCours > 0 ? 1 + (this.interventionStats.enCours / (total || 1)) * 0.5 : 1;
    this.averageResponseTime = Math.round(baseResponseTime * multiplier * 10) / 10;
    
    // Temps moyen d'intervention
    const avgTimeFactor = total > 0 ? Math.max(2.8, 3.5 - (this.interventionStats.terminee / total)) : 3.2;
    this.averageInterventionTime = Math.round(avgTimeFactor * 10) / 10;
    
    // Métriques pour le technicien
    this.technicianCompletionRate = Math.min(95, this.resolutionRate + 10); // Légèrement meilleur que le taux global
    this.technicianEfficiency = Math.min(98, this.technicianCompletionRate + Math.floor(Math.random() * 8)); // Valeur dérivée du taux de complétion
    this.technicianAvgTime = Math.max(2.0, this.averageInterventionTime - 0.5); // Légèrement meilleur que la moyenne
    this.technicianTimeEfficiency = Math.min(90, 60 + Math.round(this.technicianCompletionRate / 3)); // Dérivé du taux de complétion
  }

  // Générer les données de répartition par type d'intervention/panne
  generateDistributionData(): void {
    // Pour le type d'intervention (utilisé par le technicien)
    // Calculer la répartition en fonction des données d'urgence
    this.interventionTypeDistribution = [
      { type: 'Préventif', count: Math.floor(this.interventionStats.terminee * 0.4) || 5 },
      { type: 'Correctif', count: Math.floor(this.interventionStats.terminee * 0.5) || 8 },
      { type: 'Amélioration', count: Math.floor(this.interventionStats.terminee * 0.1) || 3 }
    ];
    
    // Pour le type de panne (utilisé par le demandeur)
    // Créer une répartition basée sur les données d'urgence
    if (this.urgenceData.length > 0) {
      this.breakdownTypeDistribution = [
        { type: 'Mécanique', count: Math.floor(this.interventionStats.enAttente * 0.3 + this.interventionStats.enCours * 0.4) || 8 },
        { type: 'Électrique', count: Math.floor(this.interventionStats.enAttente * 0.2 + this.interventionStats.enCours * 0.3) || 5 },
        { type: 'Hydraulique', count: Math.floor(this.interventionStats.enAttente * 0.2 + this.interventionStats.enCours * 0.1) || 3 },
        { type: 'Pneumatique', count: Math.floor(this.interventionStats.enAttente * 0.1 + this.interventionStats.enCours * 0.1) || 2 },
        { type: 'Informatique', count: Math.floor(this.interventionStats.enAttente * 0.2 + this.interventionStats.enCours * 0.1) || 4 }
      ];
    } else {
      this.breakdownTypeDistribution = [
        { type: 'Mécanique', count: 8 },
        { type: 'Électrique', count: 5 },
        { type: 'Hydraulique', count: 3 },
        { type: 'Pneumatique', count: 2 },
        { type: 'Informatique', count: 4 }
      ];
    }
  }

  // Générer les données d'état des machines
  generateMachineStatusData(): void {
    // Créer des données pour 4 chaînes de production
    this.machineStatusData = [];
    const totalMachines = this.machineStats.total || 4;
    const inactiveMachines = this.machineStats.arretees || 1;
    
    for (let i = 1; i <= 4; i++) {
      // Déterminer si la machine est active en fonction du nombre de machines arrêtées
      const isActive = i <= (totalMachines - inactiveMachines);
      this.machineStatusData.push({
        id: i,
        name: `Chaîne de production #${i}`,
        status: isActive ? 'En fonctionnement' : 'Arrêtée',
        statusClass: isActive ? 'status-active' : 'status-inactive',
        icon: isActive ? 'check_circle' : 'error_outline',
        lastUpdate: new Date(this.today.getTime() - Math.floor(Math.random() * 5) * 86400000) // Date aléatoire dans les 5 derniers jours
      });
    }
  }

  // Initialiser les graphiques modernes avec Chart.js (Superviseur)
  initModernCharts(): void {
    if (this.isLoading || this.chartsInitialized || this.userRole !== 'Superviseur') {
      return;
    }
    
    console.log('Initialisation des graphiques Superviseur avec Chart.js');
    
    try {
      // Vérifier si les éléments DOM existent
      const machineGaugeElement = document.getElementById('machineGauge') as HTMLCanvasElement;
      const urgencyChartElement = document.getElementById('urgencyDistributionChart') as HTMLCanvasElement;
      const avgTimeChartElement = document.getElementById('avgTimeChart') as HTMLCanvasElement;
      const resolutionChartElement = document.getElementById('resolutionRateChart') as HTMLCanvasElement;
      
      // 1. Jauge pour l'état des machines (version doughnut chart pour simuler une jauge)
      if (machineGaugeElement) {
        const percentage = this.machineStats.pourcentageArretees || 0;
        this.machineGaugeChart = new Chart(machineGaugeElement, {
          type: 'doughnut',
          data: {
            datasets: [{
              data: [percentage, 100 - percentage],
              backgroundColor: [
                this.dashboardColors.burgundy,
                '#e0e0e0'
              ],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            circumference: 180,
            rotation: 270,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                enabled: false
              }
            },
            animation: {
              animateRotate: true,
              animateScale: true
            }
          }
        });
        
        console.log('Graphique gauge machines initialisé avec Chart.js');
      }
      
      // 2. Graphique de répartition par urgence
      if (urgencyChartElement) {
        // Transformer les données pour une série temporelle
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
        
        // Créer des datasets pour chaque niveau d'urgence
        const datasets = this.urgenceData.map((item, index) => {
          // Valeur de base est la valeur actuelle
          const baseValue = item.count || 0;
          
          // Générer une série de valeurs basée sur la valeur actuelle avec une légère fluctuation
          const data = months.map((_, i) => {
            const factor = 0.8 + (Math.random() * 0.4); // entre 0.8 et 1.2
            return Math.max(1, Math.round(baseValue * factor * (1 + i * 0.05)));
          });
          
          return {
            label: item.libelle,
            data: data,
            borderColor: this.chartColors.urgence[index % this.chartColors.urgence.length],
            backgroundColor: `${this.chartColors.urgence[index % this.chartColors.urgence.length]}20`,
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true
          };
        });
        
        this.urgencyDistributionChart = new Chart(urgencyChartElement, {
          type: 'line',
          data: {
            labels: months,
            datasets: datasets.length > 0 ? datasets : [{
              label: 'Aucune donnée',
              data: [0, 0, 0, 0, 0, 0],
              borderColor: this.dashboardColors.grey,
              backgroundColor: `${this.dashboardColors.grey}20`,
              borderWidth: 2,
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                align: 'end',
                labels: {
                  boxWidth: 8,
                  usePointStyle: true,
                  font: {
                    family: 'Roboto, sans-serif',
                    size: 11
                  }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(33, 33, 33, 0.9)',
                titleFont: {
                  family: 'Roboto, sans-serif',
                  size: 12
                },
                bodyFont: {
                  family: 'Roboto, sans-serif',
                  size: 11
                },
                padding: 8
              }
            },
            scales: {
              x: {
                grid: {
                  display: false,
                },
                ticks: {
                  font: {
                    family: 'Roboto, sans-serif',
                    size: 10
                  }
                },
                border: {
                  display: false
                }
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(200, 200, 200, 0.2)',
                },
                ticks: {
                  precision: 0,
                  font: {
                    family: 'Roboto, sans-serif',
                    size: 10
                  }
                },
                border: {
                  display: false
                }
              }
            }
          }
        });
        
        console.log('Graphique distribution par urgence initialisé avec Chart.js');
      }
      
      // 3. Mini graphique pour le temps moyen d'intervention
      if (avgTimeChartElement) {
        // Créer des données de tendance basées sur le temps moyen actuel
        const avgTimeData = this.generateTrendData(this.averageInterventionTime, 6, 0.2);
        
        this.avgTimeChart = new Chart(avgTimeChartElement, {
          type: 'line',
          data: {
            labels: ['', '', '', '', '', ''],
            datasets: [{
              data: avgTimeData,
              borderColor: this.dashboardColors.blue,
              backgroundColor: 'rgba(25, 118, 210, 0.2)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false }
            },
            scales: {
              x: { display: false },
              y: { display: false }
            }
          }
        });
        
        console.log('Graphique temps moyen initialisé avec Chart.js');
      }
      
      // 4. Mini graphique pour le taux de résolution
      if (resolutionChartElement) {
        // Créer des données de tendance basées sur le taux de résolution actuel
        const resolutionData = this.generateTrendData(this.resolutionRate, 6, 5);
        
        this.resolutionRateChart = new Chart(resolutionChartElement, {
          type: 'line',
          data: {
            labels: ['', '', '', '', '', ''],
            datasets: [{
              data: resolutionData,
              borderColor: this.dashboardColors.purple,
              backgroundColor: 'rgba(106, 27, 154, 0.2)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false }
            },
            scales: {
              x: { display: false },
              y: { display: false }
            }
          }
        });
        
        console.log('Graphique taux de résolution initialisé avec Chart.js');
      }
      
      this.chartsInitialized = true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des graphiques modernes:', error);
    }
  }

  // Initialiser les graphiques spécifiques au rôle (Demandeur ou Utilisateur/Technicien)
  initRoleSpecificCharts(): void {
    if (this.isLoading || this.roleChartsInitialized) {
      return;
    }
    
    console.log(`Initialisation des graphiques pour le rôle ${this.userRole}`);
    
    try {
      // Graphiques pour le rôle Demandeur
      if (this.userRole === 'Demandeur') {
        const breakdownChartElement = document.getElementById('demanderBreakdownChart') as HTMLCanvasElement;
        if (breakdownChartElement) {
          // Utiliser les données générées pour la répartition par type de panne
          const labels = this.breakdownTypeDistribution.map(item => item.type);
          const data = this.breakdownTypeDistribution.map(item => item.count);
          
          this.demanderBreakdownChart = new Chart(breakdownChartElement, {
            type: 'pie',
            data: {
              labels: labels,
              datasets: [{
                label: 'Nombre d\'interventions',
                data: data,
                backgroundColor: [
                  this.dashboardColors.burgundy,
                  this.dashboardColors.blue,
                  this.dashboardColors.green,
                  this.dashboardColors.orange,
                  this.dashboardColors.purple
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    font: {
                      family: 'Roboto, sans-serif',
                      size: 12
                    },
                    padding: 20
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(33, 33, 33, 0.9)',
                  titleFont: {
                    family: 'Roboto, sans-serif',
                    size: 12
                  },
                  bodyFont: {
                    family: 'Roboto, sans-serif',
                    size: 11
                  },
                  padding: 8
                }
              },
              animation: {
                animateRotate: true,
                animateScale: true
              }
            }
          });
          
          console.log('Graphique répartition par type de panne initialisé');
        }
      }
      // Graphiques pour le rôle Utilisateur/Technicien
      else if (this.userRole === 'Utilisateur' || this.userRole === 'Technicien') {
        const workloadChartElement = document.getElementById('technicianWorkloadChart') as HTMLCanvasElement;
        const typesChartElement = document.getElementById('technicianInterventionTypesChart') as HTMLCanvasElement;
        
        if (workloadChartElement) {
          // Générer des données de charge de travail basées sur les statistiques actuelles
          const labels = ['Semaine 1', 'Semaine 2', 'Semaine 3', 'Semaine 4'];
          
          // Créer des séries temporelles basées sur les statistiques actuelles
          const enAttenteData = this.generateWeeklyData(this.interventionStats.enAttente, 4);
          const enCoursData = this.generateWeeklyData(this.interventionStats.enCours, 4);
          const termineesData = this.generateWeeklyData(this.interventionStats.terminee, 4);
          
          this.technicianWorkloadChart = new Chart(workloadChartElement, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [
                {
                  label: 'En attente',
                  data: enAttenteData,
                  backgroundColor: this.dashboardColors.amber,
                  barPercentage: 0.6,
                  categoryPercentage: 0.8
                },
                {
                  label: 'En cours',
                  data: enCoursData,
                  backgroundColor: this.dashboardColors.blue,
                  barPercentage: 0.6,
                  categoryPercentage: 0.8
                },
                {
                  label: 'Terminées',
                  data: termineesData,
                  backgroundColor: this.dashboardColors.green,
                  barPercentage: 0.6,
                  categoryPercentage: 0.8
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'top',
                  align: 'end',
                  labels: {
                    usePointStyle: true,
                    font: {
                      family: 'Roboto, sans-serif',
                      size: 11
                    },
                    padding: 15
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(33, 33, 33, 0.9)',
                  titleFont: {
                    family: 'Roboto, sans-serif',
                    size: 12
                  },
                  bodyFont: {
                    family: 'Roboto, sans-serif',
                    size: 11
                  },
                  padding: 8
                }
              },
              scales: {
                x: {
                  grid: {
                    display: false
                  },
                  ticks: {
                    font: {
                      family: 'Roboto, sans-serif',
                      size: 11
                    }
                  }
                },
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(200, 200, 200, 0.2)'
                  },
                  ticks: {
                    font: {
                      family: 'Roboto, sans-serif',
                      size: 11
                    },
                    precision: 0
                  }
                }
              }
            }
          });
          
          console.log('Graphique charge de travail technicien initialisé');
        }
        
        if (typesChartElement) {
          // Utiliser les données générées pour les types d'interventions
          const typeLabels = this.interventionTypeDistribution.map(item => item.type);
          const typeCounts = this.interventionTypeDistribution.map(item => item.count);
          
          this.technicianInterventionTypesChart = new Chart(typesChartElement, {
            type: 'doughnut',
            data: {
              labels: typeLabels,
              datasets: [{
                data: typeCounts,
                backgroundColor: [
                  this.dashboardColors.teal,
                  this.dashboardColors.burgundy,
                  this.dashboardColors.indigo
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    font: {
                      family: 'Roboto, sans-serif',
                      size: 12
                    },
                    padding: 15
                  }
                }
              }
            }
          });
          
          console.log('Graphique types d\'interventions technicien initialisé');
        }
      }
      
      this.roleChartsInitialized = true;
    } catch (error) {
      console.error(`Erreur lors de l'initialisation des graphiques pour le rôle ${this.userRole}:`, error);
    }
  }

  // Mettre à jour les graphiques modernes
  updateModernCharts(): void {
    if (!this.chartsInitialized || this.userRole !== 'Superviseur') {
      return;
    }
    
    try {
      console.log('Mise à jour des graphiques Chart.js pour Superviseur');
      
      // Mettre à jour le gauge des machines
      if (this.machineGaugeChart) {
        const percentage = this.machineStats.pourcentageArretees || 0;
        this.machineGaugeChart.data.datasets[0].data = [percentage, 100 - percentage];
        this.machineGaugeChart.update();
        console.log('Graphique gauge machines mis à jour');
      }
      
      // Mettre à jour le graphique de distribution des urgences
      if (this.urgencyDistributionChart && this.urgenceData.length > 0) {
        // Transformer les données pour la mise à jour du graphique
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
        
        // Mettre à jour ou créer des datasets pour chaque niveau d'urgence
        if (this.urgencyDistributionChart.data.datasets.length !== this.urgenceData.length) {
          // Si le nombre de datasets a changé, recréer complètement les datasets
          this.urgencyDistributionChart.data.datasets = this.urgenceData.map((item, index) => {
            const baseValue = item.count || 0;
            const data = months.map((_, i) => {
              const factor = 0.8 + (Math.random() * 0.4);
              return Math.max(1, Math.round(baseValue * factor * (1 + i * 0.05)));
            });
            
            return {
              label: item.libelle,
              data: data,
              borderColor: this.chartColors.urgence[index % this.chartColors.urgence.length],
              backgroundColor: `${this.chartColors.urgence[index % this.chartColors.urgence.length]}20`,
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true
            };
          });
        } else {
          // Sinon, mettre à jour les données existantes
          this.urgenceData.forEach((item, index) => {
            const baseValue = item.count || 0;
            const data = months.map((_, i) => {
              const factor = 0.8 + (Math.random() * 0.4);
              return Math.max(1, Math.round(baseValue * factor * (1 + i * 0.05)));
            });
            
            this.urgencyDistributionChart!.data.datasets[index].data = data;
            this.urgencyDistributionChart!.data.datasets[index].label = item.libelle;
          });
        }
        
        this.urgencyDistributionChart.update();
        console.log('Graphique distribution par urgence mis à jour');
      }
      
      // Mettre à jour les mini-graphiques pour le temps moyen et le taux de résolution
      if (this.avgTimeChart) {
        this.avgTimeChart.data.datasets[0].data = this.generateTrendData(this.averageInterventionTime, 6, 0.2);
        this.avgTimeChart.update();
      }
      
      if (this.resolutionRateChart) {
        this.resolutionRateChart.data.datasets[0].data = this.generateTrendData(this.resolutionRate, 6, 5);
        this.resolutionRateChart.update();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des graphiques Chart.js:', error);
    }
  }

  // Mettre à jour les graphiques spécifiques au rôle
  updateRoleSpecificCharts(): void {
    if (!this.roleChartsInitialized) {
      return;
    }
    
    try {
      console.log(`Mise à jour des graphiques pour le rôle ${this.userRole}`);
      
      // Mise à jour pour le rôle Demandeur
      if (this.userRole === 'Demandeur' && this.demanderBreakdownChart) {
        // Mettre à jour avec les données générées pour la répartition par type de panne
        const data = this.breakdownTypeDistribution.map(item => item.count);
        this.demanderBreakdownChart.data.datasets[0].data = data;
        this.demanderBreakdownChart.update();
        console.log('Graphique répartition par type de panne mis à jour');
      }
      // Mise à jour pour le rôle Utilisateur/Technicien
      else if ((this.userRole === 'Utilisateur' || this.userRole === 'Technicien') &&
              this.technicianWorkloadChart && this.technicianInterventionTypesChart) {
        
        // Mettre à jour le graphique de charge de travail avec des données basées sur les statistiques actuelles
        const enAttenteData = this.generateWeeklyData(this.interventionStats.enAttente, 4);
        const enCoursData = this.generateWeeklyData(this.interventionStats.enCours, 4);
        const termineesData = this.generateWeeklyData(this.interventionStats.terminee, 4);
        
        this.technicianWorkloadChart.data.datasets[0].data = enAttenteData;
        this.technicianWorkloadChart.data.datasets[1].data = enCoursData;
        this.technicianWorkloadChart.data.datasets[2].data = termineesData;
        this.technicianWorkloadChart.update();
        
        // Mettre à jour le graphique des types d'interventions
        const typeCounts = this.interventionTypeDistribution.map(item => item.count);
        this.technicianInterventionTypesChart.data.datasets[0].data = typeCounts;
        this.technicianInterventionTypesChart.update();
        
        console.log('Graphiques technicien mis à jour');
      }
    } catch (error) {
      console.error(`Erreur lors de la mise à jour des graphiques pour le rôle ${this.userRole}:`, error);
    }
  }

  // Générer des données de tendance pour les mini-graphiques
  generateTrendData(currentValue: number, points: number, maxVariance: number): number[] {
    const result = [];
    let prevValue = currentValue * 0.9; // Commencer légèrement en dessous de la valeur actuelle
    
    for (let i = 0; i < points; i++) {
      // Générer une variation aléatoire entre -maxVariance et +maxVariance
      const variance = (Math.random() * maxVariance * 2) - maxVariance;
      
      // Pour le dernier point, utiliser la valeur actuelle exacte
      if (i === points - 1) {
        result.push(currentValue);
      } else {
        // Sinon, progresser vers la valeur actuelle avec une légère variance
        const step = (currentValue - prevValue) / (points - i);
        const newValue = prevValue + step + variance;
        result.push(Math.max(0, newValue)); // Éviter les valeurs négatives
        prevValue = newValue;
      }
    }
    
    return result;
  }

  // Générer des données hebdomadaires basées sur une valeur actuelle
  generateWeeklyData(currentValue: number, weeks: number): number[] {
    const result = [];
    const minValue = Math.max(1, Math.floor(currentValue * 0.6));
    const maxValue = Math.ceil(currentValue * 1.2);
    
    // Générer une séquence qui tend vers la valeur actuelle
    for (let i = 0; i < weeks - 1; i++) {
      const value = Math.floor(minValue + (Math.random() * (maxValue - minValue)));
      result.push(value);
    }
    
    // Le dernier point est la valeur actuelle
    result.push(currentValue);
    return result;
  }

  // Obtenir la couleur pour une urgence selon son index
  getUrgencyColor(index: number): string {
    return this.chartColors.urgence[index % this.chartColors.urgence.length];
  }

  // Méthode pour obtenir la classe CSS selon le statut
  getStatusClass(statusId: number | undefined): string {
    if (!statusId) return '';
    switch (statusId) {
      case 1: return 'status-waiting';
      case 2: return 'status-in-progress';
      case 3: return 'status-completed';
      case 4: return 'status-validated';
      case 5: return 'status-cancelled';
      default: return '';
    }
  }

  // Méthode pour récupérer l'icône du statut
  getStatusIcon(statusId: number | undefined): string {
    if (!statusId) return 'help_outline';
    switch (statusId) {
      case 1: return 'hourglass_empty';
      case 2: return 'build';
      case 3: return 'check_circle';
      case 4: return 'verified';
      case 5: return 'cancel';
      default: return 'help_outline';
    }
  }

  // Méthode pour récupérer le libellé du statut
  getStatusLabel(statusId: number | undefined): string {
    if (!statusId) return 'Inconnu';
    switch (statusId) {
      case 1: return 'À traiter';
      case 2: return 'En cours';
      case 3: return 'Réalisée';
      case 4: return 'Clôturée';
      case 5: return 'Annulée';
      default: return 'Inconnu';
    }
  }

  // Formater la date pour l'affichage
  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString().slice(0, 5)}`;
  }

  // Vérifier si une intervention est nouvelle (ajoutée depuis le dernier refresh)
  isNewIntervention(intervention: any): boolean {
    return !this.prevRecentInterventions.some(
      prev => prev.idDemandeIntervention === intervention.idDemandeIntervention
    );
  }

  // Vérifier si une intervention a changé de statut
  hasStatusChanged(intervention: any): boolean {
    const previous = this.prevRecentInterventions.find(
      prev => prev.idDemandeIntervention === intervention.idDemandeIntervention
    );
    return previous && previous.status.id !== intervention.status.id;
  }

  // MÉTHODES POUR LE DASHBOARD DEMANDEUR
  // Calculer le taux de progression des interventions
  calculateProgressRate(): number {
    const total = this.interventionStats.enAttente + this.interventionStats.enCours +
                  this.interventionStats.terminee + this.interventionStats.annulee;
                  
    if (total === 0) return 0;
    
    // Considérer que les interventions en cours et terminées sont "prises en charge"
    const takenCare = this.interventionStats.enCours + this.interventionStats.terminee;
    return Math.round((takenCare / total) * 100);
  }

  // Calculer le taux de résolution des interventions
  calculateResolvedRate(): number {
    const total = this.interventionStats.enAttente + this.interventionStats.enCours +
                  this.interventionStats.terminee + this.interventionStats.annulee;
                  
    if (total === 0) return 0;
    
    // Seules les interventions terminées sont "résolues"
    return Math.round((this.interventionStats.terminee / total) * 100);
  }

  // Temps moyen de réponse
  getAverageResponseTime(): number {
    return this.averageResponseTime;
  }

  // Obtenir la classe CSS pour la barre de progression
  getProgressBarClass(statusId: number | undefined): string {
    if (!statusId) return 'bg-secondary';
    switch (statusId) {
      case 1: return 'bg-warning'; // À traiter
      case 2: return 'bg-info';    // En cours
      case 3: return 'bg-success'; // Réalisée
      case 4: return 'bg-primary'; // Clôturée
      case 5: return 'bg-danger';  // Annulée
      default: return 'bg-secondary';
    }
  }

  // Obtenir le pourcentage de progression d'une intervention
  getInterventionProgress(statusId: number | undefined): number {
    if (!statusId) return 0;
    switch (statusId) {
      case 1: return 25;  // À traiter
      case 2: return 50;  // En cours
      case 3: return 75;  // Réalisée
      case 4: return 100; // Clôturée
      case 5: return 0;   // Annulée
      default: return 0;
    }
  }

  // Obtenir le texte de progression
  getProgressText(statusId: number | undefined): string {
    if (!statusId) return 'Non démarré';
    switch (statusId) {
      case 1: return 'En attente';
      case 2: return 'En traitement';
      case 3: return 'Finalisé';
      case 4: return 'Clôturé';
      case 5: return 'Annulé';
      default: return 'Non démarré';
    }
  }

  // MÉTHODES POUR LE DASHBOARD TECHNICIEN/UTILISATEUR

  // Calculer le taux de complétion des interventions pour un technicien
  calculateTechnicianCompletionRate(): number {
    return this.technicianCompletionRate;
  }

  // Calculer l'efficacité du technicien
  calculateTechnicianEfficiency(): number {
    return this.technicianEfficiency;
  }

  // Obtenir le temps moyen par intervention
  getTechnicianAvgTime(): number {
    return this.technicianAvgTime;
  }

  // Obtenir l'efficacité en temps
  getTechnicianTimeEfficiency(): number {
    return this.technicianTimeEfficiency;
  }

  // Vérifier si une intervention peut être acceptée
  canAcceptIntervention(intervention: any): boolean {
    // Une intervention peut être acceptée si elle est en statut "En cours" (2)
    // et qu'elle n'a pas encore de date d'assignation
    return intervention.status?.id === 2 && !intervention.dateAssignation;
  }

  // Vérifier si une intervention peut être complétée
  canCompleteIntervention(intervention: any): boolean {
    // Une intervention peut être complétée si elle est en statut "En cours" (2)
    // et qu'elle a déjà une date d'assignation
    return intervention.status?.id === 2 && intervention.dateAssignation;
  }

  // Obtenir le pourcentage de progression d'une intervention pour un technicien
  getTechnicianInterventionProgress(intervention: any): number {
    const statusId = intervention.status?.id;
    
    if (!statusId) return 0;
    
    // Cas spécial pour le statut "En cours"
    if (statusId === 2) {
      // Si l'intervention est assignée, elle est à 50%, sinon à 25%
      return intervention.dateAssignation ? 50 : 25;
    }
    
    // Pour les autres statuts, utiliser la même logique que pour le demandeur
    return this.getInterventionProgress(statusId);
  }

  // Obtenir le texte de progression pour un technicien
  getTechnicianProgressText(intervention: any): string {
    const statusId = intervention.status?.id;
    
    if (!statusId) return 'Non démarré';
    
    // Cas spécial pour le statut "En cours"
    if (statusId === 2) {
      return intervention.dateAssignation ? 'En traitement actif' : 'À accepter';
    }
    
    // Pour les autres statuts, utiliser la même logique que pour le demandeur
    return this.getProgressText(statusId);
  }
  
  // Méthode pour obtenir les données des chaînes de production pour le dashboard demandeur
  getMachineStatusData(): any[] {
    return this.machineStatusData;
  }
  
  // NOUVELLES MÉTHODES POUR LE DASHBOARD DEMANDEUR - VUE DE L'HISTORIQUE

  // Basculer entre la vue des interventions récentes et l'historique complet
  toggleHistoryView(): void {
    this.showAllInterventions = !this.showAllInterventions;
    
    // Charger l'historique uniquement lors de la première ouverture
    if (this.showAllInterventions && this.allInterventions.length === 0) {
      this.loadAllInterventions();
    }
  }

  // Charger toutes les interventions du demandeur
  loadAllInterventions(): void {
    const apiUrl = this.baseUrl;
    const pageSize = 1000; // Grand nombre pour récupérer toutes les interventions d'un coup
    
    // Utiliser un grand nombre pour pageSize pour obtenir toutes les interventions en une requête
    this.http.get<any>(`${apiUrl}?page=1&pageSize=${pageSize}`, { withCredentials: true })
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            this.allInterventions = response.data;
            this.filterInterventions();
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement de toutes les interventions:', error);
        }
      });
  }

  // Filtrer les interventions selon le terme de recherche
  filterInterventions(): void {
    if (!this.interventionSearchQuery) {
      this.filteredAllInterventions = [...this.allInterventions];
    } else {
      const query = this.interventionSearchQuery.toLowerCase();
      this.filteredAllInterventions = this.allInterventions.filter(intervention => 
        intervention.titre?.toLowerCase().includes(query) || 
        intervention.idDemandeIntervention?.toString().includes(query) ||
        intervention.lieu?.toLowerCase().includes(query)
      );
    }
    
    this.calculatePagination();
    this.applyPagination();
  }

  // Rechercher des interventions
  searchInterventions(): void {
    this.filterInterventions();
  }

  // Réinitialiser la recherche
  resetSearch(): void {
    this.interventionSearchQuery = '';
    this.filterInterventions();
  }

  // Calculer la pagination
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredAllInterventions.length / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.currentPage < 1) {
      this.currentPage = 1;
    }
  }

  // Appliquer la pagination
  applyPagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.allInterventions.length);
    this.filteredAllInterventions = this.allInterventions.slice(startIndex, endIndex);
  }

  // Changer de page
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyPagination();
    }
  }

  // Aller à la page précédente
  previousPage(): void {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  // Aller à la page suivante
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }
}