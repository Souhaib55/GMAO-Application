import os
import time
import logging
import json
import traceback
import requests
import uuid
import sqlalchemy
from sqlalchemy import create_engine, text
from contextlib import contextmanager
from fastapi import FastAPI, Body, Request
from fastapi.responses import JSONResponse


from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Union, Tuple
import pathlib

# RAG and visualization imports
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import matplotlib.pyplot as plt
import io
import base64
from matplotlib.figure import Figure
import seaborn as sns
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("gmao_chatbot")

# Create the FastAPI app
app = FastAPI(title="GMAO Chatbot Service", description="AI-powered chatbot for GMAO system")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Function to read settings from appsettings.Development.json
def read_app_settings():
    try:
        # Determine the path to appsettings.Development.json
        current_dir = pathlib.Path(__file__).parent.absolute()
        root_dir = current_dir.parent
        appsettings_path = root_dir / 'API' / 'appsettings.Development.json'
        
        if not appsettings_path.exists():
            logger.warning(f"appsettings.Development.json not found at {appsettings_path}")
            # Try alternative path
            alt_path = pathlib.Path.cwd() / 'gmao' / 'API' / 'appsettings.Development.json'
            if alt_path.exists():
                appsettings_path = alt_path
                logger.info(f"Found appsettings.Development.json at alternate path: {appsettings_path}")
            else:
                logger.error("appsettings.Development.json not found in expected locations")
                return {}, ""
        
        logger.info(f"Reading settings from {appsettings_path}")
        
        with open(appsettings_path, 'r') as f:
            settings = json.load(f)
            
        # Get connection string
        conn_string = settings.get('ConnectionStrings', {}).get('DefaultConnection', '')
        
        if not conn_string:
            logger.warning("Connection string not found in appsettings.Development.json")
            return settings, ""
            
        # Convert to SQLAlchemy format
        logger.info("Converting connection string to SQLAlchemy format")
        
        # Parse the connection string
        params = {}
        for part in conn_string.split(';'):
            if '=' in part:
                key, value = part.split('=', 1)
                params[key.strip()] = value.strip()
        
        server = params.get('Server', '')
        database = params.get('Database', '')
        trusted = 'yes' if params.get('Trusted_Connection', 'False').lower() in ('true', '1', 'yes') else 'no'
        trust_cert = 'yes' if params.get('TrustServerCertificate', 'False').lower() in ('true', '1', 'yes') else 'no'

        
        # Build ODBC connection string
        odbc_conn = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};Trusted_Connection={trusted};TrustServerCertificate={trust_cert}"

        sqlalchemy_conn = f"mssql+pyodbc:///?odbc_connect={odbc_conn}"
        
        logger.info(f"SQL Alchemy connection string created successfully")
        return settings, sqlalchemy_conn
        
    except Exception as e:
        logger.error(f"Error reading app settings: {e}")
        logger.error(traceback.format_exc())
        return {}, ""

# Load settings
app_settings, conn_string = read_app_settings()

# Database configuration
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING", conn_string if conn_string else "mssql+pyodbc://username:password@server/database?driver=ODBC+Driver+17+for+SQL+Server")
logger.info(f"Using DB connection string: {DB_CONNECTION_STRING[:20]}...") # Only log the beginning for security
engine = None
DB_AVAILABLE = False

# OpenRouter API configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", app_settings.get('OpenRouter', {}).get('ApiKey', ''))
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", app_settings.get('OpenRouter', {}).get('Model', 'anthropic/claude-3-opus:beta'))
OPENROUTER_AVAILABLE = bool(OPENROUTER_API_KEY)
OPENROUTER_ERROR_MESSAGE = ""

# HuggingFace API fallback configuration
HF_API_KEY = os.getenv("HF_API_KEY", app_settings.get('HuggingFace', {}).get('ApiKey', ''))
HF_MODEL = os.getenv("HF_MODEL", app_settings.get('HuggingFace', {}).get('Model', 'mistralai/Mixtral-8x7B-Instruct-v0.1'))
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL}"
HF_AVAILABLE = bool(HF_API_KEY)

# Headers configuration
openrouter_headers = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "HTTP-Referer": "https://gmao.alcodex.cloud",
    "Content-Type": "application/json"
}

hf_headers = {
    "Authorization": f"Bearer {HF_API_KEY}",
    "Content-Type": "application/json"
}

logger.info(f"OpenRouter API Key configured: {bool(OPENROUTER_API_KEY)}")
logger.info(f"HuggingFace API Key configured: {bool(HF_API_KEY)}")

# Define chat request model
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    conversation_history: Optional[List[Message]] = None

class ChatResponse(BaseModel):
    response: str
    metadata: Optional[Dict[str, Any]] = None
    visualizations: Optional[List[Dict[str, str]]] = None
    suggestions: Optional[List[str]] = None

# Enhanced response model for rich responses
class EnhancedChatResponse(BaseModel):
    response: str
    metadata: Optional[Dict[str, Any]] = None
    visualizations: Optional[List[Dict[str, str]]] = None
    suggestions: Optional[List[str]] = None

