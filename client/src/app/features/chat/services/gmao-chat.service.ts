import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ChatMessage, ChatQueryDto, ChatResponse } from '../../../core/models';

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class GmaoChatService {
  private apiUrl = `${environment.apiUrl}/gmao-chat`;
  
  // Current conversation messages
  private conversationHistory = new BehaviorSubject<ChatMessage[]>([]);
  public conversationHistory$ = this.conversationHistory.asObservable();
  
  // All conversations
  private conversations = new BehaviorSubject<ChatConversation[]>([]);
  public conversations$ = this.conversations.asObservable();
  
  // Current active conversation ID
  private currentConversationId: string | null = null;

  constructor(private http: HttpClient) {
    this.loadAllConversations();
  }

  testService(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`, {
      withCredentials: true
    });
  }

  query(userQuery: string): Observable<ChatResponse> {
    const dto: ChatQueryDto = { query: userQuery };

    // Create new conversation if none exists
    if (!this.currentConversationId) {
      this.startNewConversation(userQuery);
    }

    // Add user message to history
    const userMessage: ChatMessage = {
      role: 'user',
      content: userQuery,
      timestamp: new Date()
    };
    this.addMessageToHistory(userMessage);

    return this.http.post<ChatResponse>(`${this.apiUrl}/query`, dto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        // Add assistant response to history
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          metadata: response.metadata,
          visualizations: response.visualizations,
          suggestions: response.suggestions
        };
        this.addMessageToHistory(assistantMessage);
      })
    );
  }

  // Start a new conversation
  startNewConversation(initialTitle?: string): string {
    const id = this.generateId();
    const newConversation: ChatConversation = {
      id,
      title: initialTitle ? this.truncateTitle(initialTitle) : 'Nouvelle conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const allConversations = [newConversation, ...this.conversations.value];
    this.conversations.next(allConversations);
    this.currentConversationId = id;
    this.conversationHistory.next([]);
    this.saveAllConversations();
    
    return id;
  }

  // Load a specific conversation
  loadConversation(conversationId: string): void {
    const conversation = this.conversations.value.find(c => c.id === conversationId);
    if (conversation) {
      this.currentConversationId = conversationId;
      this.conversationHistory.next([...conversation.messages]);
    }
  }

  // Delete a specific conversation
  deleteConversation(conversationId: string): void {
    const updatedConversations = this.conversations.value.filter(c => c.id !== conversationId);
    this.conversations.next(updatedConversations);
    
    // If deleted conversation was active, clear current
    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
      this.conversationHistory.next([]);
    }
    
    this.saveAllConversations();
  }

  // Rename a conversation
  renameConversation(conversationId: string, newTitle: string): void {
    const updatedConversations = this.conversations.value.map(c => {
      if (c.id === conversationId) {
        return { ...c, title: this.truncateTitle(newTitle), updatedAt: new Date() };
      }
      return c;
    });
    this.conversations.next(updatedConversations);
    this.saveAllConversations();
  }

  // Get current conversation ID
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  private addMessageToHistory(message: ChatMessage): void {
    const currentHistory = this.conversationHistory.value;
    const updatedHistory = [...currentHistory, message];
    this.conversationHistory.next(updatedHistory);
    
    // Update the conversation in the list
    if (this.currentConversationId) {
      const updatedConversations = this.conversations.value.map(c => {
        if (c.id === this.currentConversationId) {
          // Update title if this is the first user message
          const title = c.messages.length === 0 && message.role === 'user' 
            ? this.truncateTitle(message.content) 
            : c.title;
          return { 
            ...c, 
            title,
            messages: updatedHistory, 
            updatedAt: new Date() 
          };
        }
        return c;
      });
      this.conversations.next(updatedConversations);
      this.saveAllConversations();
    }
  }

  clearHistory(): void {
    this.conversationHistory.next([]);
    if (this.currentConversationId) {
      this.deleteConversation(this.currentConversationId);
    }
  }

  clearAllHistory(): void {
    this.conversations.next([]);
    this.conversationHistory.next([]);
    this.currentConversationId = null;
    localStorage.removeItem('gmao_chat_conversations');
  }

  private loadAllConversations(): void {
    const stored = localStorage.getItem('gmao_chat_conversations');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const conversations: ChatConversation[] = data.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          messages: c.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
        this.conversations.next(conversations);
        
        // Load most recent conversation if exists
        if (conversations.length > 0) {
          this.loadConversation(conversations[0].id);
        }
      } catch (e) {
        console.error('Error loading conversations', e);
      }
    }
  }

  private saveAllConversations(): void {
    try {
      // Keep only last 20 conversations
      const trimmedConversations = this.conversations.value.slice(0, 20);
      localStorage.setItem('gmao_chat_conversations', JSON.stringify(trimmedConversations));
    } catch (e) {
      console.error('Error saving conversations', e);
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private truncateTitle(text: string, maxLength: number = 30): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
}
