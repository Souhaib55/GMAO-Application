import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';

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

@Component({
    selector: 'app-equipment',
    templateUrl: './equipment.component.html',
    styleUrls: ['./equipment.component.scss']
})
export class EquipmentComponent implements OnInit {
    http = inject(HttpClient);

    baseUrl = "https://localhost:5001/api/Equipment";
    familleBaseUrl = "https://localhost:5001/api/FamilleEquipment";
    criticiteBaseUrl = "https://localhost:5001/api/EquipmentCriticite";

    equipmentList: Equipment[] = [];
    familleList: FamilleEquipment[] = [];
    criticiteList: EquipmentCriticite[] = [];
    equipmentObj: Equipment = {
        id: 0,
        code: "",
        designation: "",
        familleEquipmentId: 0,
        equipmentCriticiteId: 0
    };
    showModal: boolean = false;

    ngOnInit(): void {
        this.getAllEquipment();
        this.getFamilleEquipments();
        this.getEquipmentCriticites();
    }

    getAllEquipment() {
        this.http.get<Equipment[]>(this.baseUrl).subscribe({
            next: (res: Equipment[]) => {
                this.equipmentList = res;
                console.log('Fetched equipment:', res);
            },
            error: (err) => {
                console.error('Error fetching equipment:', err.status, err.statusText, err.error);
                alert(`Failed to fetch equipment: ${err.status} - ${err.statusText || 'Server error'}`);
            }
        });
    }

    getFamilleEquipments() {
        this.http.get<FamilleEquipment[]>(this.familleBaseUrl).subscribe({
            next: (res: FamilleEquipment[]) => {
                this.familleList = res;
                console.log('Fetched famille equipments:', res);
            },
            error: (err) => {
                console.error('Error fetching famille equipments:', err.status, err.statusText, err.error);
                alert(`Failed to fetch famille equipments: ${err.status} - ${err.statusText || 'Server error'}`);
            }
        });
    }

    getEquipmentCriticites() {
        this.http.get<EquipmentCriticite[]>(this.criticiteBaseUrl).subscribe({
            next: (res: EquipmentCriticite[]) => {
                this.criticiteList = res;
                console.log('Fetched equipment criticites:', res);
            },
            error: (err) => {
                console.error('Error fetching equipment criticites:', err.status, err.statusText, err.error);
                alert(`Failed to fetch equipment criticites: ${err.status} - ${err.statusText || 'Server error'}`);
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
        if (!this.isValidEquipment()) {
            alert('Please fill in all required fields: Code, Designation, Family, and Criticite.');
            return;
        }

        const newEquipment = {
            code: this.equipmentObj.code,
            designation: this.equipmentObj.designation,
            familleEquipmentId: Number(this.equipmentObj.familleEquipmentId),
            equipmentCriticiteId: Number(this.equipmentObj.equipmentCriticiteId)
        };

        console.log('Sending new equipment:', newEquipment);

        this.http.post<Equipment>(this.baseUrl, newEquipment).subscribe({
            next: (res: Equipment) => {
                this.getAllEquipment();
                this.closeModal();
                this.resetForm();
                alert('Equipment created successfully!');
            },
            error: (err) => {
                console.error('Error creating equipment:', err.status, err.statusText, err.error);
                const errorMessage = this.getErrorMessage(err);
                alert(`Failed to create equipment: ${errorMessage}`);
            }
        });
    }

    onUpdate() {
        if (!this.isValidEquipment()) {
            alert('Please fill in all required fields: Code, Designation, Family, and Criticite.');
            return;
        }

        const updateEquipment = {
            id: this.equipmentObj.id,
            code: this.equipmentObj.code,
            designation: this.equipmentObj.designation,
            familleEquipmentId: Number(this.equipmentObj.familleEquipmentId),
            equipmentCriticiteId: Number(this.equipmentObj.equipmentCriticiteId)
        };

        console.log('Sending updated equipment:', updateEquipment);

        this.http.put(`${this.baseUrl}/${this.equipmentObj.id}`, updateEquipment).subscribe({
            next: () => {
                this.getAllEquipment();
                this.closeModal();
                this.resetForm();
                alert('Equipment updated successfully!');
            },
            error: (err) => {
                console.error('Error updating equipment:', err.status, err.statusText, err.error);
                const errorMessage = this.getErrorMessage(err);
                alert(`Failed to update equipment: ${errorMessage}`);
            }
        });
    }

    deleteEquipment(data: Equipment) {
        if (!confirm(`Are you sure you want to delete ${data.code} - ${data.designation}?`)) {
            return;
        }

        this.http.delete(`${this.baseUrl}/${data.id}`).subscribe({
            next: () => {
                this.getAllEquipment();
                alert('Equipment deleted successfully!');
            },
            error: (err) => {
                console.error('Error deleting equipment:', err.status, err.statusText, err.error);
                alert(`Failed to delete equipment: ${err.status} - ${err.statusText || 'Server error'}`);
            }
        });
    }

    editEquipment(data: Equipment) {
        this.equipmentObj = { ...data };
        this.showModal = true;
    }

    resetForm() {
        this.equipmentObj = {
            id: 0,
            code: "",
            designation: "",
            familleEquipmentId: 0,
            equipmentCriticiteId: 0
        };
    }

    public isValidEquipment(): boolean {
        return !!this.equipmentObj.code &&
               !!this.equipmentObj.designation &&
               this.equipmentObj.familleEquipmentId > 0 &&
               this.equipmentObj.equipmentCriticiteId > 0;
    }

    private getErrorMessage(err: any): string {
        if (err.status === 400 && err.error?.errors) {
            const errors = err.error.errors;
            if (errors.FamilleEquipment) {
                return `Invalid Family ID: ${this.equipmentObj.familleEquipmentId}`;
            }
            if (errors.EquipmentCriticite) {
                return `Invalid Criticite ID: ${this.equipmentObj.equipmentCriticiteId}`;
            }
            return Object.values(errors).join(', ');
        }
        return `${err.status} - ${err.statusText || 'Server error'}`;
    }
}