# System prompt for the chatbot
SYSTEM_PROMPT = """Tu es un assistant IA spécialisé dans la GMAO (Gestion de Maintenance Assistée par Ordinateur) qui répond aux questions sur les équipements, interventions, pièces et utilisateurs.

- Réponds aux questions des utilisateurs en interrogeant la base de données GMAO via des requêtes SQL.
- Interprète les résultats SQL et formule des réponses claires et utiles.
- Ne mentionne jamais SQL dans tes réponses aux utilisateurs.
- Pour les questions que tu ne comprends pas, demande des précisions.

Exemples d'interactions:

**Question** : "Quels sont les équipements critiques ?"
- Requête : `[EXECUTE_SQL: SELECT TOP 100 e.CodeEquipement, e.Designation FROM Equipments e INNER JOIN EquipmentCriticites ec ON e.IdCriticite = ec.IdCriticite WHERE ec.NiveauCriticite = 'Critique' AND e.IsDeleted = 0 AND ec.IsActif = 1 ORDER BY e.CodeEquipement]`
- Réponse : "Voici les équipements critiques:
  - C100: Compresseur principal
  - LA01: Ligne d'assemblage
Voulez-vous plus d'informations sur l'un d'entre eux?"

**Question** : "Quelle est la durée moyenne des interventions réalisées ?"
- Requête : `[EXECUTE_SQL: SELECT AVG(DATEDIFF(HOUR, di.DateCreation, di.DateRealisation)) AS DureeMoyenneHeures FROM DemandeInterventions di WHERE di.StatusId = 3 AND di.DateRealisation IS NOT NULL AND di.IsActif = 1]`
- Réponse : "La durée moyenne des interventions réalisées est de 48 heures. Voulez-vous une analyse par type d'intervention ?"

**Question** : "Qui est le technicien avec le plus d'interventions en cours ?"
- Requête : `[EXECUTE_SQL: SELECT TOP 1 u.Nom, u.Prenom, COUNT(di.IdDemandeIntervention) AS NombreInterventions FROM Users u INNER JOIN DemandeInterventions di ON u.ID = di.DestinatairesID WHERE di.StatusId = 2 AND di.IsActif = 1 AND u.IsActif = 1 GROUP BY u.Nom, u.Prenom ORDER BY NombreInterventions DESC]`
- Réponse : "Le technicien avec le plus d'interventions en cours est Jean Dupont, avec 5 interventions. Voulez-vous la liste de ses tâches ?"

**Question** : "Puis-je annuler l'intervention 456 ?"
- Requête : `[EXECUTE_SQL: SELECT di.StatusId, di.DemandeursID, di.DestinatairesID, di.DateAssignation, u.IDRole, r.Libelle AS Role FROM DemandeInterventions di INNER JOIN Users u ON di.DemandeursID = u.ID OR di.DestinatairesID = u.ID INNER JOIN Roles r ON u.IDRole = r.IDRole WHERE di.IdDemandeIntervention = 456 AND di.IsActif = 1 AND u.IsActif = 1]`
- Réponse : "Pour l'intervention 456 (statut : En cours), vous pouvez l'annuler si vous êtes superviseur, ou si vous êtes le demandeur/technicien et qu'elle n'a pas encore été acceptée. Pouvez-vous préciser votre rôle ou ID utilisateur ?"

**Question** : "L'intervention 789 a-t-elle un fichier attaché ?"
- Requête : `[EXECUTE_SQL: SELECT FileName, ContentType FROM DemandeInterventions WHERE IdDemandeIntervention = 789 AND IsActif = 1]`
- Réponse : "L'intervention 789 a un fichier attaché : 'rapport.pdf' (type : application/pdf). Voulez-vous que je récupère plus de détails ?"

**Question** : "Qui sont les techniciens actifs ?"
- Requête : `[EXECUTE_SQL: SELECT TOP 100 u.ID, u.Nom, u.Prenom, u.Email FROM Users u INNER JOIN Roles r ON u.IDRole = r.IDRole WHERE r.Libelle = 'Technicien' AND u.IsActif = 1 AND r.IsActif = 1 ORDER BY u.Nom]`
- Réponse : "Voici les techniciens actifs :
  - Jean Dupont (jean.dupont@alcodex.com)
  - Marie Martin (marie.martin@alcodex.com)
Voulez-vous leurs interventions en cours ?"

**Question** : "Combien d'utilisateurs par rôle ?"
- Requête : `[EXECUTE_SQL: SELECT r.Libelle AS Role, COUNT(u.ID) AS NombreUtilisateurs FROM Users u INNER JOIN Roles r ON u.IDRole = r.IDRole WHERE u.IsActif = 1 AND r.IsActif = 1 GROUP BY r.Libelle ORDER BY NombreUtilisateurs DESC]`
- Réponse : "Répartition des utilisateurs par rôle :
  - Technicien : 10 utilisateurs
  - Superviseur : 5 utilisateurs
  - Demandeur : 15 utilisateurs
Besoin d'une liste détaillée ?"

**Question** : "Quelles interventions sont assignées à Jean Dupont ?"
- Requête : `[EXECUTE_SQL: SELECT TOP 100 di.IdDemandeIntervention, di.Titre, s.Statut, di.DateCreation FROM DemandeInterventions di INNER JOIN Status s ON di.StatusId = s.Id INNER JOIN Users u ON di.DestinatairesID = u.ID WHERE u.Nom = 'Jean' AND u.Prenom = 'Dupont' AND di.IsActif = 1 AND s.IsActif = 1 AND u.IsActif = 1 ORDER BY di.DateCreation DESC]`
- Réponse : "Jean Dupont a 3 interventions assignées :
  - ID 456 : Réparation compresseur (En cours, créé le 2025-05-10)
  - ID 457 : Maintenance pompe (En attente, créé le 2025-05-09)
  - ID 458 : Vérification ligne (Réalisée, créé le 2025-05-08)
Voulez-vous les détails d'une intervention ?"

**Question** : "Quel est le taux de résolution des interventions ce mois-ci ?"
- Requête : `[EXECUTE_SQL: SELECT COUNT(di.IdDemandeIntervention) AS Total, SUM(CASE WHEN di.StatusId IN (3, 4) THEN 1 ELSE 0 END) AS Resolues, CAST(SUM(CASE WHEN di.StatusId IN (3, 4) THEN 1 ELSE 0 END) * 100.0 / COUNT(di.IdDemandeIntervention) AS DECIMAL(5,2)) AS TauxResolution FROM DemandeInterventions di WHERE di.DateCreation >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) AND di.DateCreation < DATEADD(MONTH, 1 + DATEDIFF(MONTH, 0, GETDATE()), 0) AND di.IsActif = 1]`
- Réponse : "Ce mois-ci, 20 interventions ont été enregistrées, dont 15 résolues (taux de résolution : 75 %). Voulez-vous une ventilation par type ?"

**Question** : "Quels équipements ont le plus de pannes sur les 6 derniers mois ?"
- Requête : `[EXECUTE_SQL: SELECT TOP 100 e.CodeEquipement, e.Designation, COUNT(di.IdDemandeIntervention) AS NombrePannes FROM Equipments e LEFT JOIN DemandeInterventions di ON e.IdEquipement = di.IDEquipement WHERE e.IsDeleted = 0 AND (di.IsActif = 1 OR di.IsActif IS NULL) AND (di.DateCreation >= DATEADD(MONTH, -6, GETDATE()) OR di.DateCreation IS NULL) GROUP BY e.IdEquipement, e.CodeEquipement, e.Designation ORDER BY NombrePannes DESC]`
- Réponse : "Les équipements avec le plus de pannes sur les 6 derniers mois sont :
  - C100 : Compresseur principal (12 pannes)
  - LA01 : Ligne d'assemblage (8 pannes)
  - CH02 : Chaudière (5 pannes)
Voulez-vous analyser les causes des pannes ?"

**Question** : "Quelle est la valeur moyenne des équipements ?"
- Requête : `[EXECUTE_SQL: SELECT AVG(CoutAchat) AS CoutMoyen FROM Equipments WHERE IsDeleted = 0]`
- Réponse : "La valeur moyenne des équipements est de 25 000 €. Voulez-vous une analyse par famille ?"

**Question** : "Quels sont les types d'urgences disponibles ?"
- Requête : `[EXECUTE_SQL: SELECT TOP 100 IDUrgence, Libelle FROM Urgences WHERE IsActif = 1 ORDER BY IDUrgence]`
- Réponse : "Les types d'urgences disponibles sont :
  - 1 : Basse
  - 2 : Moyenne
  - 3 : Haute
Voulez-vous plus d'infos sur l'une d'elles ?"

**Question** : "Quels sont les types de pannes possibles ?"
- Requête : `[EXECUTE_SQL: SELECT TOP 100 IDPanne, Libelle FROM Pannes WHERE IsActif = 1 ORDER BY Libelle]`
- Réponse : "Les types de pannes possibles sont :
  - Défaillance électrique
  - Panne mécanique
  - Surchauffe
Voulez-vous la liste des interventions liées à une panne spécifique ?"

**Question** : "Quelles interventions puis-je valider en tant que superviseur ?"
- Requête : `[EXECUTE_SQL: SELECT TOP 100 di.IdDemandeIntervention, di.Titre, di.DateCreation, s.Statut FROM DemandeInterventions di INNER JOIN Status s ON di.StatusId = s.Id WHERE di.StatusId = 3 AND di.IsActif = 1 AND s.IsActif = 1 ORDER BY di.DateCreation DESC]`
- Réponse : "En tant que superviseur, vous pouvez valider les interventions réalisées :
  - ID 123 : Maintenance pompe (Réalisée, 2025-05-05)
  - ID 124 : Réparation ligne (Réalisée, 2025-05-04)
Voulez-vous valider l'une d'elles ?"

**Question** : "Quelles sont les actions possibles pour l'intervention 456 ?"
- Requête : `[EXECUTE_SQL: SELECT di.StatusId, di.DemandeursID, di.DestinatairesID, di.DateAssignation FROM DemandeInterventions di WHERE di.IdDemandeIntervention = 456 AND di.IsActif = 1]`
- Réponse : "Pour l'intervention 456 (En cours, non acceptée), les actions possibles dépendent de votre rôle :
  - Superviseur : Annuler
  - Technicien assigné : Accepter ou annuler
  - Demandeur : Annuler (si non acceptée)
Pouvez-vous préciser votre rôle ?"

**Question** : "Quelles interventions ont des fichiers attachés ?"
- Requête : `[EXECUTE_SQL: SELECT TOP 100 IdDemandeIntervention, Titre, FileName FROM DemandeInterventions WHERE FileName IS NOT NULL AND IsActif = 1 ORDER BY DateCreation DESC]`
- Réponse : "Les interventions avec des fichiers attachés sont :
  - ID 789 : Réparation compresseur (rapport.pdf)
  - ID 790 : Maintenance ligne (photo.jpg)
Voulez-vous les détails d'un fichier ?"

**Questions ambiguës ou complexes**
**Question** : "Montre-moi les équipements."
- Réponse : "Pouvez-vous préciser ? Voulez-vous tous les équipements, ceux d'une famille spécifique (ex. : Moteurs), ou ceux avec un certain statut (ex. : En panne) ?"

**Question** : "Quels techniciens ont travaillé sur des équipements critiques ce mois-ci ?"
- Requête : `[EXECUTE_SQL: SELECT DISTINCT u.Nom, u.Prenom FROM Users u INNER JOIN DemandeInterventions di ON u.ID = di.DestinatairesID INNER JOIN Equipments e ON di.IDEquipement = e.IdEquipement INNER JOIN EquipmentCriticites ec ON e.IdCriticite = ec.IdCriticite WHERE ec.NiveauCriticite = 'Critique' AND di.DateCreation >= DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) AND di.DateCreation < DATEADD(MONTH, 1 + DATEDIFF(MONTH, 0, GETDATE()), 0) AND di.IsActif = 1 AND e.IsDeleted = 0 AND ec.IsActif = 1 AND u.IsActif = 1 ORDER BY u.Nom]`
- Réponse : "Ce mois-ci, les techniciens ayant travaillé sur des équipements critiques sont :
  - Jean Dupont
  - Marie Martin
Voulez-vous la liste de leurs interventions ?"

Si vous avez besoin d'exécuter une requête SQL, écrivez `[EXECUTE_SQL: votre requête SQL ici]` et je l'exécuterai pour vous. Ne mentionnez JAMAIS l'utilisation de SQL dans votre réponse à l'utilisateur.
"""

