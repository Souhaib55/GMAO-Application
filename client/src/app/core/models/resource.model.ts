// Resource (Piece) Models
export interface Piece {
  idPiece: number;
  codePiece: string;
  designation: string;
  description?: string;
  idFamillePiece?: number;
  famillePiece?: FamillePiece;
  idConstructeur?: number;
  constructeur?: Constructeur;
  idCriticitePiece?: number;
  criticitePiece?: CriticitePiece;
  quantite_Stock: number;
  seuilMinimum?: number;
  enAlerte?: boolean;
  prixUnitaire: number;
  dateCreation: Date;
  dateModification: Date;
  isActif: boolean;
}

export interface FamillePiece {
  idFamillePiece: number;
  nomFamille: string;
}

export interface Constructeur {
  idConstructeur: number;
  nomConstructeur: string;
}

export interface CriticitePiece {
  idCriticitePiece: number;
  niveauCriticitePiece: string;
}
