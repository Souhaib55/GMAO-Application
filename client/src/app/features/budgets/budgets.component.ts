import { HelpTipComponent } from '../../shared/components/help-tip/help-tip.component';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { BudgetLigne, BudgetVue, GmaoApiService } from '../../core/services/gmao-api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { BarItem, GmBarListComponent, GmColumnChartComponent, Series } from '../../shared/components/charts/gm-charts';
import { errorMessage, exportCsv } from '../../shared/utils/gm-format';

const MOIS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, AppIconComponent, GmColumnChartComponent, GmBarListComponent, HelpTipComponent],
  templateUrl: './budgets.component.html',
  styleUrls: ['./budgets.component.scss']
})
export class BudgetsComponent implements OnInit {
  private readonly confirmDialog = inject(ConfirmService);
  annee = new Date().getFullYear();
  vue: BudgetVue | null = null;
  loading = true;
  error = '';
  chaines: { id: number; libelle: string }[] = [];

  monthly: { labels: string[]; series: Series[]; target: number | null } = { labels: [], series: [], target: null };
  chainBars: BarItem[] = [];

  dialog: { id: number | null; categorie: string; idChaineProduction: number | null; montant: number | null; notes: string } | null = null;
  formError = '';
  toast = '';

  constructor(private api: GmaoApiService, private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/ChaineProduction`).subscribe(l => this.chaines = (l || []).map(c => ({ id: c.idChaineProduction, libelle: c.libelle })));
    this.load();
  }

  get years(): number[] {
    const y = new Date().getFullYear();
    return [y + 1, y, y - 1, y - 2];
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getBudgets(this.annee).subscribe({
      next: v => {
        this.vue = v;
        this.loading = false;
        const globalBudget = v.lignes.filter(l => !l.idChaineProduction).reduce((s, l) => s + l.montant, 0);
        this.monthly = {
          labels: MOIS,
          series: [
            { name: "Main-d'œuvre", values: v.parMois.map(m => m.mainOeuvre), color: '#3d60dc' },
            { name: 'Pièces', values: v.parMois.map(m => m.pieces), color: '#23a07a' },
            { name: 'Sous-traitance', values: v.parMois.map(m => m.sousTraitance), color: '#e0981f' }
          ],
          target: globalBudget > 0 ? Math.round(globalBudget / 12) : null
        };
        this.chainBars = v.parChaine.map(c => ({ label: c.chaine, value: c.montant, tone: 'info' as const }));
      },
      error: err => { this.loading = false; this.error = errorMessage(err, 'Le suivi budgétaire est indisponible.'); }
    });
  }

  tone(l: BudgetLigne): string {
    // Compare the spend with the pro-rata budget of the months elapsed
    if (!l.montant) return 'info';
    if (l.realise > l.montant) return 'bad';
    if (l.realise > l.prorata * 1.05) return 'warn';
    return 'ok';
  }

  statusText(l: BudgetLigne): string {
    if (!l.montant) return 'Aucun budget';
    if (l.realise > l.montant) return 'Budget dépassé';
    if (l.realise > l.prorata * 1.05) return 'Au-dessus du rythme prévu';
    return 'Dans le rythme prévu';
  }

  pct(l: BudgetLigne): number { return l.montant ? Math.min(100, (l.realise / l.montant) * 100) : 0; }
  prorataPct(l: BudgetLigne): number { return l.montant ? Math.min(100, (l.prorata / l.montant) * 100) : 0; }

  get projection(): number | null {
    if (!this.vue || !this.vue.fractionEcoulee) return null;
    return this.vue.realiseTotal / this.vue.fractionEcoulee;
  }

  openDialog(l?: BudgetLigne): void {
    this.formError = '';
    this.dialog = l
      ? { id: l.id, categorie: l.categorie, idChaineProduction: l.idChaineProduction, montant: l.montant, notes: l.notes || '' }
      : { id: null, categorie: this.vue?.categories[0] ?? 'Pièces', idChaineProduction: null, montant: null, notes: '' };
  }

  save(): void {
    const d = this.dialog;
    if (!d) return;
    if (d.montant === null || d.montant < 0) { this.formError = 'Indiquez un montant.'; return; }
    this.api.saveBudget(d.id, { annee: this.annee, categorie: d.categorie, idChaineProduction: d.idChaineProduction, montant: Number(d.montant), notes: d.notes || null }).subscribe({
      next: () => { this.dialog = null; this.flash('Budget enregistré.'); this.load(); },
      error: err => this.formError = errorMessage(err)
    });
  }

  async remove(): Promise<void> {
    const d = this.dialog;
    if (!d?.id || !(await this.confirmDialog.ask({ title: 'Supprimer cette ligne de budget ?', message: 'Le montant prévu pour cette catégorie ne sera plus suivi.' }))) return;
    this.api.deleteBudget(d.id).subscribe({
      next: () => { this.dialog = null; this.flash('Ligne supprimée.'); this.load(); },
      error: err => this.formError = errorMessage(err)
    });
  }

  export(): void {
    if (!this.vue) return;
    const v = this.vue;
    exportCsv(`budget-maintenance-${v.annee}`, ['Mois', "Main-d'œuvre (DT)", 'Pièces (DT)', 'Sous-traitance (DT)', 'Total (DT)'],
      v.parMois.map(m => [MOIS[m.mois - 1], m.mainOeuvre, m.pieces, m.sousTraitance, m.mainOeuvre + m.pieces + m.sousTraitance]));
  }

  flash(m: string): void {
    this.toast = m;
    setTimeout(() => { if (this.toast === m) this.toast = ''; }, 3500);
  }
}
