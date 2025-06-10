import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-helpcomponent',
  templateUrl: './helpcomponent.component.html',
  styleUrls: ['./helpcomponent.component.scss']
})
export class HelpcomponentComponent implements OnInit {
  // URLs de base pour les API
  baseUrls: { [key: string]: string } = {
    'intervention-type': 'https://localhost:5001/api/TypeIntervention',
    'urgence': 'https://localhost:5001/api/Urgence',
    'etat': 'https://localhost:5001/api/Etat',
    'panne': 'https://localhost:5001/api/Panne',
    'chaine': 'https://localhost:5001/api/ChaineProduction',
    'famille-equip': 'https://localhost:5001/api/FamilleEquipment',
    'criticite': 'https://localhost:5001/api/EquipmentCriticite',
    'etat-equip': 'https://localhost:5001/api/EtatEquipement',
    'modele': 'https://localhost:5001/api/ModeleEquipement',
    'groupe': 'https://localhost:5001/api/GroupeEquipement',
    'famille-piece': 'https://localhost:5001/api/FamillePiece',
    'constructeur': 'https://localhost:5001/api/Constructeur',
    'criticite-piece': 'https://localhost:5001/api/CriticitePiece',
    'stock-status': 'https://localhost:5001/api/StockStatus',
    'supplier': 'https://localhost:5001/api/Supplier',
    'user': 'https://localhost:5001/api/Users',
    'role': 'https://localhost:5001/api/Role'
  };

  // Liste des données
  typeInterventionList: any[] = [];
  urgenceList: any[] = [];
  etatList: any[] = [];
  panneList: any[] = [];
  chaineProductionList: any[] = [];
  familleEquipmentList: any[] = [];
  criticiteList: any[] = [];
  etatEquipementList: any[] = [];
  modeleList: any[] = [];
  groupeList: any[] = [];
  marqueList: any[] = [];
  famillePieceList: any[] = [];
  constructeurList: any[] = [];
  criticitePieceList: any[] = [];
  stockStatusList: any[] = [];
  supplierList: any[] = [];
  userList: any[] = [];
  roleList: any[] = [];

  // Listes filtrées
  filteredTypeInterventions: any[] = [];
  filteredUrgences: any[] = [];
  filteredEtats: any[] = [];
  filteredPannes: any[] = [];
  filteredChaines: any[] = [];
  filteredFamilleEquipements: any[] = [];
  filteredCriticites: any[] = [];
  filteredEtatEquipements: any[] = [];
  filteredModeles: any[] = [];
  filteredGroupes: any[] = [];
  filteredFamillePieces: any[] = [];
  filteredConstructeurs: any[] = [];
  filteredCriticitePieces: any[] = [];
  filteredStockStatuses: any[] = [];
  filteredSuppliers: any[] = [];

  // Datasource pour le tableau des utilisateurs
  userDataSource = new MatTableDataSource<any>([]);

  // État du composant
  isLoading: boolean = true;
  activeTabIndex: number = 0;
  showModal: boolean = false;
  modalType: string = '';
  isEditMode: boolean = false;
  selectedItem: any = null;
  modalForm: FormGroup;
  successMessage: string = '';
  errorMessage: string = '';
  isSubmitting: boolean = false;
  currentUser: any = null;

