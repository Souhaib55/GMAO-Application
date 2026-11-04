import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ArticleRow, GmaoApiService, PieceJointeRow, SuiviIntervention, TechnicienRow } from '../../../core/services/gmao-api.service';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { InterventionPhotosComponent } from '../intervention-photos/intervention-photos.component';
import { errorMessage, fmtDate, fmtDateTime, fmtMinutes, isoDate, isoDateTimeLocal, saveBlob } from '../../../shared/utils/gm-format';

/**
 * Execution record of a work order: checklist, time spent, parts issued from the
 * store, failure analysis, cost and documents. Used on the work-order page and in
 * the planning panel, so technicians record their work where they already are.
 */
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-intervention-suivi',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent, InterventionPhotosComponent],
  templateUrl: './intervention-suivi.component.html',
  styleUrls: ['./intervention-suivi.component.scss']
})
export class InterventionSuiviComponent implements OnChanges, OnDestroy {
  private readonly confirmDialog = inject(ConfirmService);
  @Input() interventionId!: number;
  /** Changes when the parent reloads the work order (status change…), to refresh the follow-up. */
  @Input() version: any;
  @Input() compact = false;
  @Output() changed = new EventEmitter<void>();

  suivi: SuiviIntervention | null = null;
  loading = true;
  error = '';
  isSuperviseur = false;
  techniciens: TechnicienRow[] = [];

  // Time entry
  /** One tap instead of typing minutes on a tablet. */
  readonly dureesRapides = [{ min: 15, label: '15 min' }, { min: 30, label: '30 min' }, { min: 60, label: '1 h' }, { min: 120, label: '2 h' }];

  /** The work started that long ago: the start time follows the chosen duration. */
  choisirDuree(minutes: number): void {
    this.tempsForm.dureeMinutes = minutes;
    this.tempsForm.debut = isoDateTimeLocal(new Date(Date.now() - minutes * 60000));
  }

  tempsForm = { idTechnicien: null as number | null, debut: isoDateTimeLocal(new Date(Date.now() - 3600000)), dureeMinutes: 60, commentaire: '' };
  tempsOpen = false;

  // Parts
  pieceSearch = '';
  pieceResults: ArticleRow[] = [];
  pieceChoice: ArticleRow | null = null;
  pieceQte = 1;
  pieceOpen = false;
  private pieceSearch$ = new Subject<string>();

  // Checklist
  newTache = '';

  // Analysis
  analyse = { cause: '', remede: '', coutExterne: null as number | null, datePlanifiee: '' as string | null, dureeEstimeeMinutes: null as number | null };
  analyseDirty = false;

  // Documents
  fichiers: PieceJointeRow[] = [];
  peutAjouterFichier = false;
  uploading = false;

  busy = false;
  message = '';
  messageError = false;
  private subs: Subscription[] = [];

