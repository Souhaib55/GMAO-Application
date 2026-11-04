import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  AchatsSynthese, ArticleRow, CommandeDetail, CommandeRow, DemandeAchatRow, FournisseurRow, GmaoApiService
} from '../../core/services/gmao-api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { ActionsMenuComponent } from '../../shared/components/actions-menu/actions-menu.component';
import { ArticlePickerComponent } from '../../shared/components/article-picker/article-picker.component';
import { debouncer, errorMessage, exportCsv, fmtDate, fmtDateTime, isoDate, otCode } from '../../shared/utils/gm-format';

type Tab = 'commandes' | 'demandes' | 'fournisseurs';

interface EditLine { idPiece: number | null; designation: string; quantite: number; prix: number | null; unite?: string; }

@Component({
  selector: 'app-achats',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent, ActionsMenuComponent, ArticlePickerComponent],
  templateUrl: './achats.component.html',
  styleUrls: ['./achats.component.scss']
})
export class AchatsComponent implements OnInit {
  isSuperviseur = false;
  tab: Tab = 'commandes';
  synthese: AchatsSynthese | null = null;
  toast = '';
  toastError = false;

  // Orders
  commandes: CommandeRow[] = [];
  cmdStatut = '';
  cmdSearch = '';
  cmdLoading = false;
  readonly statutsBc = ['Brouillon', 'Envoyé', 'Partiellement reçu', 'Reçu', 'Annulé'];

  detail: CommandeDetail | null = null;
  detailLoading = false;

  // Requests
  demandes: DemandeAchatRow[] = [];
  daStatut = '';
  daLoading = false;
  decision: { da: DemandeAchatRow; approuver: boolean; commentaire: string } | null = null;

  // Suppliers
  fournisseurs: FournisseurRow[] = [];
  frnSearch = '';
  frnDialog: Omit<Partial<FournisseurRow>, 'id'> & { id: number | null } | null = null;

  // Order editor
  editor: { id: number | null; idFournisseur: number | null; idDemandeAchat: number | null; dateLivraisonPrevue: string; notes: string; lignes: EditLine[] } | null = null;
  // Request editor
  daEditor: { motif: string; lignes: EditLine[] } | null = null;
  // Receipt
  reception: { lignes: { idLigne: number; designation: string; reste: number; quantite: number; unite: string | null }[]; bonLivraison: string } | null = null;
  cancelDialog: { commentaire: string } | null = null;

  saving = false;
  formError = '';

  constructor(private api: GmaoApiService, private auth: AuthService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.isSuperviseur = this.auth.getCurrentUser()?.role === 'Superviseur';
    if (!this.isSuperviseur) this.tab = 'demandes';
    const vue = this.route.snapshot.queryParamMap.get('vue') as Tab | null;
    if (vue && (this.isSuperviseur || vue === 'demandes')) this.tab = vue;
    const statut = this.route.snapshot.queryParamMap.get('statut');
    if (statut && this.tab === 'demandes') this.daStatut = statut;
    this.refresh();
    const bc = Number(this.route.snapshot.queryParamMap.get('bc'));
    if (bc && this.isSuperviseur) this.openDetail(bc);
  }

  setTab(t: Tab): void {
    this.tab = t;
    this.router.navigate([], { queryParams: { vue: t }, replaceUrl: true });
    this.refresh();
  }

  refresh(): void {
    if (this.isSuperviseur) this.api.getAchatsSynthese().subscribe(s => this.synthese = s);
    if (this.tab === 'commandes') this.loadCommandes();
    if (this.tab === 'demandes') this.loadDemandes();
    if (this.tab === 'fournisseurs') this.loadFournisseurs();
    if (this.isSuperviseur && !this.fournisseurs.length) this.api.getFournisseurs().subscribe(f => this.fournisseurs = f);
  }

  // ------------------------------------------------------------------ Orders

  private readonly debounce = debouncer();

  /** Search as you type (Enter still searches immediately). */
  searchSoon(list: 'commandes' | 'fournisseurs'): void {
    this.debounce(() => list === 'commandes' ? this.loadCommandes() : this.loadFournisseurs());
  }

  loadCommandes(): void {
    this.cmdLoading = true;
    this.api.getCommandes({ statut: this.cmdStatut || undefined, search: this.cmdSearch || undefined }).subscribe({
      next: c => { this.commandes = c; this.cmdLoading = false; },
      error: err => { this.cmdLoading = false; this.showToast(errorMessage(err), true); }
    });
  }

