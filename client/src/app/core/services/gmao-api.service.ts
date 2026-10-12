import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/* ------------------------------------------------------------------ Models */

export interface RefItem { id: number; libelle: string; }

export interface Paged<T> { data: T[]; totalCount: number; page: number; pageSize: number; }

// Préventif
export interface PlanRow {
  id: number; code: string; titre: string; frequence: string; intervalle: number; frequenceLibelle: string;
  dureeEstimeeMinutes: number | null; prochaineEcheance: string; derniereGeneration: string | null;
  delaiGenerationJours: number; isActif: boolean; joursAvantEcheance: number; nbTaches: number; otEnRetard: number;
  equipement: { idEquipement: number; codeEquipement: string; designation: string };
  chaine: string | null;
  technicien: { id: number; prenom: string; nom: string } | null;
  dernierOt: { idDemandeIntervention: number; datePlanifiee: string; statusId: number; dateRealisation: string | null } | null;
}

export interface PlanDetail {
  plan: {
    id: number; code: string; titre: string; description: string | null; idEquipement: number; idTypeIntervention: number | null;
    frequence: string; intervalle: number; dureeEstimeeMinutes: number | null; idTechnicien: number | null; dateDebut: string;
    prochaineEcheance: string; derniereGeneration: string | null; delaiGenerationJours: number; isActif: boolean; dateCreation: string;
    equipement: { idEquipement: number; codeEquipement: string; designation: string };
    technicien: { id: number; prenom: string; nom: string } | null;
    taches: { id: number; ordre: number; libelle: string }[];
    historique: { idDemandeIntervention: number; titre: string; datePlanifiee: string; dateRealisation: string | null; statusId: number; statut: string; technicien: string | null }[];
  };
  frequenceLibelle: string;
}

export interface PlanPayload {
  titre: string; description?: string | null; idEquipement: number; idTypeIntervention?: number | null; frequence: string; intervalle: number;
  dureeEstimeeMinutes?: number | null; idTechnicien?: number | null; dateDebut?: string | null; prochaineEcheance?: string | null;
  delaiGenerationJours: number; isActif: boolean; taches: string[];
}

export interface CalendarEvent {
  type: 'ot' | 'prevision'; date: string; idDemandeIntervention: number | null; planId: number | null; titre: string;
  statusId: number; equipement: string | null; technicien: string | null;
}

export interface PreventifStats {
  days: number; dus: number; realises: number; aLHeure: number; tauxRespect: number | null; tauxRealisation: number | null;
  enRetard: number; aVenir7: number; plansActifs: number; equipementsCouverts: number; equipements: number; couverture: number | null; toleranceJours: number;
}

// Magasin
export interface ArticleRow {
  idPiece: number; codePiece: string; designation: string; typeArticle: string; unite: string; quantite_Stock: number;
  seuilMinimum: number; stockMaximum: number | null; prixUnitaire: number; valeur: number; emplacement: string | null;
  isActif: boolean; famille: string; magasin: string | null; fournisseur: string | null; criticite: string; niveau: string;
}

export interface MouvementRow {
  id: number; date: string; type: string; quantite: number; stockApres: number; prixUnitaire: number | null; motif: string | null;
  idPiece?: number; code?: string; designation?: string; unite?: string;
  idDemandeIntervention: number | null; idBonCommande: number | null; bonCommande: string | null; utilisateur: string | null;
}

export interface ArticleDetail {
  article: {
    idPiece: number; codePiece: string; designation: string; description: string | null; typeArticle: string; unite: string;
    idFamillePiece: number; idConstructeur: number | null; idCriticitePiece: number; idMagasin: number | null; idFournisseur: number | null;
    quantite_Stock: number; seuilMinimum: number; stockMaximum: number | null; prixUnitaire: number; emplacement: string | null;
    referenceFournisseur: string | null; delaiApproJours: number | null; isActif: boolean; dateCreation: string;
    famille: string; constructeur: string | null; criticite: string; magasin: string | null; fournisseur: string | null;
  };
  niveau: string; valeur: number; consommation: { mois: string; quantite: number }[];
  consommationMoyenneMensuelle: number; couvertureMois: number | null; mouvements: MouvementRow[];
}

