import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-ressources',
  templateUrl: './ressources.component.html',
  styleUrls: ['./ressources.component.scss'],
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
export class RessourcesComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);

  private baseUrl = 'https://localhost:5001/api/Piece';
  private familleBaseUrl = 'https://localhost:5001/api/FamillePiece';
  private constructeurBaseUrl = 'https://localhost:5001/api/Constructeur';
  private criticiteBaseUrl = 'https://localhost:5001/api/CriticitePiece';

  paginatedPieceList: PieceListItem[] = [];
  showPopup = false;
  popupMessage = '';
  popupType: 'success' | 'error' = 'success';
  isLoading = false;

  familleMap: Map<number, string> = new Map();
  constructeurMap: Map<number, string> = new Map();
  criticiteMap: Map<number, string> = new Map();

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 1;
  pageSizeOptions = [5, 10, 15];

  ngOnInit(): void {
    const state = history.state;
    if (state?.message) {
      this.showPopupMessage(state.message, state.type || 'success');
    }
    this.loadReferenceData();
  }

  loadReferenceData(): void {
    this.isLoading = true;
    forkJoin({
      familles: this.http.get<any[]>(this.familleBaseUrl),
      constructeurs: this.http.get<any[]>(this.constructeurBaseUrl),
      criticites: this.http.get<any[]>(this.criticiteBaseUrl)
    }).subscribe({
      next: (res) => {
        res.familles.forEach(item => this.familleMap.set(item.idFamillePiece, item.nomFamille));
        res.constructeurs.forEach(item => this.constructeurMap.set(item.idConstructeur, item.nomConstructeur));
        res.criticites.forEach(item => this.criticiteMap.set(item.idCriticitePiece, item.niveauCriticitePiece));
        this.getAllPieces();
      },
      error: (err) => {
        this.showPopupMessage('Failed to load reference data', 'error');
        this.isLoading = false;
      }
    });
  }

  getAllPieces(): void {
    this.isLoading = true;
    const url = `${this.baseUrl}?page=${this.currentPage}&pageSize=${this.pageSize}`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.paginatedPieceList = res.data.map((item: any) => ({
          idPiece: item.idPiece || 0,
          codePiece: item.codePiece || '',
          designation: item.designation || '',
          description: item.description || '',
          idFamillePiece: item.idFamillePiece,
          idConstructeur: item.idConstructeur,
          idCriticitePiece: item.idCriticitePiece,
          famillePiece: item.famillePiece?.nomFamille || this.familleMap.get(item.idFamillePiece) || 'Unknown',
          constructeur: item.constructeur?.nomConstructeur || this.constructeurMap.get(item.idConstructeur) || 'Unknown',
          criticitePiece: item.criticitePiece?.niveauCriticitePiece || this.criticiteMap.get(item.idCriticitePiece) || 'Unknown',
          quantite_Stock: item.quantite_Stock || 0,
          prixUnitaire: item.prixUnitaire || 0,
          dateCreation: item.dateCreation ? new Date(item.dateCreation) : new Date(),
          dateModification: item.dateModification ? new Date(item.dateModification) : null,
          isActif: item.isActif ?? true
        }));
        this.totalCount = res.totalCount || 0;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
        this.isLoading = false;
      },
      error: (err) => {
        this.showPopupMessage('Failed to fetch pieces', 'error');
        this.isLoading = false;
      }
    });
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.getAllPieces();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getAllPieces();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getAllPieces();
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/ressources/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/ressources/edit', id]);
  }

  deletePiece(item: PieceListItem): void {
    if (!confirm(`Delete ${item.codePiece} - ${item.designation}?`)) return;
    this.isLoading = true;
    this.http.delete(`${this.baseUrl}/${item.idPiece}`).subscribe({
      next: () => {
        this.showPopupMessage('Piece deleted successfully!', 'success');
        this.getAllPieces();
      },
      error: (err) => {
        this.showPopupMessage(err.error?.message || 'Failed to delete piece', 'error');
        this.isLoading = false;
      }
    });
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

interface PieceListItem {
  idPiece: number;
  codePiece: string;
  designation: string;
  description: string;
  idFamillePiece: number;
  idConstructeur: number;
  idCriticitePiece: number;
  famillePiece: string;
  constructeur: string;
  criticitePiece: string;
  quantite_Stock: number;
  prixUnitaire: number;
  dateCreation: Date;
  dateModification: Date | null;
  isActif: boolean;
}