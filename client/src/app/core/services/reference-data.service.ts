import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// Reference data interfaces
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

export interface GroupeEquipement {
  idGroupe: number;
  nomGroupe: string;
}

export interface Marque {
  idMarque: number;
  nomMarque: string;
}

export interface ModeleEquipement {
  idModele: number;
  nomModele: string;
  idMarque?: number;
  marque?: Marque;
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

export interface StockEntities {
  id: number;
  name: string;
}

export interface StockStatus {
  id: number;
  statusName: string;
}

export interface StockSupplier {
  id: number;
  supplierName: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReferenceDataService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Equipment reference data
  getEquipmentCriticites(): Observable<EquipmentCriticite[]> {
    return this.http.get<EquipmentCriticite[]>(`${this.apiUrl}/equipmentcriticite`, {
      withCredentials: true
    });
  }

  getEtatEquipements(): Observable<EtatEquipement[]> {
    return this.http.get<EtatEquipement[]>(`${this.apiUrl}/etatequipement`, {
      withCredentials: true
    });
  }

  getFamillesEquipement(): Observable<FamilleEquipement[]> {
    return this.http.get<FamilleEquipement[]>(`${this.apiUrl}/familleequipment`, {
      withCredentials: true
    });
  }

  getGroupesEquipement(): Observable<GroupeEquipement[]> {
    return this.http.get<GroupeEquipement[]>(`${this.apiUrl}/groupeequipement`, {
      withCredentials: true
    });
  }

  getMarques(): Observable<Marque[]> {
    return this.http.get<Marque[]>(`${this.apiUrl}/marque`, {
      withCredentials: true
    });
  }

  getModelesEquipement(): Observable<ModeleEquipement[]> {
    return this.http.get<ModeleEquipement[]>(`${this.apiUrl}/modeleequipement`, {
      withCredentials: true
    });
  }

  // Intervention reference data
  getInterventionEtats(): Observable<InterventionEtat[]> {
    return this.http.get<InterventionEtat[]>(`${this.apiUrl}/etat`, {
      withCredentials: true
    });
  }

  getInterventionStatuses(): Observable<InterventionStatus[]> {
    return this.http.get<InterventionStatus[]>(`${this.apiUrl}/status`, {
      withCredentials: true
    });
  }

  getTypesIntervention(): Observable<TypeIntervention[]> {
    return this.http.get<TypeIntervention[]>(`${this.apiUrl}/typeintervention`, {
      withCredentials: true
    });
  }

  getUrgences(): Observable<Urgence[]> {
    return this.http.get<Urgence[]>(`${this.apiUrl}/urgence`, {
      withCredentials: true
    });
  }

  getChainesProduction(): Observable<ChaineProduction[]> {
    return this.http.get<ChaineProduction[]>(`${this.apiUrl}/chaineproduction`, {
      withCredentials: true
    });
  }

  getPannes(): Observable<Panne[]> {
    return this.http.get<Panne[]>(`${this.apiUrl}/panne`, {
      withCredentials: true
    });
  }

  // Piece reference data
  getFamillesPiece(): Observable<FamillePiece[]> {
    return this.http.get<FamillePiece[]>(`${this.apiUrl}/famillepiece`, {
      withCredentials: true
    });
  }

  getConstructeurs(): Observable<Constructeur[]> {
    return this.http.get<Constructeur[]>(`${this.apiUrl}/constructeur`, {
      withCredentials: true
    });
  }

  getCriticitesPiece(): Observable<CriticitePiece[]> {
    return this.http.get<CriticitePiece[]>(`${this.apiUrl}/criticitepiece`, {
      withCredentials: true
    });
  }

  // Stock reference data
  getStockEntities(): Observable<StockEntities[]> {
    return this.http.get<StockEntities[]>(`${this.apiUrl}/stockentities`, {
      withCredentials: true
    });
  }

  getStockStatuses(): Observable<StockStatus[]> {
    return this.http.get<StockStatus[]>(`${this.apiUrl}/stockstatus`, {
      withCredentials: true
    });
  }

  getStockSuppliers(): Observable<StockSupplier[]> {
    return this.http.get<StockSupplier[]>(`${this.apiUrl}/stocksupplier`, {
      withCredentials: true
    });
  }
}
