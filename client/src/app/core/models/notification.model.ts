// Notification Models
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: Date;
  isRead: boolean;
  readAt?: Date;
  interventionId?: number;
  interventionTitle?: string;
  triggeredBy?: NotificationUser;
}

export interface NotificationUser {
  id: number;
  nom: string;
  prenom: string;
}

export interface NotificationCount {
  unreadCount: number;
  totalCount: number;
}

export type NotificationType = 
  | 'intervention_assigned'
  | 'intervention_started'
  | 'intervention_completed'
  | 'intervention_cancelled'
  | 'intervention_closed';

export const NotificationTypeLabels: Record<NotificationType, string> = {
  'intervention_assigned': 'Intervention assignée',
  'intervention_started': 'Intervention démarrée',
  'intervention_completed': 'Intervention réalisée',
  'intervention_cancelled': 'Intervention annulée',
  'intervention_closed': 'Intervention clôturée'
};

export const NotificationTypeIcons: Record<NotificationType, string> = {
  'intervention_assigned': 'bi-person-check',
  'intervention_started': 'bi-play-circle',
  'intervention_completed': 'bi-check-circle',
  'intervention_cancelled': 'bi-x-circle',
  'intervention_closed': 'bi-archive'
};
