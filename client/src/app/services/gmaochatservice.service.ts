import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class GmaoChatService {
  private baseUrl = 'http://localhost:5000/api/gmao-chat'; // Adjust if needed
  private _chatHistory = new BehaviorSubject<ChatMessage[]>([]);
  public chatHistory$ = this._chatHistory.asObservable();

  constructor(private http: HttpClient) { 
    this.loadChatHistory();
  }

  testChatApi(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/test`).pipe(
      catchError(this.handleError)
    );
  }

  sendQuery(query: string): Observable<any> {
    const recentHistory = this._chatHistory.value.slice(-5).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    return this.http.post<any>(`${this.baseUrl}/query`, { 
      query,
      conversationHistory: recentHistory
    }).pipe(
      catchError(this.handleError)
    );
  }
  
  addUserMessage(message: ChatMessage): void {
    this.addMessageToHistory(message);
  }
  
  addAssistantResponse(message: ChatMessage): void {
    this.addMessageToHistory(message);
  }
  
  private addMessageToHistory(message: ChatMessage): void {
    const currentHistory = this._chatHistory.value;
    const updatedHistory = [...currentHistory, message].slice(-50);
    this._chatHistory.next(updatedHistory);
    this.saveChatHistory(updatedHistory);
  }
  
  clearHistory(): void {
    this._chatHistory.next([]);
    localStorage.removeItem('gmao-chat-history');
  }
  
  private loadChatHistory(): void {
    const savedHistory = localStorage.getItem('gmao-chat-history');
    if (savedHistory) {
      const history = JSON.parse(savedHistory).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      this._chatHistory.next(history);
    }
  }
  
  private saveChatHistory(history: ChatMessage[]): void {
    localStorage.setItem('gmao-chat-history', JSON.stringify(history));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Erreur serveur inconnue.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      errorMessage = `Code ${error.status}: ${error.error?.message || error.statusText}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}