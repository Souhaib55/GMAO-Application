# GMAO Application - Angular Client Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Backend Integration](#api-backend-integration)
4. [AI Chatbot Integration](#ai-chatbot-integration)
5. [Authentication & Authorization](#authentication--authorization)
6. [Module Structure](#module-structure)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Data Models & DTOs](#data-models--dtos)
9. [Services Implementation](#services-implementation)
10. [Configuration](#configuration)
11. [Deployment & Environment Setup](#deployment--environment-setup)

---

## Overview

This guide describes how to build a new Angular frontend client that connects to:
- **API Backend**: ASP.NET Core Web API (located in `/API` folder)
- **AI Chatbot Service**: Python FastAPI service (located in `/gmaochat` folder)

The GMAO (Gestion de Maintenance Assistée par Ordinateur) application manages maintenance operations including equipment, interventions, inventory, and resources.

---

## Architecture

### System Components

```
┌─────────────────────┐
│   Angular Client    │
│   (New Project)     │
└──────┬──────┬───────┘
       │      │
       │      └──────────────────┐
       │                         │
       ▼                         ▼
┌──────────────┐         ┌──────────────────┐
│   API        │◄────────│   gmaochat       │
│   (.NET)     │         │   (Python)       │
└──────┬───────┘         └──────────────────┘
       │
       ▼
┌──────────────┐
│  SQL Server  │
│   Database   │
└──────────────┘
```

### Communication Flow

1. **Client ↔ API**: REST API calls using HttpClient
2. **Client ↔ AI Chatbot**: Through API proxy endpoint (`/api/gmao-chat`)
3. **API ↔ Database**: Entity Framework Core
4. **AI Chatbot ↔ Database**: Direct SQL connection (read-only queries)

---

## API Backend Integration

### Base Configuration

**API URL**: `http://localhost:5000` (Development)  
**CORS Policy**: Pre-configured for `http://localhost:4200`

### Backend Technologies
- **Framework**: ASP.NET Core 8.0+
- **Authentication**: ASP.NET Identity with Cookie-based authentication
- **Database**: SQL Server (Entity Framework Core)
- **JSON Format**: camelCase property naming

### Key Features
- Cookie-based session authentication
- Role-based authorization (Superviseur, Demandeur, Utilisateur)
- Pagination support for list endpoints
- Soft delete (IsDeleted, IsActif flags)
- File upload support (multipart/form-data)

---

## AI Chatbot Integration

### Python Service Details

**URL**: `http://localhost:5002`  
**Framework**: FastAPI  
**Purpose**: AI-powered assistant for GMAO queries

### Key Features
- Natural language query processing
- SQL query generation and execution
- Database context retrieval (RAG)
- Data visualization generation
- OpenRouter API integration (LLM model)

### Communication Pattern
The Angular client should **NOT** call the Python service directly. Instead, use the API proxy endpoint:

```typescript
// Correct approach - through API proxy
POST /api/gmao-chat/query

// Don't do this - direct call to Python service
POST http://localhost:5002/query
```

### Python Service Endpoints

#### 1. Health Check
```
GET http://localhost:5002/test
Response: { "status": "ok", "message": "GMAO Chatbot service is running" }
```

#### 2. Chat Query (Not used directly by client)
```
POST http://localhost:5002/query
Body: { "query": "string", "conversation_history": [...] }
```

---

## Authentication & Authorization

### Authentication Flow

```
1. Login Request → POST /api/account/login
2. Server Sets Cookie → .AspNetCore.Identity.Application
3. Subsequent Requests → Cookie automatically sent
4. Logout → POST /api/account/logout
```

### Implementation in Angular

```typescript
// auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkAuthStatus();
  }

  login(credentials: LoginDto): Observable<UserInfo> {
    return this.http.post<UserInfo>(`${this.apiUrl}/account/login`, credentials, {
      withCredentials: true // Important for cookies
    }).pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      })
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/account/logout`, {}, {
      withCredentials: true
    }).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        localStorage.removeItem('currentUser');
      })
    );
  }

  checkAuthStatus(): void {
    this.http.get<UserInfo>(`${this.apiUrl}/account/user-info`, {
      withCredentials: true
    }).subscribe({
      next: (user) => {
        this.currentUserSubject.next(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
      },
      error: () => {
        this.currentUserSubject.next(null);
        localStorage.removeItem('currentUser');
      }
    });
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }
}
```

### HTTP Interceptor Configuration

```typescript
// auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Add credentials to all API requests
  if (req.url.includes(environment.apiUrl)) {
    req = req.clone({
      withCredentials: true
    });
  }
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Redirect to login
        inject(Router).navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
```

### User Roles

| Role | ID | Permissions |
|------|----|-----------| 
| **Superviseur** | 1 | Full access to all data and operations |
| **Demandeur** | 2 | Can create interventions, view own interventions only |
| **Utilisateur** | 3 | Can view assigned interventions and own created interventions |

---

## Module Structure

### Recommended Angular Modules

```
src/app/
├── core/
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── role.guard.ts
│   ├── interceptors/
│   │   ├── auth.interceptor.ts
│   │   └── error.interceptor.ts
│   ├── services/
│   │   └── auth.service.ts
│   └── models/
│       ├── user.model.ts
│       └── role.enum.ts
│
├── shared/
│   ├── components/
│   │   ├── pagination/
│   │   ├── search/
│   │   └── file-upload/
│   ├── models/
│   │   └── paged-result.model.ts
│   └── services/
│       └── notification.service.ts
│
├── features/
│   ├── auth/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── equipment/
│   │   ├── services/
│   │   │   └── equipment.service.ts
│   │   ├── models/
│   │   │   └── equipment.model.ts
│   │   ├── equipment-list/
│   │   ├── equipment-detail/
│   │   └── equipment-form/
│   │
│   ├── interventions/
│   │   ├── services/
│   │   │   └── intervention.service.ts
│   │   ├── models/
│   │   │   └── intervention.model.ts
│   │   ├── intervention-list/
│   │   ├── intervention-detail/
│   │   └── intervention-form/
│   │
│   ├── stock/
│   │   ├── services/
│   │   │   └── stock.service.ts
│   │   ├── models/
│   │   │   └── stock.model.ts
│   │   └── components/
│   │
│   ├── resources/
│   │   ├── services/
│   │   │   └── piece.service.ts
│   │   ├── models/
│   │   │   └── piece.model.ts
│   │   └── components/
│   │
│   ├── users/
│   │   ├── services/
│   │   │   └── user.service.ts
│   │   └── components/
│   │
│   ├── chat/
│   │   ├── services/
│   │   │   └── gmao-chat.service.ts
│   │   ├── models/
│   │   │   └── chat-message.model.ts
│   │   └── components/
│   │       ├── chat-interface/
│   │       └── chat-bubble/
│   │
│   └── dashboard/
│       └── dashboard.component.ts
│
└── app.component.ts
```

---

## API Endpoints Reference

### Authentication Endpoints

#### Register User
```http
POST /api/account/register
Content-Type: application/json

Request Body:
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "password": "string",
  "roleId": number  // 1=Superviseur, 2=Demandeur, 3=Utilisateur
}

