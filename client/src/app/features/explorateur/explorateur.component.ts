import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ExplorateurCatalogue, ExplorateurColonne, ExplorateurListes, ExplorateurParams, ExplorateurQuestion, ExplorateurResultat, GmaoApiService
} from '../../core/services/gmao-api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { BarItem, ChartFormat, GmBarListComponent, GmLineChartComponent, Series } from '../../shared/components/charts/gm-charts';
import { errorMessage, exportCsv, isoDate } from '../../shared/utils/gm-format';

const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Questions shown first, before the user picks a section. */
const FREQUENTES = ['eq-plus-pannes', 'pm-respect', 'cout-total', 'int-par-panne', 'mag-sous-seuil', 'tech-heures', 'ach-retards', 'eq-disponibilite'];

@Component({
  selector: 'app-explorateur',
  standalone: true,
  imports: [CommonModule, FormsModule, PageHeaderComponent, AppIconComponent, GmBarListComponent, GmLineChartComponent],
  templateUrl: './explorateur.component.html',
  styleUrls: ['./explorateur.component.scss']
})
export class ExplorateurComponent implements OnInit {
  catalogue: ExplorateurCatalogue | null = null;
  listes: ExplorateurListes | null = null;
  loadingCatalogue = true;
  error = '';

  search = '';
  section: string | null = null;
  question: ExplorateurQuestion | null = null;

  // Parameters
  preset: 30 | 90 | 365 | 0 = 90;
  params: ExplorateurParams = this.defaultParams();

  // Result
  result: ExplorateurResultat | null = null;
  running = false;
  runError = '';
  view: 'graphique' | 'table' = 'graphique';
  bars: BarItem[] = [];
  barFormat: ChartFormat = 'number';
  line: { labels: string[]; series: Series[]; format: ChartFormat } = { labels: [], series: [], format: 'number' };

  constructor(private api: GmaoApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.api.getExplorateurCatalogue().subscribe({
      next: c => {
        this.catalogue = c;
        this.loadingCatalogue = false;
        const q = this.route.snapshot.queryParamMap.get('q');
        if (q) {
          const found = c.questions.find(x => x.id === q);
          if (found) this.select(found);
        }
      },
      error: err => { this.loadingCatalogue = false; this.error = errorMessage(err, "L'explorateur est indisponible."); }
    });
    this.api.getExplorateurListes().subscribe(l => this.listes = l);
  }

