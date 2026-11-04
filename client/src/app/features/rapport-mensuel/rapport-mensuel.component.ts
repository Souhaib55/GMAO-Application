import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { KPI } from '../../shared/kpi/kpi-definitions';
import { errorMessage, fmtDateTime, fmtHours, fmtMoney, fmtNumber, fmtPercent } from '../../shared/utils/gm-format';
import { Comparaison, Pilotage, comparer } from '../dashboard/dashboard.component';

interface Ligne { label: string; def: string; cur: string; prev: string; cmp: Comparaison | null; objectif: string; }

/**
 * One-page monthly report for the management meeting: the month's figures next to the
 * previous month's, what to remember, where the downtime and the money went. Printed or
 * saved as PDF from the browser (print stylesheet); works without Internet.
 */
@Component({
  selector: 'app-rapport-mensuel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent],
  template: `
    <div class="gm-page rapport">
      <app-page-header icon="print" title="Rapport mensuel de maintenance"
                       subtitle="Les chiffres d'un mois, comparés au mois précédent, à imprimer ou à enregistrer en PDF pour la réunion.">
        <select [(ngModel)]="mois" (ngModelChange)="load()" aria-label="Mois du rapport">
          <option *ngFor="let m of moisDisponibles" [value]="m.value">{{ m.label }}</option>
        </select>
        <button type="button" class="btn btn-primary" (click)="imprimer()" [disabled]="!data"><app-icon name="print"></app-icon> Imprimer ou PDF</button>
      </app-page-header>

      <p class="print-tip">Pour un PDF : « Imprimer », puis choisissez « Enregistrer au format PDF » comme imprimante.</p>

      <div class="gm-loading" *ngIf="loading"><span class="spinner"></span> Préparation du rapport…</div>
      <div class="gm-error-box" *ngIf="error"><app-icon name="alert"></app-icon>{{ error }}</div>

      <article class="sheet" *ngIf="data as d">
        <header class="sheet-head">
          <div>
            <div class="brand">SIMOTEX · Maintenance</div>
            <h1>Rapport de {{ d.periode.libelle }}</h1>
            <div class="meta">{{ d.periode.machines }} machines suivies · comparaison avec {{ d.periode.libellePrecedent.replace('en ', '') }} · édité le {{ edition }}</div>
          </div>
        </header>

        <section>
          <h2>À retenir</h2>
          <ul class="points">
            <li *ngFor="let p of d.aRetenir" [ngClass]="'n-' + p.niveau"><b>{{ p.texte }}</b> <span>{{ p.action }}</span></li>
          </ul>
        </section>

        <section>
          <h2>Indicateurs du mois</h2>
          <table class="t">
            <thead><tr><th>Indicateur</th><th class="r">{{ d.periode.libelle }}</th><th class="r">Mois précédent</th><th>Évolution</th><th>Objectif / repère</th></tr></thead>
            <tbody>
              <tr *ngFor="let l of lignes">
                <td><b>{{ l.label }}</b><small>{{ l.def }}</small></td>
                <td class="r num"><b>{{ l.cur }}</b></td>
                <td class="r num">{{ l.prev }}</td>
                <td><span class="cmp" *ngIf="l.cmp" [ngClass]="l.cmp.tone">{{ l.cmp.text.replace(' par rapport à ' + d.periode.libellePrecedent.replace('en ', ''), '') }}</span></td>
                <td class="muted">{{ l.objectif }}</td>
              </tr>
            </tbody>
          </table>
          <p class="legend">Évolution : vert = mieux, rouge = moins bien, gris = stable. Les définitions détaillées sont dans la page Aide de la GMAO.</p>
        </section>

        <div class="two">
          <section>
            <h2>Pannes par cause (Pareto)</h2>
            <table class="t" *ngIf="d.pareto.length; else rien">
              <thead><tr><th>Cause</th><th class="r">Pannes</th><th class="r">Part</th><th class="r">Cumul</th><th class="r">Arrêt</th></tr></thead>
              <tbody>
                <tr *ngFor="let p of d.pareto"><td>{{ p.panne }}</td><td class="r num">{{ p.nombre }}</td><td class="r num">{{ pct(p.part) }}</td><td class="r num">{{ pct(p.cumul) }}</td><td class="r num">{{ h(p.heures) }}</td></tr>
              </tbody>
            </table>
          </section>
          <section>
            <h2>Heures d'arrêt par chaîne</h2>
            <table class="t" *ngIf="d.parChaine.length; else rien">
              <thead><tr><th>Chaîne</th><th class="r">Pannes</th><th class="r">Arrêt</th></tr></thead>
              <tbody><tr *ngFor="let c of d.parChaine"><td>{{ c.chaine }}</td><td class="r num">{{ c.pannes }}</td><td class="r num">{{ h(c.heures) }}</td></tr></tbody>
            </table>
          </section>
        </div>

        <section>
          <h2>Machines les plus pénalisantes</h2>
          <table class="t" *ngIf="d.topMachines.length; else rien">
            <thead><tr><th>Machine</th><th>Chaîne</th><th class="r">Pannes</th><th class="r">Arrêt</th><th class="r">Cumul</th><th class="r">Coût du mois</th></tr></thead>
            <tbody>
              <tr *ngFor="let m of d.topMachines"><td><b>{{ m.code }}</b> {{ m.designation }}</td><td>{{ m.chaine }}</td><td class="r num">{{ m.pannes }}</td><td class="r num">{{ h(m.heures) }}</td><td class="r num">{{ pct(m.cumul) }}</td><td class="r num">{{ money(m.cout) }}</td></tr>
            </tbody>
          </table>
        </section>

        <div class="two">
          <section>
            <h2>Coûts du mois</h2>
            <table class="t">
              <tbody>
                <tr><td>Main-d'œuvre</td><td class="r num">{{ money(d.cout.mainOeuvre) }}</td></tr>
                <tr><td>Pièces</td><td class="r num">{{ money(d.cout.pieces) }}</td></tr>
                <tr><td>Sous-traitance</td><td class="r num">{{ money(d.cout.externe) }}</td></tr>
                <tr class="total"><td>Total</td><td class="r num">{{ money(d.cout.total) }}</td></tr>
                <tr *ngIf="d.budgetPeriode"><td>Budget du mois (annuel au prorata)</td><td class="r num">{{ money(d.budgetPeriode) }} · {{ ratio(d.cout.total, d.budgetPeriode) }}</td></tr>
                <tr><td>Mois précédent</td><td class="r num">{{ money(d.coutPrecedent) }}</td></tr>
              </tbody>
            </table>
          </section>
          <section>
            <h2>Machines qui ont coûté le plus</h2>
            <table class="t" *ngIf="d.coutParMachine.length; else rien">
              <tbody><tr *ngFor="let m of d.coutParMachine"><td><b>{{ m.code }}</b> {{ m.designation }}</td><td class="r num">{{ money(m.cout) }}</td></tr></tbody>
            </table>
          </section>
        </div>

        <footer class="sheet-foot">GMAO SIMOTEX · calculs identiques au tableau de bord · {{ d.courant.declarees }} interventions déclarées, {{ d.courant.realisees }} terminées dans le mois</footer>
        <ng-template #rien><p class="muted">Aucune panne ce mois-ci.</p></ng-template>
      </article>
    </div>
  `,
  styles: [`
    .print-tip { font-size: 0.8125rem; color: var(--text-muted); margin: 0 0 12px; }
    .sheet { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--card-shadow); padding: 28px 32px; max-width: 1000px; color: #151a22; }
    .sheet-head { border-bottom: 2px solid var(--primary-600); padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--burgundy); }
    h1 { font-size: 1.375rem; margin: 4px 0 2px; font-weight: 600; text-transform: none; }
    h1::first-letter { text-transform: uppercase; }
    .meta { font-size: 0.8125rem; color: #505a69; }
    h2 { font-size: 0.9375rem; font-weight: 600; margin: 18px 0 8px; color: var(--primary-800); }
    section { break-inside: avoid; }
    .points { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .points li { padding: 6px 10px 6px 12px; border-left: 3px solid var(--gray-400); background: #f6f8fb; font-size: 0.8125rem; }
    .points li span { display: block; color: #505a69; margin-top: 1px; }
    .points .n-bad { border-color: var(--error); } .points .n-warn { border-color: var(--warning); } .points .n-ok { border-color: var(--success); } .points .n-info { border-color: var(--primary-600); }
    .t { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .t th { text-align: left; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7585; border-bottom: 1px solid #cdd4df; padding: 5px 6px; font-weight: 600; }
    .t td { border-bottom: 1px solid #eef1f6; padding: 5px 6px; vertical-align: top; }
    .t td small { display: block; color: #6b7585; font-size: 0.72rem; max-width: 380px; }
    .t .r { text-align: right; } .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .t tr.total td { font-weight: 600; border-top: 1px solid #cdd4df; }
    .cmp { font-size: 0.75rem; font-weight: 600; padding: 2px 6px; border-radius: 5px; white-space: nowrap; }
    .muted { color: #6b7585; }
    .legend { font-size: 0.75rem; color: #6b7585; margin: 6px 0 0; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .sheet-foot { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e1e6ee; font-size: 0.72rem; color: #6b7585; }
    @media (max-width: 760px) { .two { grid-template-columns: 1fr; } .sheet { padding: 16px; } }
    @media print {
      app-page-header, .print-tip { display: none !important; }
      .sheet { border: 0; box-shadow: none; padding: 0; max-width: none; }
      .cmp { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .points li { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `]
})
export class RapportMensuelComponent implements OnInit {
  mois = '';
  moisDisponibles: { value: string; label: string }[] = [];
  data: Pilotage | null = null;
  lignes: Ligne[] = [];
  loading = false;
  error = '';
  edition = fmtDateTime(new Date());

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    // The last 12 months, the month just finished selected by default
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) + (i === 0 ? ' (en cours)' : '');
      this.moisDisponibles.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    this.mois = this.moisDisponibles[1].value;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.http.get<Pilotage>(`${environment.apiUrl}/pilotage`, { params: { mois: this.mois } }).subscribe({
      next: d => {
        this.data = d;
        const prec = d.periode.libellePrecedent;
        const c = d.courant, p = d.precedent;
        const histo = p.declarees >= 5;
        this.lignes = [
          { label: KPI['disponibilite'].titre, def: KPI['disponibilite'].definition, cur: fmtPercent(c.disponibilite), prev: fmtPercent(p.disponibilite), cmp: comparer(c.disponibilite, p.disponibilite, 'haut', 'pt', prec, histo), objectif: '98 % ou plus' },
          { label: KPI['heuresArret'].titre, def: KPI['heuresArret'].definition, cur: fmtHours(c.heuresArret), prev: fmtHours(p.heuresArret), cmp: comparer(c.heuresArret, p.heuresArret, 'bas', 'pct', prec, histo), objectif: 'En baisse' },
          { label: 'Pannes déclarées', def: 'Demandes qui ont arrêté une machine identifiée.', cur: fmtNumber(c.pannes), prev: fmtNumber(p.pannes), cmp: comparer(c.pannes, p.pannes, 'bas', 'pct', prec, histo), objectif: 'En baisse' },
          { label: KPI['mttr'].titre, def: KPI['mttr'].definition, cur: fmtHours(c.mttr), prev: fmtHours(p.mttr), cmp: comparer(c.mttr, p.mttr, 'bas', 'pct', prec, histo), objectif: 'Moins de 2 h (machines à coudre)' },
          { label: KPI['mtbf'].titre, def: KPI['mtbf'].definition, cur: c.mtbf !== null ? fmtNumber(c.mtbf) + ' h' : '—', prev: p.mtbf !== null ? fmtNumber(p.mtbf) + ' h' : '—', cmp: comparer(c.mtbf, p.mtbf, 'haut', 'pct', prec, histo), objectif: 'En hausse' },
          { label: KPI['respectPreventif'].titre, def: `${c.preventifsATemps} faits à temps sur ${c.preventifsDus} prévus.`, cur: fmtPercent(c.respectPreventif), prev: fmtPercent(p.respectPreventif), cmp: comparer(c.respectPreventif, p.respectPreventif, 'haut', 'pt', prec, histo, 3), objectif: '90 % ou plus' },
          { label: KPI['cout'].titre, def: 'Main-d\'œuvre, pièces et sous-traitance.', cur: fmtMoney(d.cout.total), prev: fmtMoney(d.coutPrecedent), cmp: comparer(d.cout.total, d.coutPrecedent, 'bas', 'pct', prec, histo), objectif: d.budgetPeriode ? 'Budget : ' + fmtMoney(d.budgetPeriode) : 'Aucun budget saisi' }
        ];
        this.edition = fmtDateTime(new Date());
        this.loading = false;
      },
      error: err => { this.error = errorMessage(err, 'Le rapport ne peut pas être préparé.'); this.loading = false; }
    });
  }

  imprimer(): void { window.print(); }

  h = fmtHours;
  money = (v: number) => fmtMoney(v);
  pct = (v: number | null) => v === null ? '—' : `${Math.round(v)} %`;
  ratio = (v: number, b: number) => b ? `${Math.round(100 * v / b)} % consommé` : '';
}
