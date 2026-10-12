import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { NgIf } from '@angular/common';

/**
 * Small "?" next to an indicator or a card title. Shows a plain-language explanation
 * on hover, keyboard focus or tap (phones), so non-specialists can read every figure.
 * The bubble is positioned on the viewport so cards with hidden overflow never cut it.
 */
@Component({
  selector: 'app-help',
  standalone: true,
  imports: [NgIf],
  template: `
    <button type="button" class="help" [attr.aria-label]="'Explication : ' + text" [attr.aria-expanded]="open"
            (mouseenter)="show()" (mouseleave)="hide()" (focus)="show()" (blur)="hide()" (click)="toggle($event)">?</button>
    <span class="bubble" role="tooltip" *ngIf="open" [class.above]="above" [style.left.px]="x" [style.top.px]="y">{{ text }}</span>
  `,
  styles: [`
    :host { display: inline-flex; vertical-align: middle; margin-left: 5px; text-transform: none; letter-spacing: 0; font-weight: 400; }
    .help {
      width: 16px; height: 16px; padding: 0; border-radius: 50%;
      display: inline-grid; place-items: center;
      border: 1.5px solid var(--gray-300); background: var(--surface); color: var(--gray-500);
      font: 700 10px/1 var(--font-sans); cursor: help;
    }
    .help:hover, .help:focus-visible, .help[aria-expanded="true"] { border-color: var(--primary-500); color: var(--primary-700); outline: none; }
    .bubble {
      position: fixed; z-index: 2000; width: max-content; max-width: 280px;
      padding: 9px 11px; border-radius: 8px;
      background: var(--gray-900); color: #fff;
      font: 400 12.5px/1.45 var(--font-sans); text-align: left; white-space: normal;
      box-shadow: 0 8px 24px -6px rgba(15, 23, 42, 0.35);
      pointer-events: none;
    }
    .bubble.above { transform: translateY(-100%); }
  `]
})
export class HelpTipComponent {
  @Input() text = '';

  open = false;
  above = false;
  x = 0;
  y = 0;
  private pinned = false;

  constructor(private host: ElementRef<HTMLElement>) {}

  show(): void {
    const r = this.host.nativeElement.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 16);
    this.x = Math.max(8, Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 8));
    this.above = r.bottom + 140 > window.innerHeight;
    this.y = this.above ? r.top - 8 : r.bottom + 8;
    this.open = true;
  }

  hide(): void {
    if (!this.pinned) this.open = false;
  }

  toggle(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.pinned = !this.pinned;
    if (this.pinned) this.show(); else this.open = false;
  }

  @HostListener('document:click')
  @HostListener('window:resize')
  @HostListener('document:wheel')
  close(): void {
    this.pinned = false;
    this.open = false;
  }
}
