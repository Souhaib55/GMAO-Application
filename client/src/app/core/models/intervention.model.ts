import { UserSummary } from './user.model';

// Intervention Models
export interface DemandeIntervention {
  idDemandeIntervention: number;
  titre: string;
  dateCreation: Date;
  fileName?: string;
  fichierJoint?: string;
  machineArretee: boolean;
  machineArrete?: boolean;
  etat?: InterventionEtat;
  status?: InterventionStatus;
  type?: TypeIntervention;
  typeIntervention?: TypeIntervention;
  urgence?: Urgence;
  chaineProduction?: ChaineProduction;
  panne?: Panne;
  demandeur?: UserSummary;
  demandeurs?: UserSummary;
  demandeursId?: number;
  demandeursID?: number;
  destinataire?: UserSummary;
  destinatairesId?: number;
  destinatairesID?: number;
  technicienId?: string;
  dateAssignation?: Date;
  dateRealisation?: Date;
  dateCloture?: Date;
  raisonAnnulation?: string;
  isActif: boolean;
  datePriseEnCharge?: Date;
  dateResolution?: Date;
  description?: string;
}

export interface InterventionEtat {
  idEtat: number;
  libelle: string;
}

export interface InterventionStatus {
  id: number;
  statut: string;
}

export interface TypeIntervention {
  idTypeIntervention: number;
  libelle: string;
}

export interface Urgence {
  idUrgence: number;
  libelle: string;
}

export interface ChaineProduction {
  idChaineProduction: number;
  libelle: string;
}

export interface Panne {
  idPanne: number;
  libelle: string;
}

export interface InterventionDto {
  titre: string;
  dateCreation: string | Date;
  machineArretee: boolean;
  idEtat: number | null;
  idTypeIntervention: number | null;
  idUrgence: number | null;
  idChaineProduction: number | null;
  idPanne: number | null;
  demandeursId: number;
  destinatairesId?: number | null;
  description?: string;
}
