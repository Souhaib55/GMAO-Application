import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-equipment-button',
  templateUrl: './equipment-button.component.html',
  styleUrls: ['./equipment-button.component.scss']
})
export class EquipmentButtonComponent implements OnInit {
  http = inject(HttpClient);
  route = inject(ActivatedRoute);
  router = inject(Router);

  baseUrl = "https://localhost:5001/api/Equipment";
  familleBaseUrl = "https://localhost:5001/api/FamilleEquipment";
  criticiteBaseUrl = "https://localhost:5001/api/EquipmentCriticite";

  equipmentObj: Equipment = {
    id: 0,
    code: "",
    designation: "",
    familleEquipmentId: 0,
    equipmentCriticiteId: 0,
    createdOn: new Date()
  };
  familleList: FamilleEquipment[] = [];
  criticiteList: EquipmentCriticite[] = [];
  isEditMode: boolean = false;
  errorMessage: string = '';

  ngOnInit(): void {
    this.getFamilleEquipments();
    this.getEquipmentCriticites();
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.loadEquipment(+id);
      } else {
        this.isEditMode = false;
        this.resetForm();
      }
    });
  }

  getFamilleEquipments() {
    this.http.get<FamilleEquipment[]>(this.familleBaseUrl).subscribe({
      next: (res) => this.familleList = res,
      error: (err) => this.errorMessage = 'Failed to fetch families'
    });
  }

  getEquipmentCriticites() {
    this.http.get<EquipmentCriticite[]>(this.criticiteBaseUrl).subscribe({
      next: (res) => this.criticiteList = res,
      error: (err) => this.errorMessage = 'Failed to fetch criticites'
    });
  }

  loadEquipment(id: number) {
    this.http.get<Equipment>(`${this.baseUrl}/${id}`).subscribe({
      next: (data) => this.equipmentObj = { ...data, createdOn: new Date(data.createdOn!) },
      error: (err) => this.errorMessage = 'Failed to load equipment'
    });
  }

  onSubmit() {
    if (!this.isValidEquipment()) {
      this.errorMessage = 'Please fill all required fields';
      return;
    }
    this.errorMessage = '';
    if (this.isEditMode) {
      this.updateEquipment();
    } else {
      this.createEquipment();
    }
  }

  createEquipment() {
    const newEquipment = {
      code: this.equipmentObj.code,
      designation: this.equipmentObj.designation,
      familleEquipmentId: Number(this.equipmentObj.familleEquipmentId),
      equipmentCriticiteId: Number(this.equipmentObj.equipmentCriticiteId),
      createdOn: this.equipmentObj.createdOn
    };
    this.http.post<Equipment>(this.baseUrl, newEquipment).subscribe({
      next: () => {
        this.router.navigate(['/admin/equipment'], { state: { message: 'Equipment created successfully!', type: 'success' } });
      },
      error: (err) => this.errorMessage = err.error?.message || 'Failed to create equipment'
    });
  }

  updateEquipment() {
    const updateEquipment = {
      id: this.equipmentObj.id,
      code: this.equipmentObj.code,
      designation: this.equipmentObj.designation,
      familleEquipmentId: Number(this.equipmentObj.familleEquipmentId),
      equipmentCriticiteId: Number(this.equipmentObj.equipmentCriticiteId),
      createdOn: this.equipmentObj.createdOn
    };
    this.http.put(`${this.baseUrl}/${this.equipmentObj.id}`, updateEquipment).subscribe({
      next: () => {
        this.router.navigate(['/admin/equipment'], { state: { message: 'Equipment updated successfully!', type: 'success' } });
      },
      error: (err) => this.errorMessage = err.error?.message || 'Failed to update equipment'
    });
  }

  goBack() {
    this.router.navigate(['/admin/equipment']);
  }

  resetForm() {
    this.equipmentObj = {
      id: 0,
      code: "",
      designation: "",
      familleEquipmentId: 0,
      equipmentCriticiteId: 0,
      createdOn: new Date()
    };
  }

  isValidEquipment(): boolean {
    return !!this.equipmentObj.code?.trim() &&
           !!this.equipmentObj.designation?.trim() &&
           this.equipmentObj.familleEquipmentId > 0 &&
           this.equipmentObj.equipmentCriticiteId > 0 &&
           !!this.equipmentObj.createdOn;
  }
}

interface Equipment {
  id: number;
  code: string;
  designation: string;
  familleEquipmentId: number;
  equipmentCriticiteId: number;
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