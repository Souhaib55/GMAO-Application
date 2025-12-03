import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EquipmentService } from './services/equipment.service';
import { Equipment, PagedResult, UserInfo } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './equipment.component.html',
  styleUrls: ['../../shared/styles/crud-table-design.scss']
})
export class EquipmentComponent implements OnInit {
  equipments: Equipment[] = [];
  loading = true;
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  currentUser: UserInfo | null = null;

  stats = {
    actif: 0,
    critique: 0,
    horsService: 0
  };

  constructor(
    private equipmentService: EquipmentService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    this.loadEquipments();
  }

  canShowActions(): boolean {
    // Only Superviseur can see actions
    return this.currentUser?.role === 'Superviseur';
  }

  canCreate(): boolean {
    // Only Superviseur can create
    return this.currentUser?.role === 'Superviseur';
  }

  loadEquipments(): void {
    this.loading = true;
    this.equipmentService.getEquipments(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (result: PagedResult<Equipment>) => {
        this.equipments = result.data;
        this.totalCount = result.totalCount;
        this.calculateStats();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats = {
      actif: this.equipments.filter(e => e.etat?.nomEtat?.toLowerCase().includes('actif') || 
             e.etat?.nomEtat?.toLowerCase().includes('bon')).length,
      critique: this.equipments.filter(e => e.criticite?.nomCriticite?.toLowerCase().includes('critique') ||
                e.criticite?.nomCriticite?.toLowerCase().includes('haute')).length,
      horsService: this.equipments.filter(e => e.etat?.nomEtat?.toLowerCase().includes('hors') ||
                   e.etat?.nomEtat?.toLowerCase().includes('panne')).length
    };
  }

  search(): void {
    this.currentPage = 1;
    this.loadEquipments();
  }

  getEtatClass(equipment: Equipment): string {
    const etat = equipment.etat?.nomEtat?.toLowerCase() || '';
    if (etat.includes('actif') || etat.includes('bon')) return 'status-success';
    if (etat.includes('maintenance')) return 'status-warning';
    if (etat.includes('hors') || etat.includes('panne')) return 'status-danger';
    return 'status-primary';
  }

  getCriticiteClass(equipment: Equipment): string {
    const criticite = equipment.criticite?.nomCriticite?.toLowerCase() || '';
    if (criticite.includes('critique') || criticite.includes('haute')) return 'status-danger';
    if (criticite.includes('moyenne') || criticite.includes('moyen')) return 'status-warning';
    if (criticite.includes('basse') || criticite.includes('faible')) return 'status-normal';
    return 'status-normal';
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadEquipments();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadEquipments();
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  deleteEquipment(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet équipement ?')) {
      this.equipmentService.deleteEquipment(id).subscribe({
        next: () => {
          this.notificationService.success('Succès', 'Équipement supprimé avec succès');
          this.loadEquipments();
        },
        error: (err) => {
          this.notificationService.error('Erreur', 'Impossible de supprimer l\'équipement');
          console.error('Erreur lors de la suppression:', err);
        }
      });
    }
  }
}
