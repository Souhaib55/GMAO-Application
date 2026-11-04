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
import { KpiInfoComponent } from '../../shared/components/kpi-info/kpi-info.component';
import { KPI, KpiContexte } from '../../shared/kpi/kpi-definitions';
import { TourService } from '../../core/services/tour.service';
import { ActionsMenuComponent } from '../../shared/components/actions-menu/actions-menu.component';

interface PeriodFigures {
  disponibilite: number; heuresArret: number; pannes: number; declarees: number; realisees: number;
  mttr: number | null; mtbf: number | null; respectPreventif: number | null; preventifsDus: number;
  preventifsATemps: number; reparations: number; heuresReparation: number; heuresPeriode: number;
}

export interface PointSynthese { niveau: 'bad' | 'warn' | 'ok' | 'info'; texte: string; action: string; lien: string | null; parametres: Record<string, string> | null; }

export interface Pilotage {
  periode: { from: string; to: string; days: number; machines: number; mois: string | null; libelle: string; libellePrecedent: string; precedentFrom: string; precedentTo: string };
  courant: PeriodFigures;
  precedent: PeriodFigures;
  backlog: number;
  enRetard: number;
  cout: { mainOeuvre: number; pieces: number; externe: number; total: number };
  coutPrecedent: number;
  budgetPeriode: number;
  budgetAnnuel: number;
  projectionAnnuelle: number | null;
  partPreventif: number | null;
  heuresSaisies: number;
  tendance: { label: string; declarees: number; realisees: number; arret: number }[];
  parChaine: { id: number; chaine: string; heures: number; pannes: number }[];
  pareto: { panneId: number; panne: string; nombre: number; heures: number; part: number | null; cumul: number | null }[];
  topMachines: { id: number; code: string; designation: string; chaine: string; pannes: number; heures: number; cout: number; part: number | null; cumul: number | null }[];
  coutParMachine: { id: number; code: string; designation: string; chaine: string | null; cout: number }[];
  alertes: { machinesArretees: number; nonAffectees: number; preventifsEnRetard: number; stockRupture: number; stockSousSeuil: number; commandesEnRetard: number; demandesAchat: number };
  aTraiter: { id: number; titre: string; machine: string | null; chaine: string; raison: string; statusId: number; urgence: string; technicien: string | null; depuis: string; heures: number }[];
  aRetenir: PointSynthese[];
}

/** Comparison with the previous period, in words, coloured by meaning (better / worse / stable). */
export interface Comparaison { text: string; tone: 't-ok' | 't-bad' | 't-neutral'; }

/** Level of a figure against its usual target, in words and in colour. */
export interface Etat { texte: string; tone: 't-ok' | 't-warn' | 't-bad'; }

/**
 * "+12 % par rapport aux 30 jours précédents". Changes too small to mean anything are
 * shown as stable, in grey, so that red always means "worse" and never "noise".
 */
