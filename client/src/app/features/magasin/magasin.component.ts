import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  ArticleDetail, ArticlePayload, ArticleRow, GmaoApiService, MagasinRefs, MagasinRow, MagasinSynthese, MouvementRow, ReapproRow
} from '../../core/services/gmao-api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { GmColumnChartComponent, Series } from '../../shared/components/charts/gm-charts';
import { errorMessage, exportCsv, fmtDate, fmtDateTime, fmtMoney, fmtMonth, isoDate, otCode } from '../../shared/utils/gm-format';

type Tab = 'articles' | 'mouvements' | 'reappro' | 'magasins';

@Component({
  selector: 'app-magasin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent, GmColumnChartComponent],
  templateUrl: './magasin.component.html',
  styleUrls: ['./magasin.component.scss']
})
export class MagasinComponent implements OnInit {
  isSuperviseur = false;
  tab: Tab = 'articles';

  synthese: MagasinSynthese | null = null;
  refs: MagasinRefs | null = null;

  // Articles
  articles: ArticleRow[] = [];
  total = 0;
  page = 1;
  readonly pageSize = 25;
  search = '';
  type = '';
  magasinId: number | null = null;
  niveau: '' | 'alerte' | 'rupture' = '';
  loading = true;
  error = '';

  // Movements
  mouvements: MouvementRow[] = [];
  mvTotal = 0;
  mvPage = 1;
  mvType = '';
  mvFrom = isoDate(new Date(Date.now() - 30 * 86400000));
  mvTo = isoDate(new Date());
  mvSearch = '';
  mvLoading = false;

  // Replenishment
  reappro: (ReapproRow & { selected: boolean; qte: number })[] = [];
  reapproLoading = false;
  creatingOrders = false;

  // Store rooms
  magasins: MagasinRow[] = [];
  magasinDialog: { id: number | null; code: string; nom: string; description: string; isActif: boolean } | null = null;

  // Article drawer
  detail: ArticleDetail | null = null;
  detailLoading = false;
  conso: { labels: string[]; series: Series[] } = { labels: [], series: [] };

  // Movement dialog
  mvDialog: { article: { idPiece: number; codePiece: string; designation: string; unite: string; quantite_Stock: number; prixUnitaire: number }; type: string; quantite: number | null; prix: number | null; motif: string } | null = null;
  mvSaving = false;
  mvError = '';

  // Article editor
  editorOpen = false;
  editingId: number | null = null;
  form: ArticlePayload = this.emptyForm();
  saving = false;
  formError = '';

  toast = '';
  toastError = false;

  constructor(private api: GmaoApiService, private auth: AuthService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.isSuperviseur = this.auth.getCurrentUser()?.role === 'Superviseur';
    this.api.getMagasinRefs().subscribe(r => this.refs = r);
    this.loadSynthese();
    this.loadArticles();

    this.route.queryParamMap.subscribe(q => {
      const id = Number(q.get('article'));
      if (id) this.openDetail(id);
      const tab = q.get('vue') as Tab | null;
      if (tab && tab !== this.tab) this.setTab(tab, false);
    });
  }

  setTab(tab: Tab, updateUrl = true): void {
    this.tab = tab;
    if (updateUrl) this.router.navigate([], { queryParams: { vue: tab === 'articles' ? null : tab }, queryParamsHandling: 'merge', replaceUrl: true });
    if (tab === 'mouvements' && !this.mouvements.length) this.loadMouvements();
    if (tab === 'reappro') this.loadReappro();
    if (tab === 'magasins') this.loadMagasins();
  }

  // ------------------------------------------------------------------ Loading

  loadSynthese(): void {
    this.api.getMagasinSynthese().subscribe({ next: s => this.synthese = s, error: () => {} });
  }

  loadArticles(page = 1): void {
    this.page = page;
    this.loading = true;
    this.error = '';
    this.api.getArticles({ search: this.search, type: this.type, magasinId: this.magasinId, niveau: this.niveau, page, pageSize: this.pageSize }).subscribe({
      next: r => { this.articles = r.data; this.total = r.totalCount; this.loading = false; },
      error: err => { this.error = errorMessage(err, 'Impossible de charger les articles.'); this.loading = false; }
    });
  }

  setNiveau(n: '' | 'alerte' | 'rupture'): void {
    this.niveau = n;
    this.loadArticles();
  }