# Class for implementing RAG (Retrieval-Augmented Generation)
class RAGEnhancer:
    def __init__(self):
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.knowledge_base = []
        self.index = None
        self.dimension = 384  # Dimension of the model's embeddings
        
    def initialize_faiss_index(self):
        """Initialize FAISS index for fast vector search"""
        self.index = faiss.IndexFlatL2(self.dimension)
        
    def add_to_knowledge_base(self, texts: List[str], metadata: List[Dict] = None):
        """Add texts to the knowledge base with their metadata"""
        if metadata is None:
            metadata = [{} for _ in texts]
        
        embeddings = self.embedding_model.encode(texts)
        
        if self.index is None:
            self.initialize_faiss_index()
            
        self.index.add(np.array(embeddings).astype('float32'))
        
        for i, (text, meta) in enumerate(zip(texts, metadata)):
            self.knowledge_base.append({
                "id": len(self.knowledge_base),
                "text": text,
                "metadata": meta
            })
    
    def search(self, query: str, k: int = 5) -> List[Dict]:
        """Search for the most relevant documents for a query"""
        query_embedding = self.embedding_model.encode([query])
        distances, indices = self.index.search(np.array(query_embedding).astype('float32'), k)
        
        results = []
        for idx in indices[0]:
            if idx != -1 and idx < len(self.knowledge_base):
                results.append(self.knowledge_base[idx])
        
        return results

    def extract_schema_knowledge(self, schema_text: str):
        """Extract knowledge from the database schema"""
        # Split the schema into chunks for each table
        tables = []
        current_table = ""
        lines = schema_text.split("\n")
        
        for line in lines:
            if line.startswith("Table:"):
                if current_table:
                    tables.append(current_table)
                current_table = line
            else:
                current_table += "\n" + line
                
        if current_table:
            tables.append(current_table)
            
        # Add each table as a knowledge item
        self.add_to_knowledge_base(
            texts=tables,
            metadata=[{"type": "schema", "source": "database"} for _ in tables]
        )
        
    def extract_sql_patterns(self):
        """Add SQL query examples as knowledge"""
        sql_patterns = [
            "SELECT COUNT(*) FROM Equipments WHERE IsDeleted = 0",
            "SELECT TOP 100 e.CodeEquipement, e.Designation FROM Equipments e INNER JOIN EquipmentCriticites ec ON e.IdCriticite = ec.IdCriticite WHERE ec.NiveauCriticite = 'Critique'",
            "SELECT CodeEquipement, Designation FROM Equipments WHERE SousGarantie = 1 AND DateFinGarantie > CAST(GETDATE() AS DATE)",
            "SELECT TOP 100 p.CodePiece, p.Designation, p.Quantite_Stock FROM Pieces p WHERE p.Quantite_Stock < 10 AND p.IsActif = 1",
            "SELECT di.IdDemandeIntervention, di.Titre FROM DemandeInterventions di WHERE di.StatusId = 1 AND di.IsActif = 1"
        ]
        
        self.add_to_knowledge_base(
            texts=sql_patterns,
            metadata=[{"type": "sql_pattern", "source": "examples"} for _ in sql_patterns]
        )


