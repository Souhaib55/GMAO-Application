// Equipment Models
export interface Equipment {
  idEquipement: number;
  codeEquipement: string;
  designation: string;
  description?: string;
  idCriticite?: number;
  criticite?: EquipmentCriticite;
  idEtat?: number;
  etat?: EtatEquipement;
  idFamille?: number;
  famille?: FamilleEquipement;
  idModele?: number;
  modele?: ModeleEquipement;
  idGroupe?: number;
  groupe?: GroupeEquipement;
  dateInstallation?: Date;
  dateMiseEnService?: Date;
  numeroSerie?: string;
  sousGarantie: boolean;
  dateAchat?: Date;
  dateFinGarantie?: Date;
  dateConstruction?: Date;
  coutAchat?: number;
  dateCreation: Date;
  dateModification: Date;
  isDeleted: boolean;
}

export interface EquipmentCriticite {
  idCriticite: number;
  nomCriticite: string;
}

export interface EtatEquipement {
  idEtat: number;
  nomEtat: string;
}

export interface FamilleEquipement {
  idFamille: number;
  nomFamille: string;
}

export interface ModeleEquipement {
  idModele: number;
  nomModele: string;
  marque?: Marque;
}

export interface Marque {
  idMarque: number;
  nomMarque: string;
}

export interface GroupeEquipement {
  idGroupe: number;
  nomGroupe: string;
}