  get pages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }

  loadMouvements(page = 1): void {
    this.mvPage = page;
    this.mvLoading = true;
    this.api.getMouvements({ type: this.mvType, from: this.mvFrom, to: this.mvTo, search: this.mvSearch, page, pageSize: 50 }).subscribe({
      next: r => { this.mouvements = r.data; this.mvTotal = r.totalCount; this.mvLoading = false; },
      error: err => { this.mvLoading = false; this.showToast(errorMessage(err), true); }
    });
  }

  get mvPages(): number { return Math.max(1, Math.ceil(this.mvTotal / 50)); }

  loadReappro(): void {
    this.reapproLoading = true;
    this.api.getReappro().subscribe({
      next: r => {
        this.reappro = r.map(x => ({ ...x, selected: x.quantiteSuggeree > 0 && !!x.idFournisseur, qte: x.quantiteSuggeree }));
        this.reapproLoading = false;
      },
      error: err => { this.reapproLoading = false; this.showToast(errorMessage(err), true); }
    });
  }

  loadMagasins(): void {
    this.api.getMagasins().subscribe(m => this.magasins = m);
  }

  // ------------------------------------------------------------------ Helpers

  niveauTone(n: string): string {
    return n === 'Rupture' ? 't-bad' : n === 'Sous le seuil' ? 't-warn' : n === 'Non suivi' ? 't-neutral' : 't-ok';
  }

  fill(a: { quantite_Stock: number; seuilMinimum: number; stockMaximum: number | null }): number {
    const max = a.stockMaximum || Math.max(a.seuilMinimum * 2, a.quantite_Stock, 1);
    return Math.max(0, Math.min(100, (a.quantite_Stock / max) * 100));
  }

  fillClass(n: string): string {
    return n === 'Rupture' ? 'bad' : n === 'Sous le seuil' ? 'warn' : 'ok';
  }

  mvTone(m: MouvementRow): string {
    if (m.type === 'Ajustement') return 't-warn';
    if (m.type === 'Inventaire initial') return 't-neutral';
    return m.quantite > 0 ? 't-ok' : 't-info';
  }

  get reapproSelection() { return this.reappro.filter(r => r.selected && r.qte > 0 && r.idFournisseur); }

  get reapproMontant(): number { return this.reapproSelection.reduce((s, r) => s + r.qte * r.prixUnitaire, 0); }

  get reapproFournisseurs(): number { return new Set(this.reapproSelection.map(r => r.idFournisseur)).size; }

  // ------------------------------------------------------------------ Exports

  exportArticles(): void {
    this.api.getArticles({ search: this.search, type: this.type, magasinId: this.magasinId, niveau: this.niveau, page: 1, pageSize: 200 }).subscribe(r =>
      exportCsv('articles-magasin', ['Code', 'Désignation', 'Type', 'Famille', 'Magasin', 'Emplacement', 'Stock', 'Unité', 'Seuil', 'Maximum', 'Prix unitaire (DT)', 'Valeur (DT)', 'Fournisseur', 'Niveau'],
        r.data.map(a => [a.codePiece, a.designation, a.typeArticle, a.famille, a.magasin, a.emplacement, a.quantite_Stock, a.unite, a.seuilMinimum, a.stockMaximum, a.prixUnitaire, a.valeur, a.fournisseur, a.niveau])));
  }

  exportMouvements(): void {
    this.api.getMouvements({ type: this.mvType, from: this.mvFrom, to: this.mvTo, search: this.mvSearch, page: 1, pageSize: 200 }).subscribe(r =>
      exportCsv('mouvements-stock', ['Date', 'Type', 'Code', 'Article', 'Quantité', 'Stock après', 'Prix unitaire (DT)', 'Motif', 'Intervention', 'Commande', 'Par'],
        r.data.map(m => [fmtDateTime(m.date), m.type, m.code, m.designation, m.quantite, m.stockApres, m.prixUnitaire, m.motif,
          m.idDemandeIntervention ? otCode(m.idDemandeIntervention) : '', m.bonCommande, m.utilisateur])));
  }

  // ------------------------------------------------------------------ Detail

  openDetail(id: number): void {
    this.detailLoading = true;
    this.detail = null;
    this.api.getArticle(id).subscribe({
      next: d => {
        this.detail = d;
        this.conso = { labels: d.consommation.map(c => fmtMonth(c.mois)), series: [{ name: 'Sorties', values: d.consommation.map(c => c.quantite) }] };
        this.detailLoading = false;
      },
      error: err => { this.detailLoading = false; this.showToast(errorMessage(err, 'Article introuvable.'), true); }
    });
  }

  closeDetail(): void {
    this.detail = null;
    this.detailLoading = false;
    if (this.route.snapshot.queryParamMap.get('article'))
      this.router.navigate([], { queryParams: { article: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  // ------------------------------------------------------------------ Movement dialog

  openMovement(type: string, a?: { idPiece: number; codePiece: string; designation: string; unite: string; quantite_Stock: number; prixUnitaire: number }): void {
    const article = a ?? (this.detail ? this.detail.article : null);
    if (!article) return;
    this.mvDialog = {
      article: { idPiece: article.idPiece, codePiece: article.codePiece, designation: article.designation, unite: article.unite, quantite_Stock: article.quantite_Stock, prixUnitaire: article.prixUnitaire },
      type, quantite: type === 'Ajustement' ? article.quantite_Stock : null, prix: type === 'Entrée' ? article.prixUnitaire : null, motif: ''
    };
    this.mvError = '';
  }

  get mvResult(): number | null {
    if (!this.mvDialog || this.mvDialog.quantite === null || this.mvDialog.quantite === undefined) return null;
    const q = Number(this.mvDialog.quantite);
    const cur = this.mvDialog.article.quantite_Stock;
    return this.mvDialog.type === 'Entrée' ? cur + q : this.mvDialog.type === 'Sortie' ? cur - q : q;
  }

  saveMovement(): void {
    if (!this.mvDialog) return;
    const d = this.mvDialog;
    this.mvError = '';
    if (d.quantite === null || d.quantite === undefined || (d.type !== 'Ajustement' && d.quantite <= 0) || d.quantite < 0) { this.mvError = 'Indiquez une quantité valide.'; return; }
    if (d.type === 'Ajustement' && !d.motif.trim()) { this.mvError = "Indiquez le motif de l'ajustement (inventaire, casse, perte…)."; return; }
    this.mvSaving = true;
    this.api.createMouvement({ idPiece: d.article.idPiece, type: d.type, quantite: Number(d.quantite), prixUnitaire: d.type === 'Entrée' ? d.prix : null, motif: d.motif || null }).subscribe({
      next: r => {
        this.mvSaving = false;
        this.mvDialog = null;
        this.showToast(`${d.type} enregistrée. Nouveau stock : ${r.stockApres} ${d.article.unite}.`);
        this.refreshAfterChange(d.article.idPiece);
      },
      error: err => { this.mvSaving = false; this.mvError = errorMessage(err); }
    });
  }

  private refreshAfterChange(idPiece?: number): void {
    this.loadSynthese();
    this.loadArticles(this.page);
    if (this.tab === 'mouvements') this.loadMouvements(this.mvPage);
    if (this.tab === 'reappro') this.loadReappro();
    if (idPiece && this.detail?.article.idPiece === idPiece) this.openDetail(idPiece);
  }

  // ------------------------------------------------------------------ Article editor

  private emptyForm(): ArticlePayload {
    return {
      codePiece: '', designation: '', description: '', typeArticle: 'Pièce de rechange', unite: 'pièce', idFamillePiece: 0, idConstructeur: null,
      idCriticitePiece: 0, idMagasin: null, idFournisseur: null, seuilMinimum: 0, stockMaximum: null, prixUnitaire: 0, emplacement: '',
      referenceFournisseur: '', delaiApproJours: null, isActif: true, quantiteInitiale: 0
    };
  }

  openCreate(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    if (this.refs) {
      this.form.idFamillePiece = this.refs.familles[0]?.id ?? 0;
      this.form.idCriticitePiece = this.refs.criticites.find(c => /standard/i.test(c.libelle))?.id ?? this.refs.criticites[0]?.id ?? 0;
      this.form.idMagasin = this.refs.magasins[0]?.id ?? null;
    }
    this.formError = '';
    this.editorOpen = true;
  }

  openEdit(): void {
    if (!this.detail) return;
    const a = this.detail.article;
    this.editingId = a.idPiece;
    this.form = {
      codePiece: a.codePiece, designation: a.designation, description: a.description, typeArticle: a.typeArticle, unite: a.unite,
      idFamillePiece: a.idFamillePiece, idConstructeur: a.idConstructeur, idCriticitePiece: a.idCriticitePiece, idMagasin: a.idMagasin,
      idFournisseur: a.idFournisseur, seuilMinimum: a.seuilMinimum, stockMaximum: a.stockMaximum, prixUnitaire: a.prixUnitaire,
      emplacement: a.emplacement, referenceFournisseur: a.referenceFournisseur, delaiApproJours: a.delaiApproJours, isActif: a.isActif
    };
    this.formError = '';
    this.editorOpen = true;
  }

  saveArticle(): void {
    this.formError = '';
    if (!this.form.codePiece?.trim()) { this.formError = 'Le code article est obligatoire.'; return; }
    if (!this.form.designation?.trim()) { this.formError = 'La désignation est obligatoire.'; return; }
    this.saving = true;
    const payload: ArticlePayload = {
      ...this.form,
      seuilMinimum: Number(this.form.seuilMinimum || 0),
      stockMaximum: this.form.stockMaximum ? Number(this.form.stockMaximum) : null,
      prixUnitaire: Number(this.form.prixUnitaire || 0),
      delaiApproJours: this.form.delaiApproJours ? Number(this.form.delaiApproJours) : null,
      quantiteInitiale: Number(this.form.quantiteInitiale || 0)
    };
    const req = this.editingId ? this.api.updateArticle(this.editingId, payload) : this.api.createArticle(payload);
    req.subscribe({
      next: (r: any) => {
        this.saving = false;
        this.editorOpen = false;
        this.showToast(this.editingId ? 'Article mis à jour.' : 'Article créé.');
        this.refreshAfterChange(this.editingId ?? undefined);
        if (!this.editingId && r?.idPiece) this.openDetail(r.idPiece);
      },
      error: err => { this.saving = false; this.formError = errorMessage(err); }
    });
  }

  // ------------------------------------------------------------------ Replenishment → draft orders

  createDraftOrders(): void {
    const bySupplier = new Map<number, typeof this.reappro>();
    this.reapproSelection.forEach(r => bySupplier.set(r.idFournisseur!, [...(bySupplier.get(r.idFournisseur!) || []), r]));
    if (!bySupplier.size) return;
    this.creatingOrders = true;
    forkJoin([...bySupplier.entries()].map(([idFournisseur, lines]) => this.api.createCommande({
      idFournisseur, envoyer: false, notes: 'Réapprovisionnement sur seuil',
      lignes: lines.map(l => ({ idPiece: l.idPiece, designation: l.designation, quantite: Number(l.qte), prix: l.prixUnitaire }))
    }))).subscribe({
      next: res => {
        this.creatingOrders = false;
        this.showToast(`${res.length} bon(s) de commande créé(s) en brouillon : ${res.map(r => r.numero).join(', ')}.`);
        this.loadReappro();
      },
      error: err => { this.creatingOrders = false; this.showToast(errorMessage(err), true); }
    });
  }

  // ------------------------------------------------------------------ Store rooms

  openMagasin(m?: MagasinRow): void {
    this.magasinDialog = m
      ? { id: m.id, code: m.code, nom: m.nom, description: m.description || '', isActif: m.isActif }
      : { id: null, code: '', nom: '', description: '', isActif: true };
    this.formError = '';
  }

  saveMagasin(): void {
    const d = this.magasinDialog;
    if (!d) return;
    this.api.saveMagasin(d.id, { code: d.code, nom: d.nom, description: d.description || null, isActif: d.isActif }).subscribe({
      next: () => { this.magasinDialog = null; this.loadMagasins(); this.api.getMagasinRefs().subscribe(r => this.refs = r); this.showToast('Magasin enregistré.'); },
      error: err => this.formError = errorMessage(err)
    });
  }

  // ------------------------------------------------------------------ Misc

  showToast(message: string, isError = false): void {
    this.toast = message;
    this.toastError = isError;
    setTimeout(() => { if (this.toast === message) this.toast = ''; }, 4500);
  }

  fmtMoney = fmtMoney;
  fmtDate = fmtDate;
  fmtDateTime = fmtDateTime;
  otCode = otCode;
}
