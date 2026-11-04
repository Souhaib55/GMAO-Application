import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgIf } from '@angular/common';
import { Subscription } from 'rxjs';
import { TourService, TourStep } from '../../../core/services/tour.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Step-by-step tour: a frame around the element being explained and a short card next
 * to it. Keyboard: Enter / → next, ← previous, Escape closes. Focus stays in the card.
 */
@Component({
  selector: 'app-guided-tour',
  standalone: true,
  imports: [NgIf],
  template: `
    <ng-container *ngIf="steps">
      <div class="tour-shade" [class.with-target]="!!rect" (click)="close()"></div>
      <div class="tour-frame" *ngIf="rect" [style.top.px]="rect.top - 6" [style.left.px]="rect.left - 6"
           [style.width.px]="rect.width + 12" [style.height.px]="rect.height + 12"></div>
      <div #card class="tour-card" role="dialog" aria-modal="true" [attr.aria-labelledby]="'tour-titre'" tabindex="-1"
           [style.top.px]="cardTop" [style.left.px]="cardLeft" [class.centered]="!rect">
        <div class="tour-count">Étape {{ index + 1 }} sur {{ steps.length }}</div>
        <h3 id="tour-titre">{{ step.titre }}</h3>
        <p>{{ step.texte }}</p>
        <div class="tour-actions">
          <button type="button" class="btn btn-secondary btn-sm skip" (click)="close()">{{ last ? 'Fermer' : 'Passer la visite' }}</button>
          <span class="spacer"></span>
          <button type="button" class="btn btn-secondary btn-sm" *ngIf="index > 0" (click)="prev()">Précédent</button>
          <button type="button" class="btn btn-primary btn-sm" (click)="next()">{{ last ? 'Terminer' : 'Suivant' }}</button>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .tour-shade { position: fixed; inset: 0; background: rgba(21, 26, 34, 0.45); z-index: 3000; }
    .tour-shade.with-target { background: transparent; }
    .tour-frame { position: fixed; z-index: 3001; border-radius: 10px; border: 2px solid var(--primary-600);
                  box-shadow: 0 0 0 9999px rgba(21, 26, 34, 0.45); pointer-events: none; transition: all .25s ease; }
    .tour-card { position: fixed; z-index: 3002; width: min(360px, calc(100vw - 32px)); background: var(--surface); border-radius: var(--radius-lg);
                 border: 1px solid var(--border); box-shadow: 0 12px 32px rgba(21, 26, 34, 0.2); padding: 16px 18px 14px; outline: none; }
    .tour-card.centered { transform: translate(-50%, -50%); }
    .tour-count { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    h3 { margin: 4px 0 6px; font-size: 1rem; font-weight: 600; }
    p { margin: 0; font-size: 0.875rem; line-height: 1.5; color: var(--text-secondary); }
    .tour-actions { display: flex; gap: 8px; align-items: center; margin-top: 14px; }
    .spacer { flex: 1; }
    @media print { :host { display: none; } }
  `]
})
export class GuidedTourComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('card') card?: ElementRef<HTMLElement>;
  steps: TourStep[] | null = null;
  index = 0;
  rect: DOMRect | null = null;
  cardTop = 0;
  cardLeft = 0;
  private sub?: Subscription;
  private focusPending = false;

  constructor(private tour: TourService, private auth: AuthService) {}

  get step(): TourStep { return this.steps![this.index]; }
  get last(): boolean { return !!this.steps && this.index === this.steps.length - 1; }

  ngOnInit(): void {
    this.sub = this.tour.steps$.subscribe(steps => {
      this.steps = steps;
      this.index = 0;
      if (steps) setTimeout(() => this.place(), 50);
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  ngAfterViewChecked(): void {
    if (this.focusPending && this.card) {
      this.focusPending = false;
      this.card.nativeElement.focus();
    }
  }

  next(): void { if (this.last) this.close(); else { this.index++; this.place(); } }
  prev(): void { if (this.index > 0) { this.index--; this.place(); } }

  close(): void {
    this.tour.finish(this.auth.getCurrentUser());
  }

  /** Finds the first visible element of the step and puts the card beside it. */
  private place(): void {
    if (!this.steps) return;
    const sel = this.step.selector;
    const el = sel ? Array.from(document.querySelectorAll<HTMLElement>(sel)).find(e => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) : undefined;
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
      const rect = el.getBoundingClientRect();
      this.rect = rect;
      const w = Math.min(360, window.innerWidth - 32);
      const below = rect.bottom + 16;
      const fitsBelow = below + 200 < window.innerHeight;
      this.cardTop = fitsBelow ? below : Math.max(16, rect.top - 216);
      this.cardLeft = Math.min(Math.max(16, rect.left), window.innerWidth - w - 16);
      if (!fitsBelow && rect.top < 232) {
        // No room above or below (tall element): to its right, or over it
        this.cardTop = Math.max(16, Math.min(rect.top, window.innerHeight - 240));
        this.cardLeft = rect.right + 16 + w < window.innerWidth ? rect.right + 16 : Math.max(16, window.innerWidth - w - 16);
      }
    } else {
      this.rect = null;
      this.cardTop = window.innerHeight / 2;
      this.cardLeft = window.innerWidth / 2;
    }
    this.focusPending = true;
  }

  @HostListener('window:resize')
  onResize(): void { if (this.steps) this.place(); }

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.steps) return;
    if (e.key === 'Escape') { e.preventDefault(); this.close(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
  }
}
