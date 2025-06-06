import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
    selector: 'app-stock',
    templateUrl: './stock.component.html',
    styleUrls: ['./stock.component.scss'],
    animations: [
        trigger('slideInOut', [
            transition(':enter', [
                style({ transform: 'translateX(100%)', opacity: 0 }),
                animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
            ])
        ])
    ]
})
export class StockComponent implements OnInit {
    http = inject(HttpClient);
    router = inject(Router);

    baseUrl = "https://localhost:5001/api/Stock";
    entitiesUrl = "https://localhost:5001/api/StockEntities";
    statusUrl = "https://localhost:5001/api/StockStatus";
    supplierUrl = "https://localhost:5001/api/StockSupplier";

    stockList: Stock[] = [];
    paginatedStockList: Stock[] = [];
    entitiesList: StockEntities[] = [];
    statusList: StockStatus[] = [];
    supplierList: StockSupplier[] = [];

    showPopup: boolean = false;
    popupMessage: string = '';
    popupType: 'success' | 'error' = 'success';
    isLoading: boolean = false;
    searchTerm: string = '';

    currentPage: number = 1;
    pageSize: number = 5;
    totalCount: number = 0;
    totalPages: number = 1;
    pageSizeOptions: number[] = [5, 10, 15];

    private searchSubject = new Subject<string>();

    ngOnInit(): void {
        const state = history.state;
        if (state && state.message) {
            this.popupMessage = state.message;
            this.popupType = state.type || 'success';
            this.showPopup = true;
            setTimeout(() => this.hidePopup(), 3000);
        }

        this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
            this.filterItems();
        });

        this.getAllStock();
        this.getStockEntities();
        this.getStockStatuses();
        this.getStockSuppliers();
    }

    getAllStock() {
        this.isLoading = true;
        let url = `${this.baseUrl}?page=${this.currentPage}&pageSize=${this.pageSize}`;
        
        if (this.searchTerm.trim()) {
            url += `&search=${encodeURIComponent(this.searchTerm.trim())}`;
        }

        this.http.get<any>(url).subscribe({
            next: (res: any) => {
                this.paginatedStockList = res.data;
                this.totalCount = res.totalCount;
                this.totalPages = Math.ceil(this.totalCount / this.pageSize);
                this.isLoading = false;
            },
            error: (err) => {
                this.showError('Failed to fetch stock');
                this.isLoading = false;
            }
        });
    }

    applyFilter(): void {
        this.searchSubject.next(this.searchTerm);
    }

    filterItems(): void {
        this.currentPage = 1;
        this.getAllStock();
    }

    getStockEntities() {
        this.http.get<StockEntities[]>(this.entitiesUrl).subscribe({
            next: (res) => this.entitiesList = res,
            error: (err) => this.showError('Failed to fetch entities')
        });
    }

    getStockStatuses() {
        this.http.get<StockStatus[]>(this.statusUrl).subscribe({
            next: (res) => this.statusList = res,
            error: (err) => this.showError('Failed to fetch statuses')
        });
    }

    getStockSuppliers() {
        this.http.get<StockSupplier[]>(this.supplierUrl).subscribe({
            next: (res) => this.supplierList = res,
            error: (err) => this.showError('Failed to fetch suppliers')
        });
    }

    changePageSize(): void {
        this.currentPage = 1;
        this.getAllStock();
    }

    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.getAllStock();
        }
    }

    nextPage(): void {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.getAllStock();
        }
    }

    goToPage(page: number): void {
        if (page !== this.currentPage && page > 0 && page <= this.totalPages) {
            this.currentPage = page;
            this.getAllStock();
        }
    }

    getPageNumbers(): number[] {
        const pages: number[] = [];
        const maxVisiblePages = 3;
        
        if (this.totalPages <= maxVisiblePages) {
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(this.currentPage);
            if (this.currentPage > 1) {
                pages.unshift(this.currentPage - 1);
            }
            if (this.currentPage < this.totalPages) {
                pages.push(this.currentPage + 1);
            }
            while (pages.length < maxVisiblePages && pages.length < this.totalPages) {
                if (pages[0] > 1) {
                    pages.unshift(pages[0] - 1);
                } else if (pages[pages.length - 1] < this.totalPages) {
                    pages.push(pages[pages.length - 1] + 1);
                }
            }
        }
        return pages;
    }

    navigateToCreate() {
        this.router.navigate(['/stock/create']);
    }

    navigateToEdit(id: number) {
        this.router.navigate(['/stock/edit', id]);
    }

    deleteStock(data: Stock) {
        if (!confirm(`Delete ${data.code} - ${data.description}?`)) return;
        this.isLoading = true;
        this.http.delete(`${this.baseUrl}/${data.id}`).subscribe({
            next: () => {
                this.getAllStock();
                this.showSuccess('Stock deleted successfully!');
            },
            error: (err) => {
                this.showError('Failed to delete stock');
                this.isLoading = false;
            }
        });
    }

    private showSuccess(message: string): void {
        this.popupMessage = message;
        this.popupType = 'success';
        this.showPopup = true;
        setTimeout(() => this.hidePopup(), 3000);
    }

    private showError(message: string): void {
        this.popupMessage = message;
        this.popupType = 'error';
        this.showPopup = true;
        setTimeout(() => this.hidePopup(), 3000);
    }

    hidePopup(): void {
        this.showPopup = false;
    }
}

export interface Stock {
  id: number;
  code: string;
  description: string;
  stockEntitiesId: number;
  stockEntities?: StockEntities;
  stockStatusId: number;
  stockStatus?: StockStatus;
  stockSupplierId: number;
  stockSupplier?: StockSupplier;
  createdOn: Date;
  isDeleted: boolean;
}

export interface StockEntities {
  id: number;
  name: string;
}

export interface StockStatus {
  id: number;
  status: string;
}

export interface StockSupplier {
  id: number;
  supplierName: string;
}