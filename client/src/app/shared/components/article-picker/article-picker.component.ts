import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ArticleRow, GmaoApiService } from '../../../core/services/gmao-api.service';

/** Type-ahead search in the store catalogue; free text is allowed for off-catalogue lines. */
@Component({
  selector: 'gm-article-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="picker">
      <input [(ngModel)]="text" (input)="onInput()" (focus)="open = true" (blur)="close()" [placeholder]="placeholder" autocomplete="off" maxlength="150">
      <div class="list" *ngIf="open && results.length">
        <button type="button" *ngFor="let a of results" (mousedown)="choose(a)">
          <span><b>{{ a.designation }}</b><small>{{ a.codePiece }} · {{ a.fournisseur || 'sans fournisseur' }}</small></span>
          <span class="stock">{{ a.quantite_Stock }} {{ a.unite }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .picker { position: relative; }
    input { height: 34px; }
    .list { position: absolute; top: 100%; left: 0; right: 0; z-index: 30; margin-top: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-lg); max-height: 260px; overflow-y: auto; min-width: 280px; }
    button { width: 100%; display: flex; justify-content: space-between; gap: 10px; align-items: center; padding: 7px 10px; border: 0; background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; }
    button:hover { background: var(--primary-50); }
    span:first-child { display: flex; flex-direction: column; min-width: 0; }
    b { font-size: 0.8125rem; font-weight: 600; }
    small { font-size: 0.72rem; color: var(--text-muted); }
    .stock { font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; }
  `]
})
export class ArticlePickerComponent implements OnDestroy {
  @Input() text = '';
  @Input() placeholder = 'Article du magasin ou désignation libre…';
  @Output() textChange = new EventEmitter<string>();
  @Output() picked = new EventEmitter<ArticleRow>();

  results: ArticleRow[] = [];
  open = false;
  private term$ = new Subject<string>();
  private sub: Subscription;

  constructor(private api: GmaoApiService) {
    this.sub = this.term$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(t => t.trim().length < 2 ? of({ data: [] as ArticleRow[] }) : this.api.getArticles({ search: t, pageSize: 8 }).pipe(catchError(() => of({ data: [] as ArticleRow[] }))))
    ).subscribe((r: any) => this.results = r.data);
  }

  onInput(): void {
    this.open = true;
    this.textChange.emit(this.text);
    this.term$.next(this.text);
  }

  choose(a: ArticleRow): void {
    this.text = a.designation;
    this.textChange.emit(this.text);
    this.picked.emit(a);
    this.results = [];
    this.open = false;
  }

  close(): void {
    setTimeout(() => this.open = false, 150);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