Response: 200 OK
{
  "message": "User registered successfully"
}
```

#### Login
```http
POST /api/account/login
Content-Type: application/json

Request Body:
{
  "email": "string",
  "password": "string"
}

Response: 200 OK
{
  "userId": "string",          // AspNetUser ID (GUID)
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "string",            // "Superviseur", "Demandeur", "Utilisateur"
  "internalId": number         // Users table ID
}
```

#### Logout
```http
POST /api/account/logout

Response: 204 No Content
```

#### Get Current User Info
```http
GET /api/account/user-info

Response: 200 OK (if authenticated)
{
  "userId": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "string",
  "internalId": number
}

Response: 204 No Content (if not authenticated)
```

---

### Equipment Endpoints

#### Get Equipment List (Paginated)
```http
GET /api/equipment?page={page}&pageSize={pageSize}&search={search}

Query Parameters:
- page: number (default: 1)
- pageSize: number (default: 5)
- search: string (optional) - searches by CodeEquipement

Response: 200 OK
{
  "data": [
    {
      "idEquipement": number,
      "codeEquipement": "string",
      "designation": "string",
      "description": "string",
      "idCriticite": number,
      "criticite": { "idCriticite": number, "nomCriticite": "string" },
      "idEtat": number,
      "etat": { "idEtat": number, "nomEtat": "string" },
      "idFamille": number,
      "famille": { "idFamille": number, "nomFamille": "string" },
      "idModele": number,
      "modele": {
        "idModele": number,
        "nomModele": "string",
        "marque": { "idMarque": number, "nomMarque": "string" }
      },
      "idGroupe": number,
      "groupe": { "idGroupe": number, "nomGroupe": "string" },
      "dateInstallation": "datetime",
      "dateMiseEnService": "datetime",
      "numeroSerie": "string",
      "sousGarantie": boolean,
      "dateAchat": "datetime",
      "dateFinGarantie": "datetime",
      "dateConstruction": "datetime",
      "coutAchat": number,
      "dateCreation": "datetime",
      "dateModification": "datetime",
      "isDeleted": boolean
    }
  ],
  "totalCount": number,
  "page": number,
  "pageSize": number
}
```

#### Get Equipment by ID
```http
GET /api/equipment/{id}

