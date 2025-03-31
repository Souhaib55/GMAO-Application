import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-equipment',
  templateUrl: './equipment.component.html',
  styleUrls: ['./equipment.component.scss'],
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
export class EquipmentComponent implements OnInit {
  http = inject(HttpClient);

  // API endpoints
  baseUrl = "https://localhost:5001/api/Equipment";
  familleBaseUrl = "https://localhost:5001/api/FamilleEquipment";
  criticiteBaseUrl = "https://localhost:5001/api/EquipmentCriticite";

  // Data properties
  equipmentList: Equipment[] = [];
  paginatedEquipmentList: Equipment[] = [];
  familleList: FamilleEquipment[] = [];
  criticiteList: EquipmentCriticite[] = [];
  
  // Form object
  equipmentObj: Equipment = {
    id: 0,
    code: "",
    designation: "",
    familleEquipmentId: 0,
    equipmentCriticiteId: 0,
  };

  // UI control properties
  showModal: boolean = false;
  showPopup: boolean = false;
  popupMessage: string = '';
  popupType: 'success' | 'error' = 'success';

  // Pagination properties
  currentPage: number = 1;
  pageSize: number = 5;
  totalCount: number = 0;
  totalPages: number = 1;
  pageSizeOptions: number[] = [5, 10, 15];

  ngOnInit(): void {
    this.getAllEquipment();
    this.getFamilleEquipments();
    this.getEquipmentCriticites();
  }

  // Data fetching methods
  getAllEquipment() {
    const url = `${this.baseUrl}?page=${this.currentPage}&pageSize=${this.pageSize}`;
    this.http.get<any>(url).subscribe({
      next: (res: any) => {
        this.paginatedEquipmentList = res.data;
        this.totalCount = res.totalCount;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize);
      },
      error: (err) => {
        this.showError('Failed to fetch equipment');
        console.error('Error fetching equipment:', err);
      }
    });
  }

  getFamilleEquipments() {
    this.http.get<FamilleEquipment[]>(this.familleBaseUrl).subscribe({
      next: (res: FamilleEquipment[]) => {
        this.familleList = res;
      },
      error: (err) => {
        this.showError('Failed to fetch families');
        console.error('Error fetching families:', err);
      }
    });
  }

  getEquipmentCriticites() {
    this.http.get<EquipmentCriticite[]>(this.criticiteBaseUrl).subscribe({
      next: (res: EquipmentCriticite[]) => {
        this.criticiteList = res;
      },
      error: (err) => {
        this.showError('Failed to fetch criticites');
        console.error('Error fetching criticites:', err);
      }
    });
  }

  // Pagination methods
  changePageSize(): void {
    this.currentPage = 1;
    this.getAllEquipment();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getAllEquipment();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getAllEquipment();
    }
  }

  // Modal methods
  openCreateModal() {
    this.resetForm();
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  // CRUD operations
  onSave() {
    if (!this.isValidEquipment()) {
      this.showError('Please fill all required fields');
      return;
    }

    const newEquipment = {
      code: this.equipmentObj.code,
      designation: this.equipmentObj.designation,
      familleEquipmentId: Number(this.equipmentObj.familleEquipmentId),
      equipmentCriticiteId: Number(this.equipmentObj.equipmentCriticiteId)
    };

    this.http.post<Equipment>(this.baseUrl, newEquipment).subscribe({
      next: () => {
        this.getAllEquipment();
        this.closeModal();
        this.resetForm();
        this.showSuccess('Equipment created successfully!');
      },
      error: (err) => {
        this.handleError(err, 'create equipment');
      }
    });
  }

  onUpdate() {
    if (!this.isValidEquipment()) {
      this.showError('Please fill all required fields');
      return;
    }

    const updateEquipment = {
      id: this.equipmentObj.id,
      code: this.equipmentObj.code,
      designation: this.equipmentObj.designation,
      familleEquipmentId: Number(this.equipmentObj.familleEquipmentId),
      equipmentCriticiteId: Number(this.equipmentObj.equipmentCriticiteId)
    };

    this.http.put(`${this.baseUrl}/${this.equipmentObj.id}`, updateEquipment).subscribe({
      next: () => {
        this.getAllEquipment();
        this.closeModal();
        this.resetForm();
        this.showSuccess('Equipment updated successfully!');
      },
      error: (err) => {
        this.handleError(err, 'update equipment');
      }
    });
  }

  deleteEquipment(data: Equipment) {
    if (!confirm(`Delete ${data.code} - ${data.designation}?`)) return;

    this.http.delete(`${this.baseUrl}/${data.id}`).subscribe({
      next: () => {
        this.getAllEquipment();
        this.showSuccess('Equipment deleted successfully!');
      },
      error: (err) => {
        this.handleError(err, 'delete equipment');
      }
    });
  }

  editEquipment(data: Equipment) {
    this.equipmentObj = { ...data };
    this.showModal = true;
  }

  // Form methods
  resetForm() {
    this.equipmentObj = {
      id: 0,
      code: "",
      designation: "",
      familleEquipmentId: 0,
      equipmentCriticiteId: 0
    };
  }

  isValidEquipment(): boolean {
    return !!this.equipmentObj.code?.trim() &&
           !!this.equipmentObj.designation?.trim() &&
           this.equipmentObj.familleEquipmentId > 0 &&
           this.equipmentObj.equipmentCriticiteId > 0;
  }

  // Popup methods
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

  private handleError(err: any, operation: string): void {
    console.error(`Error ${operation}:`, err);
    const errorMessage = err.error?.message || `Failed to ${operation}`;
    this.showError(errorMessage);
  }
}

// Interfaces
interface Equipment {
  id: number;
  code: string;
  designation: string;
  familleEquipmentId: number;
  familleEquipment?: { id: number; libelleFamille: string };
  equipmentCriticiteId: number;
  equipmentCriticite?: { id: number; criticiteLevel: string };
}

interface FamilleEquipment {
  id: number;
  libelleFamille: string;
}

interface EquipmentCriticite {
  id: number;
  criticiteLevel: string;
}