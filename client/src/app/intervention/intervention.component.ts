import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { forkJoin } from 'rxjs';
import { debounceTime, Subject } from 'rxjs';
import { AccountService } from 'app/core/services/account.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-interventions',
  templateUrl: './intervention.component.html',
  styleUrls: ['./intervention.component.scss'],
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
  ],
  providers: [DatePipe]
})
export class InterventionComponent implements OnInit {
  private http = inject(HttpClient);
  private router = inject(Router);
  private accountService = inject(AccountService);
  private datePipe = inject(DatePipe);

  private baseUrl = 'https://localhost:5001/api/DemandeIntervention';
  private etatBaseUrl = 'https://localhost:5001/api/Etat';
  private typeInterventionBaseUrl = 'https://localhost:5001/api/TypeIntervention';
  private urgenceBaseUrl = 'https://localhost:5001/api/Urgence';
  private chaineProductionBaseUrl = 'https://localhost:5001/api/ChaineProduction';
  private panneBaseUrl = 'https://localhost:5001/api/Panne';
  private usersBaseUrl = 'https://localhost:5001/api/Users';

  paginatedInterventionList: InterventionListItem[] = [];
  showPopup = false;
  popupMessage = '';
  popupType: 'success' | 'error' = 'success';
  isLoading = false;
  searchTerm = '';

  etatMap: Map<number, string> = new Map();
  typeInterventionMap: Map<number, string> = new Map();
  urgenceMap: Map<number, string> = new Map();
  chaineProductionMap: Map<number, string> = new Map();
  panneMap: Map<number, string> = new Map();
  usersMap: Map<number, string> = new Map();

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 1;
  pageSizeOptions = [5, 10, 15];

  private searchSubject = new Subject<string>();

  get currentUserRole(): string | null {
    const user = this.accountService.currentUser();
    return user ? user.role : null;
  }

