import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Stock, PagedResult, CreateStockDTO } from '../../../core/models';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private apiUrl = `${environment.apiUrl}/stock`;

  constructor(private http: HttpClient) {}

  getStocks(page: number = 1, pageSize: number = 10, search?: string): Observable<PagedResult<Stock>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PagedResult<Stock>>(this.apiUrl, {
      params,
      withCredentials: true
    });
  }

  getStock(id: number): Observable<Stock> {
    return this.http.get<Stock>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  createStock(stock: CreateStockDTO): Observable<Stock> {
    return this.http.post<Stock>(this.apiUrl, stock, {
      withCredentials: true
    });
  }

  updateStock(id: number, stock: Partial<Stock>): Observable<void> {
    const payload = { ...stock, id: id };
    return this.http.put<void>(`${this.apiUrl}/${id}`, payload, {
      withCredentials: true
    });
  }

  deleteStock(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }
}
