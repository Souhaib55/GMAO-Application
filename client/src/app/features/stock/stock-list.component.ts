import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StockService } from './services/stock.service';
import { Stock, PagedResult } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent],
  templateUrl: './stock-list.component.html',
  styleUrls: ['../../shared/styles/crud-table-design.scss']
})
export class StockListComponent implements OnInit {
  // Component stays the same - only template changes
  stocks: Stock[] = [];
  loading = true;
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  
  stats = { total: 0, actif: 0, low: 0 };
  
  constructor(
    private stockService: StockService,
    private notificationService: NotificationService
  ) {}
  
  ngOnInit(): void { this.loadStocks(); }
  
  loadStocks(): void {
    this.loading = true;
    this.stockService.getStocks(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (result: PagedResult<Stock>) => {
        this.stocks = result.data;
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
      actif: this.stocks.filter(s => !s.isDeleted).length,
      low: 0
    };
  }
  
  search(): void {
    this.currentPage = 1;
    this.loadStocks();
  }
  
  getStatusClass(stock: Stock): string {
    if (stock.stockStatus?.statusName?.toLowerCase().includes('disponible')) return 'status-success';
    if (stock.stockStatus?.statusName?.toLowerCase().includes('rupture')) return 'status-danger';
    return 'status-warning';
  }
  
  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadStocks();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadStocks();
    }
  }

  deleteStock(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce stock ?')) {
      this.stockService.deleteStock(id).subscribe({
        next: () => {
          this.notificationService.success('Succès', 'Stock supprimé avec succès');
          this.loadStocks();
        },
        error: (err) => {
          this.notificationService.error('Erreur', 'Impossible de supprimer le stock');
          console.error('Erreur lors de la suppression:', err);
        }
      });
    }
  }
}
