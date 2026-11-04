import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Generic interface for reference data items
export interface ReferenceItem {
  id: number;
  libelle: string;
  code?: string;
  description?: string;
  [key: string]: any;
}

// Equipment Reference Types
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
}

// Intervention Reference Types
export interface InterventionEtat {
  idEtat: number;
  libelle: string;
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

// Resource Reference Types
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

// Stock Reference Types
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

// Reference Data Category Definition
export interface ReferenceCategory {
  key: string;
  label: string;
  description: string;
  endpoint: string;
  idField: string;
  nameField: string;
  icon: string;
  module: string;
  /** Lists people change often come first; the rare ones are folded under "Autres listes". */
  frequent?: boolean;
  hasCode?: boolean;
  hasDescription?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ReferenceManagementService {
  private apiUrl = environment.apiUrl;

  // Define all reference data categories
  private readonly _categories: ReferenceCategory[] = [
    // Machines and production lines
    { key: 'chaineProduction', label: 'Chaînes de production', description: 'Les lignes de l\'atelier : Coupe, Couture A…', endpoint: 'chaineproduction', idField: 'idChaineProduction', nameField: 'libelle', icon: 'git-branch', module: 'equipment', frequent: true },
    { key: 'equipmentCriticite', label: 'Importance des machines', description: 'Critique, important, standard : sert à décider quelle panne traiter d\'abord', endpoint: 'equipmentcriticite', idField: 'idCriticite', nameField: 'nomCriticite', icon: 'alert-triangle', module: 'equipment' },
    { key: 'etatEquipement', label: 'États des machines', description: 'En service, en panne, en maintenance : l\'état « en panne » est mis à jour tout seul', endpoint: 'etatequipement', idField: 'idEtat', nameField: 'nomEtat', icon: 'settings', module: 'equipment' },
    { key: 'familleEquipement', label: 'Familles de machines', description: 'Machines à coudre, de coupe, de repassage…', endpoint: 'familleequipment', idField: 'idFamille', nameField: 'nomFamille', icon: 'folder', module: 'equipment', frequent: true },
    { key: 'groupeEquipement', label: 'Groupes de machines', description: 'Regroupement libre, facultatif', endpoint: 'groupeequipement', idField: 'idGroupe', nameField: 'nomGroupe', icon: 'layers', module: 'equipment' },
    { key: 'marque', label: 'Marques', description: 'Fabricants des machines (JUKI, Brother…)', endpoint: 'marque', idField: 'idMarque', nameField: 'nomMarque', icon: 'award', module: 'equipment', frequent: true },
    { key: 'modeleEquipement', label: 'Modèles de machines', description: 'Modèle précis, rattaché à une marque', endpoint: 'modeleequipement', idField: 'idModele', nameField: 'nomModele', icon: 'cpu', module: 'equipment', frequent: true },
    
    // Intervention Module
    { key: 'etatIntervention', label: 'États d\'intervention (liste technique)', description: 'Reliés aux statuts des interventions : ne pas renommer', endpoint: 'etat', idField: 'idEtat', nameField: 'libelle', icon: 'activity', module: 'interventions' },
    { key: 'typeIntervention', label: 'Types d\'intervention', description: 'Corrective, préventive, dépannage…', endpoint: 'typeintervention', idField: 'idTypeIntervention', nameField: 'libelle', icon: 'tool', module: 'interventions', frequent: true },
    { key: 'urgence', label: 'Niveaux d\'urgence', description: 'Haute, normale, basse', endpoint: 'urgence', idField: 'idUrgence', nameField: 'libelle', icon: 'zap', module: 'interventions' },
    { key: 'panne', label: 'Types de pannes', description: 'Proposés au chef de chaîne quand il déclare une panne', endpoint: 'panne', idField: 'idPanne', nameField: 'libelle', icon: 'alert-circle', module: 'interventions', frequent: true },
    
    // Resource Module
    { key: 'famillePiece', label: 'Familles d\'articles', description: 'Pièces de machines à coudre, composants électriques…', endpoint: 'famillepiece', idField: 'idFamillePiece', nameField: 'nomFamille', icon: 'archive', module: 'resources', frequent: true },
    { key: 'constructeur', label: 'Fabricants des articles', description: 'Marques des pièces de rechange', endpoint: 'constructeur', idField: 'idConstructeur', nameField: 'nomConstructeur', icon: 'hard-hat', module: 'resources', frequent: true },
    { key: 'criticitePiece', label: 'Importance des articles', description: 'Pour repérer les pièces qui ne doivent jamais manquer', endpoint: 'criticitepiece', idField: 'idCriticitePiece', nameField: 'niveauCriticitePiece', icon: 'gauge', module: 'resources' },
    
    // Stock Module
    { key: 'stockEntities', label: 'Entités Stock', description: 'Entités de stock', endpoint: 'stockentities', idField: 'id', nameField: 'name', icon: 'map-pin', module: 'stock' },
    { key: 'stockStatus', label: 'Statuts Stock', description: 'Statuts du stock', endpoint: 'stockstatus', idField: 'id', nameField: 'statusName', icon: 'check-circle', module: 'stock' },
    { key: 'stockSupplier', label: 'Fournisseurs', description: 'Fournisseurs', endpoint: 'stocksupplier', idField: 'id', nameField: 'supplierName', icon: 'truck', module: 'stock' },
  ];

  constructor(private http: HttpClient) {}

  // Get all categories
  getCategories(): ReferenceCategory[] {
    return this._categories;
  }

  // Get category by key
  getCategory(key: string): ReferenceCategory | undefined {
    return this._categories.find(c => c.key === key);
  }

  // Get all items for a category
  getItems(categoryKey: string): Observable<ReferenceItem[]> {
    const category = this.getCategory(categoryKey);
    if (!category) {
      throw new Error(`Category ${categoryKey} not found`);
    }
    return this.http.get<any[]>(`${this.apiUrl}/${category.endpoint}`, {
      withCredentials: true
    });
  }

  // Get single item
  getItem(categoryKey: string, id: number): Observable<any> {
    const category = this.getCategory(categoryKey);
    if (!category) {
      throw new Error(`Category ${categoryKey} not found`);
    }
    return this.http.get<any>(`${this.apiUrl}/${category.endpoint}/${id}`, {
      withCredentials: true
    });
  }

  // Create item
  createItem(categoryKey: string, item: any): Observable<any> {
    const category = this.getCategory(categoryKey);
    if (!category) {
      throw new Error(`Category ${categoryKey} not found`);
    }
    return this.http.post<any>(`${this.apiUrl}/${category.endpoint}`, item, {
      withCredentials: true
    });
  }

  // Update item
  updateItem(categoryKey: string, id: number, item: any): Observable<any> {
    const category = this.getCategory(categoryKey);
    if (!category) {
      throw new Error(`Category ${categoryKey} not found`);
    }
    return this.http.put<any>(`${this.apiUrl}/${category.endpoint}/${id}`, item, {
      withCredentials: true
    });
  }

  // Delete item
  deleteItem(categoryKey: string, id: number): Observable<void> {
    const category = this.getCategory(categoryKey);
    if (!category) {
      throw new Error(`Category ${categoryKey} not found`);
    }
    return this.http.delete<void>(`${this.apiUrl}/${category.endpoint}/${id}`, {
      withCredentials: true
    });
  }

  // Get categories grouped by module
  getCategoriesByModule(): Map<string, ReferenceCategory[]> {
    const grouped = new Map<string, ReferenceCategory[]>();
    this._categories.forEach(cat => {
      if (!grouped.has(cat.module)) {
        grouped.set(cat.module, []);
      }
      grouped.get(cat.module)!.push(cat);
    });
    return grouped;
  }
}
