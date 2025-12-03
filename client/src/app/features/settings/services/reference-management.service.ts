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
    // Equipment Module
    { key: 'equipmentCriticite', label: 'Criticité Équipement', description: 'Niveaux de criticité des équipements', endpoint: 'equipmentcriticite', idField: 'idCriticite', nameField: 'nomCriticite', icon: '⚠️', module: 'equipment' },
    { key: 'etatEquipement', label: 'État Équipement', description: 'États possibles des équipements', endpoint: 'etatequipement', idField: 'idEtat', nameField: 'nomEtat', icon: '🔧', module: 'equipment' },
    { key: 'familleEquipement', label: 'Famille Équipement', description: 'Familles d\'équipements', endpoint: 'familleequipment', idField: 'idFamille', nameField: 'nomFamille', icon: '📁', module: 'equipment' },
    { key: 'groupeEquipement', label: 'Groupe Équipement', description: 'Groupes d\'équipements', endpoint: 'groupeequipement', idField: 'idGroupe', nameField: 'nomGroupe', icon: '📦', module: 'equipment' },
    { key: 'marque', label: 'Marques', description: 'Marques des équipements', endpoint: 'marque', idField: 'idMarque', nameField: 'nomMarque', icon: '🏭', module: 'equipment' },
    { key: 'modeleEquipement', label: 'Modèles Équipement', description: 'Modèles d\'équipements', endpoint: 'modeleequipement', idField: 'idModele', nameField: 'nomModele', icon: '📋', module: 'equipment' },
    
    // Intervention Module
    { key: 'etatIntervention', label: 'État Intervention', description: 'États des interventions', endpoint: 'etat', idField: 'idEtat', nameField: 'libelle', icon: '📊', module: 'interventions' },
    { key: 'typeIntervention', label: 'Type Intervention', description: 'Types d\'interventions', endpoint: 'typeintervention', idField: 'idTypeIntervention', nameField: 'libelle', icon: '🔨', module: 'interventions' },
    { key: 'urgence', label: 'Niveaux d\'Urgence', description: 'Niveaux d\'urgence', endpoint: 'urgence', idField: 'idUrgence', nameField: 'libelle', icon: '🚨', module: 'interventions' },
    { key: 'chaineProduction', label: 'Chaînes de Production', description: 'Chaînes de production', endpoint: 'chaineproduction', idField: 'idChaineProduction', nameField: 'libelle', icon: '🏭', module: 'interventions' },
    { key: 'panne', label: 'Types de Pannes', description: 'Types de pannes', endpoint: 'panne', idField: 'idPanne', nameField: 'libelle', icon: '❌', module: 'interventions' },
    
    // Resource Module
    { key: 'famillePiece', label: 'Famille Pièces', description: 'Familles de pièces', endpoint: 'famillepiece', idField: 'idFamillePiece', nameField: 'nomFamille', icon: '🗂️', module: 'resources' },
    { key: 'constructeur', label: 'Constructeurs', description: 'Constructeurs', endpoint: 'constructeur', idField: 'idConstructeur', nameField: 'nomConstructeur', icon: '🏗️', module: 'resources' },
    { key: 'criticitePiece', label: 'Criticité Pièces', description: 'Niveaux de criticité des pièces', endpoint: 'criticitepiece', idField: 'idCriticitePiece', nameField: 'niveauCriticitePiece', icon: '⚡', module: 'resources' },
    
    // Stock Module
    { key: 'stockEntities', label: 'Entités Stock', description: 'Entités de stock', endpoint: 'stockentities', idField: 'id', nameField: 'name', icon: '📍', module: 'stock' },
    { key: 'stockStatus', label: 'Statuts Stock', description: 'Statuts du stock', endpoint: 'stockstatus', idField: 'id', nameField: 'statusName', icon: '✅', module: 'stock' },
    { key: 'stockSupplier', label: 'Fournisseurs', description: 'Fournisseurs', endpoint: 'stocksupplier', idField: 'id', nameField: 'supplierName', icon: '🚚', module: 'stock' },
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