  constructor(private api: GmaoApiService, private auth: AuthService) {
    this.isSuperviseur = this.auth.getCurrentUser()?.role === 'Superviseur';
    this.subs.push(this.pieceSearch$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(term => term.trim().length < 2 ? of({ data: [] as ArticleRow[] } as any)
        : this.api.getArticles({ search: term, pageSize: 8 }).pipe(catchError(() => of({ data: [] as ArticleRow[] }))))
    ).subscribe((r: any) => this.pieceResults = r.data));
  }

  ngOnChanges(): void {
    if (this.interventionId) this.load();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  load(): void {
    this.loading = !this.suivi;
    this.error = '';
    this.api.getSuivi(this.interventionId).subscribe({
      next: s => {
        this.suivi = s;
        this.loading = false;
        if (!this.analyseDirty) {
          this.analyse = {
            cause: s.cause || '', remede: s.remede || '', coutExterne: s.coutExterne,
            datePlanifiee: s.datePlanifiee ? s.datePlanifiee.substring(0, 10) : '', dureeEstimeeMinutes: s.dureeEstimeeMinutes
          };
        }
        if (this.isSuperviseur && s.peutSaisir && !this.techniciens.length) this.api.getTechniciens().subscribe(t => this.techniciens = t);
      },
      error: err => { this.loading = false; this.error = errorMessage(err, 'Le suivi est indisponible.'); }
    });
    this.api.getPiecesJointes('Intervention', this.interventionId).subscribe({
      next: r => { this.fichiers = r.fichiers; this.peutAjouterFichier = r.peutAjouter; },
      error: () => { this.fichiers = []; }
    });
  }

  private done(message: string): void {
    this.busy = false;
    this.flash(message);
    this.load();
    this.changed.emit();
  }

  private fail(err: any): void {
    this.busy = false;
    this.flash(errorMessage(err), true);
  }

  flash(message: string, isError = false): void {
    this.message = message;
    this.messageError = isError;
    setTimeout(() => { if (this.message === message) this.message = ''; }, 4000);
  }

  // ------------------------------------------------------------------ Checklist

  get tachesFaites(): number { return this.suivi?.taches.filter(t => t.fait).length ?? 0; }

  toggleTache(t: { id: number; fait: boolean }): void {
    if (!this.suivi?.peutSaisir) return;
    t.fait = !t.fait;
    this.api.toggleTache(this.interventionId, t.id, t.fait).subscribe({ next: () => this.changed.emit(), error: err => { t.fait = !t.fait; this.fail(err); } });
  }

  addTache(): void {
    const libelle = this.newTache.trim();
    if (!libelle) return;
    this.busy = true;
    this.api.addTache(this.interventionId, libelle).subscribe({ next: () => { this.newTache = ''; this.done('Étape ajoutée.'); }, error: err => this.fail(err) });
  }

  deleteTache(id: number): void {
    this.api.deleteTache(this.interventionId, id).subscribe({ next: () => this.done('Étape supprimée.'), error: err => this.fail(err) });
  }

  // ------------------------------------------------------------------ Time

  openTemps(): void {
    this.tempsForm = { idTechnicien: null, debut: isoDateTimeLocal(new Date(Date.now() - 3600000)), dureeMinutes: 60, commentaire: '' };
    this.tempsOpen = true;
  }

  saveTemps(): void {
    if (!this.tempsForm.debut || !this.tempsForm.dureeMinutes) { this.flash('Indiquez le début et la durée.', true); return; }
    this.busy = true;
    this.api.addTemps(this.interventionId, {
      idTechnicien: this.tempsForm.idTechnicien,
      debut: this.tempsForm.debut,
      dureeMinutes: Number(this.tempsForm.dureeMinutes),
      commentaire: this.tempsForm.commentaire || null
    }).subscribe({ next: () => { this.tempsOpen = false; this.done('Temps enregistré.'); }, error: err => this.fail(err) });
  }

  async deleteTemps(id: number): Promise<void> {
    if (!(await this.confirmDialog.ask({ title: 'Supprimer cette saisie de temps ?', message: 'Le coût de main-d\'œuvre de l\'intervention sera recalculé.' }))) return;
    this.api.deleteTemps(this.interventionId, id).subscribe({ next: () => this.done('Saisie supprimée.'), error: err => this.fail(err) });
  }

  // ------------------------------------------------------------------ Parts

  onPieceSearch(): void {
    this.pieceChoice = null;
    this.pieceSearch$.next(this.pieceSearch);
  }

  choosePiece(a: ArticleRow): void {
    this.pieceChoice = a;
    this.pieceSearch = `${a.codePiece} — ${a.designation}`;
    this.pieceResults = [];
    this.pieceQte = 1;
  }

  savePiece(): void {
    if (!this.pieceChoice) { this.flash('Choisissez un article du magasin.', true); return; }
    this.busy = true;
    this.api.addPiece(this.interventionId, { idPiece: this.pieceChoice.idPiece, quantite: Number(this.pieceQte) }).subscribe({
      next: r => {
        const unite = this.pieceChoice?.unite ?? '';
        this.pieceOpen = false;
        this.pieceSearch = '';
        this.pieceChoice = null;
        this.done(`Sortie de stock enregistrée. Reste ${r.stockRestant} ${unite} au magasin.`);
      },
      error: err => this.fail(err)
    });
  }

  async deletePiece(id: number): Promise<void> {
    if (!(await this.confirmDialog.ask({ title: 'Retirer cette pièce de l\'intervention ?', message: 'Elle sera remise en stock au magasin.', confirmText: 'Retirer' }))) return;
    this.api.deletePiece(this.interventionId, id).subscribe({ next: () => this.done('Pièce retournée au magasin.'), error: err => this.fail(err) });
  }

  // ------------------------------------------------------------------ Analysis

  saveAnalyse(): void {
    this.busy = true;
    this.api.saveAnalyse(this.interventionId, {
      cause: this.analyse.cause || null,
      remede: this.analyse.remede || null,
      coutExterne: this.analyse.coutExterne !== null && this.analyse.coutExterne !== undefined && (this.analyse.coutExterne as any) !== '' ? Number(this.analyse.coutExterne) : null,
      datePlanifiee: this.analyse.datePlanifiee || null,
      dureeEstimeeMinutes: this.analyse.dureeEstimeeMinutes ? Number(this.analyse.dureeEstimeeMinutes) : null
    }).subscribe({ next: () => { this.analyseDirty = false; this.done('Analyse enregistrée.'); }, error: err => this.fail(err) });
  }

  // ------------------------------------------------------------------ Documents

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { this.flash('Le fichier dépasse 10 Mo.', true); return; }
    this.uploading = true;
    this.api.uploadPieceJointe('Intervention', this.interventionId, file).subscribe({
      next: () => { this.uploading = false; this.done('Document ajouté.'); },
      error: err => { this.uploading = false; this.fail(err); }
    });
  }

  download(f: PieceJointeRow): void {
    this.api.downloadPieceJointe(f.id).subscribe({ next: blob => saveBlob(blob, f.nomFichier), error: err => this.fail(err) });
  }

  async deleteFichier(f: PieceJointeRow): Promise<void> {
    if (!(await this.confirmDialog.ask({ title: `Supprimer « ${f.nomFichier} » ?`, message: 'Le document sera retiré de l\'intervention.' }))) return;
    this.api.deletePieceJointe(f.id).subscribe({ next: () => this.done('Document supprimé.'), error: err => this.fail(err) });
  }

  fileIcon(f: PieceJointeRow): string {
    return f.contentType.startsWith('image/') ? 'eye' : 'file';
  }

  size(bytes: number): string {
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  }

  fmtDate = fmtDate;
  fmtDateTime = fmtDateTime;
  fmtMinutes = fmtMinutes;
  today = isoDate(new Date());
}
