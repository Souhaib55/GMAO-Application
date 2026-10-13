import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ResourceService } from './services/resource.service';
import { Piece, PagedResult } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-resources',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  templateUrl: './resources-list.component.html',
  styleUrls: ['../../shared/styles/crud-table-design.scss']
})
export class ResourcesListComponent implements OnInit {
  private readonly confirmDialog = inject(ConfirmService);
  pieces: Piece[] = [];
  loading = true;
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  
  stats = { total: 0, lowStock: 0, critical: 0 };
  
  constructor(
    private resourceService: ResourceService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit(): void { this.loadPieces(); }
  
  loadPieces(): void {
    this.loading = true;
    this.resourceService.getPieces(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (result: PagedResult<Piece>) => {
        this.pieces = result.data;
        this.totalCount = result.totalCount;
        this.calculateStats();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }
  
  calculateStats(): void {
    this.stats = {
      total: this.totalCount,
      lowStock: this.pieces.filter(p => p.quantite_Stock < 10).length,
      critical: this.pieces.filter(p => p.criticitePiece?.niveauCriticitePiece === 'Critique').length
    };
  }
  
  search(): void {
    this.currentPage = 1;
    this.loadPieces();
  }
  
  getCriticiteClass(piece: Piece): string {
    const niveau = piece.criticitePiece?.niveauCriticitePiece?.toLowerCase();
    if (niveau?.includes('critique')) return 'status-danger';
    if (niveau?.includes('moyen')) return 'status-warning';
    return 'status-success';
  }
  
  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadPieces();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPieces();
    }
  }

  async deletePiece(id: number): Promise<void> {
    if (await this.confirmDialog.ask({ title: 'Supprimer cette pièce ?' })) {
      this.resourceService.deletePiece(id).subscribe({
        next: () => {
          this.notificationService.success('Succès', 'Pièce supprimée avec succès');
          this.loadPieces();
        },
        error: (err) => {
          this.notificationService.error('Erreur', 'Impossible de supprimer la pièce');
          console.error('Erreur lors de la suppression:', err);
        }
      });
    }
  }
}
