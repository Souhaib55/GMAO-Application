import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
//import { Stock, StockEntities, StockStatus, StockSupplier } from './stock.interfaces';

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

    currentPage: number = 1;
    pageSize: number = 5;
    totalCount: number = 0;
    totalPages: number = 1;
    pageSizeOptions: number[] = [5, 10, 15];

    ngOnInit(): void {
        const state = history.state;
        if (state && state.message) {
            this.popupMessage = state.message;
            this.popupType = state.type || 'success';
            this.showPopup = true;
            setTimeout(() => this.hidePopup(), 3000);
        }
        this.getAllStock();
        this.getStockEntities();
        this.getStockStatuses();
        this.getStockSuppliers();
    }

    getAllStock() {
        const url = `${this.baseUrl}?page=${this.currentPage}&pageSize=${this.pageSize}`;
        this.http.get<any>(url).subscribe({
            next: (res: any) => {
                this.paginatedStockList = res.data;
                this.totalCount = res.totalCount;
                this.totalPages = Math.ceil(this.totalCount / this.pageSize);
            },
            error: (err) => this.showError('Failed to fetch stock')
        });
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

    navigateToCreate() {
        this.router.navigate(['/stock/create']);
    }

    navigateToEdit(id: number) {
        this.router.navigate(['/stock/edit', id]);
    }

    deleteStock(data: Stock) {
        if (!confirm(`Delete ${data.code} - ${data.description}?`)) return;
        this.http.delete(`${this.baseUrl}/${data.id}`).subscribe({
            next: () => {
                this.getAllStock();
                this.showSuccess('Stock deleted successfully!');
            },
            error: (err) => this.showError('Failed to delete stock')
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
