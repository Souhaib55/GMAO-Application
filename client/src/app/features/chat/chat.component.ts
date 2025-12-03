import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GmaoChatService, ChatConversation } from './services/gmao-chat.service';
import { ChatMessage } from '../../core/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('inputField') inputField!: ElementRef;

  messages: ChatMessage[] = [];
  conversations: ChatConversation[] = [];
  userInput: string = '';
  loading: boolean = false;
  sidebarCollapsed: boolean = false;
  
  // Edit mode for renaming
  editingConversationId: string | null = null;
  editingTitle: string = '';
  
  // Context menu
  contextMenuVisible: boolean = false;
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  contextMenuConversation: ChatConversation | null = null;

  private subscriptions: Subscription[] = [];

  constructor(private chatService: GmaoChatService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.chatService.conversationHistory$.subscribe(messages => {
        this.messages = messages;
        setTimeout(() => this.scrollToBottom(), 100);
      }),
      this.chatService.conversations$.subscribe(conversations => {
        this.conversations = conversations;
      })
    );

    // Close context menu on click outside
    document.addEventListener('click', this.closeContextMenu.bind(this));
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    document.removeEventListener('click', this.closeContextMenu.bind(this));
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.loading) return;

    const query = this.userInput.trim();
    this.userInput = '';
    this.loading = true;
    this.resetTextarea();

    this.chatService.query(query).subscribe({
      next: () => {
        this.loading = false;
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Chat error:', err);
        this.loading = false;
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Désolé, une erreur s\'est produite. Veuillez réessayer.',
          timestamp: new Date()
        };
        this.messages = [...this.messages, errorMessage];
      }
    });
  }

  handleEnter(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    if (event.shiftKey) {
      return;
    }
    event.preventDefault();
    this.sendMessage();
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  }

  resetTextarea(): void {
    if (this.inputField?.nativeElement) {
      this.inputField.nativeElement.style.height = 'auto';
    }
  }

  // ===== Conversation Management =====
  
  startNewChat(): void {
    this.chatService.startNewConversation();
    this.sidebarCollapsed = window.innerWidth < 1024;
  }

  loadConversation(conversation: ChatConversation): void {
    this.chatService.loadConversation(conversation.id);
    this.sidebarCollapsed = window.innerWidth < 1024;
  }

  deleteConversation(conversationId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.chatService.deleteConversation(conversationId);
    this.closeContextMenu();
  }

  clearAllHistory(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer TOUTES les conversations ?')) {
      this.chatService.clearAllHistory();
    }
  }

  clearHistory(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      this.chatService.clearHistory();
    }
  }

  // ===== Rename Conversation =====
  
  startRenaming(conversation: ChatConversation, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.editingConversationId = conversation.id;
    this.editingTitle = conversation.title;
    this.closeContextMenu();
  }

  saveRename(conversationId: string): void {
    if (this.editingTitle.trim()) {
      this.chatService.renameConversation(conversationId, this.editingTitle.trim());
    }
    this.cancelRename();
  }

  cancelRename(): void {
    this.editingConversationId = null;
    this.editingTitle = '';
  }

  handleRenameKeydown(event: KeyboardEvent, conversationId: string): void {
    if (event.key === 'Enter') {
      this.saveRename(conversationId);
    } else if (event.key === 'Escape') {
      this.cancelRename();
    }
  }

  // ===== Context Menu =====
  
  showContextMenu(event: MouseEvent, conversation: ChatConversation): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuConversation = conversation;
    this.contextMenuVisible = true;
  }

  closeContextMenu(): void {
    this.contextMenuVisible = false;
    this.contextMenuConversation = null;
  }

  // ===== Utility Methods =====

  isActiveConversation(conversationId: string): boolean {
    return this.chatService.getCurrentConversationId() === conversationId;
  }

  copyToClipboard(text: string | undefined): void {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  }

  formatMessage(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = 
        this.messagesContainer.nativeElement.scrollHeight;
    } catch(err) {}
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  }
}
