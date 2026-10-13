import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  /** What will happen, in plain words. */
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** 'danger' for deletions (default), 'primary' for other confirmations. */
  tone?: 'danger' | 'primary';
}

export interface ConfirmRequest extends ConfirmOptions {
  resolve: (answer: boolean) => void;
}

/**
 * The application's confirmation dialog (replaces the browser's confirm(),
 * which shows "localhost says…"). Usage:
 *
 *   if (!(await this.confirmDialog.ask({ title: 'Supprimer cet équipement ?' }))) return;
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request$ = new BehaviorSubject<ConfirmRequest | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise(resolve => {
      this.request$.value?.resolve(false);
      this.request$.next({ ...options, resolve });
    });
  }

  answer(confirmed: boolean): void {
    const request = this.request$.value;
    this.request$.next(null);
    request?.resolve(confirmed);
  }
}
