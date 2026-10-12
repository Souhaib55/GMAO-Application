import { HelpTipComponent } from '../../shared/components/help-tip/help-tip.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { BarItem, DonutSlice, GmBarListComponent, GmDonutComponent, GmLineChartComponent, Series } from '../../shared/components/charts/gm-charts';
import { STATUTS_OT, errorMessage, exportCsv, fmtDate, fmtHours, fmtMoney, otCode, relativeDays } from '../../shared/utils/gm-format';

interface PeriodFigures {
  disponibilite: number; heuresArret: number; pannes: number; declarees: number; realisees: number;
  mttr: number | null; mtbf: number | null; respectPreventif: number | null; preventifsDus: number;
}

interface Pilotage {
  periode: { from: string; to: string; days: number; machines: number };
  courant: PeriodFigures;
  precedent: PeriodFigures;
  backlog: number;
  enRetard: number;
  cout: { mainOeuvre: number; pieces: number; externe: number; total: number };
  coutPrecedent: number;
  budgetPeriode: number;
  partPreventif: number | null;
  heuresSaisies: number;
  tendance: { label: string; declarees: number; realisees: number; arret: number }[];
  parChaine: { id: number; chaine: string; heures: number; pannes: number }[];
  pareto: { panne: string; nombre: number; heures: number }[];
  topMachines: { id: number; code: string; designation: string; chaine: string; pannes: number; heures: number }[];
  alertes: { machinesArretees: number; nonAffectees: number; preventifsEnRetard: number; stockRupture: number; stockSousSeuil: number; commandesEnRetard: number; demandesAchat: number };
  aTraiter: { id: number; titre: string; machine: string | null; chaine: string; raison: string; statusId: number; urgence: string; technicien: string | null; depuis: string; heures: number }[];
}

interface MonTravail {
  role: string; prenom: string;
  ouverts: { idDemandeIntervention: number; titre: string; statusId: number; statut: string; dateCreation: string; datePlanifiee: string | null; machineArretee: boolean; urgence: string; machine: string | null; chaine: string; preventif: boolean; accepte: boolean; technicien: string | null }[];
  aujourdhui: number; enCours: number; aTraiter: number; aValider: number; enRetard: number; heuresSemaine: number; realiseesMois: number;
  recentes: { idDemandeIntervention: number; titre: string; statusId: number; statut: string; dateRealisation: string | null; dateCloture: string | null }[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent, GmBarListComponent, GmDonutComponent, GmLineChartComponent, HelpTipComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  readonly periods = [
    { days: 7, label: '7 j' }, { days: 30, label: '30 j' }, { days: 90, label: '90 j' }, { days: 365, label: '12 mois' }
  ];
  readonly statuts = STATUTS_OT;

  role = '';
  prenom = '';
  today = new Date();

  // Supervisor
  days = 30;
  chaineId: number | null = null;
  equipementId: number | null = null;
  chaines: { id: number; libelle: string }[] = [];
  equipements: { id: number; libelle: string; chaine: number | null }[] = [];
  data: Pilotage | null = null;
  loading = true;
  error = '';

  trend: { labels: string[]; series: Series[] } = { labels: [], series: [] };
  arretChaines: BarItem[] = [];
  paretoBars: BarItem[] = [];
  coutSlices: DonutSlice[] = [];

  // Technician / requester
  work: MonTravail | null = null;

  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    this.role = user?.role || '';
    this.prenom = user?.firstName || '';

    if (this.isSuperviseur) {
      const base = environment.apiUrl;
      this.http.get<any[]>(`${base}/ChaineProduction`).subscribe(l => this.chaines = (l || []).map(c => ({ id: c.idChaineProduction, libelle: c.libelle })));
      this.http.get<any[]>(`${base}/Equipment/lookup`).subscribe(l => this.equipements = (l || []).map(e => ({ id: e.idEquipement, libelle: `${e.codeEquipement} — ${e.designation}`, chaine: e.idChaineProduction })));
      this.load();
    } else {
      this.loadWork();
    }
  }

  get isSuperviseur(): boolean { return this.role === 'Superviseur'; }
  get isTechnicien(): boolean { return this.role === 'Utilisateur'; }

  get greeting(): string {
    const h = new Date().getHours();
    return `${h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'}${this.prenom ? ', ' + this.prenom : ''}`;
  }

  get equipementsFiltres() {
    return this.chaineId ? this.equipements.filter(e => e.chaine === this.chaineId) : this.equipements;
  }

  // ------------------------------------------------------------------ Supervisor

  setDays(d: number): void { this.days = d; this.load(); }