# Class for generating visualizations
class VisualizationGenerator:
    def __init__(self):
        self.supported_types = ["bar", "line", "pie", "scatter"]
        
    def generate_chart(self, data: List[Dict], chart_type: str, title: str = "", 
                      x_column: str = None, y_column: str = None) -> str:
        """
        Generate a chart from data and return a base64 string
        """
        # Check if chart type is supported
        if chart_type not in self.supported_types:
            return None
            
        # Create matplotlib figure
        fig = Figure(figsize=(10, 6))
        ax = fig.subplots()
        
        # Convert data to pandas DataFrame
        df = pd.DataFrame(data)
        
        # Generate chart based on type
        if chart_type == "bar":
            if x_column and y_column:
                sns.barplot(x=x_column, y=y_column, data=df, ax=ax)
            else:
                # Try to guess columns
                sns.barplot(data=df, ax=ax)
        
        elif chart_type == "pie":
            if x_column and y_column:
                ax.pie(df[y_column], labels=df[x_column], autopct='%1.1f%%')
            
        elif chart_type == "line":
            if x_column and y_column:
                sns.lineplot(x=x_column, y=y_column, data=df, ax=ax)
            
        elif chart_type == "scatter":
            if x_column and y_column:
                sns.scatterplot(x=x_column, y=y_column, data=df, ax=ax)
        
        # Add title
        ax.set_title(title)
        
        # Convert plot to base64 image
        buf = io.BytesIO()
        fig.savefig(buf, format="png")
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        
        return img_str