  statutTone(s: string): string {
    return { 'Brouillon': 't-neutral', 'Envoyé': 't-info', 'Partiellement reçu': 't-warn', 'Reçu': 't-ok', 'Annulé': 't-neutral' }[s] || 't-neutral';
  }

  daTone(s: string): string {
    return { 'Soumise': 't-warn', 'Approuvée': 't-info', 'Rejetée': 't-bad', 'Commandée': 't-ok' }[s] || 't-neutral';
  }

  recuPct(c: CommandeRow): number { return c.montant > 0 ? Math.round((c.montantRecu / c.montant) * 100) : 0; }

  openDetail(id: number): void {
    this.detailLoading = true;
    this.detail = null;
    this.api.getCommande(id).subscribe({
      next: d => { this.detail = d; this.detailLoading = false; },
      error: err => { this.detailLoading = false; this.showToast(errorMessage(err), true); }
    });
  }

  closeDetail(): void { this.detail = null; this.detailLoading = false; }

  send(): void {
    if (!this.detail) return;
    const id = this.detail.bc.id;
    this.api.sendCommande(id).subscribe({
      next: () => { this.showToast('Bon de commande envoyé au fournisseur.'); this.openDetail(id); this.refresh(); },
      error: err => this.showToast(errorMessage(err), true)
    });
  }

  confirmCancel(): void {
    if (!this.detail || !this.cancelDialog) return;
    if (!this.cancelDialog.commentaire.trim()) { this.formError = "Indiquez le motif de l'annulation."; return; }
    const id = this.detail.bc.id;
    this.api.cancelCommande(id, this.cancelDialog.commentaire).subscribe({
      next: () => { this.cancelDialog = null; this.showToast('Bon de commande annulé.'); this.openDetail(id); this.refresh(); },
      error: err => this.formError = errorMessage(err)
    });
  }

  openReception(): void {
    if (!this.detail) return;
    this.formError = '';
    this.reception = {
      bonLivraison: '',
      lignes: this.detail.bc.lignes.filter(l => l.quantite > l.quantiteRecue).map(l => ({
        idLigne: l.id, designation: l.designation, reste: l.quantite - l.quantiteRecue, quantite: l.quantite - l.quantiteRecue, unite: l.unite
      }))
    };
  }

  saveReception(): void {
    if (!this.detail || !this.reception) return;
    const id = this.detail.bc.id;
    const lignes = this.reception.lignes.filter(l => l.quantite > 0).map(l => ({ idLigne: l.idLigne, quantite: Number(l.quantite) }));
    if (!lignes.length) { this.formError = 'Indiquez au moins une quantité reçue.'; return; }
    this.saving = true;
    this.api.receiveCommande(id, lignes, this.reception.bonLivraison || null).subscribe({
      next: r => {
        this.saving = false;
        this.reception = null;
        this.showToast(r.statut === 'Reçu' ? 'Réception complète : le stock a été mis à jour.' : 'Réception partielle enregistrée : le stock a été mis à jour.');
        this.openDetail(id);
        this.refresh();
      },
      error: err => { this.saving = false; this.formError = errorMessage(err); }
    });
  }

