import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import {
  CalendarEvent, GmaoApiService, PlanDetail, PlanPayload, PlanRow, PreventifStats, TechnicienRow
} from '../../core/services/gmao-api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import {
  STATUTS_OT, daysFromToday, debouncer, errorMessage, exportCsv, fmtDate, fmtMinutes, fmtPercent, isoDate, otCode, parseDate, relativeDays
} from '../../shared/utils/gm-format';

interface DayCell { date: Date; iso: string; inMonth: boolean; today: boolean; events: CalendarEvent[]; }

const FREQUENCES = [
  { value: 'Jour', singulier: 'jour', pluriel: 'jours' },
  { value: 'Semaine', singulier: 'semaine', pluriel: 'semaines' },
  { value: 'Mois', singulier: 'mois', pluriel: 'mois' },
  { value: 'Annee', singulier: 'an', pluriel: 'ans' }
];

@Component({
  selector: 'app-preventif',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent],
  templateUrl: './preventif.component.html',
  styleUrls: ['./preventif.component.scss']
})
export class PreventifComponent implements OnInit {
  readonly frequences = FREQUENCES;
  readonly statuts = STATUTS_OT;
  readonly weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  isSuperviseur = false;
  tab: 'plans' | 'calendrier' = 'plans';
  /** Day of the month grid showing all its events (time value), 0 when none. */
  expandedDay = 0;

  // Data
  plans: PlanRow[] = [];
  stats: PreventifStats | null = null;
  chaines: { id: number; libelle: string }[] = [];
  equipements: { id: number; code: string; libelle: string; chaine: number | null }[] = [];
  techniciens: TechnicienRow[] = [];
  loading = true;
  error = '';

  // Filters
  search = '';
  chaineId: number | null = null;
  etat: 'actifs' | 'suspendus' | 'tous' = 'actifs';

  // Calendar
  month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  weeks: DayCell[][] = [];
  agenda: DayCell[] = [];
  calendarLoading = false;
  compact = window.innerWidth < 760;

  // Detail drawer
  detail: PlanDetail | null = null;
  detailLoading = false;

  // Editor drawer
  editorOpen = false;
  editingId: number | null = null;
  form: PlanPayload & { prochaineEcheance: string | null } = this.emptyForm();
  formTaches: { libelle: string }[] = [];
  saving = false;
  formError = '';

  toast = '';
  toastError = false;
  busyPlanId: number | null = null;

  constructor(
    private api: GmaoApiService,
    private http: HttpClient,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isSuperviseur = this.auth.getCurrentUser()?.role === 'Superviseur';
    const tab = this.route.snapshot.queryParamMap.get('vue');
    if (tab === 'calendrier') this.tab = 'calendrier';

    const base = environment.apiUrl;
    this.http.get<any[]>(`${base}/ChaineProduction`).subscribe(list => {
      this.chaines = (list || []).map(c => ({ id: c.idChaineProduction, libelle: c.libelle }));
    });
    this.http.get<any[]>(`${base}/Equipment/lookup`).subscribe(list => {
      this.equipements = (list || []).map(e => ({ id: e.idEquipement, code: e.codeEquipement, libelle: e.designation, chaine: e.idChaineProduction }));
    });
    if (this.isSuperviseur) this.api.getTechniciens().subscribe(t => this.techniciens = t);

    this.load();
    if (this.tab === 'calendrier') this.loadCalendar();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.compact = window.innerWidth < 760;
  }

  // ------------------------------------------------------------------ Loading

  private readonly debounce = debouncer();

  /** Search as you type (Enter still searches immediately). */
  searchSoon(): void {
    this.debounce(() => this.load());
  }