  setChaine(id: number | null): void {
    this.chaineId = id;
    if (this.equipementId && !this.equipementsFiltres.some(e => e.id === this.equipementId)) this.equipementId = null;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    const params: any = { days: this.days };
    if (this.chaineId) params.chaineId = this.chaineId;
    if (this.equipementId) params.equipementId = this.equipementId;
    this.http.get<Pilotage>(`${environment.apiUrl}/pilotage`, { params }).subscribe({
      next: d => {
        this.data = d;
        this.trend = {
          labels: d.tendance.map(t => t.label),
          series: [
            { name: 'Déclarées', values: d.tendance.map(t => t.declarees), color: '#3d60dc' },
            { name: 'Réalisées', values: d.tendance.map(t => t.realisees), color: '#23a07a' }
          ]
        };
        this.arretChaines = d.parChaine.map(c => ({ label: c.chaine, value: c.heures, sub: `${c.pannes} panne${c.pannes > 1 ? 's' : ''}`, tone: 'bad' as const, key: c.id }));
        this.paretoBars = d.pareto.map(p => ({ label: p.panne, value: p.nombre, sub: `${fmtHours(p.heures)} d'arrêt`, tone: 'warn' as const }));
        this.coutSlices = [
          { label: "Main-d'œuvre", value: d.cout.mainOeuvre, color: '#3d60dc' },
          { label: 'Pièces', value: d.cout.pieces, color: '#23a07a' },
          { label: 'Prestations externes', value: d.cout.externe, color: '#e0981f' }
        ];
        this.loading = false;
      },
      error: err => { this.error = errorMessage(err, 'Le tableau de bord est indisponible.'); this.loading = false; }
    });
  }

  /** Comparison with the previous period; hidden when there is not enough history. */
  delta(cur: number | null, prev: number | null, higherIsBetter: boolean, unit: 'pt' | '%' | 'h' = '%'): { text: string; tone: string } | null {
    if (!this.data || cur === null || prev === null || this.data.precedent.declarees < 5) return null;
    let diff: number;
    let text: string;
    if (unit === 'pt') {
      diff = cur - prev;
      if (Math.abs(diff) < 0.05) return { text: 'stable', tone: 't-neutral' };
      text = `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} pt`;
    } else {
      if (prev === 0) return null;
      diff = ((cur - prev) / Math.abs(prev)) * 100;
      if (Math.abs(diff) < 1) return { text: 'stable', tone: 't-neutral' };
      text = `${diff > 0 ? '+' : ''}${Math.round(diff)} %`;
    }
    const good = higherIsBetter ? diff > 0 : diff < 0;
    return { text: `${text} vs période préc.`, tone: good ? 't-ok' : 't-bad' };
  }

  get budgetRatio(): number | null {
    if (!this.data || !this.data.budgetPeriode) return null;
    return Math.round((this.data.cout.total / this.data.budgetPeriode) * 100);
  }

  dispoTone(v: number): string { return v >= 95 ? 't-ok' : v >= 90 ? 't-warn' : 't-bad'; }
  respectTone(v: number | null): string { return v === null ? 't-neutral' : v >= 90 ? 't-ok' : v >= 75 ? 't-warn' : 't-bad'; }

  filterChaine(item: BarItem): void { this.setChaine(item.key); }

  get periodLabel(): string {
    return this.periods.find(p => p.days === this.days)?.label.replace('j', 'jours') ?? '';
  }

  raisonTone(r: string): string {
    return r === "Machine à l'arrêt" ? 't-bad' : r === 'Préventif en retard' ? 't-warn' : 't-info';
  }

  depuis(h: number): string {
    if (h < 1) return "moins d'1 h";
    if (h < 48) return `${h} h`;
    return `${Math.round(h / 24)} j`;
  }

  exportSynthese(): void {
    if (!this.data) return;
    const d = this.data;
    const c = d.courant, p = d.precedent;
    exportCsv(`tableau-de-bord-${this.days}j`, ['Indicateur', 'Période', 'Période précédente'], [
      ['Disponibilité du parc (%)', c.disponibilite, p.disponibilite],
      ["Heures d'arrêt", c.heuresArret, p.heuresArret],
      ['Pannes déclarées', c.pannes, p.pannes],
      ['Interventions déclarées', c.declarees, p.declarees],
      ['Interventions réalisées', c.realisees, p.realisees],
      ['MTTR (h)', c.mttr, p.mttr],
      ['MTBF (h)', c.mtbf, p.mtbf],
      ['Respect du préventif (%)', c.respectPreventif, p.respectPreventif],
      ['Coût de maintenance (DT)', d.cout.total, d.coutPrecedent],
      ['Budget de la période (DT)', d.budgetPeriode, null],
      ['Interventions ouvertes', d.backlog, null],
      ['Interventions en retard', d.enRetard, null]
    ]);
  }

  // ------------------------------------------------------------------ Technician / requester

  loadWork(): void {
    this.loading = true;
    this.http.get<MonTravail>(`${environment.apiUrl}/pilotage/mon-travail`).subscribe({
      next: w => { this.work = w; this.loading = false; },
      error: err => { this.error = errorMessage(err, 'Le tableau de bord est indisponible.'); this.loading = false; }
    });
  }

  open(id: number): void { this.router.navigate(['/interventions/view', id]); }

  fmtMoney = fmtMoney;
  fmtHours = fmtHours;
  fmtDate = fmtDate;
  otCode = otCode;
  relativeDays = relativeDays;
}