Response: 200 OK
{
  // Single equipment object with all related entities
}
```

#### Create Equipment
```http
POST /api/equipment
Content-Type: application/json

Request Body:
{
  "codeEquipement": "string",        // Required, unique
  "designation": "string",           // Required
  "description": "string",
  "idCriticite": number,            // Optional
  "idEtat": number,                 // Optional
  "idFamille": number,              // Optional
  "idModele": number,               // Optional
  "idGroupe": number,               // Optional
  "dateInstallation": "datetime",
  "dateMiseEnService": "datetime",
  "numeroSerie": "string",
  "sousGarantie": boolean,
  "dateAchat": "datetime",
  "dateFinGarantie": "datetime",
  "dateConstruction": "datetime",
  "coutAchat": number
}

Response: 201 Created
```

#### Update Equipment
```http
PUT /api/equipment/{id}
Content-Type: application/json

Request Body: Same as Create

Response: 204 No Content
```

#### Delete Equipment (Soft Delete)
```http
DELETE /api/equipment/{id}

Response: 204 No Content
```

---

### Intervention Endpoints

#### Get Interventions (Paginated & Role-Filtered)
```http
GET /api/demandeintervention?page={page}&pageSize={pageSize}&search={search}

Authorization: Required
Role-Based Filtering:
- Superviseur: Sees all interventions
- Demandeur: Sees only interventions they created
- Utilisateur: Sees interventions they created or are assigned to

Response: 200 OK
{
  "data": [
    {
      "idDemandeIntervention": number,
      "titre": "string",
      "dateCreation": "datetime",
      "fileName": "string",
      "machineArretee": boolean,
      "etat": { "idEtat": number, "libelle": "string" },
      "status": { "id": number, "statut": "string" },
      "typeIntervention": { "idTypeIntervention": number, "libelle": "string" },
      "urgence": { "idUrgence": number, "libelle": "string" },
      "chaineProduction": { "idChaineProduction": number, "libelle": "string" },
      "panne": { "idPanne": number, "libelle": "string" },
      "demandeur": { "id": number, "nom": "string", "prenom": "string" },
      "destinataire": { "id": number, "nom": "string", "prenom": "string" },
      "dateAssignation": "datetime",
      "dateRealisation": "datetime",
      "dateCloture": "datetime",
      "raisonAnnulation": "string",
      "isActif": boolean,
      "datePriseEnCharge": "datetime",
      "dateResolution": "datetime"
    }
  ],
  "totalCount": number,
  "page": number,
  "pageSize": number
}
```

#### Get Today's Intervention Count
```http
GET /api/demandeintervention/today-count

Authorization: Required

Response: 200 OK
number (count of interventions created today for current user based on role)
```

#### Get Intervention by ID
```http
GET /api/demandeintervention/{id}

Authorization: Required
Note: Access restricted based on user role and relationship to intervention

Response: 200 OK or 403 Forbidden
```

#### Create Intervention
```http
POST /api/demandeintervention
Content-Type: multipart/form-data OR application/json

For multipart/form-data:
- interventionData: JSON string of InterventionDto
- file: File (optional attachment)

For application/json:
{
  "titre": "string",
  "dateCreation": "datetime",
  "machineArretee": boolean,
  "idEtat": number,
  "idTypeIntervention": number,
  "idUrgence": number,
  "idChaineProduction": number,
  "idPanne": number,
  "demandeursId": number,
  "destinatairesId": number,    // Optional
  "description": "string"
}

Response: 201 Created
```

#### Update Intervention
```http
PUT /api/demandeintervention/{id}
Content-Type: multipart/form-data OR application/json