  ngOnInit(): void {
    const state = history.state;
    if (state?.message) {
      this.showPopupMessage(state.message, state.type || 'success');
    }

    this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
      this.applyFilter();
    });

    this.loadReferenceData();
  }

  loadReferenceData(): void {
    this.isLoading = true;
    forkJoin({
      etats: this.http.get<any[]>(this.etatBaseUrl, { withCredentials: true }),
      types: this.http.get<any[]>(this.typeInterventionBaseUrl, { withCredentials: true }),
      urgences: this.http.get<any[]>(this.urgenceBaseUrl, { withCredentials: true }),
      chaines: this.http.get<any[]>(this.chaineProductionBaseUrl, { withCredentials: true }),
      pannes: this.http.get<any[]>(this.panneBaseUrl, { withCredentials: true }),
      users: this.http.get<any[]>(this.usersBaseUrl, { withCredentials: true })
    }).subscribe({
      next: (res) => {
        res.etats.forEach(item => this.etatMap.set(item.idEtat, item.libelle));
        res.types.forEach(item => this.typeInterventionMap.set(item.idTypeIntervention, item.libelle));
        res.urgences.forEach(item => this.urgenceMap.set(item.idUrgence, item.libelle));
        res.chaines.forEach(item => this.chaineProductionMap.set(item.idChaineProduction, item.libelle));
        res.pannes.forEach(item => this.panneMap.set(item.idPanne, item.libelle));
        res.users.forEach(item => this.usersMap.set(item.id, `${item.nom} ${item.prenom}`));
        this.getAllInterventions();
      },
      error: (err) => {
        console.error('Failed to load reference data:', err);
        this.showPopupMessage('Failed to load reference data', 'error');
        this.isLoading = false;
      }
    });
  }

  getAllInterventions(): void {
    this.isLoading = true;
    const url = `${this.baseUrl}?page=${this.currentPage}&pageSize=${this.pageSize}`;
    this.http.get<any>(url, { withCredentials: true }).subscribe({
      next: (res) => {
        this.paginatedInterventionList = res.data.map((item: any) => ({
          idDemandeIntervention: item.idDemandeIntervention || 0,
          titre: item.titre || '',
          dateCreation: item.dateCreation ? new Date(item.dateCreation) : new Date(),
          machineArretee: item.machineArretee || false,
          etat: item.etat?.libelle || this.etatMap.get(item.idEtat) || 'Unknown',
          typeIntervention: item.typeIntervention?.libelle || this.typeInterventionMap.get(item.idTypeIntervention) || 'Unknown',
          urgence: item.urgence?.libelle || this.urgenceMap.get(item.idUrgence) || 'Unknown',
          chaineProduction: item.chaineProduction?.libelle || this.chaineProductionMap.get(item.idChaineProduction) || 'Unknown',
          panne: item.panne?.libelle || this.panneMap.get(item.idPanne) || 'Unknown',
          demandeur: item.demandeur ? `${item.demandeur.nom} ${item.demandeur.prenom}` : this.usersMap.get(item.demandeursID) || 'Unknown',
          destinataire: item.destinataire ? `${item.destinataire.nom} ${item.destinataire.prenom}` : this.usersMap.get(item.destinatairesID) || 'Unknown',
          fileName: item.fileName || ''
        }));
        this.totalCount = res.totalCount || 0;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch interventions:', err);
        this.showPopupMessage('Failed to fetch interventions', 'error');
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    this.searchSubject.next(this.searchTerm);
  }

  filterItems(): void {
    if (!this.searchTerm.trim()) {
      this.getAllInterventions();
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.isLoading = true;
    const url = `${this.baseUrl}?page=${this.currentPage}&pageSize=${this.pageSize}&search=${term}`;
    this.http.get<any>(url, { withCredentials: true }).subscribe({
      next: (res) => {
        this.paginatedInterventionList = res.data.map((item: any) => ({
          idDemandeIntervention: item.idDemandeIntervention || 0,
          titre: item.titre || '',
          dateCreation: item.dateCreation ? new Date(item.dateCreation) : new Date(),
          machineArretee: item.machineArretee || false,
          etat: item.etat?.libelle || this.etatMap.get(item.idEtat) || 'Unknown',
          typeIntervention: item.typeIntervention?.libelle || this.typeInterventionMap.get(item.idTypeIntervention) || 'Unknown',
          urgence: item.urgence?.libelle || this.urgenceMap.get(item.idUrgence) || 'Unknown',
          chaineProduction: item.chaineProduction?.libelle || this.chaineProductionMap.get(item.idChaineProduction) || 'Unknown',
          panne: item.panne?.libelle || this.panneMap.get(item.idPanne) || 'Unknown',
          demandeur: item.demandeur ? `${item.demandeur.nom} ${item.demandeur.prenom}` : this.usersMap.get(item.demandeursID) || 'Unknown',
          destinataire: item.destinataire ? `${item.destinataire.nom} ${item.destinataire.prenom}` : this.usersMap.get(item.destinatairesID) || 'Unknown',
          fileName: item.fileName || ''
        }));
        this.totalCount = res.totalCount || 0;
        this.totalPages = Math.ceil(this.totalCount / this.pageSize) || 1;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to search interventions:', err);
        this.showPopupMessage('Failed to search interventions', 'error');
        this.isLoading = false;
      }
    });
  }

  changePageSize(): void {
    this.currentPage = 1;
    this.getAllInterventions();
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.getAllInterventions();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.getAllInterventions();
    }
  }

  goToPage(page: number): void {
    if (page !== this.currentPage && page > 0 && page <= this.totalPages) {
      this.currentPage = page;
      this.getAllInterventions();
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
    this.router.navigate(['/intervention/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/intervention/edit', id]);
  }

  deleteIntervention(item: InterventionListItem): void {
    if (!confirm(`Delete intervention: ${item.titre}?`)) return;
    this.isLoading = true;
    this.http.delete(`${this.baseUrl}/${item.idDemandeIntervention}`, { withCredentials: true }).subscribe({
      next: () => {
        this.showPopupMessage('Intervention deleted successfully!', 'success');
        this.getAllInterventions();
      },
      error: (err) => {
        console.error('Failed to delete intervention:', err);
        this.showPopupMessage(err.error?.message || 'Failed to delete intervention', 'error');
        this.isLoading = false;
      }
    });
  }

  downloadFile(id: number, fileName: string): void {
    const url = `${this.baseUrl}/${id}/file`;
    this.http.get(url, { responseType: 'blob', withCredentials: true }).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(objectUrl);
      },
      error: (err) => {
        console.error('Download failed:', err);
        this.showPopupMessage('Failed to download file', 'error');
      }
    });
  }

  getUrgenceClass(urgence: string): string {
    const normalizedUrgence = urgence.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    if (normalizedUrgence === 'haute') return 'urgence-tres-urgent';
    if (normalizedUrgence === 'moyenne') return 'urgence-urgent';
    if (normalizedUrgence === 'basse') return 'urgence-normal';
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

interface InterventionListItem {
  idDemandeIntervention: number;
  titre: string;
  dateCreation: Date;
  machineArretee: boolean;
  etat: string;
  typeIntervention: string;
  urgence: string;
  chaineProduction: string;
  panne: string;
  demandeur: string;
  destinataire: string;
  fileName?: string;
}