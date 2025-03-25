import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';

@Component({
  selector: 'app-equipment',
  templateUrl: './equipment.component.html',
  styleUrls: ['./equipment.component.scss']
})
export class EquipmentComponent implements OnInit {
  http = inject(HttpClient);
  baseUrl = "https://localhost:5001/api/Equipment";

  equipmentList: any[] = [];
  equipmentObj: any = {
    id: 0,
    code: "",
    designation: ""
  };
  showModal: boolean = false;

  ngOnInit(): void {
    this.getAllEquipment();
  }

  getAllEquipment() {
    this.http.get(this.baseUrl).subscribe({
      next: (res: any) => {
        this.equipmentList = res;
      },
      error: (err) => {
        console.error('Error fetching equipment:', err);
      }
    });
  }

  openCreateModal() {
    this.resetForm();
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  onSave() {
    this.http.post(this.baseUrl, this.equipmentObj).subscribe({
      next: (res: any) => {
        this.getAllEquipment();
        this.closeModal();
        this.resetForm();
      },
      error: (err) => {
        console.error('Error creating equipment:', err);
      }
    });
  }

  onUpdate() {
    this.http.put(`${this.baseUrl}/${this.equipmentObj.id}`, this.equipmentObj).subscribe({
      next: (res: any) => {
        this.getAllEquipment();
        this.closeModal();
        this.resetForm();
      },
      error: (err) => {
        console.error('Error updating equipment:', err);
      }
    });
  }

  resetForm() {
    this.equipmentObj = {
      id: 0,
      code: "",
      designation: ""
    };
  }

  deleteEquipment(data: any) {
    this.http.delete(this.baseUrl + "/" + data.id).subscribe({
      next: () => {
        this.getAllEquipment();
      },
      error: (err) => {
        console.error('Error deleting equipment:', err);
      }
    });
  }

  editEquipment(data: any) {
    this.equipmentObj = { ...data };
    this.showModal = true;
  }
}