export interface ArticlePayload {
  codePiece: string; designation: string; description?: string | null; typeArticle: string; unite: string;
  idFamillePiece: number; idConstructeur?: number | null; idCriticitePiece: number; idMagasin?: number | null; idFournisseur?: number | null;
  seuilMinimum: number; stockMaximum?: number | null; prixUnitaire: number; emplacement?: string | null;
  referenceFournisseur?: string | null; delaiApproJours?: number | null; isActif: boolean; quantiteInitiale?: number;
}

export interface MagasinSynthese {
  valeur: number; articles: number; ruptures: number; sousSeuil: number; entrees30: number; sorties30: number; valeurDormante: number;
  topConsommes: { idPiece: number; codePiece: string; designation: string; unite: string; quantite: number; valeur: number }[];
  parType: { type: string; articles: number; valeur: number }[];
}

export interface ReapproRow {
  idPiece: number; codePiece: string; designation: string; unite: string; quantite_Stock: number; seuilMinimum: number;
  stockMaximum: number | null; prixUnitaire: number; idFournisseur: number | null; fournisseur: string | null;
  delaiApproJours: number | null; enCommande: number; quantiteSuggeree: number; montantEstime: number;
}

export interface MagasinRefs {
  types: string[]; familles: RefItem[]; constructeurs: RefItem[]; criticites: RefItem[]; magasins: RefItem[]; fournisseurs: RefItem[];
}

export interface MagasinRow { id: number; code: string; nom: string; description: string | null; isActif: boolean; articles: number; valeur: number; }

// Fournisseurs & achats
export interface FournisseurRow {
  id: number; code: string; nom: string; contact: string | null; telephone: string | null; email: string | null; adresse: string | null;
  delaiLivraisonJours: number | null; notes: string | null; isActif: boolean; articles: number; commandesEnCours: number;
  achats12Mois: number; livraisonsALHeure: number; livraisons: number;
}

export interface LigneAchat { id?: number; idPiece: number | null; designation: string; quantite: number; prix?: number | null; prixEstime?: number | null; code?: string | null; }

export interface DemandeAchatRow {
  id: number; numero: string; dateDemande: string; statut: string; motif: string | null; idDemandeIntervention: number | null;
  dateDecision: string | null; commentaireDecision: string | null; demandeur: string; lignes: LigneAchat[]; montantEstime: number;
  bonCommande: { id: number; numero: string } | null;
}

export interface CommandeRow {
  id: number; numero: string; statut: string; dateCommande: string; dateLivraisonPrevue: string | null; dateReceptionComplete: string | null;
  notes: string | null; idFournisseur: number; fournisseur: string; demandeAchat: string | null; montant: number; montantRecu: number;
  nbLignes: number; enRetard: boolean;
}

export interface CommandeDetail {
  bc: {
    id: number; numero: string; statut: string; dateCommande: string; dateLivraisonPrevue: string | null; dateReceptionComplete: string | null;
    notes: string | null; dateCreation: string; idFournisseur: number; idDemandeAchat: number | null;
    fournisseur: { id: number; nom: string; contact: string | null; telephone: string | null; email: string | null; adresse: string | null };
    demandeAchat: string | null;
    lignes: { id: number; idPiece: number | null; designation: string; quantite: number; quantiteRecue: number; prixUnitaire: number; montant: number; code: string | null; unite: string | null }[];
    receptions: { date: string; quantite: number; codePiece: string; designation: string; utilisateur: string | null }[];
  };
  montant: number;
}

export interface AchatsSynthese {
  engageAnnee: number; enAttente: number; enRetard: number; daEnAttente: number; daApprouvees: number; brouillons: number;
  parMois: { mois: number; montant: number }[];
}

// Budgets
export interface BudgetLigne {
  id: number; annee: number; categorie: string; idChaineProduction: number | null; chaine: string | null; montant: number; notes: string | null;
  realise: number; taux: number | null; prorata: number; ecart: number;
}

export interface BudgetVue {
  annee: number; categories: string[]; lignes: BudgetLigne[];
  parMois: { mois: number; mainOeuvre: number; pieces: number; sousTraitance: number }[];
  parChaine: { chaineId: number | null; chaine: string; montant: number }[];
  budgetTotal: number; realiseTotal: number; tauxConsommation: number | null; moisEcoules: number; fractionEcoulee: number;
}

