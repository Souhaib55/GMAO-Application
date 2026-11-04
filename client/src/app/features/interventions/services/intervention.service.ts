import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DemandeIntervention, PagedResult, InterventionDto } from '../../../core/models';

/** Filters of the list (all optional), same names as the API query parameters. */
export interface InterventionFiltres {
  statusId?: number | null;
  type?: string | null;
  chaineId?: number | null;
  equipementId?: number | null;
  panneId?: number | null;
  du?: string | null;
  au?: string | null;
  export?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InterventionService {
  private apiUrl = `${environment.apiUrl}/demandeintervention`;

  constructor(private http: HttpClient) {}

  /**
   * The list with its filters. "vue" selects the work orders behind a dashboard figure;
   * "export" returns the whole filtered list (up to 5 000 rows) for the Excel export.
   */
  getInterventions(page: number = 1, pageSize: number = 10, search?: string, vue?: string | null,
                   filtres: InterventionFiltres = {}): Observable<PagedResult<DemandeIntervention>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }
    if (vue) params = params.set('vue', vue);
    for (const [k, v] of Object.entries(filtres)) {
      if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
    }

    return this.http.get<PagedResult<DemandeIntervention>>(this.apiUrl, {
      params,
      withCredentials: true
    });
  }

  /** Work orders of a date range (planned date, else declaration date), for the planning. */
  getCalendar(from: string, to: string): Observable<PagedResult<DemandeIntervention>> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<PagedResult<DemandeIntervention>>(`${this.apiUrl}/calendrier`, { params, withCredentials: true });
  }

  getTodayCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/today-count`, {
      withCredentials: true
    });
  }

  getIntervention(id: number): Observable<DemandeIntervention> {
    return this.http.get<DemandeIntervention>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  createIntervention(intervention: Partial<InterventionDto>, file?: File): Observable<DemandeIntervention> {
    if (file) {
      const formData = new FormData();
      formData.append('interventionData', JSON.stringify(intervention));
      formData.append('file', file);

      return this.http.post<DemandeIntervention>(this.apiUrl, formData, {
        withCredentials: true
      });
    }

    return this.http.post<DemandeIntervention>(this.apiUrl, intervention, {
      withCredentials: true
    });
  }

  updateIntervention(id: number, intervention: Partial<InterventionDto>, file?: File): Observable<void> {
    const interventionWithId = { ...intervention, idDemandeIntervention: id };
    
    if (file) {
      const formData = new FormData();
      formData.append('interventionData', JSON.stringify(interventionWithId));
      formData.append('file', file);

      return this.http.put<void>(`${this.apiUrl}/${id}`, formData, {
        withCredentials: true
      });
    }

    return this.http.put<void>(`${this.apiUrl}/${id}`, interventionWithId, {
      withCredentials: true
    });
  }

  updateInterventionWithFormData(id: number, formData: FormData): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, formData, {
      withCredentials: true
    });
  }

  getTechnicians(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/users/technicians`, {
      withCredentials: true
    });
  }

  assignTechnician(interventionId: number, technicianId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${interventionId}/assign`, { technicianId }, {
      withCredentials: true
    });
  }

  /** 2 = accept / reopen, 3 = complete (work report required), 4 = close. */
  updateStatus(interventionId: number, statusId: number, compteRendu?: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${interventionId}/status`, { statusId, compteRendu }, {
      withCredentials: true
    });
  }

  cancelIntervention(interventionId: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${interventionId}/cancel`, { reason }, {
      withCredentials: true
    });
  }

  acceptIntervention(interventionId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${interventionId}/accept`, {}, {
      withCredentials: true
    });
  }

  rejectIntervention(interventionId: number, reason: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${interventionId}/reject`, { reason }, {
      withCredentials: true
    });
  }

  deleteIntervention(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  downloadFile(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/file`, {
      withCredentials: true,
      responseType: 'blob'
    });
  }
}
