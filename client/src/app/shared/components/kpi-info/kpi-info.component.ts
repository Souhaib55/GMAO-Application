import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { KpiContexte, KpiDefinition } from '../../kpi/kpi-definitions';

let nextId = 0;

/**
 * The "?" next to an indicator: what it means, how it is calculated (in words and with the
 * figures on screen), what a good value looks like, and which way is better.
 * Opens on click or Enter, closes on Escape, a second click or a click elsewhere.
 */
@Component({
  selector: 'app-kpi-info',
  standalone: true,
  imports: [NgIf, NgFor],
  template: `
    <button type="button" class="kpi-info-btn" [attr.aria-expanded]="open" [attr.aria-controls]="panelId"
            [attr.aria-label]="'Comprendre : ' + (defs[0]?.titre || '')" (click)="toggle($event)">?</button>
    <div class="kpi-info-panel" *ngIf="open" [id]="panelId" role="dialog" [attr.aria-label]="defs[0]?.titre" [class.left]="alignLeft"
         (click)="$event.stopPropagation()">
      <section *ngFor="let d of defs; let first = first" [class.next]="!first">
        <h4>{{ d.titre }}</h4>
        <p class="def">{{ d.definition }}</p>
        <dl>
          <dt>Calcul</dt><dd>{{ d.formule }}</dd>
          <ng-container *ngIf="contexte && d.exemple"><dt>Avec vos chiffres</dt><dd class="ex">{{ d.exemple(contexte) }}</dd></ng-container>
          <dt>Repères</dt><dd>{{ d.reperes }}</dd>
          <dt>Sens</dt><dd><b>{{ d.sens === 'haut' ? 'Plus c\\'est haut, mieux c\\'est.' : 'Plus c\\'est bas, mieux c\\'est.' }}</b></dd>
          <ng-container *ngIf="d.note"><dt>À savoir</dt><dd>{{ d.note }}</dd></ng-container>
        </dl>
      </section>
      <button type="button" class="close" (click)="open = false">Fermer</button>
    </div>
  `,
  styles: [`
    :host { position: relative; display: inline-flex; z-index: 2; }
    .kpi-info-btn {
      width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--border-strong); background: var(--surface);
      color: var(--text-secondary); font: 600 0.75rem/1 var(--font-sans); cursor: pointer; display: grid; place-items: center; padding: 0;
    }
    .kpi-info-btn:hover, .kpi-info-btn[aria-expanded="true"] { background: var(--primary-50); border-color: var(--primary-300); color: var(--primary-700); }
    @media (pointer: coarse) {
      .kpi-info-btn { width: 32px; height: 32px; font-size: 0.875rem; }
      .kpi-info-btn::after { content: ''; position: absolute; inset: -6px; }
    }
    .kpi-info-panel {
      position: absolute; top: calc(100% + 8px); right: -8px; width: min(360px, calc(100vw - 32px));
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      box-shadow: 0 10px 30px rgba(21, 26, 34, 0.14); padding: 14px 16px 12px; text-align: left; cursor: default;
      font-size: 0.8125rem; line-height: 1.45; color: var(--text); max-height: 70vh; overflow: auto;
    }
    .kpi-info-panel.left { right: auto; left: -8px; }
    section.next { border-top: 1px solid var(--border); margin-top: 12px; padding-top: 12px; }
    h4 { margin: 0 0 4px; font-size: 0.875rem; font-weight: 600; }
    .def { margin: 0 0 8px; color: var(--text-secondary); }
    dl { margin: 0; display: grid; gap: 2px; }
    dt { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-top: 6px; }
    dd { margin: 0; }
    dd.ex { background: var(--primary-50); color: var(--primary-900); border-radius: 6px; padding: 6px 8px; font-variant-numeric: tabular-nums; }
    .close { margin-top: 10px; border: 0; background: none; color: var(--primary-700); font: 600 0.8125rem var(--font-sans); cursor: pointer; padding: 6px 0; }
    @media print { :host { display: none; } }
  `]
})
export class KpiInfoComponent {
  /** One or several definitions (e.g. MTTR and MTBF in the same card). */
  @Input() set def(value: KpiDefinition | KpiDefinition[] | null | undefined) {
    this.defs = !value ? [] : Array.isArray(value) ? value : [value];
  }
  @Input() contexte: KpiContexte | null = null;
  /** Open towards the right (for cards on the left edge of the screen). */
  @Input() alignLeft = false;

  defs: KpiDefinition[] = [];
  open = false;
  readonly panelId = `kpi-info-${++nextId}`;

  constructor(private host: ElementRef<HTMLElement>) {}

  toggle(event: Event): void {
    // The card behind is a link to the detailed list: the "?" must not follow it
    event.preventDefault();
    event.stopPropagation();
    this.open = !this.open;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.open = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.open = false;
      this.host.nativeElement.querySelector<HTMLButtonElement>('.kpi-info-btn')?.focus();
    }
  }
}