export function comparer(cur: number | null, prev: number | null, sens: 'haut' | 'bas', kind: 'pct' | 'pt',
                         libellePrecedent: string, historiqueSuffisant = true, seuilPoints = 0.5): Comparaison | null {
  if (cur === null || prev === null || !historiqueSuffisant) return null;
  const versus = libellePrecedent.startsWith('les ') ? 'par rapport aux ' + libellePrecedent.slice(4)
    : libellePrecedent.startsWith('en ') ? 'par rapport à ' + libellePrecedent.slice(3) : 'par rapport à ' + libellePrecedent;
  let diff: number;
  let text: string;
  if (kind === 'pt') {
    diff = cur - prev;
    if (Math.abs(diff) < seuilPoints) return { text: `Stable ${versus}`, tone: 't-neutral' };
    const v = Math.abs(diff).toFixed(1).replace('.', ',').replace(',0', '');
    text = `${diff > 0 ? '+' : '−'}${v} point${Math.abs(diff) >= 2 ? 's' : ''}`;
  } else {
    if (prev === 0) {
      if (cur === 0) return { text: `Stable ${versus}`, tone: 't-neutral' };
      return null;
    }
    diff = ((cur - prev) / Math.abs(prev)) * 100;
    if (Math.abs(diff) < 5) return { text: `Stable ${versus}`, tone: 't-neutral' };
    text = `${diff > 0 ? '+' : '−'}${Math.round(Math.abs(diff))} %`;
  }
  const better = sens === 'haut' ? diff > 0 : diff < 0;
  // Said in words as well as in colour: never colour alone
  return { text: `${better ? 'Mieux' : 'Moins bien'} · ${text} ${versus}`, tone: better ? 't-ok' : 't-bad' };
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
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent, GmBarListComponent, GmDonutComponent, GmLineChartComponent, KpiInfoComponent, ActionsMenuComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  readonly periods = [
    { days: 7, label: '7 j' }, { days: 30, label: '30 j' }, { days: 90, label: '90 j' }, { days: 365, label: '12 mois' }
  ];
  readonly statuts = STATUTS_OT;
  readonly K = KPI;

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
  paretoMachines: BarItem[] = [];
  paretoVue: 'causes' | 'machines' = 'causes';
  coutSlices: DonutSlice[] = [];
  ctx: KpiContexte | null = null;
  /** Secondary indicators (repair time, time between failures, cost), shown on demand. */
  plusIndicateurs = false;

  // Technician / requester
  work: MonTravail | null = null;

  constructor(private http: HttpClient, private auth: AuthService, readonly router: Router, private tour: TourService) {}

  /** First visit of this account on this device: the guided tour of the role, once the page is drawn. */
  private proposerVisite(): void {
    setTimeout(() => this.tour.startIfFirstTime(this.role, this.auth.getCurrentUser()), 400);
  }

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
        const c = d.courant;
        this.ctx = {
          libelle: d.periode.libelle, machines: d.periode.machines, heuresPeriode: c.heuresPeriode,
          disponibilite: c.disponibilite, heuresArret: c.heuresArret, pannes: c.pannes, mttr: c.mttr, mtbf: c.mtbf,
          reparations: c.reparations, heuresReparation: c.heuresReparation, respectPreventif: c.respectPreventif,
          preventifsDus: c.preventifsDus, preventifsATemps: c.preventifsATemps, backlog: d.backlog, enRetard: d.enRetard,
          realisees: c.realisees, coutMainOeuvre: d.cout.mainOeuvre, coutPieces: d.cout.pieces, coutExterne: d.cout.externe,
          coutTotal: d.cout.total, budgetPeriode: d.budgetPeriode
        };
        // 30 daily points are noise to the eye: grouped by week (from the end of the period)
        const t = this.days === 30 ? this.parSemaine(d.tendance) : d.tendance;
        this.trend = {
          labels: t.map(x => x.label),
          series: [
            { name: 'Déclarées', values: t.map(x => x.declarees), color: '#3d60dc' },
            { name: 'Réalisées', values: t.map(x => x.realisees), color: '#1d7a5c' }
          ]
        };
        this.arretChaines = d.parChaine.map(c => ({ label: c.chaine, value: c.heures, sub: `${c.pannes} panne${c.pannes > 1 ? 's' : ''}`, tone: 'info' as const, key: c.id }));
        this.paretoBars = d.pareto.map(p => ({
          label: p.panne, value: p.nombre, tone: 'info' as const, key: p.panneId,
          sub: `${p.part !== null ? Math.round(p.part) + ' %' : ''}${p.cumul !== null ? ' · cumul ' + Math.round(p.cumul) + ' %' : ''}`
        }));
        // Code as the label (short, it is written on the machine), name and breakdowns underneath
        this.paretoMachines = d.topMachines.slice(0, 6).map(m => ({
          label: m.code, value: m.heures, tone: 'info' as const, key: m.id,
          sub: `${m.designation} · ${m.pannes} panne${m.pannes > 1 ? 's' : ''}`
        }));
        this.coutSlices = [
          { label: "Main-d'œuvre", value: d.cout.mainOeuvre, color: '#3d60dc' },
          { label: 'Pièces', value: d.cout.pieces, color: '#23a07a' },
          { label: 'Sous-traitance', value: d.cout.externe, color: '#e0981f' }
        ];
        this.loading = false;
        this.proposerVisite();
      },
      error: err => { this.error = errorMessage(err, 'Le tableau de bord est indisponible.'); this.loading = false; }
    });
  }

  /** Daily buckets grouped by 7 days, the last group ending today. */
  private parSemaine(jours: Pilotage['tendance']): Pilotage['tendance'] {
    const out: Pilotage['tendance'] = [];
    for (let end = jours.length; end > 0; end -= 7) {
      const g = jours.slice(Math.max(0, end - 7), end);
      out.unshift({ label: 'sem. du ' + g[0].label, declarees: g.reduce((a, x) => a + x.declarees, 0), realisees: g.reduce((a, x) => a + x.realisees, 0), arret: g.reduce((a, x) => a + x.arret, 0) });
    }
    return out;
  }

  /** Availability against the usual targets of a garment workshop (see the "?"). */
  etatDispo(v: number): Etat {
    return v >= 98 ? { texte: 'Bon niveau (objectif 98 %)', tone: 't-ok' }
      : v >= 95 ? { texte: 'À surveiller (objectif 98 %)', tone: 't-warn' }
      : { texte: 'Sous l\'objectif de 98 %', tone: 't-bad' };
  }

  etatRespect(v: number | null): Etat | null {
    if (v === null) return null;
    return v >= 90 ? { texte: 'Objectif de 90 % atteint', tone: 't-ok' }
      : v >= 75 ? { texte: 'À surveiller (objectif 90 %)', tone: 't-warn' }
      : { texte: 'Sous l\'objectif de 90 %', tone: 't-bad' };
  }

  etatOuvertes(enRetard: number): Etat {
    return enRetard ? { texte: `${enRetard} en retard`, tone: 't-bad' } : { texte: 'Aucune en retard', tone: 't-ok' };
  }

  etatBudget(ratio: number | null): Etat | null {
    if (ratio === null) return null;
    return ratio <= 90 ? { texte: `${ratio} % du budget de la période`, tone: 't-ok' }
      : ratio <= 100 ? { texte: `${ratio} % du budget : à surveiller`, tone: 't-warn' }
      : { texte: `${ratio} % du budget : dépassé`, tone: 't-bad' };
  }

  /** Not enough history (new installation, or a very quiet line / machine). */
  get historique(): boolean { return !!this.data && this.data.precedent.declarees >= 5; }

  /**
   * Comparison chip of a card. Below the threshold the change is noise and shown as stable:
   * half a point of availability, 3 points of preventive compliance (one job out of ~40).
   */
  cmp(cur: number | null, prev: number | null, sens: 'haut' | 'bas', kind: 'pct' | 'pt' = 'pct', seuilPoints = 0.5) {
    return this.data ? comparer(cur, prev, sens, kind, this.data.periode.libellePrecedent, this.historique, seuilPoints) : null;
  }

  /** Query of the list that shows the work orders behind a figure ("why is it high?"). */
  drill(vue: string, extra: Record<string, any> = {}): Record<string, any> {
    const q: Record<string, any> = { vue, ...extra };
    if (this.data && !['ouvertes', 'en-retard', 'arret', 'non-affectees'].includes(vue)) {
      q['du'] = this.data.periode.from;
      q['au'] = this.data.periode.to;
    }
    if (this.chaineId) q['chaineId'] = this.chaineId;
    if (this.equipementId) q['equipementId'] = this.equipementId;
    return q;
  }

  /** Where a line of "À retenir" leads: the list keeps the dashboard's period and filters. */
  pointParams(p: PointSynthese): Record<string, any> | null {
    if (!p.parametres) return null;
    if (p.lien === '/interventions') return this.drill(p.parametres['vue'] ?? '', {});
    return p.parametres;
  }

  openPoint(p: PointSynthese, event: Event): void {
    // A line pointing at the dashboard itself narrows it instead of reloading the page
    if (p.lien === '/dashboard' && p.parametres?.['chaineId']) {
      event.preventDefault();
      this.setChaine(+p.parametres['chaineId']);
    }
  }

  pickCause(item: BarItem): void {
    this.router.navigate(['/interventions'], { queryParams: this.drill('pannes', { panneId: item.key }) });
  }

  pickMachine(item: BarItem): void {
    this.router.navigate(['/equipment/view', item.key], { queryParams: { onglet: 'historique' } });
  }

  get budgetRatio(): number | null {
    if (!this.data || !this.data.budgetPeriode) return null;
    return Math.round((this.data.cout.total / this.data.budgetPeriode) * 100);
  }


  filterChaine(item: BarItem): void { this.setChaine(item.key); }

  /** Whole dinars with an ordinary space as thousands separator (SVG text lacks the narrow space). */
  montantCentre(v: number): string { return Math.round(v).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' '); }

  get periodLabel(): string {
    return this.data?.periode.libelle ?? '';
  }

  get comparaisonLabel(): string {
    const l = this.data?.periode.libellePrecedent ?? '';
    return l.startsWith('en ') ? l.slice(3) : l;
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
    exportCsv(`tableau-de-bord-${this.days}j`, ['Indicateur', d.periode.libelle, d.periode.libellePrecedent], [
      ['Disponibilité du parc (%)', c.disponibilite, p.disponibilite],
      ["Heures d'arrêt (h)", c.heuresArret, p.heuresArret],
      ['Pannes déclarées', c.pannes, p.pannes],
      ['Interventions déclarées', c.declarees, p.declarees],
      ['Interventions réalisées', c.realisees, p.realisees],
      ['Temps moyen de réparation, MTTR (h)', c.mttr, p.mttr],
      ['Temps moyen entre pannes, MTBF (h)', c.mtbf, p.mtbf],
      ['Respect du préventif (%)', c.respectPreventif, p.respectPreventif],
      ['Coût de maintenance (DT)', d.cout.total, d.coutPrecedent],
      ['Budget de la période (DT)', d.budgetPeriode, null],
      ['Interventions ouvertes (maintenant)', d.backlog, null],
      ['Interventions en retard (maintenant)', d.enRetard, null],
      ...d.aRetenir.map(a => ['À retenir', a.texte, a.action] as (string | number | null)[])
    ]);
  }

  // ------------------------------------------------------------------ Technician / requester

  loadWork(): void {
    this.loading = true;
    this.http.get<MonTravail>(`${environment.apiUrl}/pilotage/mon-travail`).subscribe({
      next: w => { this.work = w; this.loading = false; this.proposerVisite(); },
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