  constructor(private http: HttpClient, private fb: FormBuilder) {
    this.modalForm = this.fb.group({
      name: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Charger les données du premier onglet
    this.loadTabData(0);

    // Récupérer l'utilisateur actuel (si nécessaire)
    // this.authService.getCurrentUser().subscribe(user => this.currentUser = user);

    // Simuler un utilisateur avec un rôle pour le développement
    this.currentUser = { role: 'Superviseur' };
  }

  /**
   * Charge les données en fonction de l'onglet actif
   */
  loadTabData(tabIndex: number): void {
    this.isLoading = true;
    switch (tabIndex) {
      case 0:
        this.loadInterventionData();
        break;
      case 1:
        this.loadEquipmentData();
        break;
      case 2:
        this.loadStockData();
        break;
      case 3:
        // Charger les rôles d'abord, puis les utilisateurs
        this.http.get<any[]>(this.baseUrls['role']).pipe(
          catchError(error => {
            console.error('Error loading roles', error);
            return of([]);
          })
        ).subscribe(roles => {
          console.log('Roles loaded from API:', roles);
          
          if (roles && roles.length > 0) {
            this.roleList = roles;
          } else {
            console.warn('Aucun rôle chargé depuis l\'API, utilisation des rôles par défaut');
            // Ajouter des rôles par défaut si aucun n'est chargé
            this.roleList = [
              { IDRole: 1, Libelle: 'Administrateur' },
              { IDRole: 2, Libelle: 'Superviseur' },
              { IDRole: 3, Libelle: 'Technicien' },
              { IDRole: 4, Libelle: 'Utilisateur' }
            ];
          }
          
          console.log('Final role list:', this.roleList);
          // Maintenant charger les utilisateurs
          this.loadUserData();
        });
        break;
    }
  }

  /**
   * Gère le changement d'onglet
   */
  onTabChange(event: MatTabChangeEvent): void {
    this.activeTabIndex = event.index;
    this.loadTabData(event.index);
  }

  /**
   * Charge les données liées aux interventions
   */
  loadInterventionData(): void {
    forkJoin({
      typeInterventions: this.http.get<any[]>(this.baseUrls['intervention-type']).pipe(catchError(error => {
        console.error('Error loading type interventions', error);
        return of([]);
      })),
      urgences: this.http.get<any[]>(this.baseUrls['urgence']).pipe(catchError(error => {
        console.error('Error loading urgences', error);
        return of([]);
      })),
      etats: this.http.get<any[]>(this.baseUrls['etat']).pipe(catchError(error => {
        console.error('Error loading etats', error);
        return of([]);
      })),
      pannes: this.http.get<any[]>(this.baseUrls['panne']).pipe(catchError(error => {
        console.error('Error loading pannes', error);
        return of([]);
      })),
      chaineProductions: this.http.get<any[]>(this.baseUrls['chaine']).pipe(catchError(error => {
        console.error('Error loading chaine productions', error);
        return of([]);
      }))
    }).subscribe(results => {
      // Stocker les résultats
      this.typeInterventionList = results.typeInterventions;
      this.urgenceList = results.urgences;
      this.etatList = results.etats;
      this.panneList = results.pannes;
      this.chaineProductionList = results.chaineProductions;

      // Initialiser les filtres
      this.filteredTypeInterventions = [...this.typeInterventionList];
      this.filteredUrgences = [...this.urgenceList];
      this.filteredEtats = [...this.etatList];
      this.filteredPannes = [...this.panneList];
      this.filteredChaines = [...this.chaineProductionList];

      this.isLoading = false;
    });
  }

  /**
   * Charge les données liées aux équipements
   */
  loadEquipmentData(): void {
    forkJoin({
      familleEquipements: this.http.get<any[]>(this.baseUrls['famille-equip']).pipe(catchError(error => {
        console.error('Error loading famille equipements', error);
        return of([]);
      })),
      criticites: this.http.get<any[]>(this.baseUrls['criticite']).pipe(catchError(error => {
        console.error('Error loading criticites', error);
        return of([]);
      })),
      etatEquipements: this.http.get<any[]>(this.baseUrls['etat-equip']).pipe(catchError(error => {
        console.error('Error loading etat equipements', error);
        return of([]);
      })),
      modeles: this.http.get<any[]>(this.baseUrls['modele']).pipe(catchError(error => {
        console.error('Error loading modeles', error);
        return of([]);
      })),
      groupes: this.http.get<any[]>(this.baseUrls['groupe']).pipe(catchError(error => {
        console.error('Error loading groupes', error);
        return of([]);
      })),
      marques: this.http.get<any[]>('https://localhost:5001/api/Marque').pipe(catchError(error => {
        console.error('Error loading marques', error);
        return of([]);
      }))
    }).subscribe(results => {
      // Stocker les résultats
      this.familleEquipmentList = results.familleEquipements;
      this.criticiteList = results.criticites;
      this.etatEquipementList = results.etatEquipements;
      this.modeleList = results.modeles;
      this.groupeList = results.groupes;
      this.marqueList = results.marques;

      // Initialiser les filtres
      this.filteredFamilleEquipements = [...this.familleEquipmentList];
      this.filteredCriticites = [...this.criticiteList];
      this.filteredEtatEquipements = [...this.etatEquipementList];
      this.filteredModeles = [...this.modeleList];
      this.filteredGroupes = [...this.groupeList];

      this.isLoading = false;
    });
  }

  /**
   * Charge les données liées aux pièces et au stock
   */
  loadStockData(): void {
    forkJoin({
      famillePieces: this.http.get<any[]>(this.baseUrls['famille-piece']).pipe(catchError(error => {
        console.error('Error loading famille pieces', error);
        return of([]);
      })),
      constructeurs: this.http.get<any[]>(this.baseUrls['constructeur']).pipe(catchError(error => {
        console.error('Error loading constructeurs', error);
        return of([]);
      })),
      criticitePieces: this.http.get<any[]>(this.baseUrls['criticite-piece']).pipe(catchError(error => {
        console.error('Error loading criticite pieces', error);
        return of([]);
      })),
      stockStatuses: this.http.get<any[]>(this.baseUrls['stock-status']).pipe(catchError(error => {
        console.error('Error loading stock statuses', error);
        return of([]);
      })),
      suppliers: this.http.get<any[]>(this.baseUrls['supplier']).pipe(catchError(error => {
        console.error('Error loading suppliers', error);
        return of([]);
      }))
    }).subscribe(results => {
      // Stocker les résultats
      this.famillePieceList = results.famillePieces;
      this.constructeurList = results.constructeurs;
      this.criticitePieceList = results.criticitePieces;
      this.stockStatusList = results.stockStatuses;
      this.supplierList = results.suppliers;

      // Initialiser les filtres
      this.filteredFamillePieces = [...this.famillePieceList];
      this.filteredConstructeurs = [...this.constructeurList];
      this.filteredCriticitePieces = [...this.criticitePieceList];
      this.filteredStockStatuses = [...this.stockStatusList];
      this.filteredSuppliers = [...this.supplierList];

      this.isLoading = false;
    });
  }

  /**
   * Charge les données des utilisateurs
   */
  loadUserData(): void {
    this.http.get<any[]>(this.baseUrls['user']).pipe(
      catchError(error => {
        console.error('Error loading users', error);
        return of([]);
      })
    ).subscribe(users => {
      console.log('Users loaded from API:', users);
      this.userList = users;
      
      console.log('Available roles for user enrichment:', this.roleList);
      
      // Enrichir les données utilisateur avec les informations de rôle
      this.userList.forEach(user => {
        console.log(`Processing user ${user.ID || user.id}, role ID: ${user.IDRole || user.idRole}`);
        
        // Vérifier à la fois IDRole et idRole (différence possible de casse)
        const roleId = user.IDRole !== undefined ? user.IDRole : user.idRole;
        
        if (roleId !== undefined && roleId !== null) {
          // Convertir en nombre pour la comparaison
          const numericRoleId = Number(roleId);
          
          // Rechercher le rôle correspondant
          const role = this.roleList.find(r => Number(r.IDRole) === numericRoleId);
          console.log(`Role found for user ID ${user.ID || user.id}:`, role);
          
          if (role) {
            user.Role = {
              IDRole: role.IDRole,
              Libelle: role.Libelle
            };
          } else {
            console.warn(`No role found for user ${user.ID || user.id} with role ID ${numericRoleId}`);
            // Assigner un rôle par défaut si aucun n'est trouvé
            user.Role = {
              IDRole: numericRoleId,
              Libelle: `Rôle ${numericRoleId}`
            };
          }
        } else {
          console.warn(`User ${user.ID || user.id} has no role ID`);
        }
      });
      
      console.log('Users after role enrichment:', this.userList);
      this.userDataSource.data = this.userList;
      this.isLoading = false;
    });
  }

  /**
   * Obtient le libellé du rôle à partir de l'ID
   */
  getRoleNameFromId(roleId: number | string | undefined | null): string {
    if (roleId === undefined || roleId === null) return 'Non défini';
    
    // Convertir en nombre pour la comparaison
    const numericRoleId = Number(roleId);
    console.log(`Getting role name for ID ${numericRoleId}, available roles:`, this.roleList);
    
    if (isNaN(numericRoleId)) return 'Non défini';
    
    const role = this.roleList.find(r => Number(r.IDRole) === numericRoleId);
    return role ? role.Libelle : `Rôle ${numericRoleId}`;
  }

  /**
   * Filtre les éléments d'une liste spécifique en fonction du terme de recherche
   */
  applyFilter(event: Event, listName: string): void {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase().trim();

    switch (listName) {
      case 'typeInterventionList':
        this.filteredTypeInterventions = this.typeInterventionList.filter(item => 
          item.libelle.toLowerCase().includes(filterValue));
        break;
      case 'urgenceList':
        this.filteredUrgences = this.urgenceList.filter(item => 
          item.libelle.toLowerCase().includes(filterValue));
        break;
      case 'etatList':
        this.filteredEtats = this.etatList.filter(item => 
          item.libelle.toLowerCase().includes(filterValue));
        break;
      case 'panneList':
        this.filteredPannes = this.panneList.filter(item => 
          item.libelle.toLowerCase().includes(filterValue));
        break;
      case 'chaineList':
        this.filteredChaines = this.chaineProductionList.filter(item => 
          item.libelle.toLowerCase().includes(filterValue));
        break;
      case 'familleEquipList':
        this.filteredFamilleEquipements = this.familleEquipmentList.filter(item => 
          item.nomFamille.toLowerCase().includes(filterValue));
        break;
      case 'criticiteList':
        this.filteredCriticites = this.criticiteList.filter(item => 
          item.nomCriticite.toLowerCase().includes(filterValue));
        break;
      case 'etatEquipList':
        this.filteredEtatEquipements = this.etatEquipementList.filter(item => 
          item.nomEtat.toLowerCase().includes(filterValue));
        break;
      case 'modeleList':
        this.filteredModeles = this.modeleList.filter(item => 
          item.nomModele.toLowerCase().includes(filterValue));
        break;
      case 'groupeList':
        this.filteredGroupes = this.groupeList.filter(item => 
          item.nomGroupe.toLowerCase().includes(filterValue));
        break;
      case 'famillePieceList':
        this.filteredFamillePieces = this.famillePieceList.filter(item => 
          item.nomFamille.toLowerCase().includes(filterValue));
        break;
      case 'constructeurList':
        this.filteredConstructeurs = this.constructeurList.filter(item => 
          item.nomConstructeur.toLowerCase().includes(filterValue));
        break;
      case 'criticitePieceList':
        this.filteredCriticitePieces = this.criticitePieceList.filter(item => 
          item.niveauCriticitePiece.toLowerCase().includes(filterValue));
        break;
      case 'stockStatusList':
        this.filteredStockStatuses = this.stockStatusList.filter(item => 
          item.status.toLowerCase().includes(filterValue));
        break;
      case 'supplierList':
        this.filteredSuppliers = this.supplierList.filter(item => 
          item.supplierName.toLowerCase().includes(filterValue));
        break;
      case 'userList':
        this.userDataSource.filter = filterValue;
        break;
    }
  }

  /**
   * Ouvre le modal d'ajout pour un type donné
   */
  openAddModal(type: string): void {
    this.modalType = type;
    this.isEditMode = false;
    this.selectedItem = null;
    this.initializeModalForm(type);
    this.showModal = true;
  }

  /**
   * Ouvre le modal d'édition pour un élément spécifique
   */
  openEditModal(type: string, item: any): void {
    this.modalType = type;
    this.isEditMode = true;
    this.selectedItem = item;
    this.initializeModalForm(type, item);
    this.showModal = true;
  }

  /**
   * Ferme le modal
   */
  closeModal(): void {
    this.showModal = false;
    this.modalType = '';
    this.selectedItem = null;
  }

  /**
   * Initialise le formulaire modal en fonction du type et de l'élément à éditer
   */
  initializeModalForm(type: string, item?: any): void {
    switch (type) {
      case 'intervention-type':
      case 'urgence':
      case 'etat':
      case 'panne':
      case 'chaine':
        this.modalForm = this.fb.group({
          name: [item ? item.libelle : '', Validators.required]
        });
        break;
        
      case 'famille-equip':
        this.modalForm = this.fb.group({
          name: [item ? item.nomFamille : '', Validators.required]
        });
        break;
        
      case 'criticite':
        this.modalForm = this.fb.group({
          name: [item ? item.nomCriticite : '', Validators.required]
        });
        break;
        
      case 'etat-equip':
        this.modalForm = this.fb.group({
          name: [item ? item.nomEtat : '', Validators.required]
        });
        break;
        
      case 'modele':
        this.modalForm = this.fb.group({
          name: [item ? item.nomModele : '', Validators.required],
          marqueId: [item ? item.idMarque : '', Validators.required]
        });
        break;
        
      case 'groupe':
        this.modalForm = this.fb.group({
          name: [item ? item.nomGroupe : '', Validators.required]
        });
        break;
        
      case 'famille-piece':
        this.modalForm = this.fb.group({
          name: [item ? item.nomFamille : '', Validators.required]
        });
        break;
        
      case 'constructeur':
        this.modalForm = this.fb.group({
          name: [item ? item.nomConstructeur : '', Validators.required]
        });
        break;
        
      case 'criticite-piece':
        this.modalForm = this.fb.group({
          name: [item ? item.niveauCriticitePiece : '', Validators.required]
        });
        break;
        
      case 'stock-status':
        this.modalForm = this.fb.group({
          name: [item ? item.status : '', Validators.required]
        });
        break;
        
      case 'supplier':
        this.modalForm = this.fb.group({
          name: [item ? item.supplierName : '', Validators.required]
        });
        break;
        
      case 'user':
        // Assurer que IDRole est correctement défini même en mode édition
        const roleId = item ? (item.IDRole !== undefined ? Number(item.IDRole) : 
                              (item.idRole !== undefined ? Number(item.idRole) : '')) : '';
                              
        console.log(`Initializing user form with role ID: ${roleId}`);
        
        this.modalForm = this.fb.group({
          nom: [item ? item.nom : '', Validators.required],
          prenom: [item ? item.prenom : '', Validators.required],
          email: [item ? item.email : '', [Validators.required, Validators.email]],
          IDRole: [roleId, Validators.required],
          password: ['', this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]]
        });
        break;
        
      default:
        this.modalForm = this.fb.group({
          name: ['', Validators.required]
        });
    }
  }

  /**
   * Enregistre l'élément (création ou mise à jour)
   */
  saveItem(): void {
    if (this.modalForm.invalid) {
      this.errorMessage = 'Veuillez remplir correctement tous les champs requis';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    const formValue = this.modalForm.value;

    let apiUrl = this.baseUrls[this.modalType];
    let payload: any;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Préparer les données en fonction du type
    switch (this.modalType) {
      case 'intervention-type':
        payload = { 
          libelle: formValue.name,
          isActif: true
        };
        break;
      case 'urgence':
        payload = { 
          libelle: formValue.name,
          isActif: true
        };
        break;
      case 'etat':
        payload = { 
          libelle: formValue.name,
          isActif: true
        };
        break;
      case 'panne':
        payload = { 
          libelle: formValue.name,
          isActif: true
        };
        break;
      case 'chaine':
        payload = { 
          libelle: formValue.name,
          isActif: true
        };
        break;
      case 'famille-equip':
        payload = { 
          nomFamille: formValue.name,
          isActif: true
        };
        break;
      case 'criticite':
        payload = { 
          nomCriticite: formValue.name,
          isActif: true
        };
        break;
      case 'etat-equip':
        payload = { 
          nomEtat: formValue.name,
          isActif: true
        };
        break;
      case 'modele':
        payload = { 
          nomModele: formValue.name,
          idMarque: formValue.marqueId,
          isActif: true
        };
        break;
      case 'groupe':
        payload = { 
          nomGroupe: formValue.name,
          isActif: true
        };
        break;
      case 'famille-piece':
        payload = { 
          nomFamille: formValue.name,
          isActif: true
        };
        break;
      case 'constructeur':
        payload = { 
          nomConstructeur: formValue.name,
          isActif: true
        };
        break;
      case 'criticite-piece':
        payload = { 
          niveauCriticitePiece: formValue.name,
          isActif: true
        };
        break;
      case 'stock-status':
        payload = { 
          status: formValue.name,
          isActive: true
        };
        break;
      case 'supplier':
        payload = { 
          supplierName: formValue.name,
          isActive: true
        };
        break;
      case 'user':
        if (this.isEditMode) {
          // Pour l'édition, conserver le format existant pour l'API Users
          payload = {
            ID: this.selectedItem.ID,
            nom: formValue.nom,
            prenom: formValue.prenom,
            email: formValue.email,
            IDRole: Number(formValue.IDRole),
            isActif: true,
            DateModification: new Date()
          };
        } else {
          // Pour la création, utiliser le format attendu par l'API Register
          payload = {
            firstName: formValue.prenom,
            lastName: formValue.nom,
            email: formValue.email,
            password: formValue.password,
            roleId: Number(formValue.IDRole)
          };
          
          // Changer l'URL pour l'API d'enregistrement
          apiUrl = 'https://localhost:5001/api/account/register';
        }
        break;
      default:
        payload = formValue;
    }

    // Ajouter l'ID dans le cas d'une mise à jour
    if (this.isEditMode && this.selectedItem && this.modalType !== 'user') {
      switch (this.modalType) {
        case 'intervention-type':
          payload.idTypeIntervention = this.selectedItem.idTypeIntervention;
          break;
        case 'urgence':
          payload.idUrgence = this.selectedItem.idUrgence;
          break;
        case 'etat':
          payload.idEtat = this.selectedItem.idEtat;
          break;
        case 'panne':
          payload.idPanne = this.selectedItem.idPanne;
          break;
        case 'chaine':
          payload.idChaineProduction = this.selectedItem.idChaineProduction;
          break;
        case 'famille-equip':
          payload.idFamille = this.selectedItem.idFamille;
          break;
        case 'criticite':
          payload.idCriticite = this.selectedItem.idCriticite;
          break;
        case 'etat-equip':
          payload.idEtat = this.selectedItem.idEtat;
          break;
        case 'modele':
          payload.idModele = this.selectedItem.idModele;
          break;
        case 'groupe':
          payload.idGroupe = this.selectedItem.idGroupe;
          break;
        case 'famille-piece':
          payload.idFamillePiece = this.selectedItem.idFamillePiece;
          break;
        case 'constructeur':
          payload.idConstructeur = this.selectedItem.idConstructeur;
          break;
        case 'criticite-piece':
          payload.idCriticitePiece = this.selectedItem.idCriticitePiece;
          break;
        case 'stock-status':
          payload.id = this.selectedItem.id;
          break;
        case 'supplier':
          payload.id = this.selectedItem.id;
          break;
      }
    }

    console.log(`Saving ${this.modalType}:`, payload);

    // Envoyer la requête
    if (this.isEditMode) {
      let id: number | string = '';
      
      // Déterminer l'ID pour l'URL
      switch (this.modalType) {
        case 'intervention-type':
          id = this.selectedItem.idTypeIntervention;
          break;
        case 'urgence':
          id = this.selectedItem.idUrgence;
          break;
        case 'etat':
          id = this.selectedItem.idEtat;
          break;
        case 'panne':
          id = this.selectedItem.idPanne;
          break;
        case 'chaine':
          id = this.selectedItem.idChaineProduction;
          break;
        case 'famille-equip':
          id = this.selectedItem.idFamille;
          break;
        case 'criticite':
          id = this.selectedItem.idCriticite;
          break;
        case 'etat-equip':
          id = this.selectedItem.idEtat;
          break;
        case 'modele':
          id = this.selectedItem.idModele;
          break;
        case 'groupe':
          id = this.selectedItem.idGroupe;
          break;
        case 'famille-piece':
          id = this.selectedItem.idFamillePiece;
          break;
        case 'constructeur':
          id = this.selectedItem.idConstructeur;
          break;
        case 'criticite-piece':
          id = this.selectedItem.idCriticitePiece;
          break;
        case 'stock-status':
        case 'supplier':
          id = this.selectedItem.id;
          break;
        case 'user':
          id = this.selectedItem.ID; // Utiliser ID majuscule selon la structure de l'API
          break;
      }

      this.http.put(`${apiUrl}/${id}`, payload, { headers }).subscribe({
        next: (response) => {
          console.log(`Updated ${this.modalType}:`, response);
          this.handleSaveSuccess('Élément mis à jour avec succès');
        },
        error: (error) => {
          console.error(`Error updating ${this.modalType}:`, error);
          this.handleSaveError(error);
        }
      });
    } else {
      this.http.post(apiUrl, payload, { headers }).subscribe({
        next: (response) => {
          console.log(`Created ${this.modalType}:`, response);
          this.handleSaveSuccess('Élément ajouté avec succès');
        },
        error: (error) => {
          console.error(`Error creating ${this.modalType}:`, error);
          this.handleSaveError(error);
        }
      });
    }
  }

  /**
   * Gère le succès après sauvegarde
   */
  handleSaveSuccess(message: string): void {
    this.successMessage = message;
    this.isSubmitting = false;
    this.closeModal();
    
    // Recharger les données de l'onglet actif
    this.loadTabData(this.activeTabIndex);
    
    // Effacer le message après quelques secondes
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  /**
   * Gère l'erreur après tentative de sauvegarde
   */
  handleSaveError(error: any): void {
    console.error('Save error:', error);
    let errorMessage = '';
    
    if (error.status === 405) {
      errorMessage = `L'opération n'est pas autorisée. Veuillez vérifier que l'API supporte cette méthode.`;
    } else if (error.error && typeof error.error === 'string') {
      errorMessage = error.error;
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else {
      errorMessage = 'Une erreur inconnue s\'est produite lors de l\'opération';
    }
    
    this.errorMessage = `Erreur: ${errorMessage}`;
    this.isSubmitting = false;
    
    // Effacer le message après quelques secondes
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }




  

  // Ajoutez ces propriétés à votre classe
  showDeleteConfirmation: boolean = false;
  itemToDelete: any = null;
  deleteType: string = '';
  deletingInProgress: boolean = false;
  deleteItemName: string = '';

  /**
   * Supprime un élément
   */
  deleteItem(type: string, item: any): void {
    // Au lieu d'utiliser confirm(), afficher notre modale personnalisée
    this.showDeleteConfirmation = true;
    this.itemToDelete = item;
    this.deleteType = type;
    
    // Déterminer le nom de l'élément à afficher dans la confirmation
    switch (type) {
      case 'intervention-type':
      case 'urgence':
      case 'etat':
      case 'panne':
      case 'chaine':
        this.deleteItemName = item.libelle || '';
        break;
      case 'famille-equip':
      case 'famille-piece':
        this.deleteItemName = item.nomFamille || '';
        break;
      case 'criticite':
        this.deleteItemName = item.nomCriticite || '';
        break;
      case 'etat-equip':
        this.deleteItemName = item.nomEtat || '';
        break;
      case 'modele':
        this.deleteItemName = item.nomModele || '';
        break;
      case 'groupe':
        this.deleteItemName = item.nomGroupe || '';
        break;
      case 'constructeur':
        this.deleteItemName = item.nomConstructeur || '';
        break;
      case 'criticite-piece':
        this.deleteItemName = item.niveauCriticitePiece || '';
        break;
      case 'stock-status':
        this.deleteItemName = item.status || '';
        break;
      case 'supplier':
        this.deleteItemName = item.supplierName || '';
        break;
      case 'user':
        this.deleteItemName = `${item.nom} ${item.prenom}` || '';
        break;
      default:
        this.deleteItemName = 'Cet élément';
    }
  }

  /**
   * Annule la suppression
   */
  cancelDelete(): void {
    this.showDeleteConfirmation = false;
    this.itemToDelete = null;
    this.deleteType = '';
    this.deleteItemName = '';
  }

  /**
   * Confirme la suppression
   */
  confirmDelete(): void {
    if (!this.itemToDelete || !this.deleteType) return;
    
    this.deletingInProgress = true;
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    let apiUrl = this.baseUrls[this.deleteType];
    let id: number | string = '';
    
    // Déterminer l'ID en fonction du type
    switch (this.deleteType) {
      case 'intervention-type':
        id = this.itemToDelete.idTypeIntervention;
        break;
      case 'urgence':
        id = this.itemToDelete.idUrgence;
        break;
      case 'etat':
        id = this.itemToDelete.idEtat;
        break;
      case 'panne':
        id = this.itemToDelete.idPanne;
        break;
      case 'chaine':
        id = this.itemToDelete.idChaineProduction;
        break;
      case 'famille-equip':
        id = this.itemToDelete.idFamille;
        break;
      case 'criticite':
        id = this.itemToDelete.idCriticite;
        break;
      case 'etat-equip':
        id = this.itemToDelete.idEtat;
        break;
      case 'modele':
        id = this.itemToDelete.idModele;
        break;
      case 'groupe':
        id = this.itemToDelete.idGroupe;
        break;
      case 'famille-piece':
        id = this.itemToDelete.idFamillePiece;
        break;
      case 'constructeur':
        id = this.itemToDelete.idConstructeur;
        break;
      case 'criticite-piece':
        id = this.itemToDelete.idCriticitePiece;
        break;
      case 'stock-status':
      case 'supplier':
        id = this.itemToDelete.id;
        break;
      case 'user':
        id = this.itemToDelete.ID; // Utiliser ID majuscule selon la structure de l'API
        break;
    }

    // Ajouter la classe "deleting-item" à l'élément qu'on supprime
    const element = document.querySelector(`[data-id="${id}"]`);
    if (element) {
      element.classList.add('deleting-item');
    }

    this.http.delete(`${apiUrl}/${id}`, { headers }).subscribe({
      next: () => {
        this.successMessage = 'Élément supprimé avec succès';
        this.showDeleteConfirmation = false;
        this.deletingInProgress = false;
        this.itemToDelete = null;
        this.deleteType = '';
        
        // Recharger les données de l'onglet actif
        this.loadTabData(this.activeTabIndex);
        
        // Effacer le message après quelques secondes
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        console.error('Delete error:', error);
        let errorMessage = '';
        
        if (error.status === 405) {
          errorMessage = `La suppression n'est pas autorisée. Veuillez vérifier que l'API supporte cette méthode.`;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.message) {
          errorMessage = error.message;
        } else {
          errorMessage = 'Une erreur inconnue s\'est produite lors de la suppression';
        }
        
        this.errorMessage = `Erreur: ${errorMessage}`;
        this.showDeleteConfirmation = false;
        this.deletingInProgress = false;
        
        // Effacer le message après quelques secondes
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  /**
   * Rafraîchit toutes les données de l'onglet actif
   */
  refreshData(): void {
    this.loadTabData(this.activeTabIndex);
  }

  /**
   * Obtient le titre du modal en fonction du type
   */
  getModalTitle(): string {
    switch (this.modalType) {
      case 'intervention-type': 
        return 'Type d\'intervention';
      case 'urgence': 
        return 'Niveau d\'urgence';
      case 'etat': 
        return 'État d\'intervention';
      case 'panne': 
        return 'Type de panne';
      case 'chaine': 
        return 'Chaîne de production';
      case 'famille-equip': 
        return 'Famille d\'équipement';
      case 'criticite': 
        return 'Criticité';
      case 'etat-equip': 
        return 'État d\'équipement';
      case 'modele': 
        return 'Modèle';
      case 'groupe': 
        return 'Groupe d\'équipement';
      case 'famille-piece': 
        return 'Famille de pièce';
      case 'constructeur': 
        return 'Constructeur';
      case 'criticite-piece': 
        return 'Criticité de pièce';
      case 'stock-status': 
        return 'Statut de stock';
      case 'supplier': 
        return 'Fournisseur';
      case 'user': 
        return 'Utilisateur';
      default: 
        return 'Donnée';
    }
  }

  /**
   * Obtient le label pour le champ principal (champ "name") du formulaire
   */
  getNameLabel(): string {
    switch (this.modalType) {
      case 'intervention-type':
      case 'urgence':
      case 'etat':
      case 'panne':
      case 'chaine':
        return 'Libellé';
      case 'famille-equip':
      case 'famille-piece':
        return 'Nom de la famille';
      case 'criticite':
        return 'Nom de la criticité';
      case 'etat-equip':
        return 'Nom de l\'état';
      case 'modele':
        return 'Nom du modèle';
      case 'groupe':
        return 'Nom du groupe';
      case 'constructeur':
        return 'Nom du constructeur';
      case 'criticite-piece':
        return 'Niveau de criticité';
      case 'stock-status':
        return 'Statut';
      case 'supplier':
        return 'Nom du fournisseur';
      default:
        return 'Nom';
    }
  }

  /**
   * Vérifie si l'utilisateur actuel peut modifier cet élément
   */
  canEdit(): boolean {
    return this.currentUser?.role === 'Superviseur';
  }
}