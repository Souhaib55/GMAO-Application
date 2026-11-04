import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { debouncer, errorMessage, exportCsv, isoDate } from '../../shared/utils/gm-format';
import { FormsModule } from '@angular/forms';
import { EquipmentService } from './services/equipment.service';
import { Equipment, PagedResult, UserInfo } from '../../core/models';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { ActionsMenuComponent } from '../../shared/components/actions-menu/actions-menu.component';

import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, PageHeaderComponent, AppIconComponent, ActionsMenuComponent],
  templateUrl: './equipment.component.html',
  styles: [`
    .count { font-size: 0.8125rem; color: var(--text-muted); }
    .row-actions { display: inline-flex; gap: 2px; justify-content: flex-end; }
  `]
})
export class EquipmentComponent implements OnInit {
  private readonly confirmDialog = inject(ConfirmService);
  equipments: Equipment[] = [];
  loading = true;
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  currentUser: UserInfo | null = null;

  stats = {
    total: 0,
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

  exporting = false;

  /** The whole machine list (not only the current page), as a file Excel opens directly. */
  exporter(): void {
    this.exporting = true;
    this.equipmentService.getEquipments(1, 5000, this.searchTerm, true).subscribe({
      next: r => {
        const rows = r.data.map((e: any) => [e.codeEquipement, e.designation, e.chaineProduction?.libelle ?? e.chaineProduction?.nom ?? '',
          e.famille?.nomFamille ?? '', e.modele?.marque?.nomMarque ?? '', e.modele?.nomModele ?? '', e.etat?.nomEtat ?? '', e.criticite?.nomCriticite ?? '',
          e.emplacement ?? '', e.numeroSerie ?? '']);
        exportCsv(`equipements-${isoDate(new Date())}`, ['Code', 'Désignation', 'Chaîne', 'Famille', 'Marque', 'Modèle', 'État', 'Criticité', 'Emplacement', 'N° de série'], rows);
        this.exporting = false;
      },
      error: err => { this.exporting = false; this.notificationService.error('Export impossible', errorMessage(err, "La liste n'a pas pu être exportée.")); }
    });
  }

  loadEquipments(): void {
    this.loading = true;
    // Only the latest request counts: an older, slower answer must not overwrite the list
    this.listSub?.unsubscribe();
    this.listSub = this.equipmentService.getEquipments(this.currentPage, this.pageSize, this.searchTerm).subscribe({
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

  /** Counters over the whole fleet (the table only shows one page). */
  calculateStats(): void {
    this.equipmentService.stats().subscribe({
      next: s => this.stats = { total: s.total, actif: s.enService, critique: s.critiques, horsService: s.enPanne },
      error: () => {}
    });
  }

  private listSub?: Subscription;
  private readonly debounce = debouncer();

  search(): void {
    this.debounce(() => {
      this.currentPage = 1;
      this.loadEquipments();
    });
  }

  /** The list and its counters are refreshed when the side panel closes (after a save or not). */
  onFormClosed(): void {
    this.loadEquipments();
  }

  getEtatClass(equipment: Equipment): string {
    const etat = equipment.etat?.nomEtat?.toLowerCase() || '';
    if (etat.includes('hors') || etat.includes('panne')) return 'd-bad';
    if (etat.includes('maintenance')) return 'd-warn';
    if (etat.includes('service') || etat.includes('actif') || etat.includes('bon')) return 'd-ok';
    return 'd-muted';
  }

  getCriticiteClass(equipment: Equipment): string {
    const criticite = equipment.criticite?.nomCriticite?.toLowerCase() || '';
    if (criticite.includes('critique') || criticite.includes('haute')) return 't-bad';
    if (criticite.includes('important') || criticite.includes('moyenne') || criticite.includes('moyen')) return 't-warn';
    return 't-neutral';
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

  async deleteEquipment(id: number): Promise<void> {
    if (await this.confirmDialog.ask({ title: 'Supprimer cet équipement ?', message: 'Il ne sera plus proposé dans les demandes d\'intervention. Son historique est conservé.' })) {
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