Request Body: Same as Create + workflow actions

Additional workflow fields:
{
  "workflowAction": "string",  // Optional: "assign", "start", "complete", "cancel"
  "raisonAnnulation": "string" // Required if workflowAction = "cancel"
}

Response: 204 No Content
```

---

### Stock Management Endpoints

#### Get Stock Items
```http
GET /api/stock?page={page}&pageSize={pageSize}&search={search}

Response: 200 OK
{
  "data": [
    {
      "id": number,
      "code": "string",
      "description": "string",
      "stockEntitiesId": number,
      "stockEntities": { "id": number, "name": "string" },
      "stockStatusId": number,
      "stockStatus": { "id": number, "statusName": "string" },
      "stockSupplierId": number,
      "stockSupplier": { "id": number, "supplierName": "string" },
      "createdOn": "datetime",
      "isDeleted": boolean
    }
  ],
  "totalCount": number,
  "page": number,
  "pageSize": number
}
```

#### Get Stock by ID
```http
GET /api/stock/{id}

Response: 200 OK
```

#### Create Stock
```http
POST /api/stock
Content-Type: application/json

Request Body:
{
  "code": "string",              // Required
  "description": "string",       // Required
  "stockEntitiesId": number,     // Required
  "stockStatusId": number,       // Required
  "stockSupplierId": number      // Required
}

Response: 201 Created
```

#### Update Stock
```http
PUT /api/stock/{id}
Content-Type: application/json

Request Body:
{
  "id": number,
  "code": "string",
  "description": "string",
  "stockEntitiesId": number,
  "stockStatusId": number,
  "stockSupplierId": number,
  "createdOn": "datetime"
}

Response: 204 No Content
```

#### Delete Stock
```http
DELETE /api/stock/{id}

Response: 204 No Content
```

---

### Resources (Pieces) Endpoints

#### Get Pieces (Paginated)
```http
GET /api/piece?page={page}&pageSize={pageSize}&search={search}

Response: 200 OK
{
  "data": [
    {
      "idPiece": number,
      "codePiece": "string",
      "designation": "string",
      "description": "string",
      "idFamillePiece": number,
      "famillePiece": { "idFamillePiece": number, "nomFamille": "string" },
      "idConstructeur": number,
      "constructeur": { "idConstructeur": number, "nomConstructeur": "string" },
      "idCriticitePiece": number,
      "criticitePiece": { "idCriticitePiece": number, "niveauCriticitePiece": "string" },
      "quantite_Stock": number,
      "prixUnitaire": number,
      "dateCreation": "datetime",
      "dateModification": "datetime",
      "isActif": boolean
    }
  ],
  "totalCount": number,
  "page": number,
  "pageSize": number
}
```

#### Get Piece by ID
```http
GET /api/piece/{id}

Response: 200 OK
```

#### Create/Update/Delete Piece
Similar pattern to Equipment endpoints with appropriate request/response structures.

---

### Users Management Endpoints

#### Get All Users
```http
GET /api/users

Response: 200 OK
[
  {
    "id": number,
    "appUserId": "string",
    "nom": "string",
    "prenom": "string",
    "email": "string",
    "dateCreation": "datetime",
    "dateModification": "datetime",
    "isActif": boolean,
    "idRole": number,
    "role": { "idRole": number, "libelle": "string" }
  }
]
```

#### Get User by ID
```http
GET /api/users/{id}

Response: 200 OK
```

---

### Reference Data Endpoints

All reference data endpoints follow similar patterns:

#### Equipment Criticality
```http
GET /api/equipmentcriticite
GET /api/equipmentcriticite/{id}
POST /api/equipmentcriticite
PUT /api/equipmentcriticite/{id}
DELETE /api/equipmentcriticite/{id}
```

#### Equipment Status (État)
```http
GET /api/etatequipement
```

#### Equipment Family
```http
GET /api/familleequipment
```

#### Equipment Group
```http
GET /api/groupeequipement
```

#### Equipment Brand (Marque)
```http
GET /api/marque
POST /api/marque
PUT /api/marque/{id}
DELETE /api/marque/{id}
```

#### Equipment Model
```http
GET /api/modeleequipement
```

#### Intervention Status
```http
GET /api/status
```

#### Intervention État
```http
GET /api/etat
```

#### Intervention Type
```http
GET /api/typeintervention
```

#### Urgence
```http
GET /api/urgence
```

#### Chaine Production
```http
GET /api/chaineproduction
```

#### Panne
```http
GET /api/panne
```

#### Stock Entities
```http
GET /api/stockentities
```

#### Stock Status
```http
GET /api/stockstatus
```

#### Stock Supplier
```http
GET /api/stocksupplier
```

#### Piece Family
```http
GET /api/famillepiece
```

#### Constructeur
```http
GET /api/constructeur
```

#### Piece Criticality
```http
GET /api/criticitepiece
```

---

### AI Chat Endpoints

#### Test Chat Service
```http
GET /api/gmao-chat/test

