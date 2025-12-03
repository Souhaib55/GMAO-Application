import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStatsResponse {
  interventionStats: {
    enAttente: number;
    enCours: number;
    terminee: number;
    annulee: number;
  };
  machineStats: {
    arretees: number;
    enFonctionnement: number;
    total: number;
    pourcentageArretees: number;
  };
  recentInterventions: Array<{
    idDemandeIntervention: number;
    titre: string;
    dateCreation: Date;
    status: {
      id: number;
      statut: string;
    };
  }>;
  monthlyData: Array<{
    year: number;
    month: number;
    count: number;
  }>;
  urgenceData: Array<{
    id: number;
    libelle: string;
    count: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/demandeintervention`;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/dashboard-stats`, {
      withCredentials: true
    });
  }
}
