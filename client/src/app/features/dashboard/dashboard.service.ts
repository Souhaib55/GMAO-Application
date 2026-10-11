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

/** Maintenance KPIs computed by /api/kpi (hours unless stated). */
export interface KpiResponse {
  periodDays: number;
  scope: 'usine' | 'personnel';
  summary: {
    created: number;
    completed: number;
    closed: number;
    cancelled: number;
    completionRate: number | null;
    mttrHours: number | null;
    responseHours: number | null;
    mtbfHours: number | null;
    downtimeHours: number;
    availability: number;
    preventiveShare: number | null;
    breakdowns: number;
    backlog: number;
    backlogOverdue: number;
    machines: number;
  };
  byLine: { label: string; interventions: number; stops: number; downtimeHours: number }[];
  pareto: { label: string; count: number; share: number; cumulative: number }[];
  byRequester: { label: string; requests: number; stops: number; stopRate: number }[];
  byTechnician: { label: string; open: number; completed: number; mttrHours: number | null }[];
  topEquipment: { code: string; label: string; interventions: number; downtimeHours: number }[];
  backlogAging: { label: string; count: number }[];
  trend: { label: string; created: number; closed: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/demandeintervention`;

  constructor(private http: HttpClient) {}

  getKpis(days: number): Observable<KpiResponse> {
    return this.http.get<KpiResponse>(`${environment.apiUrl}/kpi`, {
      params: { days: String(days) },
      withCredentials: true
    });
  }

  getDashboardStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/dashboard-stats`, {
      withCredentials: true
    });
  }
}
