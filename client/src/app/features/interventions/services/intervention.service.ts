import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DemandeIntervention, PagedResult, InterventionDto } from '../../../core/models';

@Injectable({
  providedIn: 'root'
})
export class InterventionService {
  private apiUrl = `${environment.apiUrl}/demandeintervention`;

  constructor(private http: HttpClient) {}

  getInterventions(page: number = 1, pageSize: number = 10, search?: string): Observable<PagedResult<DemandeIntervention>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PagedResult<DemandeIntervention>>(this.apiUrl, {
      params,
      withCredentials: true
    });
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
    const interventionWithId = { ...intervention, idDemande: id };
    
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

  updateStatus(interventionId: number, statusId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${interventionId}/status`, { statusId }, {
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
}
