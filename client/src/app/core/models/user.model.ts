// User Models
export interface User {
  id: number;
  appUserId: string;
  nom: string;
  prenom: string;
  email: string;
  dateCreation: Date;
  dateModification: Date;
  isActif: boolean;
  idRole: number;
  role?: Role;
}

export interface UserInfo {
  id?: string;
  userId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  internalId: number;
}

export interface Role {
  idRole: number;
  libelle: string;
}

export enum UserRole {
  Superviseur = 'Superviseur',
  Demandeur = 'Demandeur',
  Utilisateur = 'Utilisateur'
}

export interface UserSummary {
  id?: number;
  ID?: number;
  nom: string;
  prenom: string;
  email?: string;
}

// DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: number;
}