// Techniciens
export interface TechnicienRow {
  id: number; nom: string; prenom: string; email: string; telephone: string | null; specialite: string | null; tauxHoraire: number | null;
  enCours: number; aFaire: number; enRetard: number; realisees: number; heuresSaisies: number; heuresPlanifiees: number; charge: number;
}

// Suivi d'intervention
export interface SuiviIntervention {
  datePlanifiee: string | null; dureeEstimeeMinutes: number | null; cause: string | null; remede: string | null; coutExterne: number | null;
  plan: { id: number; code: string; titre: string } | null;
  temps: { id: number; debut: string; fin: string | null; dureeMinutes: number; commentaire: string | null; idTechnicien: number; technicien: string; tauxHoraire: number | null }[];
  pieces: { id: number; idPiece: number; codePiece: string; designation: string; unite: string; quantite: number; prixUnitaire: number; date: string; montant: number }[];
  taches: { id: number; ordre: number; libelle: string; fait: boolean; dateFait: string | null }[];
  cout: { mainOeuvre: number; pieces: number; externe: number; total: number; heures: number };
  journal: { date: string; utilisateurNom: string | null; action: string; details: string | null }[];
  peutSaisir: boolean; peutPlanifier: boolean;
  statusId: number; estTechnicienAffecte: boolean; estSuperviseur: boolean; compteRendu: string | null;
}

export interface PieceJointeRow { id: number; nomFichier: string; contentType: string; taille: number; dateAjout: string; }

// Équipement 360
export interface EquipementHistorique {
  equipement: {
    idEquipement: number; codeEquipement: string; designation: string; emplacement: string | null; numeroSerie: string | null;
    dateMiseEnService: string | null; dateFinGarantie: string | null; coutAchat: number | null; isDeleted: boolean;
    chaine: string | null; etat: string | null; criticite: string | null; fournisseur: string | null;
  };
  indicateurs: {
    interventions12Mois: number; pannes12Mois: number; heuresArret: number; disponibilite: number; mtbfHeures: number | null;
    mttrHeures: number | null; cout12Mois: number; coutTotal: number; otOuverts: number; dernierepanne: string | null;
  };
  pannesParType: { panne: string; nombre: number }[];
  interventions: {
    idDemandeIntervention: number; titre: string; dateCreation: string; datePlanifiee: string | null; dateRealisation: string | null;
    statusId: number; statut: string; type: string; panne: string; urgence: string; machineArretee: boolean; cause: string | null;
    remede: string | null; technicien: string | null; idPlanPreventif: number | null; cout: number; dureeArretHeures: number | null;
  }[];
  plans: { id: number; code: string; titre: string; frequence: string; intervalle: number; prochaineEcheance: string; isActif: boolean }[];
  piecesConsommees: { idPiece: number; codePiece: string; designation: string; unite: string; quantite: number; montant: number; derniere: string }[];
  documents: number;
}

// Explorateur
export interface ExplorateurQuestion {
  id: string; section: string; question: string; description: string; rendu: 'chiffre' | 'table' | 'barres' | 'ligne';
  parametres: string[]; obligatoires: string[];
}

export interface ExplorateurCatalogue {
  sections: { id: string; libelle: string; icone: string }[];
  questions: ExplorateurQuestion[];
}

export interface ExplorateurListes {
  chaines: RefItem[]; equipements: RefItem[]; techniciens: RefItem[]; articles: RefItem[]; fournisseurs: RefItem[];
}

export interface ExplorateurColonne { cle: string; libelle: string; type: 'text' | 'number' | 'money' | 'percent' | 'hours' | 'date'; }

export interface ExplorateurResultat {
  questionId: string; rendu: string; colonnes: ExplorateurColonne[]; lignes: any[][]; tronque: boolean; dureeMs: number;
}

export interface ExplorateurParams {
  debut?: string | null; fin?: string | null; chaine?: number | null; equipement?: number | null; technicien?: number | null;
  article?: number | null; fournisseur?: number | null; annee?: number | null; top?: number | null;
}

// Paramètres
export interface RapportPowerBi { id?: string; titre: string; description?: string | null; url: string; }

export interface JournalRow { id: number; date: string; utilisateurNom: string | null; entite: string; entiteId: number | null; action: string; details: string | null; }

