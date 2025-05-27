import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
  fb = inject(FormBuilder);

  baseUrl = "https://localhost:5001/api/Stock";
  entitiesUrl = "https://localhost:5001/api/StockEntities";
  statusUrl = "https://localhost:5001/api/StockStatus";
  supplierUrl = "https://localhost:5001/api/StockSupplier";

  stockForm: FormGroup;
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
  isSubmitting: boolean = false;
  errorMessage: string = '';

  constructor() {
    this.stockForm = this.fb.group({
      code: ['', Validators.required],
      description: ['', Validators.required],
      stockEntitiesId: [null, Validators.required],
      stockStatusId: [null, Validators.required],
      stockSupplierId: [null, Validators.required],
      createdOn: [new Date(), Validators.required]
    });
  }

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
      next: (data) => {
        this.stockObj = { ...data, createdOn: new Date(data.createdOn) };
        this.updateFormWithStockData();
      },
      error: (err) => this.errorMessage = 'Failed to load stock'
    });
  }

  updateFormWithStockData() {
    this.stockForm.patchValue({
      code: this.stockObj.code,
      description: this.stockObj.description,
      stockEntitiesId: this.stockObj.stockEntitiesId,
      stockStatusId: this.stockObj.stockStatusId,
      stockSupplierId: this.stockObj.stockSupplierId,
      createdOn: new Date(this.stockObj.createdOn)
    });
  }

  onSubmit() {
    if (this.stockForm.invalid) {
      this.stockForm.markAllAsTouched();
      this.errorMessage = 'Please fill all required fields';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Update stockObj with form values
    const formValues = this.stockForm.value;
    this.stockObj = {
      ...this.stockObj,
      code: formValues.code,
      description: formValues.description,
      stockEntitiesId: formValues.stockEntitiesId,
      stockStatusId: formValues.stockStatusId,
      stockSupplierId: formValues.stockSupplierId,
      createdOn: formValues.createdOn
    };

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
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/admin/stock'], { state: { message: 'Stock created successfully!', type: 'success' } });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to create stock';
      }
    });
  }
  
  updateStock() {
    const updateStock = {
      id: this.stockObj.id,
      code: this.stockObj.code,
      description: this.stockObj.description,
      stockEntitiesId: this.stockObj.stockEntitiesId,
      stockStatusId: this.stockObj.stockStatusId,
      stockSupplierId: this.stockObj.stockSupplierId,
      createdOn: this.stockObj.createdOn
    };
    
    this.http.put(`${this.baseUrl}/${this.stockObj.id}`, updateStock).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/admin/stock'], { state: { message: 'Stock updated successfully!', type: 'success' } });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to update stock';
      }
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
    
    this.stockForm.reset({
      code: '',
      description: '',
      stockEntitiesId: null,
      stockStatusId: null,
      stockSupplierId: null,
      createdOn: new Date()
    });
  }

  // This method is kept for backward compatibility with the template
  // but the form validity is now primarily managed by the FormGroup
  isValidStock(): boolean {
    return this.stockForm.valid;
  }
}