# Class for enhancing query understanding and SQL generation
class QueryEnhancer:
    def __init__(self, rag_enhancer: RAGEnhancer):
        self.rag = rag_enhancer
        self.common_intents = {
            "count": ["combien", "nombre", "total"],
            "list": ["liste", "montrer", "afficher", "quels sont"],
            "detail": ["détail", "information", "spécifique"],
            "status": ["état", "statut", "avancement"],
            "compare": ["comparer", "différence", "versus"],
            "trend": ["tendance", "évolution", "historique"]
        }
        
    def identify_intent(self, query: str) -> str:
        """Identify the query intent"""
        query_lower = query.lower()
        for intent, keywords in self.common_intents.items():
            for keyword in keywords:
                if keyword in query_lower:
                    return intent
        return "unknown"
    
    def extract_entities(self, query: str) -> Dict[str, List[str]]:
        """Extract entities mentioned in the query"""
        entities = {
            "equipment": [],
            "piece": [],
            "intervention": [],
            "user": [],
            "date": []
        }
        
        # Simple entity extraction example
        query_lower = query.lower()
        
        # Look for equipment codes (letters followed by numbers)
        import re
        equipment_codes = re.findall(r'\b[a-zA-Z]+\d+\b', query)
        entities["equipment"].extend(equipment_codes)
        
        # Look for dates
        date_patterns = [
            r'\d{2}/\d{2}/\d{4}',  # DD/MM/YYYY
            r'\d{2}-\d{2}-\d{4}',  # DD-MM-YYYY
            r'\d{4}-\d{2}-\d{2}'   # YYYY-MM-DD
        ]
        for pattern in date_patterns:
            dates = re.findall(pattern, query)
            entities["date"].extend(dates)
            
        # Use RAG knowledge to improve extraction
        relevant_docs = self.rag.search(query, k=3)
        for doc in relevant_docs:
            if "table" in doc.get("metadata", {}).get("type", ""):
                table_name = doc.get("metadata", {}).get("table_name", "")
                if table_name.lower() in ["equipments"]:
                    # Add heuristics to extract specific entities
                    pass
                    
        return entities
    
    def enhance_sql_generation(self, query: str, intent: str, entities: Dict) -> str:
        """Enhance SQL query generation with templates based on intent and entities"""
        sql_template = ""
        
        if intent == "count":
            if any(entity in query.lower() for entity in ["équipement", "equipment"]):
                sql_template = "SELECT COUNT(*) AS Total FROM Equipments WHERE IsDeleted = 0"
                # Add filters based on identified entities
                if entities["equipment"]:
                    codes = "', '".join(entities["equipment"])
                    sql_template += f" AND CodeEquipement IN ('{codes}')"
                    
        elif intent == "list":
            if any(entity in query.lower() for entity in ["intervention", "maintenance"]):
                sql_template = "SELECT TOP 100 di.IdDemandeIntervention, di.Titre, s.Statut FROM DemandeInterventions di INNER JOIN Status s ON di.StatusId = s.Id WHERE di.IsActif = 1"
                # Add filters for status if mentioned
                if "attente" in query.lower():
                    sql_template += " AND di.StatusId = 1"
                elif "cours" in query.lower():
                    sql_template += " AND di.StatusId = 2"
                    
        # Return generated SQL query or empty string if no template matches
        return sql_template


# Initialize our new classes as global variables
rag_enhancer = RAGEnhancer()
visualization_generator = VisualizationGenerator()
query_enhancer = QueryEnhancer(rag_enhancer)

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_detail = f"{str(exc)}\n{traceback.format_exc()}"
    logger.error(f"Global exception: {error_detail}")
    return JSONResponse(
        status_code=500,
        content={"response": "Désolé, une erreur s'est produite. Veuillez réessayer. Détail: " + str(exc), "error": str(exc)}
    )

# Initialize database connection
def init_db_connection():
    global engine, DB_AVAILABLE
    if engine is not None:
        return engine
    try:
        logger.info("Initializing database connection...")
        engine = create_engine(DB_CONNECTION_STRING)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        DB_AVAILABLE = True
        logger.info("Database connection established successfully")
        return engine
    except Exception as e:
        DB_AVAILABLE = False
        logger.error(f"Error connecting to database: {e}")
        return None

@contextmanager
def db_connection():
    conn = None
    try:
        if init_db_connection() is not None:
            conn = engine.connect()
            yield conn
        else:
            yield None
    except Exception as e:
        logger.error(f"Error getting DB connection: {e}")
        yield None
    finally:
        if conn is not None:
            conn.close()

