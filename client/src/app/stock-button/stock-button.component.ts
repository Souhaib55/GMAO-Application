import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Stock, StockEntities, StockStatus, StockSupplier } from 'app/stock/stock.component';

@Component({
    selector: 'app-stock-button',
    templateUrl: './stock-button.component.html',
    styleUrls: ['./stock-button.component.scss']
})
export class StockButtonComponent implements OnInit {
    http = inject(HttpClient);
    route = inject(ActivatedRoute);
    router = inject(Router);

    baseUrl = "https://localhost:5001/api/Stock";
    entitiesUrl = "https://localhost:5001/api/StockEntities";
    statusUrl = "https://localhost:5001/api/StockStatus";
    supplierUrl = "https://localhost:5001/api/StockSupplier";

    stockObj: Stock = {
        id: 0,
        code: "",
        description: "",
        stockEntitiesId: 0,
        stockStatusId: 0,
        stockSupplierId: 0,
        createdOn: new Date(),
        isDeleted: false
    };
    entitiesList: StockEntities[] = [];
    statusList: StockStatus[] = [];
    supplierList: StockSupplier[] = [];
    isEditMode: boolean = false;
    errorMessage: string = '';

    ngOnInit(): void {
        this.getStockEntities();
        this.getStockStatuses();
        this.getStockSuppliers();
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.isEditMode = true;
                this.loadStock(+id);
            } else {
                this.isEditMode = false;
                this.resetForm();
            }
        });
    }

    getStockEntities() {
        this.http.get<StockEntities[]>(this.entitiesUrl).subscribe({
            next: (res) => this.entitiesList = res,
            error: (err) => this.errorMessage = 'Failed to fetch entities'
        });
    }

    getStockStatuses() {
        this.http.get<StockStatus[]>(this.statusUrl).subscribe({
            next: (res) => this.statusList = res,
            error: (err) => this.errorMessage = 'Failed to fetch statuses'
        });
    }

    getStockSuppliers() {
        this.http.get<StockSupplier[]>(this.supplierUrl).subscribe({
            next: (res) => this.supplierList = res,
            error: (err) => this.errorMessage = 'Failed to fetch suppliers'
        });
    }

    loadStock(id: number) {
        this.http.get<Stock>(`${this.baseUrl}/${id}`).subscribe({
            next: (data) => this.stockObj = { ...data, createdOn: new Date(data.createdOn) },
            error: (err) => this.errorMessage = 'Failed to load stock'
        });
    }

    onSubmit() {
        if (!this.isValidStock()) {
            this.errorMessage = 'Please fill all required fields';
            return;
        }
        this.errorMessage = '';
        if (this.isEditMode) {
            this.updateStock();
        } else {
            this.createStock();
        }
    }

    createStock() {
        const newStock = {
            code: this.stockObj.code,
            description: this.stockObj.description,
            stockEntitiesId: this.stockObj.stockEntitiesId,
            stockStatusId: this.stockObj.stockStatusId,
            stockSupplierId: this.stockObj.stockSupplierId,
            createdOn: this.stockObj.createdOn
          };
        this.http.post<Stock>(this.baseUrl, newStock).subscribe({
            next: () => this.router.navigate(['/admin/stock'], { state: { message: 'Stock created successfully!', type: 'success' } }),
            error: (err) => this.errorMessage = err.error?.message || 'Failed to create stock'
        });
    }
    
    updateStock() {
        const updateStock = {
            id: this.stockObj.id,
            code: this.stockObj.code,                   // lowercase first letter
            description: this.stockObj.description,     // lowercase first letter
            stockEntitiesId: this.stockObj.stockEntitiesId,
            stockStatusId: this.stockObj.stockStatusId,
            stockSupplierId: this.stockObj.stockSupplierId,
            createdOn: this.stockObj.createdOn
        };
        this.http.put(`${this.baseUrl}/${this.stockObj.id}`, updateStock).subscribe({
            next: () => this.router.navigate(['/admin/stock'], { state: { message: 'Stock updated successfully!', type: 'success' } }),
            error: (err) => this.errorMessage = err.error?.message || 'Failed to update stock'
        });
    }

    goBack() {
        this.router.navigate(['/admin/stock']);
    }

    resetForm() {
        this.stockObj = {
            id: 0,
            code: "",
            description: "",
            stockEntitiesId: 0,
            stockStatusId: 0,
            stockSupplierId: 0,
            createdOn: new Date(),
            isDeleted: false
        };
    }

    isValidStock(): boolean {
        return !!this.stockObj.code?.trim() &&
               !!this.stockObj.description?.trim() &&
               this.stockObj.stockEntitiesId > 0 &&
               this.stockObj.stockStatusId > 0 &&
               this.stockObj.stockSupplierId > 0 &&
               !!this.stockObj.createdOn;
    }
}