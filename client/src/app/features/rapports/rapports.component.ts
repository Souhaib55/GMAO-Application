import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GmaoApiService, RapportPowerBi } from '../../core/services/gmao-api.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { errorMessage, fmtDateTime } from '../../shared/utils/gm-format';

type Reachability = 'checking' | 'ok' | 'offline';

/**
 * Power BI reports published by the BI owner. Links are stored on the server (one
 * configuration for every workstation). Power BI Service needs internet access: the page
 * checks it first and explains what to do instead of showing an empty frame.
 */
@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent],
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.scss']
})
export class RapportsComponent implements OnInit, OnDestroy {
  @ViewChild('frameBox') frameBox?: ElementRef<HTMLElement>;

  rapports: RapportPowerBi[] = [];
  dateModification: string | null = null;
  selected: RapportPowerBi | null = null;
  safeUrl: SafeResourceUrl | null = null;
  loading = true;
  error = '';

  reach: Reachability = 'checking';
  frameLoading = false;
  frameSlow = false;
  private slowTimer: any;

  // Legacy link saved in this browser by the previous version of the page
  legacyUrl: string | null = null;

  editorOpen = false;
  draft: RapportPowerBi[] = [];
  saving = false;
  formError = '';
  toast = '';

  constructor(private api: GmaoApiService, private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    try {
      const saved = localStorage.getItem('powerbi-config');
      this.legacyUrl = saved ? JSON.parse(saved).embedUrl || null : null;
    } catch { this.legacyUrl = null; }
    this.load();
    this.checkReachability();
  }

  ngOnDestroy(): void {
    clearTimeout(this.slowTimer);
  }

  load(): void {
    this.loading = true;
    this.api.getPowerBi().subscribe({
      next: r => {
        this.rapports = r.rapports;
        this.dateModification = r.dateModification;
        this.loading = false;
        const keep = this.selected && this.rapports.find(x => x.id === this.selected!.id);
        this.select(keep || this.rapports[0] || null);
      },
      error: err => { this.loading = false; this.error = errorMessage(err, 'Impossible de charger la liste des rapports.'); }
    });
  }

  /** Power BI is a cloud service: probe it before loading a frame that would stay blank. */
  checkReachability(): void {
    this.reach = 'checking';
    if (!navigator.onLine) { this.reach = 'offline'; return; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    fetch('https://app.powerbi.com/favicon.ico', { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal })
      .then(() => { this.reach = 'ok'; })
      .catch(() => { this.reach = 'offline'; })
      .finally(() => clearTimeout(timer));
  }

  select(r: RapportPowerBi | null): void {
    this.selected = r;
    this.safeUrl = r ? this.sanitizer.bypassSecurityTrustResourceUrl(r.url) : null;
    this.frameLoading = !!r;
    this.frameSlow = false;
    clearTimeout(this.slowTimer);
    if (r) this.slowTimer = setTimeout(() => this.frameSlow = this.frameLoading, 15000);
  }

  onFrameLoad(): void {
    this.frameLoading = false;
    this.frameSlow = false;
  }

  refresh(): void {
    const r = this.selected;
    this.select(null);
    setTimeout(() => this.select(r), 50);
    this.checkReachability();
  }

  fullscreen(): void {
    const el = this.frameBox?.nativeElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  openExternal(): void {
    if (this.selected) window.open(this.selected.url, '_blank', 'noopener');
  }

  kind(url: string): string {
    if (/\/view\?r=/i.test(url)) return 'Publié sur le web (public)';
    if (/reportEmbed|dashboardEmbed/i.test(url)) return 'Incorporation sécurisée (compte Power BI requis)';
    return 'Lien Power BI';
  }

  // ------------------------------------------------------------------ Configuration

  openEditor(): void {
    this.formError = '';
    this.draft = this.rapports.length
      ? this.rapports.map(r => ({ ...r }))
      : [{ titre: 'Tableau de bord maintenance', description: '', url: this.legacyUrl || '' }];
    this.editorOpen = true;
  }

  addDraft(): void { this.draft.push({ titre: '', description: '', url: '' }); }
  removeDraft(i: number): void { this.draft.splice(i, 1); }
  moveDraft(i: number, d: number): void {
    const j = i + d;
    if (j < 0 || j >= this.draft.length) return;
    [this.draft[i], this.draft[j]] = [this.draft[j], this.draft[i]];
  }

  urlProblem(url: string): string | null {
    const u = (url || '').trim();
    if (!u) return 'Collez le lien fourni par Power BI.';
    if (/<iframe/i.test(u)) {
      const m = /src="([^"]+)"/i.exec(u);
      return m ? null : "Collez uniquement l'adresse (src) du code d'intégration.";
    }
    if (!/^https:\/\//i.test(u)) return 'Le lien doit commencer par https://';
    if (!/^https:\/\/([a-z0-9-]+\.)*powerbi\.(com|cn)\/|^https:\/\/app\.powerbigov\.us\//i.test(u)) return 'Seuls les liens Power BI Service sont acceptés.';
    return null;
  }

  /** Accepts the whole <iframe> snippet copied from Power BI and keeps only its address. */
  normalize(r: RapportPowerBi): void {
    const m = /src="([^"]+)"/i.exec(r.url || '');
    if (m) r.url = m[1].replace(/&amp;/g, '&');
    r.url = (r.url || '').trim();
  }

  save(): void {
    this.formError = '';
    this.draft.forEach(r => this.normalize(r));
    const bad = this.draft.find(r => !r.titre?.trim() || this.urlProblem(r.url));
    if (bad) {
      this.formError = !bad.titre?.trim() ? 'Chaque rapport doit avoir un titre.' : `« ${bad.titre} » : ${this.urlProblem(bad.url)}`;
      return;
    }
    this.saving = true;
    this.api.savePowerBi(this.draft).subscribe({
      next: () => {
        this.saving = false;
        this.editorOpen = false;
        try { localStorage.removeItem('powerbi-config'); } catch { /* ignore */ }
        this.legacyUrl = null;
        this.flash('Rapports enregistrés pour tous les postes.');
        this.load();
      },
      error: err => { this.saving = false; this.formError = errorMessage(err); }
    });
  }

  flash(m: string): void {
    this.toast = m;
    setTimeout(() => { if (this.toast === m) this.toast = ''; }, 3500);
  }

  fmtDateTime = fmtDateTime;
}