Response: 200 OK
{
  "apiStatus": {
    "message": "GMAO Chat API is working!"
  },
  "pythonService": {
    "status": "ok",
    "message": "GMAO Chatbot service is running"
    // ... or error information if service unavailable
  }
}
```

#### Query AI Assistant
```http
POST /api/gmao-chat/query
Content-Type: application/json

Request Body:
{
  "query": "string"  // User's question or command
}

Response: 200 OK
{
  "response": "string",           // AI-generated natural language response
  "metadata": {
    "sqlQuery": "string",         // SQL query executed (if any)
    "sqlResult": [...],           // Query results (if any)
    "context": "string"           // Database context used
  },
  "visualizations": [             // Optional visualizations
    {
      "type": "chart",
      "data": "base64_encoded_image"
    }
  ],
  "suggestions": [                // Optional follow-up suggestions
    "string"
  ]
}

Error Response: 400 Bad Request
{
  "response": "Error message"
}
```

---

## Data Models & DTOs

### Core Models

#### User Model
```typescript
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
  userId: string;
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
```

#### Equipment Model
```typescript
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
```

#### Intervention Model
```typescript
export interface DemandeIntervention {
  idDemandeIntervention: number;
  titre: string;
  dateCreation: Date;
  fileName?: string;
  machineArretee: boolean;
  etat?: InterventionEtat;
  status?: InterventionStatus;
  typeIntervention?: TypeIntervention;
  urgence?: Urgence;
  chaineProduction?: ChaineProduction;
  panne?: Panne;
  demandeur?: UserSummary;
  destinataire?: UserSummary;
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

export interface UserSummary {
  id: number;
  nom: string;
  prenom: string;
}
```

#### Stock Model
```typescript
export interface Stock {
  id: number;
  code: string;
  description: string;
  stockEntitiesId: number;
  stockEntities?: StockEntities;
  stockStatusId: number;
  stockStatus?: StockStatus;
  stockSupplierId: number;
  stockSupplier?: StockSupplier;
  createdOn: Date;
  isDeleted: boolean;
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
```

#### Piece Model
```typescript
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
```

#### Chat Models
```typescript
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: ChatMetadata;
  visualizations?: Visualization[];
  suggestions?: string[];
}

export interface ChatMetadata {
  sqlQuery?: string;
  sqlResult?: any[];
  context?: string;
}

export interface Visualization {
  type: string;
  data: string; // base64 encoded
}

export interface ChatQueryDto {
  query: string;
}

export interface ChatResponse {
  response: string;
  metadata?: ChatMetadata;
  visualizations?: Visualization[];
  suggestions?: string[];
}
```

#### Shared Models
```typescript
export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

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
```

---

## Services Implementation

### Equipment Service Example
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Equipment, PagedResult } from '../models';

@Injectable({ providedIn: 'root' })
export class EquipmentService {
  private apiUrl = `${environment.apiUrl}/equipment`;

  constructor(private http: HttpClient) {}

  getEquipments(page: number = 1, pageSize: number = 5, search?: string): Observable<PagedResult<Equipment>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PagedResult<Equipment>>(this.apiUrl, { 
      params,
      withCredentials: true 
    });
  }

  getEquipment(id: number): Observable<Equipment> {
    return this.http.get<Equipment>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  createEquipment(equipment: Partial<Equipment>): Observable<Equipment> {
    return this.http.post<Equipment>(this.apiUrl, equipment, {
      withCredentials: true
    });
  }

  updateEquipment(id: number, equipment: Partial<Equipment>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, equipment, {
      withCredentials: true
    });
  }

  deleteEquipment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }
}
```

### Intervention Service Example
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DemandeIntervention, PagedResult } from '../models';

