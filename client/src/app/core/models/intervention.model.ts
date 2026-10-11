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
  compteRendu?: string;
  statusId?: number;
  idEquipement?: number | null;
  equipement?: EquipementSummary | null;
}

export interface EquipementSummary {
  idEquipement: number;
  codeEquipement: string;
  designation: string;
  idChaineProduction?: number | null;
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

/**
 * Payload sent when creating / editing a request. The creation date, the
 * requester, the machine-stop flag and the status are set by the server.
 */
export interface InterventionDto {
  titre: string;
  idTypeIntervention: number | null;
  idUrgence: number | null;
  idChaineProduction: number | null;
  idPanne: number | null;
  idEquipement?: number | null;
  destinatairesId?: number | null;
  description?: string;
}