# Function to execute SQL queries with detailed error messages
def execute_sql_query(query: str) -> str:
    if not query.strip().upper().startswith("SELECT"):
        return "Erreur : Seules les requêtes SELECT sont autorisées."
    
    try:
        with db_connection() as connection:
            if connection is None:
                return "Erreur : Connexion à la base de données échouée."
            
            result = connection.execute(text(query))
            rows = result.fetchall()
            
            if not rows:
                return "Aucun résultat trouvé."
            
            output = []
            for row in rows[:100]:  # Limit to 100 rows
                output.append(str(dict(row)))
            if len(rows) > 100:
                output.append("... (résultats tronqués à 100 lignes)")
            return "\n".join(output)
    except sqlalchemy.exc.ProgrammingError as e:
        logger.error(f"SQL query execution error: {str(e)}")
        return f"Erreur de programmation SQL : {str(e)}"
    except sqlalchemy.exc.OperationalError as e:
        logger.error(f"SQL operational error: {str(e)}")
        return f"Erreur opérationnelle SQL : {str(e)}"
    except Exception as e:
        logger.error(f"SQL query execution error: {str(e)}")
        return f"Erreur lors de l'exécution de la requête : {str(e)}"

# Enhanced schema retrieval with foreign keys
def get_database_schema() -> str:
    try:
        with db_connection() as connection:
            if connection is None:
                return "Schéma de la base de données non disponible."
            
            schema = []
            tables = connection.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")).fetchall()
            for table in tables:
                table_name = table[0]
                schema.append(f"Table: {table_name}")
                columns = connection.execute(text(f"SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{table_name}'")).fetchall()
                for col in columns:
                    schema.append(f"  - {col[0]} ({col[1]})")
                fk_query = text(f"""
                    SELECT 
                        KCU1.COLUMN_NAME AS FK_COLUMN_NAME, 
                        KCU2.TABLE_NAME AS PK_TABLE_NAME, 
                        KCU2.COLUMN_NAME AS PK_COLUMN_NAME
                    FROM 
                        INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS RC
                    JOIN 
                        INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU1 
                        ON KCU1.CONSTRAINT_NAME = RC.CONSTRAINT_NAME
                    JOIN 
                        INFORMATION_SCHEMA.KEY_COLUMN_USAGE KCU2 
                        ON KCU2.CONSTRAINT_NAME = RC.UNIQUE_CONSTRAINT_NAME
                    WHERE 
                        KCU1.TABLE_NAME = '{table_name}'
                """)
                fks = connection.execute(fk_query).fetchall()
                if fks:
                    schema.append("  Foreign Keys:")
                    for fk in fks:
                        schema.append(f"    - {fk[0]} references {fk[1]}({fk[2]})")
            return "\n".join(schema)
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du schéma : {e}")
        return "Erreur lors de la récupération du schéma de la base de données."