  load(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      plans: this.api.getPlans({
        search: this.search || undefined,
        chaineId: this.chaineId,
        actif: this.etat === 'tous' ? null : this.etat === 'actifs'
      }),
      stats: this.api.getPreventifStats(90)
    }).subscribe({
      next: ({ plans, stats }) => {
        this.plans = plans;
        this.stats = stats;
        this.loading = false;
      },
      error: err => {
        this.error = errorMessage(err, 'Impossible de charger les plans préventifs.');
        this.loading = false;
      }
    });
  }

  setTab(tab: 'plans' | 'calendrier'): void {
    this.tab = tab;
    this.router.navigate([], { queryParams: { vue: tab === 'calendrier' ? 'calendrier' : null }, replaceUrl: true });
    if (tab === 'calendrier') this.loadCalendar();
  }

  // ------------------------------------------------------------------ Calendar

  shiftMonth(delta: number): void {
    this.month = new Date(this.month.getFullYear(), this.month.getMonth() + delta, 1);
    this.loadCalendar();
  }

  goToday(): void {
    const now = new Date();
    this.month = new Date(now.getFullYear(), now.getMonth(), 1);
    this.loadCalendar();
  }

  get monthLabel(): string {
    const s = this.month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  loadCalendar(): void {
    const first = new Date(this.month);
    const offset = (first.getDay() + 6) % 7; // Monday first
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    const days: DayCell[] = [];
    const todayIso = isoDate(new Date());
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      days.push({ date: d, iso: isoDate(d), inMonth: d.getMonth() === this.month.getMonth(), today: isoDate(d) === todayIso, events: [] });
    }
    // Drop a trailing week that is entirely in the next month
    const cells = days.slice(35).every(c => !c.inMonth) ? days.slice(0, 35) : days;

    this.calendarLoading = true;
    this.api.getCalendar(cells[0].iso, cells[cells.length - 1].iso, this.chaineId).subscribe({
      next: events => {
        const byDay = new Map<string, CalendarEvent[]>();
        events.forEach(e => {
          const key = e.date.substring(0, 10);
          byDay.set(key, [...(byDay.get(key) || []), e]);
        });
        cells.forEach(c => c.events = (byDay.get(c.iso) || []).sort((a, b) => this.eventRank(a) - this.eventRank(b)));
        this.weeks = [];
        for (let i = 0; i < cells.length; i += 7) this.weeks.push(cells.slice(i, i + 7));
        this.agenda = cells.filter(c => c.inMonth && c.events.length);
        this.calendarLoading = false;
      },
      error: err => {
        this.calendarLoading = false;
        this.showToast(errorMessage(err, 'Impossible de charger le calendrier.'), true);
      }
    });
  }

  private eventRank(e: CalendarEvent): number {
    return e.type === 'prevision' ? 9 : e.statusId;
  }

  eventClass(e: CalendarEvent, day: DayCell): string {
    if (e.type === 'prevision') return 'ev-prev';
    if (e.statusId <= 2 && day.iso < isoDate(new Date())) return 'ev-late';
    return { 1: 'ev-todo', 2: 'ev-doing', 3: 'ev-done', 4: 'ev-closed', 5: 'ev-cancel' }[e.statusId] || 'ev-todo';
  }

  openEvent(e: CalendarEvent): void {
    if (e.idDemandeIntervention) this.router.navigate(['/interventions/view', e.idDemandeIntervention]);
    else if (e.planId) this.openDetail(e.planId);
  }

  // ------------------------------------------------------------------ Plans table helpers

  echeanceTone(p: PlanRow): string {
    if (!p.isActif) return 'muted';
    if (p.otEnRetard > 0 || p.joursAvantEcheance < 0) return 'bad';
    if (p.joursAvantEcheance <= 7) return 'warn';
    return '';
  }

  frequenceShort(p: { frequence: string; intervalle: number }): string {
    const f = FREQUENCES.find(x => x.value === p.frequence);
    if (!f) return '';
    return p.intervalle === 1 ? `Chaque ${f.singulier}` : `Tous les ${p.intervalle} ${f.pluriel}`;
  }

  get nbEnRetard(): number {
    return this.plans.filter(p => p.otEnRetard > 0).length;
  }

  exportPlans(): void {
    exportCsv('plans-preventifs', ['Code', 'Plan', 'Machine', 'Chaîne', 'Fréquence', 'Prochaine échéance', 'Technicien', 'Durée estimée (min)', 'Actif'],
      this.plans.map(p => [p.code, p.titre, `${p.equipement.codeEquipement} ${p.equipement.designation}`, p.chaine, this.frequenceShort(p),
        fmtDate(p.prochaineEcheance), p.technicien ? `${p.technicien.prenom} ${p.technicien.nom}` : '', p.dureeEstimeeMinutes, p.isActif ? 'Oui' : 'Non']));
  }

  // ------------------------------------------------------------------ Detail

  openDetail(id: number): void {
    this.detailLoading = true;
    this.detail = null;
    this.api.getPlan(id).subscribe({
      next: d => { this.detail = d; this.detailLoading = false; },
      error: err => { this.detailLoading = false; this.showToast(errorMessage(err, 'Plan introuvable.'), true); }
    });
  }

  closeDetail(): void {
    this.detail = null;
    this.detailLoading = false;
  }

  generateNow(planId: number, event?: Event): void {
    event?.stopPropagation();
    this.busyPlanId = planId;
    this.api.generatePlan(planId).subscribe({
      next: r => {
        this.busyPlanId = null;
        const n = r.generes?.length || 0;
        this.showToast(n ? `Ordre de travail ${otCode(r.generes[0].interventionId)} créé pour le ${fmtDate(r.generes[0].echeance)}.` : 'Aucun nouvel ordre de travail : il existe déjà.');
        this.load();
        if (this.detail?.plan.id === planId) this.openDetail(planId);
      },
      error: err => { this.busyPlanId = null; this.showToast(errorMessage(err), true); }
    });
  }

  generateAll(): void {
    this.api.generateAll().subscribe({
      next: r => {
        const n = r.generes?.length || 0;
        this.showToast(n ? `${n} ordre(s) de travail préventif(s) créé(s).` : 'Tous les ordres de travail dus existent déjà.');
        this.load();
        if (this.tab === 'calendrier') this.loadCalendar();
      },
      error: err => this.showToast(errorMessage(err), true)
    });
  }

  toggleActif(p: { id: number; isActif: boolean }, event?: Event): void {
    event?.stopPropagation();
    this.api.setPlanActif(p.id, !p.isActif).subscribe({
      next: () => {
        this.showToast(p.isActif ? 'Plan suspendu : plus aucun ordre de travail ne sera généré.' : 'Plan réactivé.');
        this.load();
        if (this.detail?.plan.id === p.id) this.openDetail(p.id);
      },
      error: err => this.showToast(errorMessage(err), true)
    });
  }

  // ------------------------------------------------------------------ Editor

  private emptyForm(): PlanPayload & { prochaineEcheance: string | null } {
    return {
      titre: '', description: '', idEquipement: 0, frequence: 'Mois', intervalle: 1, dureeEstimeeMinutes: 60,
      idTechnicien: null, dateDebut: isoDate(new Date()), prochaineEcheance: null, delaiGenerationJours: 7, isActif: true, taches: []
    };
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.formTaches = [{ libelle: '' }];
    this.formError = '';
    this.editorOpen = true;
  }

  openEdit(id: number, event?: Event): void {
    event?.stopPropagation();
    this.api.getPlan(id).subscribe({
      next: d => {
        const p = d.plan;
        this.editingId = p.id;
        this.form = {
          titre: p.titre, description: p.description, idEquipement: p.idEquipement, idTypeIntervention: p.idTypeIntervention,
          frequence: p.frequence, intervalle: p.intervalle, dureeEstimeeMinutes: p.dureeEstimeeMinutes, idTechnicien: p.idTechnicien,
          dateDebut: p.dateDebut.substring(0, 10), prochaineEcheance: p.prochaineEcheance.substring(0, 10),
          delaiGenerationJours: p.delaiGenerationJours, isActif: p.isActif, taches: []
        };
        this.formTaches = p.taches.length ? p.taches.map(t => ({ libelle: t.libelle })) : [{ libelle: '' }];
        this.formError = '';
        this.editorOpen = true;
      },
      error: err => this.showToast(errorMessage(err), true)
    });
  }

  closeEditor(): void {
    if (!this.saving) this.editorOpen = false;
  }

  addTache(): void {
    this.formTaches.push({ libelle: '' });
    setTimeout(() => (document.querySelector('.task-row:last-child input') as HTMLInputElement | null)?.focus());
  }

  removeTache(i: number): void {
    this.formTaches.splice(i, 1);
    if (!this.formTaches.length) this.formTaches.push({ libelle: '' });
  }

  moveTache(i: number, delta: number): void {
    const j = i + delta;
    if (j < 0 || j >= this.formTaches.length) return;
    [this.formTaches[i], this.formTaches[j]] = [this.formTaches[j], this.formTaches[i]];
  }

  get frequencePreview(): string {
    const f = FREQUENCES.find(x => x.value === this.form.frequence);
    if (!f || !this.form.intervalle) return '';
    const start = this.editingId ? this.form.prochaineEcheance : this.form.dateDebut;
    const d = parseDate(start || null);
    if (!d) return '';
    const dates: string[] = [];
    let cur = new Date(d);
    for (let i = 0; i < 3; i++) {
      dates.push(cur.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
      cur = this.next(cur);
    }
    return `Prochaines échéances : ${dates.join(', ')}…`;
  }

  private next(d: Date): Date {
    const n = this.form.intervalle || 1;
    switch (this.form.frequence) {
      case 'Jour': return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
      case 'Semaine': return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * n);
      case 'Annee': return new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
      default: return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
    }
  }

  get filteredEquipements() {
    return this.equipements;
  }

  save(): void {
    this.formError = '';
    if (!this.form.titre || this.form.titre.trim().length < 3) { this.formError = 'Donnez un titre au plan (3 caractères minimum).'; return; }
    if (!this.form.idEquipement) { this.formError = 'Choisissez la machine concernée.'; return; }
    if (!this.form.intervalle || this.form.intervalle < 1) { this.formError = "L'intervalle doit être d'au moins 1."; return; }

    const payload: PlanPayload = {
      ...this.form,
      titre: this.form.titre.trim(),
      idEquipement: Number(this.form.idEquipement),
      idTechnicien: this.form.idTechnicien ? Number(this.form.idTechnicien) : null,
      intervalle: Number(this.form.intervalle),
      dureeEstimeeMinutes: this.form.dureeEstimeeMinutes ? Number(this.form.dureeEstimeeMinutes) : null,
      delaiGenerationJours: Number(this.form.delaiGenerationJours ?? 7),
      prochaineEcheance: this.editingId ? this.form.prochaineEcheance : null,
      taches: this.formTaches.map(t => t.libelle.trim()).filter(t => t.length > 0)
    };

    this.saving = true;
    const req = this.editingId ? this.api.updatePlan(this.editingId, payload) : this.api.createPlan(payload);
    req.subscribe({
      next: (r: any) => {
        this.saving = false;
        this.editorOpen = false;
        this.showToast(this.editingId ? 'Plan mis à jour.' : `Plan ${r?.code ?? ''} créé. Les ordres de travail seront générés automatiquement.`);
        this.load();
        if (this.detail && this.editingId === this.detail.plan.id) this.openDetail(this.editingId);
      },
      error: err => {
        this.saving = false;
        this.formError = errorMessage(err);
      }
    });
  }

  // ------------------------------------------------------------------ Misc

  showToast(message: string, isError = false): void {
    this.toast = message;
    this.toastError = isError;
    setTimeout(() => { if (this.toast === message) this.toast = ''; }, 4000);
  }

  fmtDate = fmtDate;
  fmtMinutes = fmtMinutes;
  fmtPercent = fmtPercent;
  relativeDays = relativeDays;
  otCode = otCode;
  daysFromToday = daysFromToday;

  statutLabel(id: number): string { return this.statuts[id]?.label ?? '—'; }
  statutDot(id: number): string { return this.statuts[id]?.dot ?? 'd-muted'; }
  tauxTone(v: number | null | undefined): string {
    if (v === null || v === undefined) return 't-neutral';
    return v >= 90 ? 't-ok' : v >= 75 ? 't-warn' : 't-bad';
  }
}
