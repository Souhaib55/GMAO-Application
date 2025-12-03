import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Piece, PagedResult } from '../../../core/models';

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private apiUrl = `${environment.apiUrl}/piece`;

  constructor(private http: HttpClient) {}

  getPieces(page: number = 1, pageSize: number = 10, search?: string): Observable<PagedResult<Piece>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PagedResult<Piece>>(this.apiUrl, {
      params,
      withCredentials: true
    });
  }

  getPiece(id: number): Observable<Piece> {
    return this.http.get<Piece>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  createPiece(piece: Partial<Piece>): Observable<Piece> {
    return this.http.post<Piece>(this.apiUrl, piece, {
      withCredentials: true
    });
  }

  updatePiece(id: number, piece: Partial<Piece>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, piece, {
      withCredentials: true
    });
  }

  deletePiece(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }
}
