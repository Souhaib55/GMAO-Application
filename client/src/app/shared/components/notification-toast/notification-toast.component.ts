import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let notification of (notifications$ | async); trackBy: trackById" 
           class="toast" 
           [class.success]="notification.type === 'success'"
           [class.error]="notification.type === 'error'"
           [class.warning]="notification.type === 'warning'"
           [class.info]="notification.type === 'info'">
        <div class="toast-icon">
          <svg *ngIf="notification.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <svg *ngIf="notification.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
          <svg *ngIf="notification.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 9v4M12 17h.01"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <svg *ngIf="notification.type === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4M12 8h.01"/>
          </svg>
        </div>
        <div class="toast-body">
          <div class="toast-title">{{ notification.title }}</div>
          <div class="toast-message">{{ notification.message }}</div>
        </div>
        <button class="toast-close" (click)="close(notification.id)" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        <div class="toast-progress" [style.animation-duration]="notification.duration + 'ms'"></div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      min-width: 340px;
      max-width: 420px;
      padding: 16px 18px;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 10px 20px -5px rgba(0, 0, 0, 0.12),
        0 0 0 1px rgba(0, 0, 0, 0.05);
      animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
      position: relative;
      overflow: hidden;
    }

    @keyframes toastSlideIn {
      from {
        transform: translateX(120%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 22px;
        height: 22px;
      }
    }

    .toast.success .toast-icon {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      color: #059669;
    }

    .toast.error .toast-icon {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      color: #dc2626;
    }

    .toast.warning .toast-icon {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #d97706;
    }

    .toast.info .toast-icon {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #2563eb;
    }

    .toast-body {
      flex: 1;
      min-width: 0;
      padding-top: 2px;
    }

    .toast-title {
      font-weight: 600;
      font-size: 0.9375rem;
      color: #0f172a;
      margin-bottom: 4px;
      line-height: 1.3;
    }

    .toast-message {
      font-size: 0.875rem;
      color: #64748b;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .toast-close {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s ease;
      margin: -4px -4px -4px 0;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: #f1f5f9;
        color: #475569;
      }
    }

    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      transform-origin: left;
      animation: progressShrink linear forwards;
    }

    @keyframes progressShrink {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }

    .toast.success .toast-progress {
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
    }

    .toast.error .toast-progress {
      background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
    }

    .toast.warning .toast-progress {
      background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
    }

    .toast.info .toast-progress {
      background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
    }

    /* Mobile Styles */
    @media (max-width: 480px) {
      .toast-container {
        left: 16px;
        right: 16px;
        top: 16px;
      }

      .toast {
        min-width: 0;
        max-width: none;
        padding: 14px 16px;
      }

      .toast-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;

        svg {
          width: 18px;
          height: 18px;
        }
      }

      .toast-title {
        font-size: 0.875rem;
      }

      .toast-message {
        font-size: 0.8125rem;
      }
    }
  `]
})
export class NotificationToastComponent implements OnInit {
  notifications$: Observable<Notification[]>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications;
  }

  ngOnInit(): void {}

  trackById(index: number, notification: Notification): string {
    return notification.id;
  }

  close(id: string): void {
    this.notificationService.remove(id);
  }
}
