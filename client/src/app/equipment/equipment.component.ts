import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
  router = inject(Router);

  baseUrl = "https://localhost:5001/api/Equipment";
  familleBaseUrl = "https://localhost:5001/api/FamilleEquipment";
  criticiteBaseUrl = "https://localhost:5001/api/EquipmentCriticite";

  equipmentList: Equipment[] = [];
  paginatedEquipmentList: Equipment[] = [];
  familleList: FamilleEquipment[] = [];
  criticiteList: EquipmentCriticite[] = [];

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
    this.getAllEquipment();
    this.getFamilleEquipments();
    this.getEquipmentCriticites();
  }

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
      next: (res) => this.familleList = res,
      error: (err) => this.showError('Failed to fetch families')
    });
  }

  getEquipmentCriticites() {
    this.http.get<EquipmentCriticite[]>(this.criticiteBaseUrl).subscribe({
      next: (res) => this.criticiteList = res,
      error: (err) => this.showError('Failed to fetch criticites')
    });
  }

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

  navigateToCreate() {
    this.router.navigate(['/equipment/create']);
  }

  navigateToEdit(id: number) {
    this.router.navigate(['/equipment/edit', id]);
  }

  deleteEquipment(data: Equipment) {
    if (!confirm(`Delete ${data.code} - ${data.designation}?`)) return;
    this.http.delete(`${this.baseUrl}/${data.id}`).subscribe({
      next: () => {
        this.getAllEquipment();
        this.showSuccess('Equipment deleted successfully!');
      },
      error: (err) => this.handleError(err, 'delete equipment')
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

  private handleError(err: any, operation: string): void {
    console.error(`Error ${operation}:`, err);
    this.showError(err.error?.message || `Failed to ${operation}`);
  }
}

interface Equipment {
  id: number;
  code: string;
  designation: string;
  familleEquipmentId: number;
  familleEquipment?: { id: number; libelleFamille: string };
  equipmentCriticiteId: number;
  equipmentCriticite?: { id: number; criticiteLevel: string };
  createdOn?: Date;
}

interface FamilleEquipment {
  id: number;
  libelleFamille: string;
}

interface EquipmentCriticite {
  id: number;
  criticiteLevel: string;
}