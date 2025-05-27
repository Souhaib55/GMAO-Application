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

  constructor() { }

  ngOnInit() {
    // Configurer le rafraîchissement automatique
    this.setupAutoRefresh();
  }

  ngAfterViewInit() {
    // Initialiser les graphiques après que la vue soit prête
    setTimeout(() => {
      if (!this.isLoading && !this.chartsInitialized) {
        this.initModernCharts();
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
    if (this.machineGaugeChart) {
      this.machineGaugeChart.destroy();
    }
    if (this.urgencyDistributionChart) {
      this.urgencyDistributionChart.destroy();
    }
    if (this.avgTimeChart) {
      this.avgTimeChart.destroy();
    }
    if (this.resolutionRateChart) {
      this.resolutionRateChart.destroy();
    }
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
    this.recentInterventions = stats.recentInterventions;
    
    // Mettre à jour les données pour les graphiques
    const dataChanged = 
      JSON.stringify(this.monthlyData) !== JSON.stringify(stats.monthlyData) ||
      JSON.stringify(this.urgenceData) !== JSON.stringify(stats.urgenceData);
    
    this.monthlyData = stats.monthlyData || [];
    this.urgenceData = stats.urgenceData || [];
    
    console.log('Données mensuelles:', this.monthlyData);
    console.log('Données d\'urgence:', this.urgenceData);
    
    // Initialiser ou mettre à jour les graphiques
    if (!this.chartsInitialized) {
      setTimeout(() => this.initModernCharts(), 300);
    } else if (dataChanged) {
      this.updateModernCharts();
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

  // Initialiser les graphiques modernes avec Chart.js
  initModernCharts(): void {
    if (this.isLoading || this.chartsInitialized) {
      return;
    }

    console.log('Initialisation des graphiques avec Chart.js');

    try {
      // Vérifier si les éléments DOM existent
      const machineGaugeElement = document.getElementById('machineGauge') as HTMLCanvasElement;
      const urgencyChartElement = document.getElementById('urgencyDistributionChart') as HTMLCanvasElement;
      const avgTimeChartElement = document.getElementById('avgTimeChart') as HTMLCanvasElement;
      const resolutionChartElement = document.getElementById('resolutionRateChart') as HTMLCanvasElement;

      // 1. Jauge pour l'état des machines (version doughnut chart pour simuler une jauge)
      if (machineGaugeElement) {
        const percentage = this.machineStats.pourcentageArretees || 25;
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
        // Vérifier si nous avons des données d'urgence
        if (this.urgenceData.length === 0) {
          console.warn('Aucune donnée d\'urgence disponible pour le graphique');
          // Créer des données de démonstration si aucune donnée n'est disponible
          this.urgenceData = [
            { id: 1, libelle: 'Haute', count: 12 },
            { id: 2, libelle: 'Moyenne', count: 25 },
            { id: 3, libelle: 'Basse', count: 18 }
          ];
        }

        // Transformer les données pour une série temporelle
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
        
        // Créer des datasets pour chaque niveau d'urgence
        const datasets = this.urgenceData.map((item, index) => {
          // Valeur de base est la valeur actuelle
          const baseValue = item.count || 8;
          
          // Générer une série de valeurs qui fluctuent autour de la valeur de base
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
            datasets: datasets
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
        this.avgTimeChart = new Chart(avgTimeChartElement, {
          type: 'line',
          data: {
            labels: ['', '', '', '', '', ''],
            datasets: [{
              data: [3.5, 3.8, 3.2, 3.0, 3.1, 3.2],
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
        this.resolutionRateChart = new Chart(resolutionChartElement, {
          type: 'line',
          data: {
            labels: ['', '', '', '', '', ''],
            datasets: [{
              data: [88, 90, 89, 92, 91, 92],
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

  // Mettre à jour les graphiques modernes
  updateModernCharts(): void {
    if (!this.chartsInitialized) {
      return;
    }

    try {
      console.log('Mise à jour des graphiques Chart.js');

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
        
        this.urgenceData.forEach((item, index) => {
          const baseValue = item.count || 8;
          
          // Générer des valeurs qui fluctuent
          const data = months.map((_, i) => {
            const factor = 0.8 + (Math.random() * 0.4);
            return Math.max(1, Math.round(baseValue * factor * (1 + i * 0.05)));
          });
          
          if (this.urgencyDistributionChart.data.datasets[index]) {
            this.urgencyDistributionChart.data.datasets[index].data = data;
          }
        });
        
        this.urgencyDistributionChart.update();
        console.log('Graphique distribution par urgence mis à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des graphiques Chart.js:', error);
    }
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
}