  private defaultParams(): ExplorateurParams {
    const today = new Date();
    return {
      debut: isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 89)),
      fin: isoDate(today),
      chaine: null, equipement: null, technicien: null, article: null, fournisseur: null,
      annee: today.getFullYear(), top: 10
    };
  }

  // ------------------------------------------------------------------ Catalogue

  sectionLabel(id: string): string {
    return this.catalogue?.sections.find(s => s.id === id)?.libelle ?? id;
  }

  sectionIcon(id: string): string {
    return this.catalogue?.sections.find(s => s.id === id)?.icone ?? 'explorer';
  }

  count(sectionId: string): number {
    return this.catalogue?.questions.filter(q => q.section === sectionId).length ?? 0;
  }

  private normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  get visibleQuestions(): ExplorateurQuestion[] {
    if (!this.catalogue) return [];
    const term = this.normalize(this.search.trim());
    if (term) {
      const words = term.split(/\s+/);
      return this.catalogue.questions.filter(q => {
        const hay = this.normalize(`${q.question} ${q.description} ${this.sectionLabel(q.section)}`);
        return words.every(w => hay.includes(w));
      });
    }
    if (this.section) return this.catalogue.questions.filter(q => q.section === this.section);
    return FREQUENTES.map(id => this.catalogue!.questions.find(q => q.id === id)).filter((q): q is ExplorateurQuestion => !!q);
  }

  get listTitle(): string {
    if (this.search.trim()) return `${this.visibleQuestions.length} question${this.visibleQuestions.length > 1 ? 's' : ''} trouvée${this.visibleQuestions.length > 1 ? 's' : ''}`;
    return this.section ? this.sectionLabel(this.section) : 'Questions fréquentes';
  }

  pickSection(id: string | null): void {
    this.section = id;
    this.search = '';
  }

  select(q: ExplorateurQuestion): void {
    this.question = q;
    this.result = null;
    this.runError = '';
    this.view = q.rendu === 'table' ? 'table' : 'graphique';
    this.router.navigate([], { queryParams: { q: q.id }, replaceUrl: true });
    if (!q.obligatoires.length || q.obligatoires.every(p => (this.params as any)[p])) this.run();
    if (window.innerWidth < 1000) setTimeout(() => document.querySelector('.result-pane')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  uses(p: string): boolean { return !!this.question?.parametres.includes(p); }
  required(p: string): boolean { return !!this.question?.obligatoires.includes(p); }

  setPreset(days: 30 | 90 | 365): void {
    this.preset = days;
    const today = new Date();
    this.params.debut = isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days + 1));
    this.params.fin = isoDate(today);
    this.run();
  }

  // ------------------------------------------------------------------ Execution

  run(): void {
    if (!this.question) return;
    const missing = this.question.obligatoires.find(p => !(this.params as any)[p]);
    if (missing) {
      this.runError = missing === 'equipement' ? 'Choisissez une machine pour répondre à cette question.' : missing === 'article' ? 'Choisissez un article pour répondre à cette question.' : 'Un paramètre est obligatoire.';
      this.result = null;
      return;
    }
    this.running = true;
    this.runError = '';
    const q = this.question;
    this.api.runQuestion(q.id, this.params).subscribe({
      next: r => {
        if (this.question?.id !== q.id) return;
        this.result = r;
        this.running = false;
        this.buildCharts(r);
      },
      error: err => { this.running = false; this.result = null; this.runError = errorMessage(err, "La question n'a pas pu être calculée."); }
    });
  }

  private formatOf(c: ExplorateurColonne | undefined): ChartFormat {
    if (!c) return 'number';
    return c.type === 'money' ? 'money' : c.type === 'hours' ? 'hours' : c.type === 'percent' ? 'percent' : 'number';
  }

  private isNumeric(c: ExplorateurColonne): boolean {
    return ['number', 'money', 'percent', 'hours'].includes(c.type);
  }

  private buildCharts(r: ExplorateurResultat): void {
    const numericIdx = r.colonnes.map((c, i) => this.isNumeric(c) ? i : -1).filter(i => i > 0);
    if (r.rendu === 'barres' && numericIdx.length) {
      const vi = numericIdx[0];
      const si = numericIdx[1];
      this.barFormat = this.formatOf(r.colonnes[vi]);
      this.bars = r.lignes.slice(0, 25).map(l => ({
        label: String(l[0] ?? '—').replace(/^\d+ /, ''),
        value: Number(l[vi] ?? 0),
        sub: si !== undefined ? `${r.colonnes[si].libelle} : ${this.format(l[si], r.colonnes[si])}` : undefined
      }));
    }
    if (r.rendu === 'ligne' && numericIdx.length) {
      const idx = numericIdx.slice(0, 4);
      this.line = {
        labels: r.lignes.map(l => this.shortLabel(l[0])),
        series: idx.map(i => ({ name: r.colonnes[i].libelle.replace(/ \((DT|h|%)\)$/, ''), values: r.lignes.map(l => l[i] === null ? null : Number(l[i])) })),
        format: this.formatOf(r.colonnes[idx[0]])
      };
    }
  }

  private shortLabel(v: any): string {
    const s = String(v ?? '');
    const m = /^(\d{4})-(\d{2})$/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }).replace('.', '');
    return s;
  }

  format(v: any, c: ExplorateurColonne): string {
    if (v === null || v === undefined || v === '') return '—';
    switch (c.type) {
      case 'money': return `${nf.format(Number(v))} DT`;
      case 'percent': return `${nf1.format(Number(v))} %`;
      case 'hours': return `${nf1.format(Number(v))} h`;
      case 'number': return nf.format(Number(v));
      case 'date': {
        const d = new Date(v);
        if (isNaN(d.getTime())) return String(v);
        const hasTime = d.getHours() || d.getMinutes();
        return d.toLocaleDateString('fr-FR') + (hasTime ? ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
      }
      default: return String(v).replace(/^\d \b(?=[A-ZÀ-Ý])/, '');
    }
  }

  label(c: ExplorateurColonne): string {
    return c.libelle;
  }

  isRight(c: ExplorateurColonne): boolean { return this.isNumeric(c); }

  /** Single-row answers are shown as figures. */
  get figures(): { label: string; value: string }[] {
    if (!this.result || !this.result.lignes.length) return [];
    const row = this.result.lignes[0];
    return this.result.colonnes.map((c, i) => ({ label: c.libelle.replace(/ \((DT|h|%)\)$/, ''), value: this.format(row[i], c) }));
  }

  export(): void {
    if (!this.result || !this.question) return;
    const r = this.result;
    exportCsv(`explorateur-${this.question.id}-${isoDate(new Date())}`, r.colonnes.map(c => c.libelle),
      r.lignes.map(l => l.map((v, i) => {
        const c = r.colonnes[i];
        if (v === null || v === undefined) return '';
        if (c.type === 'date') return this.format(v, c);
        if (this.isNumeric(c)) return Number(v);
        return String(v).replace(/^\d \b(?=[A-ZÀ-Ý])/, '');
      })));
  }

  get paramSummary(): string {
    if (!this.question) return '';
    const parts: string[] = [];
    if (this.uses('periode')) parts.push(`du ${new Date(this.params.debut + 'T00:00').toLocaleDateString('fr-FR')} au ${new Date(this.params.fin + 'T00:00').toLocaleDateString('fr-FR')}`);
    const name = (list: { id: number; libelle: string }[] | undefined, id: number | null | undefined) => list?.find(x => x.id === id)?.libelle;
    if (this.uses('chaine') && this.params.chaine) parts.push(name(this.listes?.chaines, this.params.chaine) || '');
    if (this.uses('equipement') && this.params.equipement) parts.push(name(this.listes?.equipements, this.params.equipement) || '');
    if (this.uses('technicien') && this.params.technicien) parts.push(name(this.listes?.techniciens, this.params.technicien) || '');
    if (this.uses('annee')) parts.push(`année ${this.params.annee}`);
    return parts.filter(Boolean).join(' · ');
  }

  get years(): number[] {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2, y - 3];
  }
}
