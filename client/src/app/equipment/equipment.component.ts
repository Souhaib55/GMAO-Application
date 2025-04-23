import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

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

  private baseUrl = 'https://localhost:5001/api/Equipment';
  private criticiteBaseUrl = 'https://localhost:5001/api/EquipmentCriticite';
  private etatBaseUrl = 'https://localhost:5001/api/EtatEquipement';
  private familleBaseUrl = 'https://localhost:5001/api/FamilleEquipment';
  private modeleBaseUrl = 'https://localhost:5001/api/ModeleEquipement';
  private groupeBaseUrl = 'https://localhost:5001/api/GroupeEquipement';

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
        this.paginatedEquipmentList = res.data.map((item: any) => ({
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
        this.totalCount = res.totalCount || 0;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
        this.isLoading = false;
      },
      error: (err) => {
        this.showPopupMessage('Failed to fetch equipment', 'error');
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
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
        this.paginatedEquipmentList = res.data.map((item: any) => ({
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
        this.totalCount = res.totalCount || 0;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
        this.isLoading = false;
      },
      error: (err) => {
        this.showPopupMessage('Failed to search equipment', 'error');
        this.isLoading = false;
      }
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

  goToPage(page: number): void {
    if (page !== this.currentPage && page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      this.getAllEquipment();
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
    if (!confirm(`Delete ${item.codeEquipement} - ${item.designation}?`)) return;
    this.isLoading = true;
    this.http.delete(`${this.baseUrl}/${item.idEquipement}`).subscribe({
      next: () => {
        this.showPopupMessage('Equipment deleted successfully!', 'success');
        this.getAllEquipment();
      },
      error: (err) => {
        this.showPopupMessage(err.error?.message || 'Failed to delete equipment', 'error');
        this.isLoading = false;
      }
    });
  }

  getCriticiteClass(criticite: string): string {
    const normalizedCriticite = criticite.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    if (normalizedCriticite === 'high') return 'criticite-haute';
    if (normalizedCriticite === 'medium') return 'criticite-moyenne';
    if (normalizedCriticite === 'low') return 'criticite-basse';
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