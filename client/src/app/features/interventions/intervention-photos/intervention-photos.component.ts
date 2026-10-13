import { Component, HostListener, Input, OnChanges, OnDestroy } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GmaoApiService, PieceJointeRow } from '../../../core/services/gmao-api.service';

interface Photo { id: number; name: string; url: string; }

/**
 * Photos attached to a work order (by the technician during the job, or by anyone
 * involved), shown as thumbnails next to the work report. A click opens the photo
 * full size. Formats a browser cannot display (HEIC, TIFF) stay in the documents list.
 */
@Component({
  selector: 'app-intervention-photos',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="photos" *ngIf="photos.length">
      <button type="button" class="thumb" *ngFor="let p of photos" (click)="open = p" [title]="p.name">
        <img [src]="p.url" [alt]="p.name">
      </button>
    </div>
    <div class="lightbox" *ngIf="open" (click)="open = null" role="dialog" aria-modal="true" [attr.aria-label]="open.name">
      <img [src]="open.url" [alt]="open.name" (click)="$event.stopPropagation()">
      <span class="caption">{{ open.name }}</span>
      <button type="button" class="close" (click)="open = null" aria-label="Fermer">×</button>
    </div>
  `,
  styles: [`
    .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .thumb {
      width: 88px; height: 88px; padding: 0; overflow: hidden; cursor: zoom-in;
      border: 1px solid var(--border); border-radius: 10px; background: var(--gray-50);
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .thumb:hover { border-color: var(--primary-400); box-shadow: 0 6px 14px -8px rgba(30, 70, 140, 0.45); }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .lightbox {
      position: fixed; inset: 0; z-index: 1300;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
      background: rgba(10, 14, 24, 0.82); padding: 24px; cursor: zoom-out;
    }
    .lightbox img { max-width: 92vw; max-height: 82vh; border-radius: 8px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); cursor: default; }
    .caption { color: #e5e9f2; font-size: 0.85rem; }
    .close {
      position: absolute; top: 16px; right: 20px; width: 38px; height: 38px; border-radius: 50%;
      border: 0; background: rgba(255, 255, 255, 0.14); color: #fff; font-size: 24px; line-height: 1; cursor: pointer;
    }
    .close:hover { background: rgba(255, 255, 255, 0.26); }
  `]
})
export class InterventionPhotosComponent implements OnChanges, OnDestroy {
  @Input() interventionId!: number;
  /** Change it to reload (e.g. the number of documents after an upload). */
  @Input() refresh: any;

  photos: Photo[] = [];
  open: Photo | null = null;
  private sub?: Subscription;

  constructor(private api: GmaoApiService) {}

  ngOnChanges(): void {
    if (this.interventionId) this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.revoke();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.open = null; }

  private static displayable(f: PieceJointeRow): boolean {
    return /^image\/(jpe?g|png|gif|bmp|webp|avif)$/i.test(f.contentType || '')
      || /\.(jpe?g|jfif|png|gif|bmp|webp|avif)$/i.test(f.nomFichier || '');
  }

  private load(): void {
    this.sub?.unsubscribe();
    this.sub = this.api.getPiecesJointes('Intervention', this.interventionId).subscribe({
      next: r => {
        const images = r.fichiers.filter(InterventionPhotosComponent.displayable);
        if (!images.length) { this.revoke(); this.photos = []; return; }
        this.sub = forkJoin(images.map(f => this.api.downloadPieceJointe(f.id).pipe(
          map(blob => ({ id: f.id, name: f.nomFichier, url: URL.createObjectURL(blob) }) as Photo),
          catchError(() => of(null))
        ))).subscribe(list => {
          this.revoke();
          this.photos = list.filter((p): p is Photo => !!p);
        });
      },
      error: () => { this.revoke(); this.photos = []; }
    });
  }

  private revoke(): void {
    this.photos.forEach(p => URL.revokeObjectURL(p.url));
  }
}
