import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import qrcode from 'qrcode-generator';
import { environment } from '../../../../environments/environment';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../../shared/components/app-icon/app-icon.component';
import { errorMessage } from '../../../shared/utils/gm-format';

interface Etiquette { id: number; code: string; designation: string; chaineId: number | null; chaine: string; selected: boolean; }

/** QR code drawn as one SVG path: built in the browser, nothing fetched from the network. */
export function qrPath(text: string): { d: string; size: number } {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
    }
  }
  return { d, size: n + 8 }; // 4-module quiet zone around the code
}

/**
 * Labels to stick on the machines. The phone's own camera app reads the QR code and opens
 * "Déclarer une panne" with the machine already filled in (works on plain HTTP: the page
 * itself never uses the camera).
 */
@Component({
  selector: 'app-etiquettes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PageHeaderComponent, AppIconComponent],
  template: `
    <div class="gm-page">
      <app-page-header icon="qr" title="Étiquettes QR des machines"
                       subtitle="À coller sur chaque machine : en scannant le code avec l'appareil photo du téléphone, le chef de chaîne déclare une panne sans chercher la machine.">
        <a class="btn btn-secondary" routerLink="/equipment"><app-icon name="chevron-left"></app-icon> Équipements</a>
        <button type="button" class="btn btn-primary" (click)="imprimer()" [disabled]="!selection.length"><app-icon name="print"></app-icon> Imprimer {{ selection.length }} étiquette{{ selection.length > 1 ? 's' : '' }}</button>
      </app-page-header>

      <div class="gm-card setup">
        <div class="gm-card-body">
          <label for="base">Adresse de la GMAO utilisée par les tablettes et les téléphones</label>
          <input id="base" type="text" [(ngModel)]="base" (ngModelChange)="refresh()" spellcheck="false">
          <p class="warn" *ngIf="isLocal" role="alert"><app-icon name="alert"></app-icon>
            Cette adresse ne fonctionne que sur ce poste. Remplacez-la par celle des tablettes, par exemple http://SRV-TN-BI:5091, sinon les codes ne s'ouvriront pas sur les téléphones.</p>
          <p class="hint" *ngIf="!isLocal">Chaque code ouvre : <span class="gm-code">{{ base }}/interventions/new?machine=…</span>. Testez une étiquette avec un téléphone avant d'imprimer tout le parc.</p>
          <div class="filters">
            <select [(ngModel)]="chaineId" aria-label="Chaîne">
              <option [ngValue]="null">Toutes les chaînes</option>
              <option *ngFor="let c of chaines" [ngValue]="c.id">{{ c.libelle }}</option>
            </select>
            <button type="button" class="btn btn-secondary btn-sm" (click)="toutCocher(true)">Tout cocher</button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="toutCocher(false)">Tout décocher</button>
          </div>
        </div>
      </div>

      <div class="gm-loading" *ngIf="loading"><span class="spinner"></span> Chargement des machines…</div>
      <div class="gm-error-box" *ngIf="error"><app-icon name="alert"></app-icon>{{ error }}</div>
      <div class="gm-empty" *ngIf="!loading && !error && !visibles.length"><app-icon name="equipment"></app-icon><strong>Aucune machine</strong><span>Ajoutez d'abord les machines dans Équipements.</span></div>

      <div class="labels">
        <label class="label" *ngFor="let e of visibles" [class.off]="!e.selected">
          <input type="checkbox" [(ngModel)]="e.selected" [attr.aria-label]="'Imprimer l\\'étiquette de ' + e.code">
          <svg [attr.viewBox]="'0 0 ' + qr[e.id].size + ' ' + qr[e.id].size" role="img" [attr.aria-label]="'Code QR de ' + e.code" shape-rendering="crispEdges">
            <rect [attr.width]="qr[e.id].size" [attr.height]="qr[e.id].size" fill="#fff"></rect>
            <path [attr.d]="qr[e.id].d" fill="#000"></path>
          </svg>
          <span class="txt">
            <b>{{ e.code }}</b>
            <span class="des">{{ e.designation }}</span>
            <span class="ch">{{ e.chaine }}</span>
            <span class="cta">Panne ? Scannez ce code</span>
          </span>
        </label>
      </div>
    </div>
  `,
  styles: [`
    .setup { margin-bottom: 16px; }
    .setup label { display: block; font-size: 0.8125rem; font-weight: 600; margin-bottom: 6px; }
    .setup input[type=text] { width: 100%; max-width: 520px; }
    .warn { display: flex; gap: 8px; align-items: flex-start; color: var(--warning-dark); background: var(--warning-light); border-radius: var(--radius); padding: 8px 10px; font-size: 0.8125rem; margin: 10px 0 0; max-width: 760px; }
    .hint { font-size: 0.8125rem; color: var(--text-muted); margin: 8px 0 0; }
    .filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 12px; }
    .filters select { width: auto; min-width: 220px; }
    .labels { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
    .label { position: relative; display: grid; grid-template-columns: 110px 1fr; gap: 12px; align-items: center; background: #fff;
             border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 12px 14px 12px 12px; cursor: pointer; color: #151a22; }
    .label.off { opacity: 0.45; }
    .label input { position: absolute; top: 10px; right: 10px; }
    .label svg { width: 110px; height: 110px; display: block; }
    .txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .txt b { font-size: 1.375rem; letter-spacing: 0.02em; font-family: var(--font-mono); }
    .des { font-size: 0.8125rem; line-height: 1.3; }
    .ch { font-size: 0.75rem; color: #505a69; }
    .cta { margin-top: 6px; font-size: 0.75rem; font-weight: 600; color: var(--burgundy); }
    @media print {
      app-page-header, .setup, .gm-loading { display: none !important; }
      .labels { grid-template-columns: repeat(2, 1fr); gap: 6mm; }
      .label { break-inside: avoid; border: 1px dashed #999; border-radius: 3mm; grid-template-columns: 35mm 1fr; padding: 4mm; }
      .label svg { width: 35mm; height: 35mm; }
      .label.off { display: none; }
      .label input { display: none; }
    }
  `]
})
export class EtiquettesComponent implements OnInit {
  base = window.location.origin;
  machines: Etiquette[] = [];
  chaines: { id: number; libelle: string }[] = [];
  chaineId: number | null = null;
  qr: Record<number, { d: string; size: number }> = {};
  loading = true;
  error = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const api = environment.apiUrl;
    this.http.get<any[]>(`${api}/ChaineProduction`).subscribe({
      next: l => {
        this.chaines = (l || []).map(c => ({ id: c.idChaineProduction, libelle: c.libelle }));
        this.machines.forEach(m => m.chaine = this.nomChaine(m.chaineId));
      },
      error: () => {}
    });
    this.http.get<any[]>(`${api}/Equipment/lookup`).subscribe({
      next: l => {
        this.machines = (l || []).map(e => ({ id: e.idEquipement, code: e.codeEquipement, designation: e.designation, chaineId: e.idChaineProduction, chaine: this.nomChaine(e.idChaineProduction), selected: true }));
        this.refresh();
        this.loading = false;
      },
      error: err => { this.error = errorMessage(err, 'La liste des machines est indisponible.'); this.loading = false; }
    });
  }

  private nomChaine(id: number | null): string { return this.chaines.find(c => c.id === id)?.libelle ?? ''; }

  get isLocal(): boolean { return /\/\/(localhost|127\.|\[::1\])/i.test(this.base); }

  get visibles(): Etiquette[] { return this.chaineId ? this.machines.filter(m => m.chaineId === this.chaineId) : this.machines; }

  get selection(): Etiquette[] { return this.visibles.filter(m => m.selected); }

  url(id: number): string { return `${this.base.replace(/\/+$/, '')}/interventions/new?machine=${id}`; }

  refresh(): void {
    const qr: Record<number, { d: string; size: number }> = {};
    for (const m of this.machines) qr[m.id] = qrPath(this.url(m.id));
    this.qr = qr;
  }

  toutCocher(v: boolean): void { this.visibles.forEach(m => m.selected = v); }

  imprimer(): void { window.print(); }
}
