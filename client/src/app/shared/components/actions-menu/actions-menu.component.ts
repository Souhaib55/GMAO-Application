import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { AppIconComponent } from '../app-icon/app-icon.component';

let nextId = 0;

/**
 * "Plus d'actions": the secondary actions of a screen grouped behind one button, so the
 * screen keeps a single primary button. Items are projected:
 *   <app-actions-menu><button class="menu-item" ...>Exporter</button></app-actions-menu>
 * Keyboard: Enter or ↓ opens and focuses the first item, ↑ ↓ move, Échap closes.
 */
@Component({
  selector: 'app-actions-menu',
  standalone: true,
  imports: [NgIf, AppIconComponent],
  template: `
    <button type="button" class="btn btn-secondary trigger" [attr.aria-expanded]="open" aria-haspopup="menu" [attr.aria-controls]="menuId"
            (click)="toggle()" (keydown.arrowdown)="openAndFocus($event)">
      {{ label }} <app-icon name="chevron-right" class="chev" [class.open]="open"></app-icon>
    </button>
    <div class="menu" role="menu" [id]="menuId" [hidden]="!open" (click)="onItemClick($event)" (keydown)="onMenuKey($event)">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host { position: relative; display: inline-flex; }
    .chev { font-size: 14px; transform: rotate(90deg); transition: transform 0.15s; }
    .chev.open { transform: rotate(-90deg); }
    .menu {
      position: absolute; top: calc(100% + 6px); right: 0; z-index: 30; min-width: 240px;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      box-shadow: 0 10px 28px rgba(21, 26, 34, 0.14); padding: 6px;
    }
    .menu[hidden] { display: none; }
    :host ::ng-deep .menu-item {
      display: flex; align-items: center; gap: 10px; width: 100%; min-height: 40px; padding: 8px 10px;
      border: 0; border-radius: 8px; background: none; font: inherit; font-size: 0.875rem; color: var(--text);
      text-align: left; text-decoration: none; cursor: pointer; white-space: nowrap;
    }
    :host ::ng-deep .menu-item:hover, :host ::ng-deep .menu-item:focus-visible { background: var(--gray-50); outline: none; box-shadow: inset 0 0 0 2px var(--primary-600); }
    :host ::ng-deep .menu-item:disabled { color: var(--text-muted); cursor: default; }
    :host ::ng-deep .menu-item app-icon { color: var(--text-secondary); font-size: 16px; }
    @media (pointer: coarse) { :host ::ng-deep .menu-item { min-height: 44px; } }
    @media print { :host { display: none; } }
  `]
})
export class ActionsMenuComponent {
  @Input() label = "Plus d'actions";
  open = false;
  readonly menuId = `actions-menu-${++nextId}`;

  constructor(private host: ElementRef<HTMLElement>) {}

  private items(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.menu-item')).filter(e => !(e as HTMLButtonElement).disabled);
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) setTimeout(() => this.items()[0]?.focus());
  }

  openAndFocus(event: Event): void {
    event.preventDefault();
    this.open = true;
    setTimeout(() => this.items()[0]?.focus());
  }

  onItemClick(event: Event): void {
    if ((event.target as HTMLElement).closest('.menu-item')) this.open = false;
  }

  onMenuKey(event: KeyboardEvent): void {
    const items = this.items();
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'ArrowDown') { event.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) this.open = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.open) return;
    this.open = false;
    this.host.nativeElement.querySelector<HTMLButtonElement>('.trigger')?.focus();
  }
}