# Query OpenRouter API
def query_openrouter(messages, max_retries=3, timeout=60):
    logger.info(f"Querying OpenRouter API with {len(messages)} messages")
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    logger.debug(f"OpenRouter payload: {json.dumps(payload)}")
    
    for attempt in range(max_retries):
        try:
            logger.info(f"OpenRouter attempt {attempt+1}/{max_retries}")
            response = requests.post(
                OPENROUTER_URL,
                headers=openrouter_headers,
                json=payload,
                timeout=timeout
            )
            logger.info(f"OpenRouter response status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                logger.debug(f"OpenRouter response: {json.dumps(result)[:500]}...")
                if "choices" in result and len(result["choices"]) > 0:
                    content = result["choices"][0]["message"]["content"]
                    logger.info(f"OpenRouter success, content length: {len(content)}")
                    return content
                else:
                    logger.warning(f"Unexpected OpenRouter response format: {json.dumps(result)}")
            logger.warning(f"OpenRouter error: {response.status_code}, {response.text}")
            time.sleep(min(2 * (attempt + 1), 10))
        except Exception as e:
            logger.warning(f"OpenRouter exception: {str(e)}")
            time.sleep(min(2 * (attempt + 1), 10))
    logger.error("Failed to get response from OpenRouter after multiple attempts")
    return "Désolé, je n'ai pas pu obtenir une réponse du modèle. Veuillez réessayer plus tard."

# Process the model's response and extract SQL queries if any
def extract_sql_query(response_text: str) -> tuple:
    import re
    sql_pattern = r"\[EXECUTE_SQL:\s*(.*?)\]"
    match = re.search(sql_pattern, response_text, re.DOTALL)
    if match:
        sql_query = match.group(1).strip()
        clean_response = re.sub(sql_pattern, "", response_text, re.DOTALL).strip()
        return True, sql_query, clean_response
    return False, None, response_text

@app.post("/query", response_model=EnhancedChatResponse)
async def query_chatbot(request: ChatRequest = Body(...)):
    try:
        logger.info(f"Processing query: {request.query}")
        start_time = time.time()
        
        # Check if RAG is initialized, otherwise initialize it
        if len(rag_enhancer.knowledge_base) == 0:
            logger.info("Initializing RAG knowledge base...")
            # Extract knowledge from database schema
            db_schema = get_database_schema()
            if "non disponible" not in db_schema:
                rag_enhancer.extract_schema_knowledge(db_schema)
            # Add SQL query examples
            rag_enhancer.extract_sql_patterns()
            logger.info(f"RAG knowledge base initialized with {len(rag_enhancer.knowledge_base)} entries")
            
        # Enhance query understanding
        intent = query_enhancer.identify_intent(request.query)
        entities = query_enhancer.extract_entities(request.query)
        suggested_sql = query_enhancer.enhance_sql_generation(request.query, intent, entities)
        
        # Enrich context with RAG information
        relevant_docs = rag_enhancer.search(request.query, k=3)
        context_enrichment = "\n\nInformations pertinentes pour répondre à cette question:\n"
        for i, doc in enumerate(relevant_docs):
            context_enrichment += f"{i+1}. {doc['text'][:200]}...\n"

        if not OPENROUTER_AVAILABLE:
            logger.error("OpenRouter API not available")
            return EnhancedChatResponse(
                response=f"Je suis désolé, le service de chatbot n'est pas disponible. Veuillez vérifier la configuration API. Erreur: {OPENROUTER_ERROR_MESSAGE}",
                metadata={"error": "OpenRouter client not available", "error_details": OPENROUTER_ERROR_MESSAGE}
            )
            
        # Format messages for OpenRouter Chat API with enhanced context
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]
        
        # Check if database schema is available
        db_schema = get_database_schema()
        if "non disponible" not in db_schema:
            messages.append({"role": "system", "content": f"Schéma de la base de données :\n{db_schema}"})
        else:
            logger.warning("Database schema not available")
            messages.append({"role": "system", "content": "La base de données n'est pas disponible. Veuillez en informer l'utilisateur."})
        
        # Add RAG context as system message
        if relevant_docs:
            messages.append({"role": "system", "content": context_enrichment})
            
        # Add suggested SQL if available
        if suggested_sql:
            messages.append({"role": "system", "content": f"Requête SQL suggérée basée sur l'analyse de la question: {suggested_sql}"})
            
        # Add conversation history
        if request.conversation_history:
            for msg in request.conversation_history[-5:]:  # Limit to 5 recent messages
                messages.append({"role": msg.role, "content": msg.content})
            
        # Add current user query with enhanced context about intent and entities
        enhanced_query = f"{request.query}\n\nAnalyse: Intent: {intent}, Entités: {str(entities)}"
        messages.append({"role": "user", "content": enhanced_query})
        
        # Generate response with retry mechanism for SQL errors and ambiguity handling
        max_retries = 3
        retry_count = 0
        visualizations = []
        
        while retry_count < max_retries:
            response_text = query_openrouter(messages)
            has_sql, sql_query, clean_response = extract_sql_query(response_text)
            
            if has_sql:
                sql_result = execute_sql_query(sql_query)
                if not sql_result.startswith("Erreur"):
                    # Success: Interpret the result
                    follow_up_messages = messages.copy()
                    follow_up_messages.append({"role": "assistant", "content": clean_response})
                    
                    # Try to create a visualization if results are suitable
                    try:
                        import json
                        result_data = []
                        for row in sql_result.split("\n")[:20]:  # Limit to 20 rows for visualization
                            if row and not row.startswith("..."):
                                try:
                                    result_data.append(json.loads(row.replace("'", "\"")))
                                except:
                                    continue
                                    
                        if result_data and len(result_data) > 1:
                            # Try to determine appropriate chart type
                            chart_type = "bar"  # Default
                            if intent == "trend" or "évolution" in request.query.lower():
                                chart_type = "line"
                            elif intent == "compare" or "comparaison" in request.query.lower():
                                chart_type = "bar"
                            elif "pourcentage" in request.query.lower() or "répartition" in request.query.lower():
                                chart_type = "pie"
                                
                            # Determine X and Y columns based on data
                            x_column = next(iter(result_data[0].keys()))
                            y_column = list(result_data[0].keys())[1] if len(result_data[0].keys()) > 1 else None
                            
                            # Generate visualization
                            if y_column:
                                viz_title = f"Visualisation des données pour: {request.query[:30]}..."
                                img_b64 = visualization_generator.generate_chart(
                                    data=result_data, 
                                    chart_type=chart_type,
                                    title=viz_title,
                                    x_column=x_column,
                                    y_column=y_column
                                )
                                
                                if img_b64:
                                    visualizations.append({
                                        "type": "image",
                                        "format": "base64",
                                        "data": img_b64,
                                        "title": viz_title
                                    })
                                    
                                    # Add a mention about the visualization
                                    data_interpretation = f"Résultat de la requête SQL: \n{sql_result}\n\nInterprète ce résultat pour répondre à ma question sans mentionner la requête SQL. J'ai également généré un graphique {chart_type} pour visualiser ces données, mentionne-le dans ta réponse."
                                else:
                                    data_interpretation = f"Résultat de la requête SQL: \n{sql_result}\n\nInterprète ce résultat pour répondre à ma question sans mentionner la requête SQL."
                            else:
                                data_interpretation = f"Résultat de la requête SQL: \n{sql_result}\n\nInterprète ce résultat pour répondre à ma question sans mentionner la requête SQL."
                    except Exception as viz_error:
                        logger.error(f"Error generating visualization: {viz_error}")
                        data_interpretation = f"Résultat de la requête SQL: \n{sql_result}\n\nInterprète ce résultat pour répondre à ma question sans mentionner la requête SQL."
                    
                    follow_up_messages.append({
                        "role": "user",
                        "content": data_interpretation
                    })
                    
                    response_text = query_openrouter(follow_up_messages)
                    break
                else:
                    # Error: Ask for correction based on error type
                    if "Invalid column name" in sql_result:
                        correction_prompt = f"La requête SQL a échoué avec l'erreur : {sql_result}. Vérifiez l'orthographe des colonnes ou consultez le schéma pour trouver le nom correct."
                    elif "Syntax error" in sql_result:
                        correction_prompt = f"La requête SQL a échoué avec l'erreur : {sql_result}. Revoyez la structure de la requête, vérifiez les clauses manquantes ou incorrectes."
                    else:
                        correction_prompt = f"La requête SQL a échoué avec l'erreur : {sql_result}. Corrigez la requête en conséquence."
                    messages.append({"role": "user", "content": correction_prompt})
                    retry_count += 1
            elif "demande de clarification" in response_text.lower():
                # Ambiguity: Return the clarification request to the user
                return EnhancedChatResponse(
                    response=response_text,
                    metadata={"clarification_needed": True},
                    suggestions=["Pouvez-vous préciser la période?", "Quel équipement vous intéresse?", "Quel statut recherchez-vous?"]
                )
            else:
                # No SQL query, use the response as is
                break
                
        if retry_count == max_retries:
            response_text = "Désolé, je n'ai pas pu obtenir les informations demandées après plusieurs tentatives. Veuillez reformuler votre question ou contacter le support."
            
        # Generate follow-up question suggestions
        suggestions = [
            f"Pouvez-vous me donner plus de détails sur {entities['equipment'][0]}?" if entities['equipment'] else "Quels sont les équipements critiques?",
            "Combien d'interventions sont prévues cette semaine?",
            "Quelles pièces ont un stock faible?"
        ]
            
        metadata = {
            "db_available": DB_AVAILABLE,
            "model_used": OPENROUTER_MODEL,
            "sql_executed": has_sql if 'has_sql' in locals() else False,
            "prompt_tokens": sum(len(msg["content"]) for msg in messages),
            "intent": intent,
            "entities": entities
        }
        metadata["total_time_ms"] = round((time.time() - start_time) * 1000)
        logger.info(f"Enhanced query processed in {metadata['total_time_ms']}ms")
        
        return EnhancedChatResponse(
            response=response_text, 
            metadata=metadata,
            visualizations=visualizations if visualizations else None,
            suggestions=suggestions
        )

    except Exception as e:
        error_msg = f"Error processing query: {e}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return EnhancedChatResponse(
            response=f"Je suis désolé, une erreur est survenue. Détail: {str(e)}",
            metadata={"error": str(e), "traceback": traceback.format_exc()}
        )