/* ------------------------------------------------------------------ Client */

function toParams(obj: Record<string, any>): HttpParams {
  let params = new HttpParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') params = params.set(k, String(v));
  });
  return params;
}

/** HTTP client for the maintenance modules added in the 2026 redesign. */
@Injectable({ providedIn: 'root' })
export class GmaoApiService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Préventif
  getPlans(filters: { search?: string; equipementId?: number | null; chaineId?: number | null; actif?: boolean | null } = {}): Observable<PlanRow[]> {
    return this.http.get<PlanRow[]>(`${this.api}/preventif/plans`, { params: toParams(filters) });
  }
  getPlan(id: number): Observable<PlanDetail> { return this.http.get<PlanDetail>(`${this.api}/preventif/plans/${id}`); }
  createPlan(p: PlanPayload): Observable<{ id: number; code: string }> { return this.http.post<{ id: number; code: string }>(`${this.api}/preventif/plans`, p); }
  updatePlan(id: number, p: PlanPayload): Observable<any> { return this.http.put(`${this.api}/preventif/plans/${id}`, p); }
  setPlanActif(id: number, actif: boolean): Observable<any> { return this.http.patch(`${this.api}/preventif/plans/${id}/actif?actif=${actif}`, {}); }
  generatePlan(id: number): Observable<{ generes: any[] }> { return this.http.post<{ generes: any[] }>(`${this.api}/preventif/plans/${id}/generer`, {}); }
  generateAll(): Observable<{ generes: any[] }> { return this.http.post<{ generes: any[] }>(`${this.api}/preventif/generer`, {}); }
  getCalendar(from: string, to: string, chaineId?: number | null): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(`${this.api}/preventif/calendrier`, { params: toParams({ from, to, chaineId }) });
  }
  getPreventifStats(days = 90): Observable<PreventifStats> { return this.http.get<PreventifStats>(`${this.api}/preventif/stats?days=${days}`); }

  // Magasin
  getArticles(filters: Record<string, any>): Observable<Paged<ArticleRow>> {
    return this.http.get<Paged<ArticleRow>>(`${this.api}/magasin/articles`, { params: toParams(filters) });
  }
  getArticle(id: number): Observable<ArticleDetail> { return this.http.get<ArticleDetail>(`${this.api}/magasin/articles/${id}`); }
  createArticle(p: ArticlePayload): Observable<{ idPiece: number }> { return this.http.post<{ idPiece: number }>(`${this.api}/magasin/articles`, p); }
  updateArticle(id: number, p: ArticlePayload): Observable<any> { return this.http.put(`${this.api}/magasin/articles/${id}`, p); }
  createMouvement(p: { idPiece: number; type: string; quantite: number; prixUnitaire?: number | null; motif?: string | null }): Observable<{ id: number; stockApres: number }> {
    return this.http.post<{ id: number; stockApres: number }>(`${this.api}/magasin/mouvements`, p);
  }
  getMouvements(filters: Record<string, any>): Observable<Paged<MouvementRow>> {
    return this.http.get<Paged<MouvementRow>>(`${this.api}/magasin/mouvements`, { params: toParams(filters) });
  }
  getMagasinSynthese(): Observable<MagasinSynthese> { return this.http.get<MagasinSynthese>(`${this.api}/magasin/synthese`); }
  getReappro(): Observable<ReapproRow[]> { return this.http.get<ReapproRow[]>(`${this.api}/magasin/reapprovisionnement`); }
  getMagasinRefs(): Observable<MagasinRefs> { return this.http.get<MagasinRefs>(`${this.api}/magasin/references`); }
  getMagasins(): Observable<MagasinRow[]> { return this.http.get<MagasinRow[]>(`${this.api}/magasin/magasins`); }
  saveMagasin(id: number | null, p: { code: string; nom: string; description?: string | null; isActif: boolean }): Observable<any> {
    return id ? this.http.put(`${this.api}/magasin/magasins/${id}`, p) : this.http.post(`${this.api}/magasin/magasins`, p);
  }

  // Fournisseurs
  getFournisseurs(search = '', inclureInactifs = false): Observable<FournisseurRow[]> {
    return this.http.get<FournisseurRow[]>(`${this.api}/fournisseurs`, { params: toParams({ search, inclureInactifs }) });
  }
  saveFournisseur(id: number | null, p: Partial<FournisseurRow>): Observable<{ id: number; code: string }> {
    return id ? this.http.put<{ id: number; code: string }>(`${this.api}/fournisseurs/${id}`, p) : this.http.post<{ id: number; code: string }>(`${this.api}/fournisseurs`, p);
  }

  // Achats
  getDemandesAchat(statut?: string): Observable<DemandeAchatRow[]> {
    return this.http.get<DemandeAchatRow[]>(`${this.api}/achats/demandes`, { params: toParams({ statut }) });
  }
  createDemandeAchat(p: { motif?: string | null; idDemandeIntervention?: number | null; lignes: LigneAchat[] }): Observable<{ id: number; numero: string }> {
    return this.http.post<{ id: number; numero: string }>(`${this.api}/achats/demandes`, p);
  }
  decideDemandeAchat(id: number, approuver: boolean, commentaire?: string | null): Observable<any> {
    return this.http.post(`${this.api}/achats/demandes/${id}/decision`, { approuver, commentaire });
  }
  getCommandes(filters: { statut?: string; fournisseurId?: number | null; search?: string } = {}): Observable<CommandeRow[]> {
    return this.http.get<CommandeRow[]>(`${this.api}/achats/commandes`, { params: toParams(filters) });
  }
  getCommande(id: number): Observable<CommandeDetail> { return this.http.get<CommandeDetail>(`${this.api}/achats/commandes/${id}`); }
  createCommande(p: { idFournisseur: number; idDemandeAchat?: number | null; dateLivraisonPrevue?: string | null; notes?: string | null; envoyer: boolean; lignes: LigneAchat[] }): Observable<{ id: number; numero: string }> {
    return this.http.post<{ id: number; numero: string }>(`${this.api}/achats/commandes`, p);
  }
  updateCommande(id: number, p: { idFournisseur: number; dateLivraisonPrevue?: string | null; notes?: string | null; envoyer: boolean; lignes: LigneAchat[] }): Observable<any> {
    return this.http.put(`${this.api}/achats/commandes/${id}`, p);
  }
  sendCommande(id: number): Observable<any> { return this.http.post(`${this.api}/achats/commandes/${id}/envoyer`, {}); }
  cancelCommande(id: number, commentaire: string): Observable<any> { return this.http.post(`${this.api}/achats/commandes/${id}/annuler`, { approuver: false, commentaire }); }
  receiveCommande(id: number, lignes: { idLigne: number; quantite: number }[], bonLivraison?: string | null): Observable<{ statut: string }> {
    return this.http.post<{ statut: string }>(`${this.api}/achats/commandes/${id}/reception`, { lignes, bonLivraison });
  }
  getAchatsSynthese(): Observable<AchatsSynthese> { return this.http.get<AchatsSynthese>(`${this.api}/achats/synthese`); }

  // Budgets
  getBudgets(annee: number): Observable<BudgetVue> { return this.http.get<BudgetVue>(`${this.api}/budgets?annee=${annee}`); }
  saveBudget(id: number | null, p: { annee: number; categorie: string; idChaineProduction?: number | null; montant: number; notes?: string | null }): Observable<any> {
    return id ? this.http.put(`${this.api}/budgets/${id}`, p) : this.http.post(`${this.api}/budgets`, p);
  }
  deleteBudget(id: number): Observable<any> { return this.http.delete(`${this.api}/budgets/${id}`); }

  // Techniciens
  getTechniciens(days = 30): Observable<TechnicienRow[]> { return this.http.get<TechnicienRow[]>(`${this.api}/techniciens?days=${days}`); }
  updateTechnicien(id: number, p: { tauxHoraire: number | null; specialite: string | null; telephone: string | null }): Observable<any> {
    return this.http.put(`${this.api}/techniciens/${id}`, p);
  }

  // Suivi d'intervention
  getSuivi(id: number): Observable<SuiviIntervention> { return this.http.get<SuiviIntervention>(`${this.api}/interventions/${id}/suivi`); }
  addTemps(id: number, p: { idTechnicien?: number | null; debut: string; fin?: string | null; dureeMinutes?: number | null; commentaire?: string | null }): Observable<any> {
    return this.http.post(`${this.api}/interventions/${id}/temps`, p);
  }
  deleteTemps(id: number, tempsId: number): Observable<any> { return this.http.delete(`${this.api}/interventions/${id}/temps/${tempsId}`); }
  addPiece(id: number, p: { idPiece: number; quantite: number }): Observable<{ stockRestant: number }> {
    return this.http.post<{ stockRestant: number }>(`${this.api}/interventions/${id}/pieces`, p);
  }
  deletePiece(id: number, ligneId: number): Observable<any> { return this.http.delete(`${this.api}/interventions/${id}/pieces/${ligneId}`); }
  addTache(id: number, libelle: string): Observable<any> { return this.http.post(`${this.api}/interventions/${id}/taches`, { libelle }); }
  toggleTache(id: number, tacheId: number, fait: boolean): Observable<any> { return this.http.patch(`${this.api}/interventions/${id}/taches/${tacheId}?fait=${fait}`, {}); }
  deleteTache(id: number, tacheId: number): Observable<any> { return this.http.delete(`${this.api}/interventions/${id}/taches/${tacheId}`); }
  saveAnalyse(id: number, p: { cause: string | null; remede: string | null; coutExterne: number | null; datePlanifiee?: string | null; dureeEstimeeMinutes?: number | null }): Observable<any> {
    return this.http.put(`${this.api}/interventions/${id}/analyse`, p);
  }

  // Workflow actions (existing endpoints of the work-order controller)
  acceptIntervention(id: number): Observable<any> { return this.http.post(`${this.api}/DemandeIntervention/${id}/accept`, {}); }
  setInterventionStatus(id: number, statusId: number, compteRendu?: string | null): Observable<any> {
    return this.http.patch(`${this.api}/DemandeIntervention/${id}/status`, { statusId, compteRendu });
  }

  // Pièces jointes
  getPiecesJointes(entite: string, entiteId: number): Observable<{ fichiers: PieceJointeRow[]; peutAjouter: boolean }> {
    return this.http.get<{ fichiers: PieceJointeRow[]; peutAjouter: boolean }>(`${this.api}/pieces-jointes`, { params: toParams({ entite, entiteId }) });
  }
  uploadPieceJointe(entite: string, entiteId: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('entite', entite);
    form.append('entiteId', String(entiteId));
    form.append('file', file, file.name);
    return this.http.post(`${this.api}/pieces-jointes`, form);
  }
  downloadPieceJointe(id: number): Observable<Blob> { return this.http.get(`${this.api}/pieces-jointes/${id}`, { responseType: 'blob' }); }
  deletePieceJointe(id: number): Observable<any> { return this.http.delete(`${this.api}/pieces-jointes/${id}`); }

  // Équipements
  getEquipementHistorique(id: number): Observable<EquipementHistorique> { return this.http.get<EquipementHistorique>(`${this.api}/equipment/${id}/historique`); }

  // Explorateur
  getExplorateurCatalogue(): Observable<ExplorateurCatalogue> { return this.http.get<ExplorateurCatalogue>(`${this.api}/explorateur/catalogue`); }
  getExplorateurListes(): Observable<ExplorateurListes> { return this.http.get<ExplorateurListes>(`${this.api}/explorateur/listes`); }
  runQuestion(id: string, params: ExplorateurParams): Observable<ExplorateurResultat> {
    return this.http.post<ExplorateurResultat>(`${this.api}/explorateur/executer/${encodeURIComponent(id)}`, params);
  }

  // Paramètres et journal
  getPowerBi(): Observable<{ rapports: RapportPowerBi[]; dateModification: string | null }> {
    return this.http.get<{ rapports: RapportPowerBi[]; dateModification: string | null }>(`${this.api}/parametres/powerbi`);
  }
  savePowerBi(rapports: RapportPowerBi[]): Observable<any> { return this.http.put(`${this.api}/parametres/powerbi`, rapports); }
  getJournal(filters: Record<string, any>): Observable<Paged<JournalRow>> {
    return this.http.get<Paged<JournalRow>>(`${this.api}/journal`, { params: toParams(filters) });
  }

  // Lookups shared by several screens
  getListes(): Observable<ExplorateurListes> { return this.getExplorateurListes(); }
}
