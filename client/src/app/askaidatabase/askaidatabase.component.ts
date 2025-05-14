import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, TemplateRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GmaoChatService, ChatMessage } from '../services/gmaochatservice.service';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

// Define interfaces for conversation management
interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  messages: ChatMessage[];
}

@Component({
  selector: 'app-askaidatabase',
  templateUrl: './askaidatabase.component.html',
  styleUrls: ['./askaidatabase.component.scss']
})
export class AskAiDatabaseComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatHistoryContainer') private chatHistoryContainer!: ElementRef;
  @ViewChild('chatFormRef') chatFormRef!: NgForm;
  @ViewChild('confirmDialog') confirmDialog!: TemplateRef<any>;
  @ViewChild('deleteConversationDialog') deleteConversationDialog!: TemplateRef<any>;
  
  queryText: string = '';
  loading: boolean = false;
  error: string | null = null;
  chatHistory: ChatMessage[] = [];
  isTyping: boolean = false;
  
  // Variables pour la gestion des conversations
  conversations: Conversation[] = [];
  currentConversationIndex: number = -1;
  sidebarCollapsed: boolean = true; // Sidebar hidden by default
  conversationToDelete: number = -1;
  
  // Flag pour savoir si un défilement automatique doit être effectué
  shouldScrollToBottom: boolean = true;
  
  // Suggestion categories for new conversation
  suggestionCategories = [
    {
      icon: 'build',
      title: 'Maintenance',
      questionTitle: 'Interventions en attente',
      description: 'Liste des interventions en attente de traitement',
      question: 'Quelles sont les interventions en attente de traitement?'
    },
    {
      icon: 'warning',
      title: 'Pannes',
      questionTitle: 'Équipements en panne',
      description: 'Identification des équipements actuellement en panne',
      question: 'Quels équipements sont actuellement en panne?'
    },
    {
      icon: 'schedule',
      title: 'Planification',
      questionTitle: 'Interventions prévues',
      description: 'Liste des interventions planifiées cette semaine',
      question: 'Quelles sont les interventions planifiées pour cette semaine?'
    },
    {
      icon: 'inventory',
      title: 'Stock',
      questionTitle: 'Pièces en stock faible',
      description: 'Identification des pièces détachées en quantité critique',
      question: 'Quelles sont les pièces détachées dont le stock est critique?'
    },
    {
      icon: 'insights',
      title: 'Analyse',
      questionTitle: 'Fréquence des pannes',
      description: 'Analyse des équipements avec pannes fréquentes',
      question: 'Quels sont les équipements ayant le plus de pannes ce mois-ci?'
    },
    {
      icon: 'engineering',
      title: 'Techniciens',
      questionTitle: 'Charge de travail',
      description: 'Répartition de la charge de travail par technicien',
      question: 'Quelle est la charge de travail actuelle par technicien?'
    }
  ];

  constructor(
    private chatService: GmaoChatService,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadConversations();
    this.checkUserLoginStatus();
    
    this.chatService.chatHistory$.subscribe(history => {
      this.chatHistory = history;
      if (this.currentConversationIndex >= 0) {
        this.conversations[this.currentConversationIndex].messages = [...history];
        this.saveConversations();
      }
      // Activer le défilement automatique lors de nouveaux messages
      this.shouldScrollToBottom = true;
    });
  }
  
  ngAfterViewChecked() {
    // N'effectue le défilement automatique que lorsque nécessaire
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }
  
  checkUserLoginStatus(): void {
    const lastLoginTime = localStorage.getItem('gmao-last-login-time');
    const currentTime = new Date().getTime();
    const userToken = localStorage.getItem('auth-token');
    
    if (!lastLoginTime || (currentTime - parseInt(lastLoginTime)) > 8 * 60 * 60 * 1000 || 
        (localStorage.getItem('last-user-token') !== userToken && userToken)) {
      this.startNewConversation();
      localStorage.setItem('gmao-last-login-time', currentTime.toString());
      if (userToken) {
        localStorage.setItem('last-user-token', userToken);
      }
    } else if (this.conversations.length > 0) {
      this.selectConversation(0);
    } else {
      this.startNewConversation();
    }
  }
  
  private scrollToBottom(): void {
    try {
      if (this.chatHistoryContainer && !this.isNewConversation()) {
        const element = this.chatHistoryContainer.nativeElement;
        // Utilisation de setTimeout avec un délai plus long pour s'assurer que le DOM est complètement rendu
        setTimeout(() => {
          element.scrollTop = element.scrollHeight;
          console.log('Scrolling to bottom, height:', element.scrollHeight);
          // Réinitialiser le flag après le défilement
          this.shouldScrollToBottom = false;
        }, 150);
      }
    } catch(err) {
      console.error('Erreur lors du défilement:', err);
    }
  }
  
  // Réactiver le défilement automatique lorsque l'utilisateur interagit avec le chat
  activateAutoScroll(): void {
    this.shouldScrollToBottom = true;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  
  startNewConversation(): void {
    this.chatService.clearHistory();
    this.currentConversationIndex = -1;
    this.chatHistory = [];
    this.error = null;
    this.sidebarCollapsed = true;
    this.shouldScrollToBottom = true;
  }
  
  isNewConversation(): boolean {
    return this.currentConversationIndex === -1 && this.chatHistory.length === 0;
  }
  
  getCurrentConversationHistory(): ChatMessage[] {
    return this.chatHistory;
  }
  
  selectConversation(index: number): void {
    if (index >= 0 && index < this.conversations.length) {
      this.currentConversationIndex = index;
      this.chatService.clearHistory();
      this.error = null;
      
      const selectedMessages = [...this.conversations[index].messages];
      if (selectedMessages.length > 0) {
        // Utilisation de setTimeout pour laisser le temps au DOM de se mettre à jour
        setTimeout(() => {
          selectedMessages.forEach(msg => {
            if (msg.role === 'user') {
              this.chatService.addUserMessage(msg);
            } else {
              this.chatService.addAssistantResponse(msg);
            }
          });
          
          // Forcer la mise à jour de l'affichage et défiler vers le bas
          this.chatHistory = [...this.conversations[index].messages];
          this.sidebarCollapsed = true;
          this.shouldScrollToBottom = true;
        }, 0);
      } else {
        this.chatHistory = [];
        this.sidebarCollapsed = true;
      }
    }
  }
  
  confirmDeleteConversation(event: Event, index: number): void {
    event.stopPropagation();
    this.conversationToDelete = index;
    this.dialog.open(this.deleteConversationDialog);
  }
  
  deleteConversationConfirmed(): void {
    if (this.conversationToDelete >= 0) {
      this.conversations.splice(this.conversationToDelete, 1);
      this.saveConversations();
      
      if (this.currentConversationIndex === this.conversationToDelete) {
        this.startNewConversation();
      } else if (this.conversationToDelete < this.currentConversationIndex) {
        this.currentConversationIndex--;
      }
      
      this.conversationToDelete = -1;
    }
  }
  
  getConversationTitle(conv: Conversation): string {
    if (conv.title) return conv.title;
    const firstUserMsg = conv.messages.find(msg => msg.role === 'user');
    if (firstUserMsg) {
      const title = firstUserMsg.content.substring(0, 30);
      return title.length < firstUserMsg.content.length ? `${title}...` : title;
    }
    return 'Nouvelle conversation';
  }
  
  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString();
  }

  useSuggestion(suggestion: string): void {
    this.queryText = suggestion;
    this.sendQuery();
  }

  sendQueryFromForm(event: Event): void {
    event.preventDefault();
    this.sendQuery();
  }

  sendQuery(): void {
    if (!this.queryText || this.queryText.trim().length < 3) return;

    this.loading = true;
    this.isTyping = true;
    this.error = null;
    this.shouldScrollToBottom = true;

    const userMessage: ChatMessage = {
      role: 'user',
      content: this.queryText.trim(),
      timestamp: new Date()
    };
    
    if (this.currentConversationIndex === -1) {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: '',
        timestamp: new Date(),
        messages: []
      };
      this.conversations.unshift(newConversation);
      this.currentConversationIndex = 0;
      this.saveConversations();
    }
    
    this.chatService.addUserMessage(userMessage);

    this.chatService.sendQuery(this.queryText)
      .pipe(finalize(() => {
        this.loading = false;
        if (!this.error) {
          this.queryText = '';
          this.chatFormRef?.resetForm();
        }
      }))
      .subscribe({
        next: (res) => {
          if (res && res.response) {
            setTimeout(() => {
              const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: res.response,
                timestamp: new Date()
              };
              this.chatService.addAssistantResponse(assistantMessage);
              this.isTyping = false;
              
              if (this.currentConversationIndex >= 0) {
                this.conversations[this.currentConversationIndex].timestamp = new Date();
                this.saveConversations();
              }
              
              this.shouldScrollToBottom = true;
            }, 500);
          } else {
            this.handleResponseError('Réponse invalide du serveur');
          }
        },
        error: (err) => {
          this.isTyping = false;
          this.error = `Erreur: ${err.message}`;
          this.handleResponseError(this.error);
        }
      });
  }

  private handleResponseError(errorMessage: string): void {
    const assistantErrorMessage: ChatMessage = {
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date()
    };
    this.chatService.addAssistantResponse(assistantErrorMessage);
    this.shouldScrollToBottom = true;
  }

  formatResponse(text: string): SafeHtml {
    if (!text) return '';
    
    let formattedText = text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*?)(\n|$)/gm, '<li>$1</li>');
    
    formattedText = '<p>' + formattedText + '</p>';
    formattedText = formattedText
      .replace(/<p><li>/g, '<ul><li>')
      .replace(/<\/li><\/p>/g, '</li></ul>')
      .replace(/<\/li><br><li>/g, '</li><li>');
    
    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return `Aujourd'hui à ${messageDate.getHours().toString().padStart(2, '0')}:${messageDate.getMinutes().toString().padStart(2, '0')}`;
    }
    return messageDate.toLocaleString();
  }

  confirmClearHistory(): void {
    this.dialog.open(this.confirmDialog);
  }

  clearHistoryConfirmed(): void {
    this.chatService.clearHistory();
    if (this.currentConversationIndex >= 0) {
      this.conversations[this.currentConversationIndex].messages = [];
      this.saveConversations();
    }
  }

  exportChatHistory(): void {
    const historyData = JSON.stringify(this.chatHistory, null, 2);
    const blob = new Blob([historyData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendQuery();
    }
  }

  isUserMessage(message: ChatMessage): boolean {
    return message.role === 'user';
  }
  
  // Fonction appelée lors du défilement manuel par l'utilisateur
  onChatScroll(): void {
    if (this.chatHistoryContainer) {
      const element = this.chatHistoryContainer.nativeElement;
      // Si l'utilisateur a défilé près du bas, activer le défilement auto
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
      this.shouldScrollToBottom = isNearBottom;
    }
  }
  
  private loadConversations(): void {
    const saved = localStorage.getItem('gmao-chat-conversations');
    if (saved) {
      try {
        this.conversations = JSON.parse(saved).map((conv: any) => ({
          ...conv,
          timestamp: new Date(conv.timestamp),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        this.conversations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      } catch (error) {
        console.error('Erreur lors du chargement des conversations:', error);
        this.conversations = [];
      }
    }
  }
  
  private saveConversations(): void {
    localStorage.setItem('gmao-chat-conversations', JSON.stringify(this.conversations));
  }
}