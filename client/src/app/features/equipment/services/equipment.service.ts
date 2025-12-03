import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Equipment, PagedResult } from '../../../core/models';

@Injectable({
  providedIn: 'root'
})
export class EquipmentService {
  private apiUrl = `${environment.apiUrl}/equipment`;

  constructor(private http: HttpClient) {}

  getEquipments(page: number = 1, pageSize: number = 10, search?: string): Observable<PagedResult<Equipment>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PagedResult<Equipment>>(this.apiUrl, {
      params,
      withCredentials: true
    });
  }

  getEquipment(id: number): Observable<Equipment> {
    return this.http.get<Equipment>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  createEquipment(equipment: Partial<Equipment>): Observable<Equipment> {
    return this.http.post<Equipment>(this.apiUrl, equipment, {
      withCredentials: true
    });
  }

  updateEquipment(id: number, equipment: Partial<Equipment>): Observable<void> {
    const payload = { ...equipment, idEquipement: id };
    return this.http.put<void>(`${this.apiUrl}/${id}`, payload, {
      withCredentials: true
    });
  }

  deleteEquipment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }
}