@Injectable({ providedIn: 'root' })
export class InterventionService {
  private apiUrl = `${environment.apiUrl}/demandeintervention`;

  constructor(private http: HttpClient) {}

  getInterventions(page: number = 1, pageSize: number = 5, search?: string): Observable<PagedResult<DemandeIntervention>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PagedResult<DemandeIntervention>>(this.apiUrl, { 
      params,
      withCredentials: true 
    });
  }

  getTodayCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/today-count`, {
      withCredentials: true
    });
  }

  getIntervention(id: number): Observable<DemandeIntervention> {
    return this.http.get<DemandeIntervention>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  createIntervention(intervention: Partial<DemandeIntervention>, file?: File): Observable<DemandeIntervention> {
    if (file) {
      const formData = new FormData();
      formData.append('interventionData', JSON.stringify(intervention));
      formData.append('file', file);

      return this.http.post<DemandeIntervention>(this.apiUrl, formData, {
        withCredentials: true
      });
    }

    return this.http.post<DemandeIntervention>(this.apiUrl, intervention, {
      withCredentials: true
    });
  }

  updateIntervention(id: number, intervention: Partial<DemandeIntervention>, file?: File): Observable<void> {
    if (file) {
      const formData = new FormData();
      formData.append('interventionData', JSON.stringify(intervention));
      formData.append('file', file);

      return this.http.put<void>(`${this.apiUrl}/${id}`, formData, {
        withCredentials: true
      });
    }

    return this.http.put<void>(`${this.apiUrl}/${id}`, intervention, {
      withCredentials: true
    });
  }
}
```

