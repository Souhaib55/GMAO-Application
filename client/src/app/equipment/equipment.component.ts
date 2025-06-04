import { Component, OnInit, inject , Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AccountService } from 'app/core/services/account.service';
import { DatePipe } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

// Composant de dialogue de confirmation de suppression
@Component({
  selector: 'app-delete-confirmation-dialog',
  template: `
    <div class="delete-dialog-container">
      <div class="delete-dialog-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2 mat-dialog-title>Confirmation de suppression</h2>
      </div>
      <div mat-dialog-content>
        <p>Êtes-vous sûr de vouloir supprimer l'équipement :</p>
        <p class="equipment-title">{{ data.codeEquipement }} - {{ data.designation }}</p>
        <p class="warning-text">Cette action est irréversible !</p>
      </div>
      <div mat-dialog-actions>
        <button mat-button class="cancel-button" (click)="onCancel()">Annuler</button>
        <button mat-raised-button class="delete-button" (click)="onConfirm()">Supprimer</button>
      </div>
    </div>
  `,
  styles: [`
    .delete-dialog-container {
      padding: 0;
    }
    .delete-dialog-header {
      background-color: #f44336;
      color: white;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      border-top-left-radius: 4px;
      border-top-right-radius: 4px;
    }
    .warning-icon {
      font-size: 28px;
      height: 28px;
      width: 28px;
      margin-right: 12px;
    }
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
      color: white !important;
    }
    mat-dialog-content {
      padding: 24px;
      text-align: center;
    }
    .equipment-title {
      font-weight: 500;
      font-size: 18px;
      margin: 12px 0;
      color: #333;
    }
    .warning-text {
      color: #f44336;
      font-weight: 500;
      margin-top: 16px;
    }
    mat-dialog-actions {
      padding: 8px 24px 24px;
      display: flex;
      justify-content: space-between;
    }
    .cancel-button {
      color: #757575;
    }
    .delete-button {
      background-color: #f44336;
      color: white;
    }
    .delete-button:hover {
      background-color: #d32f2f;
    }
  `]
})
export class DeleteEquipmentConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteEquipmentConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

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
  private http = inject(HttpClient);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  private baseUrl = 'https://localhost:5001/api/Equipment';
  private criticiteBaseUrl = 'https://localhost:5001/api/Equipment/criticites';
  private etatBaseUrl = 'https://localhost:5001/api/Equipment/etats';
  private familleBaseUrl = 'https://localhost:5001/api/Equipment/familles';
  private modeleBaseUrl = 'https://localhost:5001/api/ModeleEquipement';
  private groupeBaseUrl = 'https://localhost:5001/api/Equipment/groupes';

  paginatedEquipmentList: EquipmentListItem[] = [];
  showPopup = false;
  popupMessage = '';
  popupType: 'success' | 'error' = 'success';
  isLoading = false;
  searchTerm = '';

  criticiteMap: Map<number, string> = new Map();
  etatMap: Map<number, string> = new Map();
  familleMap: Map<number, string> = new Map();
  modeleMap: Map<number, string> = new Map();
  groupeMap: Map<number, string> = new Map();

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 1;
  pageSizeOptions = [5, 10, 15];

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    const state = history.state;
    if (state?.message) {
      this.showPopupMessage(state.message, state.type || 'success');
    }
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
      this.filterItems();
    });
    this.loadReferenceData();
  }

  loadReferenceData(): void {
    this.isLoading = true;
    forkJoin({
      criticites: this.http.get<any[]>(this.criticiteBaseUrl),
      etats: this.http.get<any[]>(this.etatBaseUrl),
      familles: this.http.get<any[]>(this.familleBaseUrl),
      modeles: this.http.get<any[]>(this.modeleBaseUrl),
      groupes: this.http.get<any[]>(this.groupeBaseUrl)
    }).subscribe({
      next: (res) => {
        res.criticites.forEach(item => this.criticiteMap.set(item.idCriticite, item.nomCriticite));
        res.etats.forEach(item => this.etatMap.set(item.idEtat, item.nomEtat));
        res.familles.forEach(item => this.familleMap.set(item.idFamille, item.nomFamille));
        res.modeles.forEach(item => this.modeleMap.set(item.idModele, item.nomModele));
        res.groupes.forEach(item => this.groupeMap.set(item.idGroupe, item.nomGroupe));
        this.getAllEquipment();
      },
      error: (err) => {
        console.error('Failed to load reference data:', err);
        this.showPopupMessage('Failed to load reference data', 'error');
        this.isLoading = false;
      }
    });
  }

  getAllEquipment(): void {
    this.isLoading = true;
    const url = `${this.baseUrl}?page=${this.currentPage}&pageSize=${this.pageSize}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.paginatedEquipmentList = this.mapEquipmentData(res.data);
        this.totalCount = res.totalCount || 0;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch equipment:', err);
        this.showPopupMessage('Failed to fetch equipment', 'error');
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    this.currentPage = 1; // Reset to first page when filtering
    this.searchSubject.next(this.searchTerm);
  }

  filterItems(): void {
    if (!this.searchTerm.trim()) {
      this.getAllEquipment();
      return;
    }
    const term = this.searchTerm.toLowerCase().trim();
    this.isLoading = true;
    const url = `${this.baseUrl}?page=${this.currentPage}&pageSize=${this.pageSize}&search=${term}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.paginatedEquipmentList = this.mapEquipmentData(res.data);
        this.totalCount = res.totalCount || 0;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to search equipment:', err);
        this.showPopupMessage('Failed to search equipment', 'error');
        this.isLoading = false;
      }
    });
  }

  // Helper method to map API data to our component's data format
  private mapEquipmentData(data: any[]): EquipmentListItem[] {
    return data.map((item: any) => ({
      idEquipement: item.idEquipement || 0,
      codeEquipement: item.codeEquipement || '',
      designation: item.designation || '',
      description: item.description || '',
      idCriticite: item.idCriticite,
      idEtat: item.idEtat,
      idFamille: item.idFamille,
      idModele: item.idModele,
      idGroupe: item.idGroupe,
      criticite: item.criticite?.nomCriticite || this.criticiteMap.get(item.idCriticite) || 'Unknown',
      etat: item.etat?.nomEtat || this.etatMap.get(item.idEtat) || 'Unknown',
      famille: item.famille?.nomFamille || this.familleMap.get(item.idFamille) || 'Unknown',
      modele: item.modele?.nomModele || this.modeleMap.get(item.idModele) || 'Unknown',
      groupe: item.groupe?.nomGroupe || this.groupeMap.get(item.idGroupe) || 'Unknown',
      dateInstallation: item.dateInstallation ? new Date(item.dateInstallation) : null,
      dateMiseEnService: item.dateMiseEnService ? new Date(item.dateMiseEnService) : null,
      numeroSerie: item.numeroSerie || '',
      sousGarantie: item.sousGarantie ?? false,
      dateAchat: item.dateAchat ? new Date(item.dateAchat) : null,
      dateFinGarantie: item.dateFinGarantie ? new Date(item.dateFinGarantie) : null,
      dateConstruction: item.dateConstruction ? new Date(item.dateConstruction) : null,
      coutAchat: item.coutAchat ?? null,
      dateCreation: item.dateCreation ? new Date(item.dateCreation) : new Date(),
      dateModification: item.dateModification ? new Date(item.dateModification) : null,
      isDeleted: item.isDeleted ?? false
    }));
  }

  changePageSize(): void {
    this.currentPage = 1;
    if (this.searchTerm.trim()) {
      this.filterItems();
    } else {
      this.getAllEquipment();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      if (this.searchTerm.trim()) {
        this.filterItems();
      } else {
        this.getAllEquipment();
      }
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      if (this.searchTerm.trim()) {
        this.filterItems();
      } else {
        this.getAllEquipment();
      }
    }
  }

  goToPage(page: number): void {
    if (page !== this.currentPage && page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      if (this.searchTerm.trim()) {
        this.filterItems();
      } else {
        this.getAllEquipment();
      }
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 3;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(this.currentPage);
      if (this.currentPage > 1) {
        pages.unshift(this.currentPage - 1);
      }
      if (this.currentPage < this.totalPages) {
        pages.push(this.currentPage + 1);
      }
      while (pages.length < maxVisiblePages && pages.length < this.totalPages) {
        if (pages[0] > 1) {
          pages.unshift(pages[0] - 1);
        } else if (pages[pages.length - 1] < this.totalPages) {
          pages.push(pages[pages.length - 1] + 1);
        }
      }
    }
    return pages;
  }

  navigateToCreate(): void {
    this.router.navigate(['/equipment/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/equipment/edit', id]);
  }

  deleteEquipment(item: EquipmentListItem): void {
    const dialogRef = this.dialog.open(DeleteEquipmentConfirmationDialogComponent, {
      width: '400px',
      data: { codeEquipement: item.codeEquipement, designation: item.designation }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.http.delete(`${this.baseUrl}/${item.idEquipement}`).subscribe({
          next: () => {
            this.showPopupMessage('Equipment deleted successfully!', 'success');
            if (this.searchTerm.trim()) {
              this.filterItems();
            } else {
              this.getAllEquipment();
            }
          },
          error: (err) => {
            console.error('Failed to delete equipment:', err);
            this.showPopupMessage(err.error?.message || 'Failed to delete equipment', 'error');
            this.isLoading = false;
          }
        });
      }
    });
  }

  getCriticiteClass(criticite: string): string {
    const normalizedCriticite = criticite.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    if (normalizedCriticite === 'high' || normalizedCriticite === 'haute') return 'criticite-haute';
    if (normalizedCriticite === 'medium' || normalizedCriticite === 'moyenne') return 'criticite-moyenne';
    if (normalizedCriticite === 'low' || normalizedCriticite === 'basse') return 'criticite-basse';
    return '';
  }

  private showPopupMessage(message: string, type: 'success' | 'error'): void {
    this.popupMessage = message;
    this.popupType = type;
    this.showPopup = true;
    setTimeout(() => this.hidePopup(), 3000);
  }

  hidePopup(): void {
    this.showPopup = false;
  }
}

interface EquipmentListItem {
  idEquipement: number;
  codeEquipement: string;
  designation: string;
  description: string;
  idCriticite?: number;
  idEtat?: number;
  idFamille?: number;
  idModele?: number;
  idGroupe?: number;
  criticite: string;
  etat: string;
  famille: string;
  modele: string;
  groupe: string;
  dateInstallation: Date | null;
  dateMiseEnService: Date | null;
  numeroSerie: string;
  sousGarantie: boolean;
  dateAchat: Date | null;
  dateFinGarantie: Date | null;
  dateConstruction: Date | null;
  coutAchat: number | null;
  dateCreation: Date;
  dateModification: Date | null;
  isDeleted: boolean;
}