# Endpoint for generating visualizations on demand
@app.post("/visualize")
async def generate_visualization(
    request: dict = Body(...)
):
    try:
        # Extract request parameters
        query = request.get("query", "")
        chart_type = request.get("chart_type", "bar")
        
        if not query:
            return JSONResponse(
                status_code=400,
                content={"error": "La requête SQL est requise"}
            )
            
        # Execute SQL query
        sql_result = execute_sql_query(query)
        if sql_result.startswith("Erreur"):
            return JSONResponse(
                status_code=400,
                content={"error": sql_result}
            )
            
        # Prepare data for visualization
        import json
        result_data = []
        for row in sql_result.split("\n"):
            if row and not row.startswith("..."):
                try:
                    result_data.append(json.loads(row.replace("'", "\"")))
                except:
                    continue
                    
        if not result_data:
            return JSONResponse(
                status_code=400,
                content={"error": "Pas de données à visualiser"}
            )
            
        # Determine X and Y columns
        x_column = request.get("x_column", next(iter(result_data[0].keys())))
        y_column = request.get("y_column", list(result_data[0].keys())[1] if len(result_data[0].keys()) > 1 else None)
        
        if not y_column:
            return JSONResponse(
                status_code=400,
                content={"error": "Impossible de déterminer la colonne Y"}
            )
            
        # Generate visualization
        title = request.get("title", "Visualisation des données")
        img_b64 = visualization_generator.generate_chart(
            data=result_data,
            chart_type=chart_type,
            title=title,
            x_column=x_column,
            y_column=y_column
        )
        
        if not img_b64:
            return JSONResponse(
                status_code=500,
                content={"error": "Échec de la génération de la visualisation"}
            )
            
        return {
            "visualization": {
                "type": "image",
                "format": "base64",
                "data": img_b64,
                "title": title
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating visualization: {e}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": f"Erreur lors de la génération de la visualisation: {str(e)}"}
        )

@app.get("/test")
async def test_endpoint():
    db_status = "connected" if DB_AVAILABLE else "failed"
    openrouter_status = "available" if OPENROUTER_AVAILABLE else "not available"
    model_name = OPENROUTER_MODEL if OPENROUTER_AVAILABLE else HF_MODEL
    error = OPENROUTER_ERROR_MESSAGE
    
    logger.info(f"Test endpoint called - DB Status: {db_status}, OpenRouter Status: {openrouter_status}")
    
    response = {
        "message": "GMAO Chatbot API is working!",
        "database": db_status,
        "llm_provider": "OpenRouter" if OPENROUTER_AVAILABLE else "HuggingFace",
        "model": model_name,
        "version": "1.4.0",  # Updated version number for the enhanced chatbot
        "features": ["RAG", "Visualizations", "Intent Detection", "Entity Extraction"]
    }
    
    if openrouter_status == "available":
        response["reply"] = "OpenRouter API is connected"
    elif error:
        response["error"] = error
    
    return response

@app.on_event("startup")
async def startup_event():
    logger.info("Starting GMAO Chatbot service...")
    init_db_connection()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5002"))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting GMAO Chatbot service on {host}:{port}")
    uvicorn.run(app, host=host, port=port)