### GMAO Chat Service Example
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ChatMessage, ChatQueryDto, ChatResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class GmaoChatService {
  private apiUrl = `${environment.apiUrl}/gmao-chat`;
  private conversationHistory = new BehaviorSubject<ChatMessage[]>([]);
  public conversationHistory$ = this.conversationHistory.asObservable();

  constructor(private http: HttpClient) {
    this.loadConversationHistory();
  }

  testService(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`, {
      withCredentials: true
    });
  }

  query(userQuery: string): Observable<ChatResponse> {
    const dto: ChatQueryDto = { query: userQuery };
    
    // Add user message to history
    const userMessage: ChatMessage = {
      role: 'user',
      content: userQuery,
      timestamp: new Date()
    };
    this.addMessageToHistory(userMessage);

    return this.http.post<ChatResponse>(`${this.apiUrl}/query`, dto, {
      withCredentials: true
    }).pipe(
      tap(response => {
        // Add assistant response to history
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          metadata: response.metadata,
          visualizations: response.visualizations,
          suggestions: response.suggestions
        };
        this.addMessageToHistory(assistantMessage);
      })
    );
  }

  private addMessageToHistory(message: ChatMessage): void {
    const currentHistory = this.conversationHistory.value;
    const updatedHistory = [...currentHistory, message];
    this.conversationHistory.next(updatedHistory);
    this.saveConversationHistory(updatedHistory);
  }

  clearHistory(): void {
    this.conversationHistory.next([]);
    localStorage.removeItem('gmao_chat_history');
  }

  private loadConversationHistory(): void {
    const stored = localStorage.getItem('gmao_chat_history');
    if (stored) {
      try {
        const history = JSON.parse(stored);
        this.conversationHistory.next(history);
      } catch (e) {
        console.error('Error loading conversation history', e);
      }
    }
  }

  private saveConversationHistory(history: ChatMessage[]): void {
    try {
      // Keep only last 50 messages
      const trimmedHistory = history.slice(-50);
      localStorage.setItem('gmao_chat_history', JSON.stringify(trimmedHistory));
    } catch (e) {
      console.error('Error saving conversation history', e);
    }
  }
}
```

---

## Configuration

### Environment Files

#### environment.ts (Development)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  chatServiceUrl: 'http://localhost:5002' // Not directly used, goes through API proxy
};
```

#### environment.prod.ts (Production)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-production-domain.com/api',
  chatServiceUrl: 'https://your-production-domain.com/chat' // Not directly used
};
```

### Angular Configuration

#### app.config.ts (Angular 17+ Standalone)
```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    )
  ]
};
```

#### Route Guards
```typescript
// auth.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

// role.guard.ts
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRole = route.data['role'] as string;
  
  if (authService.hasRole(requiredRole)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
```

#### Route Configuration Example
```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component') },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component') },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component')
  },
  {
    path: 'equipment',
    canActivate: [authGuard],
    loadChildren: () => import('./features/equipment/equipment.routes')
  },
  {
    path: 'interventions',
    canActivate: [authGuard],
    loadChildren: () => import('./features/interventions/intervention.routes')
  },
  {
    path: 'stock',
    canActivate: [authGuard, roleGuard],
    data: { role: 'Superviseur' },
    loadChildren: () => import('./features/stock/stock.routes')
  },
  {
    path: 'users',
    canActivate: [authGuard, roleGuard],
    data: { role: 'Superviseur' },
    loadChildren: () => import('./features/users/users.routes')
  },
  {
    path: 'chat',
    canActivate: [authGuard],
    loadComponent: () => import('./features/chat/chat.component')
  },
  { path: '**', redirectTo: '/dashboard' }
];
```

---

## Deployment & Environment Setup

### Prerequisites

#### Backend (.NET API)
- .NET 8.0 SDK or later
- SQL Server 2019 or later (or SQL Server Express)
- Connection string configured in `appsettings.Development.json`

#### Python Chatbot Service
- Python 3.9 or later
- Required packages (see `gmaochat/requirements.txt`)
- OpenRouter API key (configured in `appsettings.Development.json`)
- ODBC Driver 17+ for SQL Server

#### Angular Client
- Node.js 18+ and npm
- Angular CLI 17+

### Starting the Services

#### 1. Start SQL Server
Ensure SQL Server is running and database is created.

#### 2. Start API Backend
```powershell
cd API
dotnet run
```
API runs on: `http://localhost:5000`

#### 3. Start Python Chatbot (Optional but recommended for chat features)
```powershell
cd gmaochat

# Option 1: Using batch file (Windows)
.\start_service.bat

# Option 2: Manual start
python gmao_chatbot_service.py
```
Chat service runs on: `http://localhost:5002`

#### 4. Start Angular Client
```powershell
cd client
npm install
ng serve
```
Client runs on: `http://localhost:4200`

### Development Workflow

1. **Backend changes**: API auto-reloads with `dotnet watch run`
2. **Frontend changes**: Angular hot-reloads automatically
3. **Python service changes**: Restart `start_service.bat`

### Testing the Integration

#### 1. Test API Health
```
GET http://localhost:5000/api/equipment
```
Should return 401 (Unauthorized) - this confirms API is running.

#### 2. Test Authentication
```
POST http://localhost:5000/api/account/login
{
  "email": "test@example.com",
  "password": "YourPassword"
}
```

#### 3. Test Chat Service
```
GET http://localhost:5000/api/gmao-chat/test
```
Should return status of both API and Python service.

### Production Deployment Considerations

#### API Backend
- Use production connection strings
- Enable HTTPS
- Configure proper CORS for production domain
- Use environment variables for sensitive data
- Set up logging and monitoring

#### Python Service
- Use production-grade WSGI server (gunicorn, uvicorn)
- Configure reverse proxy (nginx)
- Set up proper logging
- Secure OpenRouter API key
- Configure database connection pooling

#### Angular Client
- Build with production configuration: `ng build --configuration production`
- Deploy to web server (IIS, nginx, Apache)
- Configure proper routing (handle Angular routes on server)
- Set up CDN for static assets
- Enable compression (gzip/brotli)

### Security Checklist

- [ ] HTTPS enabled on all services
- [ ] CORS properly configured for production domains
- [ ] API keys stored in environment variables/Azure Key Vault
- [ ] Cookie security settings (Secure, HttpOnly, SameSite)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using parameterized queries)
- [ ] Rate limiting on API endpoints
- [ ] File upload validation and size limits
- [ ] Authentication tokens properly secured
- [ ] Database credentials encrypted

---

## Summary

This guide provides all the technical details needed to build an Angular frontend that integrates with both the GMAO API backend and the AI chatbot service. Key points:

1. **Authentication**: Cookie-based, configured with `withCredentials: true`
2. **API Communication**: All requests go through the .NET API, including chat
3. **Role-Based Access**: Three roles with different permissions
4. **Pagination**: Most list endpoints support pagination
5. **File Uploads**: Multipart form data for interventions
6. **AI Chat**: Accessed via API proxy, not direct Python service calls

For any specific implementation questions or edge cases, refer to the existing controller code in the `API/Controllers` directory.
