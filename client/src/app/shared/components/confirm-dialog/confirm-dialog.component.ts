import { AfterViewChecked, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AppIconComponent } from '../app-icon/app-icon.component';

/** Rendered once in the layout; shows the requests of ConfirmService. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [NgIf, AsyncPipe, AppIconComponent],
  template: `
    <ng-container *ngIf="confirm.request$ | async as r">
      <div class="cd-backdrop" (click)="confirm.answer(false)"></div>
      <div class="cd-box" role="alertdialog" aria-modal="true" [attr.aria-label]="r.title">
        <span class="cd-icon" [class.primary]="r.tone === 'primary'">
          <app-icon [name]="r.tone === 'primary' ? 'info' : 'trash'"></app-icon>
        </span>
        <h2>{{ r.title }}</h2>
        <p *ngIf="r.message">{{ r.message }}</p>
        <div class="cd-actions">
          <button type="button" class="btn btn-secondary" (click)="confirm.answer(false)">{{ r.cancelText || 'Annuler' }}</button>
          <button #confirmBtn type="button" class="btn" [class.btn-danger]="r.tone !== 'primary'" [class.btn-primary]="r.tone === 'primary'"
                  (click)="confirm.answer(true)">{{ r.confirmText || 'Supprimer' }}</button>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .cd-backdrop {
      position: fixed; inset: 0; z-index: 1200;
      background: rgba(15, 20, 30, 0.42);
      animation: cd-fade 0.15s ease-out;
    }
    .cd-box {
      position: fixed; z-index: 1201; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: min(420px, calc(100vw - 32px));
      padding: 26px 24px 20px;
      background: var(--surface); border-radius: 14px;
      box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.35);
      text-align: center;
      animation: cd-pop 0.18s cubic-bezier(.4, 0, .2, 1);
    }
    .cd-icon {
      width: 52px; height: 52px; margin: 0 auto 14px;
      display: grid; place-items: center; border-radius: 50%;
      background: var(--burgundy-50); color: var(--burgundy);
      box-shadow: 0 0 0 6px rgba(140, 28, 43, 0.06);
      font-size: 22px;
    }
    .cd-icon.primary { background: #e3ecfb; color: var(--navy); box-shadow: 0 0 0 6px rgba(61, 96, 220, 0.07); }
    h2 { margin: 0; font-size: 1.0625rem; font-weight: 700; color: var(--navy); line-height: 1.35; overflow-wrap: anywhere; }
    p { margin: 8px 0 0; font-size: 0.875rem; line-height: 1.5; color: var(--text-secondary); }
    .cd-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 22px; }
    .cd-actions .btn { height: 40px; justify-content: center; }
    .cd-actions .btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(140, 28, 43, 0.2); }
    .cd-actions .btn-primary:focus-visible { box-shadow: 0 0 0 3px rgba(61, 96, 220, 0.22); }
    @keyframes cd-fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes cd-pop { from { opacity: 0; transform: translate(-50%, -46%) scale(0.98); } to { opacity: 1; transform: translate(-50%, -50%); } }
  `]
})
export class ConfirmDialogComponent implements AfterViewChecked {
  @ViewChild('confirmBtn') private confirmBtn?: ElementRef<HTMLButtonElement>;
  private focused = false;

  constructor(public confirm: ConfirmService) {}

  /** Focus the main button when the dialog opens, so Enter confirms. */
  ngAfterViewChecked(): void {
    if (this.confirmBtn && !this.focused) {
      this.focused = true;
      this.confirmBtn.nativeElement.focus();
    } else if (!this.confirmBtn) {
      this.focused = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirm.request$.value) this.confirm.answer(false);
  }
}