  printBc(): void {
    if (!this.detail) return;
    const b = this.detail.bc;
    const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
    const money = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    const rows = b.lignes.map(l => `<tr><td>${esc(l.code || '')}</td><td>${esc(l.designation)}</td><td class="r">${l.quantite} ${esc(l.unite || '')}</td><td class="r">${money(l.prixUnitaire)}</td><td class="r">${money(l.montant)}</td></tr>`).join('');
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(b.numero)}</title>
      <style>body{font-family:'IBM Plex Sans',Arial,sans-serif;color:#151a22;margin:32px;font-size:13px}h1{font-size:22px;margin:0}
      .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}.muted{color:#6b7585}
      .box{border:1px solid #cdd4df;border-radius:8px;padding:12px 14px;min-width:260px}table{width:100%;border-collapse:collapse;margin-top:18px}
      th{text-align:left;font-size:11px;color:#6b7585;border-bottom:1px solid #cdd4df;padding:8px}td{padding:8px;border-bottom:1px solid #eef1f6}
      .r{text-align:right}.total{font-size:15px;font-weight:700}.sign{margin-top:48px;display:flex;justify-content:space-between}</style></head><body>
      <div class="top"><div><h1>Bon de commande</h1><div class="muted">${esc(b.numero)} · ${fmtDate(b.dateCommande)}</div>
      <p><b>SIMOTEX</b><br><span class="muted">Service maintenance</span></p></div>
      <div class="box"><b>${esc(b.fournisseur.nom)}</b><br>${esc(b.fournisseur.contact || '')}<br>${esc(b.fournisseur.adresse || '')}<br>${esc(b.fournisseur.telephone || '')} ${esc(b.fournisseur.email || '')}</div></div>
      <div>Livraison souhaitée : <b>${fmtDate(b.dateLivraisonPrevue)}</b>${b.demandeAchat ? ` · Demande d'achat ${esc(b.demandeAchat)}` : ''}</div>
      <table><thead><tr><th>Code</th><th>Désignation</th><th class="r">Quantité</th><th class="r">Prix unitaire (DT)</th><th class="r">Montant (DT)</th></tr></thead>
      <tbody>${rows}</tbody><tfoot><tr><td colspan="4" class="r total">Total HT</td><td class="r total">${money(this.detail.montant)}</td></tr></tfoot></table>
      ${b.notes ? `<p class="muted">${esc(b.notes)}</p>` : ''}
      <div class="sign"><div>Établi par le service maintenance</div><div>Signature et cachet</div></div>
      <script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open('', '_blank');
    if (!w) { this.showToast("Autorisez l'ouverture de fenêtres pour imprimer.", true); return; }
    w.document.write(html);
    w.document.close();
  }

  exportCommandes(): void {
    exportCsv('bons-de-commande', ['Numéro', 'Fournisseur', 'Date', 'Livraison prévue', 'Statut', 'Montant (DT)', 'Reçu (DT)', 'Demande d\'achat'],
      this.commandes.map(c => [c.numero, c.fournisseur, fmtDate(c.dateCommande), fmtDate(c.dateLivraisonPrevue), c.statut, c.montant, c.montantRecu, c.demandeAchat]));
  }

  // ------------------------------------------------------------------ Order editor

  newCommande(fromDa?: DemandeAchatRow): void {
    this.formError = '';
    const supplier = this.fournisseurs[0]?.id ?? null;
    this.editor = {
      id: null, idFournisseur: supplier, idDemandeAchat: fromDa?.id ?? null, dateLivraisonPrevue: '', notes: fromDa ? `Suite à ${fromDa.numero}` : '',
      lignes: fromDa ? fromDa.lignes.map(l => ({ idPiece: l.idPiece, designation: l.designation, quantite: l.quantite, prix: l.prixEstime ?? null }))
                     : [{ idPiece: null, designation: '', quantite: 1, prix: null }]
    };
  }

  editCommande(): void {
    if (!this.detail) return;
    const b = this.detail.bc;
    this.formError = '';
    this.editor = {
      id: b.id, idFournisseur: b.idFournisseur, idDemandeAchat: b.idDemandeAchat, dateLivraisonPrevue: b.dateLivraisonPrevue ? b.dateLivraisonPrevue.substring(0, 10) : '',
      notes: b.notes || '', lignes: b.lignes.map(l => ({ idPiece: l.idPiece, designation: l.designation, quantite: l.quantite, prix: l.prixUnitaire, unite: l.unite || undefined }))
    };
  }

  pickLine(line: EditLine, a: ArticleRow): void {
    line.idPiece = a.idPiece;
    line.designation = a.designation;
    line.unite = a.unite;
    if (line.prix === null || line.prix === undefined) line.prix = a.prixUnitaire;
  }

  typedLine(line: EditLine, text: string): void {
    // Free text unlinks the catalogue article
    if (line.designation !== text) { line.designation = text; line.idPiece = null; }
  }

  addLine(lines: EditLine[]): void { lines.push({ idPiece: null, designation: '', quantite: 1, prix: null }); }
  removeLine(lines: EditLine[], i: number): void { lines.splice(i, 1); if (!lines.length) this.addLine(lines); }

  total(lines: EditLine[]): number { return lines.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix) || 0), 0); }

  saveCommande(envoyer: boolean): void {
    const e = this.editor;
    if (!e) return;
    this.formError = '';
    if (!e.idFournisseur) { this.formError = 'Choisissez un fournisseur.'; return; }
    const lignes = e.lignes.filter(l => l.designation.trim()).map(l => ({ idPiece: l.idPiece, designation: l.designation.trim(), quantite: Number(l.quantite), prix: l.prix === null ? null : Number(l.prix) }));
    if (!lignes.length) { this.formError = 'Ajoutez au moins une ligne.'; return; }
    this.saving = true;
    const payload = { idFournisseur: e.idFournisseur, idDemandeAchat: e.idDemandeAchat, dateLivraisonPrevue: e.dateLivraisonPrevue || null, notes: e.notes || null, envoyer, lignes };
    const req = e.id ? this.api.updateCommande(e.id, payload) : this.api.createCommande(payload);
    req.subscribe({
      next: (r: any) => {
        this.saving = false;
        const id = e.id ?? r.id;
        this.editor = null;
        this.showToast(envoyer ? 'Bon de commande envoyé.' : 'Brouillon enregistré.');
        this.tab = 'commandes';
        this.refresh();
        this.openDetail(id);
      },
      error: err => { this.saving = false; this.formError = errorMessage(err); }
    });
  }

  // ------------------------------------------------------------------ Requests

  loadDemandes(): void {
    this.daLoading = true;
    this.api.getDemandesAchat(this.daStatut || undefined).subscribe({
      next: d => { this.demandes = d; this.daLoading = false; },
      error: err => { this.daLoading = false; this.showToast(errorMessage(err), true); }
    });
  }

  newDemande(): void {
    this.formError = '';
    this.daEditor = { motif: '', lignes: [{ idPiece: null, designation: '', quantite: 1, prix: null }] };
  }

  saveDemande(): void {
    const e = this.daEditor;
    if (!e) return;
    const lignes = e.lignes.filter(l => l.designation.trim()).map(l => ({ idPiece: l.idPiece, designation: l.designation.trim(), quantite: Number(l.quantite), prix: l.prix === null ? null : Number(l.prix) }));
    if (!lignes.length) { this.formError = 'Ajoutez au moins une ligne.'; return; }
    this.saving = true;
    this.api.createDemandeAchat({ motif: e.motif || null, lignes }).subscribe({
      next: r => { this.saving = false; this.daEditor = null; this.showToast(`Demande ${r.numero} soumise au superviseur.`); this.loadDemandes(); this.refresh(); },
      error: err => { this.saving = false; this.formError = errorMessage(err); }
    });
  }

  openDecision(da: DemandeAchatRow, approuver: boolean): void {
    this.formError = '';
    this.decision = { da, approuver, commentaire: '' };
  }

  saveDecision(): void {
    const d = this.decision;
    if (!d) return;
    if (!d.approuver && !d.commentaire.trim()) { this.formError = 'Indiquez le motif du refus.'; return; }
    this.api.decideDemandeAchat(d.da.id, d.approuver, d.commentaire || null).subscribe({
      next: () => { this.decision = null; this.showToast(d.approuver ? 'Demande approuvée.' : 'Demande refusée.'); this.loadDemandes(); this.refresh(); },
      error: err => this.formError = errorMessage(err)
    });
  }

  // ------------------------------------------------------------------ Suppliers

  loadFournisseurs(): void {
    this.api.getFournisseurs(this.frnSearch, true).subscribe(f => this.fournisseurs = f);
  }

  ponctualite(f: FournisseurRow): string {
    return f.livraisons ? `${Math.round((f.livraisonsALHeure / f.livraisons) * 100)} %` : '—';
  }

  ponctualiteTone(f: FournisseurRow): string {
    if (!f.livraisons) return 't-neutral';
    const p = f.livraisonsALHeure / f.livraisons;
    return p >= 0.9 ? 't-ok' : p >= 0.7 ? 't-warn' : 't-bad';
  }

  openFournisseur(f?: FournisseurRow): void {
    this.formError = '';
    this.frnDialog = f ? { ...f } : { id: null, nom: '', code: '', contact: '', telephone: '', email: '', adresse: '', delaiLivraisonJours: null, notes: '', isActif: true };
  }

  saveFournisseur(): void {
    const f = this.frnDialog;
    if (!f) return;
    this.api.saveFournisseur(f.id, f as Partial<FournisseurRow>).subscribe({
      next: () => { this.frnDialog = null; this.showToast('Fournisseur enregistré.'); this.loadFournisseurs(); },
      error: err => this.formError = errorMessage(err)
    });
  }

  // ------------------------------------------------------------------ Misc

  showToast(message: string, isError = false): void {
    this.toast = message;
    this.toastError = isError;
    setTimeout(() => { if (this.toast === message) this.toast = ''; }, 4500);
  }

  isLate(c: { dateLivraisonPrevue: string | null; statut: string }): boolean {
    return !!c.dateLivraisonPrevue && (c.statut === 'Envoyé' || c.statut === 'Partiellement reçu') && c.dateLivraisonPrevue.substring(0, 10) < isoDate(new Date());
  }

  fmtDate = fmtDate;
  fmtDateTime = fmtDateTime;
  otCode = otCode;
}
