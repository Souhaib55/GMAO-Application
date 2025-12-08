"""
GMAO Chatbot Service - Intelligent AI Assistant for GMAO Database
This chatbot answers supervisor questions based on the GMAO database.
"""

import os
import time
import logging
import json
import requests
import re
import traceback
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Tuple
from contextlib import contextmanager, asynccontextmanager
import pathlib
import urllib.parse

# Database imports
import pyodbc
from sqlalchemy import create_engine, text

# FastAPI imports
from fastapi import FastAPI, Body, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("gmao_chatbot.log", encoding='utf-8')]
)
logger = logging.getLogger("gmao_chatbot")

# ============================================================================
# DATABASE SCHEMA DEFINITION - This is crucial for the AI to generate correct SQL
# ============================================================================

DATABASE_SCHEMA = """
## GMAO Database Schema

### Core Tables:

#### 1. Equipment (Equipments table)
- IdEquipement (int, PK) - Equipment ID
- CodeEquipement (nvarchar) - Equipment code
- Designation (nvarchar) - Equipment name/designation
- Description (nvarchar, nullable) - Description
- IdCriticite (int, FK) - Criticality level ID
- IdEtat (int, FK) - Equipment state ID
- IdFamille (int, FK) - Equipment family ID
- IdModele (int, FK) - Equipment model ID  
- IdGroupe (int, FK) - Equipment group ID
- DateInstallation (datetime, nullable) - Installation date
- DateMiseEnService (datetime, nullable) - Commissioning date
- NumeroSerie (nvarchar, nullable) - Serial number
- SousGarantie (bit) - Under warranty flag
- DateAchat (datetime, nullable) - Purchase date
- DateFinGarantie (datetime, nullable) - Warranty end date
- DateConstruction (datetime, nullable) - Manufacturing date
- CoutAchat (decimal, nullable) - Purchase cost
- DateCreation (datetime) - Record creation date
- DateModification (datetime, nullable) - Record modification date
- IsDeleted (bit) - Soft delete flag (0 = active, 1 = deleted)

#### 2. Intervention Requests (DemandeInterventions table)
- IdDemandeIntervention (int, PK) - Intervention request ID
- Titre (nvarchar) - Title/subject of intervention
- DateCreation (datetime) - Creation date
- FileData (varbinary, nullable) - Attached file data
- FileName (nvarchar, nullable) - Attached file name
- ContentType (nvarchar, nullable) - File content type
- MachineArretee (bit) - Machine stopped flag
- IDEtat (int, FK) - State ID (legacy)
- StatusId (int, FK) - Status ID (new)
- IDTypeIntervention (int, FK) - Intervention type ID
- IDUrgence (int, FK) - Urgency level ID
- IDChaineProduction (int, FK) - Production chain ID
- IDPanne (int, FK) - Fault/breakdown ID
- DemandeursID (int, FK) - Requester user ID
- DestinatairesID (int, FK, nullable) - Assignee user ID
- IsActif (bit) - Active flag (1 = active, 0 = inactive)
- DateAssignation (datetime, nullable) - Assignment date
- DateRealisation (datetime, nullable) - Completion date
- DateCloture (datetime, nullable) - Closure date
- RaisonAnnulation (nvarchar, nullable) - Cancellation reason
- DatePriseEnCharge (datetime, nullable) - Acceptance date
- DateResolution (datetime, nullable) - Resolution date

#### 3. Status (Status table)
- Id (int, PK) - Status ID
- Statut (nvarchar) - Status name (e.g., "En attente", "En cours", "Terminé")
- Description (nvarchar) - Status description
- IsActif (bit) - Active flag

#### 4. Users (Users table)
- ID (int, PK) - User ID
- AppUserId (nvarchar, FK) - ASP.NET Identity user ID
- Nom (nvarchar) - Last name
- Prenom (nvarchar) - First name
- Email (nvarchar) - Email address
- DateCreation (datetime) - Creation date
- DateModification (datetime) - Modification date
- IsActif (bit) - Active flag
- IDRole (int, FK) - Role ID

#### 5. Equipment Criticality (EquipmentCriticites table)
- IdCriticite (int, PK) - Criticality ID
- NomCriticite (nvarchar) - Criticality name (e.g., "Haute", "Moyenne", "Basse")
- Description (nvarchar, nullable) - Description
- DateCreation (datetime) - Creation date
- DateModification (datetime, nullable) - Modification date
- IsActif (bit) - Active flag

#### 6. Equipment State (EtatEquipements table)
- IdEtat (int, PK) - State ID
- NomEtat (nvarchar) - State name (e.g., "En service", "En panne", "En maintenance")
- Description (nvarchar, nullable) - Description
- IsActif (bit) - Active flag

#### 7. Urgency Levels (Urgences table)
- IDUrgence (int, PK) - Urgency ID
- Libelle (nvarchar) - Urgency label (e.g., "Haute", "Moyenne", "Basse")
- DateCreation (datetime) - Creation date
- DateModification (datetime, nullable) - Modification date
- IsActif (bit) - Active flag

#### 8. Intervention Types (TypeInterventions table)
- IDTypeIntervention (int, PK) - Type ID
- Libelle (nvarchar) - Type label (e.g., "Corrective", "Préventive")
- DateCreation (datetime) - Creation date
- DateModification (datetime, nullable) - Modification date
- IsActif (bit) - Active flag

#### 9. Production Chains (ChaineProductions table)
- IDChaineProduction (int, PK) - Production chain ID
- Libelle (nvarchar) - Chain name
- DateCreation (datetime) - Creation date
- DateModification (datetime, nullable) - Modification date
- IsActif (bit) - Active flag

#### 10. Faults/Breakdowns (Pannes table)
- IDPanne (int, PK) - Fault ID
- Libelle (nvarchar) - Fault description
- DateCreation (datetime) - Creation date
- DateModification (datetime, nullable) - Modification date
- IsActif (bit) - Active flag

#### 11. Stock (Stocks table)
- Id (int, PK) - Stock ID
- Code (nvarchar) - Stock code
- Description (nvarchar) - Description
- StockEntitiesId (int, FK) - Stock entity ID
- StockStatusId (int, FK) - Stock status ID
- StockSupplierId (int, FK) - Supplier ID
- CreatedOn (datetime) - Creation date
- IsDeleted (bit) - Soft delete flag

#### 12. Stock Entities (StockEntities table)
- Id (int, PK) - Entity ID
- Name (nvarchar) - Entity name

#### 13. Stock Status (StockStatus table)
- Id (int, PK) - Status ID
- Name (nvarchar) - Status name

#### 14. Stock Suppliers (StockSuppliers table)
- Id (int, PK) - Supplier ID
- Name (nvarchar) - Supplier name

#### 15. Equipment Families (FamilleEquipements table)
- IdFamille (int, PK) - Family ID
- NomFamille (nvarchar) - Family name
- Description (nvarchar, nullable) - Description
- IsActif (bit) - Active flag

#### 16. Equipment Groups (GroupeEquipements table)
- IdGroupe (int, PK) - Group ID
- NomGroupe (nvarchar) - Group name
- Description (nvarchar, nullable) - Description
- IsActif (bit) - Active flag

#### 17. Equipment Models (ModeleEquipements table)
- IdModele (int, PK) - Model ID
- NomModele (nvarchar) - Model name
- Description (nvarchar, nullable) - Description
- IdMarque (int, FK) - Brand ID
- IdCriticite (int, FK) - Criticality ID
- IsActif (bit) - Active flag

#### 18. Brands (Marques table)
- IdMarque (int, PK) - Brand ID
- NomMarque (nvarchar) - Brand name
- Description (nvarchar, nullable) - Description
- IsActif (bit) - Active flag

#### 19. Roles (Roles table)
- IDRole (int, PK) - Role ID
- Libelle (nvarchar) - Role name (e.g., "Superviseur", "Technicien", "Admin")
- IsActif (bit) - Active flag

### Common Query Patterns:
1. For interventions today: WHERE CAST(DateCreation AS DATE) = CAST(GETDATE() AS DATE)
2. For active records: WHERE IsActif = 1 or WHERE IsDeleted = 0
3. Always use proper JOINs to get related data (Status, Users, etc.)
4. Use CAST(date AS DATE) for date comparisons
5. Use French month names: janvier, février, mars, avril, mai, juin, juillet, août, septembre, octobre, novembre, décembre
"""

# ============================================================================
# CONFIGURATION
# ============================================================================

def read_app_settings():
    """Read settings from appsettings.Development.json"""
    try:
        potential_paths = [
            pathlib.Path(__file__).parent.absolute().parent / 'API' / 'appsettings.Development.json',
            pathlib.Path.cwd().parent / 'API' / 'appsettings.Development.json',
            pathlib.Path.cwd() / 'API' / 'appsettings.Development.json',
            pathlib.Path(__file__).parent.absolute() / 'appsettings.Development.json',
        ]
        
        appsettings_path = None
        for path in potential_paths:
            if path.exists():
                appsettings_path = path
                logger.info(f"Found appsettings at: {path}")
                break
        
        if not appsettings_path:
            logger.error("appsettings.Development.json not found")
            return {}, ""
        
        with open(appsettings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
        
        conn_string = settings.get('ConnectionStrings', {}).get('DefaultConnection', '')
        if not conn_string:
            logger.error("No DefaultConnection found in appsettings")
            return settings, ""
        
        # Parse connection string
        params = {}
        for part in conn_string.split(';'):
            if '=' in part:
                key, value = part.split('=', 1)
                params[key.strip()] = value.strip()
        
        server = params.get('Server', params.get('Data Source', ''))
        database = params.get('Database', params.get('Initial Catalog', ''))
        trusted = params.get('Trusted_Connection', 'False').lower() in ('true', 'yes')
        trust_cert = params.get('TrustServerCertificate', 'False').lower() in ('true', 'yes')
        
        if not server or not database:
            logger.error("Missing server or database in connection string")
            return settings, ""
        
        # Find available ODBC driver
        available_drivers = []
        try:
            available_drivers = [d for d in pyodbc.drivers() if "SQL Server" in d]
            logger.info(f"Available SQL Server ODBC drivers: {available_drivers}")
        except Exception as e:
            logger.warning(f"Could not list ODBC drivers: {e}")
        
        preferred_drivers = [
            "ODBC Driver 18 for SQL Server",
            "ODBC Driver 17 for SQL Server",
            "SQL Server Native Client 11.0",
            "SQL Server"
        ]
        
        driver = next((d for d in preferred_drivers if d in available_drivers), 
                      available_drivers[0] if available_drivers else preferred_drivers[0])
        logger.info(f"Selected SQL Server driver: {driver}")
        
        # Build ODBC connection string
        server_clean = server.replace('\\\\', '\\')
        if trusted:
            odbc_conn = f"DRIVER={{{driver}}};SERVER={server_clean};DATABASE={database};Trusted_Connection=yes;TrustServerCertificate={'yes' if trust_cert else 'no'}"
        else:
            user = params.get('User ID', '')
            password = params.get('Password', '')
            odbc_conn = f"DRIVER={{{driver}}};SERVER={server_clean};DATABASE={database};UID={user};PWD={password};TrustServerCertificate={'yes' if trust_cert else 'no'}"
        
        sqlalchemy_conn = f"mssql+pyodbc:///?odbc_connect={urllib.parse.quote_plus(odbc_conn)}"
        
        # Test connection
        try:
            with pyodbc.connect(odbc_conn, timeout=10) as test_conn:
                with test_conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    logger.info("Database connection test successful")
                    return settings, sqlalchemy_conn
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return settings, sqlalchemy_conn
            
    except Exception as e:
        logger.error(f"Error reading app settings: {e}")
        logger.error(traceback.format_exc())
        return {}, ""

# Load settings
app_settings, conn_string = read_app_settings()

# Database configuration
DB_CONNECTION_STRING = conn_string
engine = None
DB_AVAILABLE = False
DB_CONNECTION_ERROR = ""

# AI Provider configurations
# Use the new OpenRouter API key directly for reliability
OPENROUTER_API_KEY = "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"

AI_PROVIDERS = {
    "openrouter": {
        "api_key": OPENROUTER_API_KEY,
        "endpoint": "https://openrouter.ai/api/v1/chat/completions",
        "model": "google/gemma-3-27b-it:free"  # Fast free model
    },
    "openai": {
        "api_key": app_settings.get('OpenAI', {}).get('ApiKey', ''),
        "endpoint": "https://api.openai.com/v1/chat/completions",
        "model": "gpt-4o-mini"
    },
    "deepseek": {
        "api_key": app_settings.get('Deepseek', {}).get('ApiKey', ''),
        "endpoint": app_settings.get('Deepseek', {}).get('Endpoint', 'https://api.deepseek.com/v1/chat/completions'),
        "model": "deepseek-chat"
    },
    "gemini": {
        "api_key": app_settings.get('Gemini', {}).get('ApiKey', ''),
        "endpoint": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        "model": "gemini-1.5-flash"
    }
}

# Select primary AI provider (OpenRouter first with new key, then others as fallback)
PRIMARY_AI_PROVIDER = None
FALLBACK_PROVIDERS = []
for provider in ["openrouter", "gemini", "openai", "deepseek"]:
    if AI_PROVIDERS[provider]["api_key"]:
        if PRIMARY_AI_PROVIDER is None:
            PRIMARY_AI_PROVIDER = provider
        else:
            FALLBACK_PROVIDERS.append(provider)

logger.info(f"Primary AI provider: {PRIMARY_AI_PROVIDER}")
logger.info(f"Fallback providers: {FALLBACK_PROVIDERS}")

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    conversation_history: Optional[List[Dict[str, str]]] = None

class EnhancedChatResponse(BaseModel):
    response: str
    metadata: Optional[Dict[str, Any]] = None
    visualizations: Optional[List[Dict[str, str]]] = None
    suggestions: Optional[List[str]] = None

# ============================================================================
# DATABASE CONNECTION
# ============================================================================

def init_db_connection():
    """Initialize database connection"""
    global engine, DB_AVAILABLE, DB_CONNECTION_ERROR
    
    if engine is not None and DB_AVAILABLE:
        return engine
    
    if not DB_CONNECTION_STRING:
        DB_CONNECTION_ERROR = "No connection string configured"
        DB_AVAILABLE = False
        return None
    
    for attempt in range(3):
        try:
            logger.info(f"Attempting DB connection (attempt {attempt+1}/3)")
            engine = create_engine(DB_CONNECTION_STRING, connect_args={"timeout": 30})
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1")).fetchone()
                if result:
                    logger.info("Database connection successful")
                    DB_AVAILABLE = True
                    DB_CONNECTION_ERROR = ""
                    return engine
        except Exception as e:
            DB_CONNECTION_ERROR = str(e)
            logger.error(f"DB connection error (attempt {attempt+1}): {e}")
            if attempt < 2:
                time.sleep(2)
    
    DB_AVAILABLE = False
    return None

@contextmanager
def db_connection():
    """Context manager for database connections"""
    conn = None
    try:
        engine_instance = init_db_connection()
        if engine_instance is not None:
            conn = engine_instance.connect()
            yield conn
        else:
            yield None
    except Exception as e:
        logger.error(f"Error getting DB connection: {e}")
        yield None
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

# ============================================================================
# AI PROVIDER FUNCTIONS
# ============================================================================

def call_ai_provider(messages: List[Dict], provider: str = None, timeout: int = 30) -> Optional[str]:
    """Call AI provider API with fallback support"""
    providers_to_try = []
    
    if provider:
        providers_to_try = [provider]
    else:
        providers_to_try = [PRIMARY_AI_PROVIDER] + FALLBACK_PROVIDERS if PRIMARY_AI_PROVIDER else []
    
    if not providers_to_try:
        logger.error("No AI provider available")
        return None
    
    for current_provider in providers_to_try:
        config = AI_PROVIDERS.get(current_provider)
        if not config or not config["api_key"]:
            continue
        
        try:
            logger.info(f"Trying AI provider: {current_provider}")
            if current_provider == "gemini":
                result = call_gemini(messages, config)
            else:
                result = call_openai_compatible(messages, config, current_provider)
            
            if result:
                return result
        except Exception as e:
            logger.warning(f"Provider {current_provider} failed: {e}")
            continue
    
    logger.error("All AI providers failed")
    return None

def call_openai_compatible(messages: List[Dict], config: Dict, provider: str) -> Optional[str]:
    """Call OpenAI-compatible API (OpenAI, DeepSeek, OpenRouter)"""
    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json"
    }
    
    if provider == "openrouter":
        headers["HTTP-Referer"] = "https://gmao.application"
    
    payload = {
        "model": config["model"],
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 2000
    }
    
    for attempt in range(2):  # Reduced retries for faster failover
        try:
            logger.info(f"Calling {provider} API (attempt {attempt+1}/2)")
            response = requests.post(
                config["endpoint"],
                headers=headers,
                json=payload,
                timeout=30  # Reduced timeout for faster failover
            )
            
            if response.status_code == 200:
                result = response.json()
                if "choices" in result and result["choices"]:
                    content = result["choices"][0]["message"]["content"]
                    logger.info(f"{provider} API call successful")
                    return content
            else:
                logger.warning(f"{provider} API error {response.status_code}: {response.text[:200]}")
        except Exception as e:
            logger.warning(f"{provider} attempt {attempt+1} failed: {e}")
        
        time.sleep(2 * (attempt + 1))
    
    return None

def call_gemini(messages: List[Dict], config: Dict) -> Optional[str]:
    """Call Google Gemini API"""
    url = f"{config['endpoint']}?key={config['api_key']}"
    
    # Convert messages to Gemini format
    contents = []
    for msg in messages:
        role = "user" if msg["role"] in ["user", "system"] else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })
    
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 2000
        }
    }
    
    try:
        logger.info("Calling Gemini API")
        response = requests.post(url, json=payload, timeout=30)
        logger.info(f"Gemini API status: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            if "candidates" in result and result["candidates"]:
                content = result["candidates"][0]["content"]["parts"][0]["text"]
                logger.info("Gemini API call successful")
                return content
        else:
            logger.warning(f"Gemini API error: {response.text[:200]}")
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
    
    return None

# ============================================================================
# DATE PARSING
# ============================================================================

FRENCH_MONTHS = {
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4,
    "mai": 5, "juin": 6, "juillet": 7, "août": 8, "aout": 8,
    "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12, "decembre": 12
}

def parse_french_date(text: str) -> Optional[str]:
    """Parse French date expressions and return SQL date string"""
    text_lower = text.lower()
    today = datetime.now()
    
    # Handle relative dates
    if "aujourd'hui" in text_lower or "aujourd hui" in text_lower:
        return today.strftime("%Y-%m-%d")
    
    if "hier" in text_lower:
        return (today - timedelta(days=1)).strftime("%Y-%m-%d")
    
    if "demain" in text_lower:
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    
    if "cette semaine" in text_lower:
        start_of_week = today - timedelta(days=today.weekday())
        return f"BETWEEN '{start_of_week.strftime('%Y-%m-%d')}' AND '{today.strftime('%Y-%m-%d')}'"
    
    if "ce mois" in text_lower or "ce mois-ci" in text_lower:
        return f"MONTH = {today.month} AND YEAR = {today.year}"
    
    # Handle specific dates like "2 juin" or "15 décembre 2025"
    date_patterns = [
        r"(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s*(\d{4})?",
        r"(\d{1,2})/(\d{1,2})/(\d{4})",
        r"(\d{4})-(\d{1,2})-(\d{1,2})"
    ]
    
    # Pattern: "2 juin 2025" or "2 juin"
    match = re.search(date_patterns[0], text_lower)
    if match:
        day = int(match.group(1))
        month = FRENCH_MONTHS.get(match.group(2))
        year = int(match.group(3)) if match.group(3) else today.year
        if month:
            return f"{year}-{month:02d}-{day:02d}"
    
    # Handle month names alone
    for month_name, month_num in FRENCH_MONTHS.items():
        if month_name in text_lower:
            year = today.year
            # Check if year is mentioned
            year_match = re.search(r"(\d{4})", text_lower)
            if year_match:
                year = int(year_match.group(1))
            return f"MONTH_YEAR:{month_num}:{year}"
    
    return None

# ============================================================================
# SQL QUERY GENERATION
# ============================================================================

def get_sql_generation_prompt() -> str:
    """Get the system prompt for SQL generation"""
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"""Tu es un expert SQL Server pour une application GMAO (Gestion de Maintenance Assistée par Ordinateur).
La date actuelle est: {current_date}

{DATABASE_SCHEMA}

### RÈGLE PRINCIPALE - TRÈS IMPORTANTE:
Tu dois TOUJOURS essayer de générer une requête SQL pour TOUTE question qui pourrait concerner les données GMAO.
Les données GMAO incluent: utilisateurs, rôles, interventions, équipements, stocks, pannes, urgences, statuts, etc.
Si l'utilisateur mentionne un nom de personne, une entité, un équipement, ou tout autre terme qui pourrait être dans la base, génère une requête SQL.

### Instructions pour générer des requêtes SQL:
1. Génère UNIQUEMENT des requêtes SELECT (pas de modification de données)
2. Utilise TOUJOURS des alias clairs pour les colonnes
3. Pour les dates:
   - Aujourd'hui: CAST(GETDATE() AS DATE)
   - Comparaison de dates: CAST(column AS DATE) = 'YYYY-MM-DD'
   - Mois spécifique: MONTH(column) = X AND YEAR(column) = Y
4. Pour les enregistrements actifs:
   - Tables avec IsActif: WHERE IsActif = 1
   - Tables avec IsDeleted: WHERE IsDeleted = 0
5. Joins importants:
   - DemandeInterventions -> Statuses ON StatusId = Id
   - DemandeInterventions -> Users ON DemandeursID = ID (Demandeur)
   - DemandeInterventions -> Users ON DestinatairesID = ID (Destinataire)
   - DemandeInterventions -> Urgences ON IDUrgence = IDUrgence
   - DemandeInterventions -> TypeInterventions ON IDTypeIntervention = IDTypeIntervention
   - Equipments -> EquipmentCriticites ON IdCriticite = IdCriticite
   - Equipments -> EtatEquipements ON IdEtat = IdEtat
   - Users -> Roles ON IDRole = IDRole

### Questions sur des personnes spécifiques (TRÈS IMPORTANT):
Quand l'utilisateur mentionne un NOM de personne (ex: Loujain, Ahmed, Mohamed, etc.) et demande:
- Son rôle -> SELECT u.ID, u.Nom, u.Prenom, u.Email, r.Libelle as Role FROM Users u LEFT JOIN Roles r ON u.IDRole = r.IDRole WHERE u.Nom LIKE '%NomPersonne%' OR u.Prenom LIKE '%NomPersonne%'
- Ses informations -> SELECT u.* , r.Libelle as Role FROM Users u LEFT JOIN Roles r ON u.IDRole = r.IDRole WHERE u.Nom LIKE '%NomPersonne%' OR u.Prenom LIKE '%NomPersonne%'
- Ses interventions créées -> SELECT d.*, s.Statut FROM DemandeInterventions d LEFT JOIN Statuses s ON d.StatusId = s.Id LEFT JOIN Users u ON d.DemandeursID = u.ID WHERE (u.Nom LIKE '%NomPersonne%' OR u.Prenom LIKE '%NomPersonne%') AND d.IsActif = 1
- Ses interventions assignées -> SELECT d.*, s.Statut FROM DemandeInterventions d LEFT JOIN Statuses s ON d.StatusId = s.Id LEFT JOIN Users u ON d.DestinatairesID = u.ID WHERE (u.Nom LIKE '%NomPersonne%' OR u.Prenom LIKE '%NomPersonne%') AND d.IsActif = 1

### Exemples de requêtes pour différentes questions:
1. "Quel est le rôle de Loujain?" -> SELECT u.ID, u.Nom, u.Prenom, u.Email, r.Libelle as Role FROM Users u LEFT JOIN Roles r ON u.IDRole = r.IDRole WHERE u.Nom LIKE '%Loujain%' OR u.Prenom LIKE '%Loujain%'
2. "Qui est Ahmed?" -> SELECT u.ID, u.Nom, u.Prenom, u.Email, u.DateCreation, r.Libelle as Role FROM Users u LEFT JOIN Roles r ON u.IDRole = r.IDRole WHERE u.Nom LIKE '%Ahmed%' OR u.Prenom LIKE '%Ahmed%'
3. "Liste des demandeurs" -> SELECT u.ID, u.Nom, u.Prenom, u.Email, r.Libelle as Role FROM Users u LEFT JOIN Roles r ON u.IDRole = r.IDRole WHERE r.Libelle LIKE '%Demandeur%'
4. "Quels sont les techniciens?" -> SELECT u.ID, u.Nom, u.Prenom, u.Email FROM Users u LEFT JOIN Roles r ON u.IDRole = r.IDRole WHERE r.Libelle LIKE '%Technicien%'
5. "Combien d'utilisateurs par rôle?" -> SELECT r.Libelle as Role, COUNT(u.ID) as NombreUtilisateurs FROM Users u LEFT JOIN Roles r ON u.IDRole = r.IDRole WHERE u.IsActif = 1 GROUP BY r.Libelle
6. "Liste tous les rôles" -> SELECT IDRole, Libelle FROM Roles

### Format de réponse:
Réponds UNIQUEMENT avec la requête SQL, sans explication ni markdown ni backticks.
Réponds NO_SQL_NEEDED SEULEMENT si la question est CLAIREMENT hors sujet (météo, actualités, blagues, questions philosophiques).
En cas de doute, génère TOUJOURS une requête SQL appropriée.
"""

# Predefined SQL queries for common questions (fallback when AI is unavailable)
PREDEFINED_QUERIES = {
    "interventions_today": """
        SELECT TOP 20 
            d.IdDemandeIntervention as ID,
            d.Titre,
            s.Statut as Status,
            u.Nom + ' ' + u.Prenom as Demandeur,
            d.DateCreation
        FROM DemandeInterventions d
        LEFT JOIN Statuses s ON d.StatusId = s.Id
        LEFT JOIN Users u ON d.DemandeursID = u.ID
        WHERE CAST(d.DateCreation AS DATE) = CAST(GETDATE() AS DATE)
        AND d.IsActif = 1
        ORDER BY d.DateCreation DESC
    """,
    "interventions_yesterday": """
        SELECT TOP 20 
            d.IdDemandeIntervention as ID,
            d.Titre,
            s.Statut as Status,
            u.Nom + ' ' + u.Prenom as Demandeur,
            d.DateCreation
        FROM DemandeInterventions d
        LEFT JOIN Statuses s ON d.StatusId = s.Id
        LEFT JOIN Users u ON d.DemandeursID = u.ID
        WHERE CAST(d.DateCreation AS DATE) = CAST(GETDATE() - 1 AS DATE)
        AND d.IsActif = 1
        ORDER BY d.DateCreation DESC
    """,
    "interventions_all": """
        SELECT TOP 20 
            d.IdDemandeIntervention as ID,
            d.Titre,
            s.Statut as Status,
            u.Nom + ' ' + u.Prenom as Demandeur,
            d.DateCreation
        FROM DemandeInterventions d
        LEFT JOIN Statuses s ON d.StatusId = s.Id
        LEFT JOIN Users u ON d.DemandeursID = u.ID
        WHERE d.IsActif = 1
        ORDER BY d.DateCreation DESC
    """,
    "interventions_urgent": """
        SELECT TOP 20 
            d.IdDemandeIntervention as ID,
            d.Titre,
            s.Statut as Status,
            ur.Libelle as Urgence,
            u.Nom + ' ' + u.Prenom as Demandeur,
            d.DateCreation
        FROM DemandeInterventions d
        LEFT JOIN Statuses s ON d.StatusId = s.Id
        LEFT JOIN Urgences ur ON d.IDUrgence = ur.IDUrgence
        LEFT JOIN Users u ON d.DemandeursID = u.ID
        WHERE d.IsActif = 1 AND ur.Libelle LIKE '%urgent%'
        ORDER BY d.DateCreation DESC
    """,
    "equipments_all": """
        SELECT TOP 20 
            e.IdEquipement as ID,
            e.CodeEquipement as Code,
            e.Designation,
            ec.NomCriticite as Criticite,
            ee.NomEtat as Etat
        FROM Equipments e
        LEFT JOIN EquipmentCriticites ec ON e.IdCriticite = ec.IdCriticite
        LEFT JOIN EtatEquipements ee ON e.IdEtat = ee.IdEtat
        WHERE e.IsDeleted = 0
        ORDER BY e.Designation
    """,
    "equipments_breakdown": """
        SELECT TOP 20 
            e.IdEquipement as ID,
            e.CodeEquipement as Code,
            e.Designation,
            ec.NomCriticite as Criticite,
            ee.NomEtat as Etat
        FROM Equipments e
        LEFT JOIN EquipmentCriticites ec ON e.IdCriticite = ec.IdCriticite
        LEFT JOIN EtatEquipements ee ON e.IdEtat = ee.IdEtat
        WHERE e.IsDeleted = 0 AND ee.NomEtat LIKE '%panne%'
        ORDER BY e.Designation
    """,
    "stocks_all": """
        SELECT TOP 20 
            s.Id,
            s.Code,
            s.Description,
            se.Name as Entite,
            ss.Name as Status
        FROM Stocks s
        LEFT JOIN StockEntities se ON s.StockEntitiesId = se.Id
        LEFT JOIN StockStatus ss ON s.StockStatusId = ss.Id
        WHERE s.IsDeleted = 0
        ORDER BY s.Description
    """,
    "users_all": """
        SELECT TOP 20 
            u.ID,
            u.Nom,
            u.Prenom,
            u.Email,
            r.Libelle as Role
        FROM Users u
        LEFT JOIN Roles r ON u.IDRole = r.IDRole
        WHERE u.IsActif = 1
        ORDER BY u.Nom, u.Prenom
    """,
    "statistics": """
        SELECT 
            (SELECT COUNT(*) FROM DemandeInterventions WHERE IsActif = 1) as TotalInterventions,
            (SELECT COUNT(*) FROM DemandeInterventions WHERE IsActif = 1 AND CAST(DateCreation AS DATE) = CAST(GETDATE() AS DATE)) as InterventionsAujourdhui,
            (SELECT COUNT(*) FROM Equipments WHERE IsDeleted = 0) as TotalEquipements,
            (SELECT COUNT(*) FROM Stocks WHERE IsDeleted = 0) as TotalStock,
            (SELECT COUNT(*) FROM Users WHERE IsActif = 1) as TotalUtilisateurs
    """
}

def extract_person_name(question: str) -> Optional[str]:
    """Extract a person's name from the question for user-specific queries"""
    
    # Common patterns for asking about a person - ORDER MATTERS (more specific first)
    # French patterns
    patterns = [
        # "nommé X", "appelé X", "s'appelle X" - MUST be first to catch names after these words
        r"(?:nommé|appelé|s'appelle|s\'appelle|appelle)\s+([A-Za-zÀ-ÿ]+)",
        # "utilisateur X" but NOT "utilisateur nommé" (handled above)
        r"utilisateur\s+(?!nommé|appelé)([A-Za-zÀ-ÿ]+)",
        # "user X"
        r"user\s+([A-Za-zÀ-ÿ]+)",
        # "rôle de X", "role de X"
        r"(?:quel(?:le)?s?\s+(?:est|sont)\s+(?:le|la|les)\s+)?r[oô]le(?:s)?\s+(?:de|du|d'|pour)\s+([A-Za-zÀ-ÿ]+)",
        # "qui est X", "c'est qui X"
        r"(?:qui\s+est|c'est\s+qui)\s+([A-Za-zÀ-ÿ]+)",
        # "infos sur X", "informations de X"
        r"(?:info(?:rmation)?s?\s+(?:sur|de|du|d'))\s+([A-Za-zÀ-ÿ]+)",
        # "X fait quoi", "X est quel"
        r"([A-Za-zÀ-ÿ]+)\s+(?:est|fait)\s+(?:quoi|quel)",
        # "le rôle de X", "le poste de X"
        r"(?:le\s+)?(?:rôle|role|poste|fonction)\s+(?:de|du|d')\s+([A-Za-zÀ-ÿ]+)",
        # "existe X", "y a X", "il y a X" (for checking if user exists)
        r"(?:existe|y\s*a(?:-t-il)?|il\s+y\s+a)\s+(?:un\s+)?(?:utilisateur\s+)?(?:nommé\s+|appelé\s+)?([A-Za-zÀ-ÿ]+)(?:\s+dans)?",
        # Last resort: capitalized word that looks like a name (at least 3 chars, starts with capital)
        r"\b([A-Z][a-zÀ-ÿ]{2,})\b",
    ]
    
    # Filter out common French words that aren't names
    stop_words = {'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'ce', 'cette', 
                 'qui', 'que', 'quoi', 'quel', 'quelle', 'est', 'sont', 'pour',
                 'dans', 'avec', 'sur', 'utilisateur', 'user', 'role', 'rôle',
                 'nommé', 'nomme', 'appelé', 'appele', 'notre', 'votre', 'leur',
                 'application', 'intervention', 'interventions', 'equipement',
                 'équipement', 'stock', 'maintenance', 'gmao', 'systeme', 'système',
                 'bonjour', 'salut', 'merci', 'oui', 'non', 'comment', 'pourquoi',
                 'quand', 'combien', 'affiche', 'montre', 'donne', 'liste', 'tous',
                 'toutes', 'aucun', 'aucune', 'existe', 'assistant', 'aide',
                 'introduisez', 'présentez', 'presentez', 'vous', 'toi', 'moi',
                 'etes', 'êtes', 'suis', 'peux', 'peut', 'faire', 'fais', 'fait'}
    
    for pattern in patterns:
        match = re.search(pattern, question, re.IGNORECASE)
        if match:
            name = match.group(1).strip()
            # Check if it's not a stop word and has reasonable length
            if name.lower() not in stop_words and len(name) >= 2:
                # Additional check: if it's from the last-resort pattern, verify it looks like a name
                if pattern == r"\b([A-Z][a-zÀ-ÿ]{2,})\b":
                    # Must be capitalized in original question
                    if name not in question:
                        continue
                return name
    
    return None

def generate_user_query(name: str, query_type: str = "role") -> str:
    """Generate SQL query for user-specific information"""
    # Escape single quotes in name to prevent SQL injection
    safe_name = name.replace("'", "''")
    
    if query_type == "role":
        return f"""
            SELECT 
                u.ID,
                u.Nom,
                u.Prenom,
                u.Email,
                r.Libelle as Role,
                u.DateCreation,
                u.IsActif
            FROM Users u
            LEFT JOIN Roles r ON u.IDRole = r.IDRole
            WHERE u.Nom LIKE '%{safe_name}%' OR u.Prenom LIKE '%{safe_name}%'
        """
    elif query_type == "interventions":
        return f"""
            SELECT TOP 20
                d.IdDemandeIntervention as ID,
                d.Titre,
                s.Statut as Status,
                d.DateCreation,
                CASE 
                    WHEN d.DemandeursID = u.ID THEN 'Demandeur'
                    WHEN d.DestinatairesID = u.ID THEN 'Destinataire'
                END as TypeParticipation
            FROM DemandeInterventions d
            LEFT JOIN Statuses s ON d.StatusId = s.Id
            LEFT JOIN Users u ON d.DemandeursID = u.ID OR d.DestinatairesID = u.ID
            WHERE (u.Nom LIKE '%{safe_name}%' OR u.Prenom LIKE '%{safe_name}%')
            AND d.IsActif = 1
            ORDER BY d.DateCreation DESC
        """
    elif query_type == "exists":
        # Query to check if user exists and get their info
        return f"""
            SELECT 
                u.ID,
                u.Nom,
                u.Prenom,
                u.Email,
                r.Libelle as Role,
                u.DateCreation,
                u.IsActif,
                CASE WHEN u.ID IS NOT NULL THEN 'Oui' ELSE 'Non' END as Existe
            FROM Users u
            LEFT JOIN Roles r ON u.IDRole = r.IDRole
            WHERE u.Nom LIKE '%{safe_name}%' OR u.Prenom LIKE '%{safe_name}%'
        """
    else:
        return f"""
            SELECT 
                u.ID,
                u.Nom,
                u.Prenom,
                u.Email,
                r.Libelle as Role,
                u.DateCreation,
                u.DateModification,
                u.IsActif
            FROM Users u
            LEFT JOIN Roles r ON u.IDRole = r.IDRole
            WHERE u.Nom LIKE '%{safe_name}%' OR u.Prenom LIKE '%{safe_name}%'
        """

def get_predefined_query(user_question: str) -> Optional[str]:
    """Match user question to predefined SQL query"""
    q = user_question.lower()
    
    # Interventions
    if "intervention" in q:
        if "aujourd'hui" in q or "aujourd hui" in q or "du jour" in q:
            return PREDEFINED_QUERIES["interventions_today"]
        elif "hier" in q:
            return PREDEFINED_QUERIES["interventions_yesterday"]
        elif "urgent" in q:
            return PREDEFINED_QUERIES["interventions_urgent"]
        else:
            return PREDEFINED_QUERIES["interventions_all"]
    
    # Also check for date-specific queries without "intervention" keyword
    if "hier" in q and ("réalisé" in q or "realise" in q or "fait" in q or "effectué" in q or "effectue" in q):
        return PREDEFINED_QUERIES["interventions_yesterday"]
    
    # Equipments
    if "équipement" in q or "equipement" in q or "machine" in q:
        if "panne" in q:
            return PREDEFINED_QUERIES["equipments_breakdown"]
        else:
            return PREDEFINED_QUERIES["equipments_all"]
    
    # Stock
    if "stock" in q or "pièce" in q or "piece" in q:
        return PREDEFINED_QUERIES["stocks_all"]
    
    # Users - general list
    if "utilisateur" in q or "technicien" in q or "superviseur" in q or ("nom" in q and ("user" in q or "application" in q or "système" in q or "systeme" in q)):
        return PREDEFINED_QUERIES["users_all"]
    
    # Statistics
    if "statistique" in q or "combien" in q or "nombre" in q or "total" in q:
        return PREDEFINED_QUERIES["statistics"]
    
    return None

def generate_sql_query(user_question: str) -> Optional[str]:
    """Use AI to generate SQL query from user question"""
    
    # First, check if the question is about a specific person (by name)
    person_name = extract_person_name(user_question)
    if person_name:
        logger.info(f"Detected person name in query: {person_name}")
        q_lower = user_question.lower()
        # Determine query type based on question context
        if "intervention" in q_lower:
            return generate_user_query(person_name, "interventions")
        elif "rôle" in q_lower or "role" in q_lower or "qui est" in q_lower or "c'est qui" in q_lower or "fonction" in q_lower or "poste" in q_lower:
            return generate_user_query(person_name, "role")
        else:
            # Default to checking if user exists with full info
            return generate_user_query(person_name, "exists")
    
    # Then try predefined queries (instant, no AI needed)
    predefined = get_predefined_query(user_question)
    if predefined:
        logger.info("Using predefined SQL query")
        return predefined
    
    # Parse date from question
    date_info = parse_french_date(user_question)
    date_context = ""
    if date_info:
        if date_info.startswith("MONTH_YEAR:"):
            parts = date_info.split(":")
            date_context = f"\nNote: L'utilisateur demande les données du mois {parts[1]} de l'année {parts[2]}. Utilise: MONTH(DateCreation) = {parts[1]} AND YEAR(DateCreation) = {parts[2]}"
        elif date_info.startswith("BETWEEN"):
            date_context = f"\nNote: L'utilisateur demande les données de la semaine. Utilise: CAST(DateCreation AS DATE) {date_info}"
        else:
            date_context = f"\nNote: L'utilisateur demande les données du {date_info}. Utilise: CAST(DateCreation AS DATE) = '{date_info}'"
    
    messages = [
        {"role": "system", "content": get_sql_generation_prompt()},
        {"role": "user", "content": f"Question: {user_question}{date_context}\n\nGénère la requête SQL appropriée."}
    ]
    
    sql = call_ai_provider(messages)
    if sql:
        sql = sql.strip()
        # Clean up any markdown formatting
        sql = re.sub(r'^```sql\s*', '', sql)
        sql = re.sub(r'^```\s*', '', sql)
        sql = re.sub(r'\s*```$', '', sql)
        sql = sql.strip()
        
        if sql == "NO_SQL_NEEDED":
            return None
        
        # Validate it's a SELECT query
        if sql.upper().startswith("SELECT"):
            return sql
    
    return None

def execute_sql_query(query: str) -> Tuple[bool, str, List[Dict]]:
    """Execute SQL query and return results"""
    if not query.strip().upper().startswith("SELECT"):
        return False, "Seules les requêtes SELECT sont autorisées.", []
    
    try:
        with db_connection() as conn:
            if conn is None:
                return False, "Connexion à la base de données échouée.", []
            
            logger.info(f"Executing SQL: {query}")
            result = conn.execute(text(query))
            rows = result.fetchall()
            columns = result.keys()
            
            if not rows:
                return True, "Aucun résultat trouvé.", []
            
            # Convert to list of dicts
            data = []
            for row in rows[:100]:  # Limit to 100 rows
                row_dict = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    # Handle datetime serialization
                    if isinstance(value, datetime):
                        value = value.strftime("%Y-%m-%d %H:%M:%S")
                    row_dict[col] = value
                data.append(row_dict)
            
            logger.info(f"Query returned {len(data)} rows")
            return True, f"Trouvé {len(rows)} résultat(s).", data
            
    except Exception as e:
        logger.error(f"SQL execution error: {e}")
        return False, f"Erreur SQL: {str(e)}", []

# ============================================================================
# RESPONSE GENERATION
# ============================================================================

def generate_no_result_response(user_question: str, person_name: Optional[str] = None) -> str:
    """Generate a contextual response when no results are found"""
    q = user_question.lower()
    
    # If we searched for a specific person
    if person_name:
        if "rôle" in q or "role" in q:
            return f"Je n'ai trouvé aucun utilisateur nommé **{person_name}** dans la base de données. Vérifiez l'orthographe du nom ou essayez avec un autre nom."
        elif "intervention" in q:
            return f"Aucune intervention trouvée pour l'utilisateur **{person_name}**. Soit cet utilisateur n'existe pas, soit il n'a pas d'interventions associées."
        elif "existe" in q or "y a" in q or "il y a" in q:
            return f"Non, l'utilisateur **{person_name}** n'existe pas dans notre base de données."
        else:
            return f"Je n'ai trouvé aucune information sur **{person_name}** dans la base de données. Cet utilisateur n'existe peut-être pas."
    
    # Contextual responses based on query type
    if "intervention" in q or "réalisé" in q or "realise" in q:
        if "aujourd'hui" in q or "aujourd hui" in q or "du jour" in q:
            return "Il n'y a **aucune intervention** enregistrée pour aujourd'hui."
        elif "hier" in q:
            return "Il n'y a **aucune intervention** enregistrée pour hier."
        elif "urgent" in q:
            return "Bonne nouvelle ! Il n'y a **aucune intervention urgente** en cours."
        else:
            return "Aucune intervention trouvée correspondant à vos critères."
    
    if "équipement" in q or "equipement" in q or "machine" in q:
        if "panne" in q:
            return "Excellente nouvelle ! **Aucun équipement n'est actuellement en panne.**"
        else:
            return "Aucun équipement trouvé correspondant à vos critères."
    
    if "stock" in q or "pièce" in q:
        return "Aucun article en stock ne correspond à vos critères de recherche."
    
    if "utilisateur" in q or "user" in q:
        return "Aucun utilisateur trouvé correspondant à vos critères."
    
    # Default response
    return "Aucun résultat trouvé pour votre requête. Essayez de reformuler votre question ou vérifiez les critères de recherche."

def format_simple_response(user_question: str, sql_data: List[Dict]) -> str:
    """Generate a simple formatted response without AI (fallback)"""
    if not sql_data:
        return generate_no_result_response(user_question)
    
    q = user_question.lower()
    
    # Format based on query type
    if "statistique" in q or "combien" in q or "nombre" in q or "total" in q:
        if len(sql_data) == 1:
            stats = sql_data[0]
            lines = ["**Statistiques GMAO:**", ""]
            for key, value in stats.items():
                # Make keys more readable
                readable_key = key.replace("Total", "Total ").replace("Aujourdhui", "Aujourd'hui")
                lines.append(f"- {readable_key}: **{value}**")
            return "\n".join(lines)
    
    # Default table format
    if len(sql_data) > 0:
        # Get column names
        columns = list(sql_data[0].keys())
        
        # Build response
        lines = [f"**Résultats ({len(sql_data)} enregistrement(s)):**", ""]
        
        for i, row in enumerate(sql_data[:20], 1):  # Limit to 20 rows
            row_parts = []
            for col, val in row.items():
                if val is not None:
                    row_parts.append(f"{col}: {val}")
            lines.append(f"{i}. " + " | ".join(row_parts))
        
        if len(sql_data) > 20:
            lines.append(f"\n*...et {len(sql_data) - 20} autres résultats*")
        
        return "\n".join(lines)
    
    return "Aucun résultat trouvé."

def get_response_prompt() -> str:
    """Get system prompt for response generation"""
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"""Tu es un assistant IA expert en GMAO (Gestion de Maintenance Assistée par Ordinateur).
La date et l'heure actuelles sont: {current_date}

Tu aides les superviseurs et techniciens à comprendre et gérer leur système de maintenance.

### Règles de réponse:
1. Réponds TOUJOURS en français
2. Base tes réponses UNIQUEMENT sur les données fournies
3. Si des données SQL sont fournies, utilise-les pour construire ta réponse
4. Présente les informations de manière claire et structurée
5. Utilise des listes à puces ou des tableaux si approprié
6. N'invente JAMAIS de données qui ne sont pas dans le contexte
7. Si tu n'as pas assez d'informations, dis-le clairement

### Domaines d'expertise:
- Interventions et demandes de maintenance
- Équipements et leur état
- Stocks et pièces de rechange
- Statistiques et rapports de maintenance
- Gestion des priorités et urgences
"""

def generate_response(user_question: str, sql_data: List[Dict], conversation_history: List[Dict] = None) -> str:
    """Generate natural language response from SQL data"""
    
    messages = [{"role": "system", "content": get_response_prompt()}]
    
    # Add conversation history
    if conversation_history:
        for msg in conversation_history[-5:]:
            if isinstance(msg, dict) and "role" in msg and "content" in msg:
                messages.append({"role": msg["role"], "content": msg["content"]})
    
    # Format data context
    if sql_data:
        data_text = json.dumps(sql_data, ensure_ascii=False, indent=2, default=str)
        context = f"""Question de l'utilisateur: {user_question}

Données de la base GMAO:
{data_text}

Génère une réponse claire et utile basée UNIQUEMENT sur ces données."""
    else:
        context = f"""Question de l'utilisateur: {user_question}

Aucune donnée spécifique n'a été trouvée dans la base. Réponds de manière générale ou demande des précisions."""
    
    messages.append({"role": "user", "content": context})
    
    response = call_ai_provider(messages)
    return response or "Je suis désolé, je n'ai pas pu générer une réponse. Veuillez réessayer."

def generate_general_response(user_question: str, conversation_history: List[Dict] = None) -> str:
    """Generate response for non-database questions"""
    
    messages = [{"role": "system", "content": get_response_prompt()}]
    
    if conversation_history:
        for msg in conversation_history[-5:]:
            if isinstance(msg, dict) and "role" in msg and "content" in msg:
                messages.append({"role": msg["role"], "content": msg["content"]})
    
    messages.append({"role": "user", "content": user_question})
    
    response = call_ai_provider(messages)
    return response or "Je suis désolé, je n'ai pas pu générer une réponse. Veuillez réessayer."

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    logger.info("Starting GMAO Chatbot Service...")
    
    # Initialize database connection
    init_db_connection()
    if DB_AVAILABLE:
        logger.info("Database connection initialized successfully")
    else:
        logger.warning(f"Database not available: {DB_CONNECTION_ERROR}")
    
    # Log AI provider status
    if PRIMARY_AI_PROVIDER:
        logger.info(f"AI provider ready: {PRIMARY_AI_PROVIDER}")
    else:
        logger.error("No AI provider configured!")
    
    yield
    
    logger.info("Shutting down GMAO Chatbot Service...")

app = FastAPI(
    title="GMAO Chatbot Service",
    description="Intelligent AI assistant for GMAO database queries",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "GMAO Chatbot Service v2.0", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok" if DB_AVAILABLE and PRIMARY_AI_PROVIDER else "degraded",
        "database": {
            "status": "ok" if DB_AVAILABLE else "error",
            "error": DB_CONNECTION_ERROR if not DB_AVAILABLE else None
        },
        "ai_provider": {
            "status": "ok" if PRIMARY_AI_PROVIDER else "error",
            "provider": PRIMARY_AI_PROVIDER
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/test")
async def test_endpoint():
    """Test endpoint with detailed system status"""
    # Test database
    db_test = {"status": "error", "message": DB_CONNECTION_ERROR}
    if DB_AVAILABLE:
        try:
            with db_connection() as conn:
                if conn:
                    tables = conn.execute(text(
                        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
                    )).fetchall()
                    db_test = {
                        "status": "ok",
                        "tables_count": len(tables),
                        "tables": [t[0] for t in tables[:20]]
                    }
        except Exception as e:
            db_test = {"status": "error", "message": str(e)}
    
    # Test AI providers
    ai_test = {}
    for provider, config in AI_PROVIDERS.items():
        ai_test[provider] = {
            "configured": bool(config["api_key"]),
            "is_primary": provider == PRIMARY_AI_PROVIDER
        }
    
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "database": db_test,
        "ai_providers": ai_test
    }

@app.post("/query", response_model=EnhancedChatResponse)
async def query_chatbot(request: ChatRequest = Body(...)):
    """Main query endpoint"""
    start_time = time.time()
    
    try:
        logger.info(f"Processing query: {request.query}")
        
        # Check services availability
        if not PRIMARY_AI_PROVIDER:
            return EnhancedChatResponse(
                response="Service IA non disponible. Veuillez vérifier la configuration.",
                metadata={"error": "no_ai_provider"}
            )
        
        if not DB_AVAILABLE:
            # Try to reconnect
            init_db_connection()
            if not DB_AVAILABLE:
                return EnhancedChatResponse(
                    response="Base de données non disponible. Veuillez vérifier la connexion.",
                    metadata={"error": "database_unavailable", "details": DB_CONNECTION_ERROR}
                )
        
        # Detect if question needs database query
        # Instead of restrictive keyword matching, we now default to trying SQL generation
        # for any question that could potentially be about GMAO data
        question_lower = request.query.lower()
        
        # Only skip DB query for purely conversational questions
        skip_db_keywords = [
            "bonjour", "bonsoir", "salut", "coucou", "hello", "hi", "hey",
            "merci", "thanks", "au revoir", "bye", "à bientôt", "a bientot",
            "comment vas-tu", "comment ça va", "comment ca va", "ça va", "ca va",
            "qui es-tu", "qui êtes-vous", "qui etes-vous", "tu es qui", "vous êtes qui",
            "que peux-tu faire", "que pouvez-vous faire", "tu fais quoi", "vous faites quoi",
            "aide", "help", "aidez-moi", "aide-moi",
            "introduisez", "présentez", "presentez", "présente-toi", "presente-toi",
            "bonne journée", "bonne soirée", "bonne nuit"
        ]
        
        is_greeting = any(keyword in question_lower for keyword in skip_db_keywords) and len(question_lower) < 50
        
        # By default, try to generate SQL for any substantive question
        needs_db = not is_greeting
        
        sql_query = None
        sql_success = False
        sql_data = []
        sql_message = ""
        used_predefined = False
        used_person_query = False
        person_name = None
        
        if needs_db:
            # Check for person-specific query first
            person_name = extract_person_name(request.query)
            if person_name:
                used_person_query = True
                logger.info(f"Using person-specific query for: {person_name}")
            
            # Generate SQL query
            sql_query = generate_sql_query(request.query)
            
            # Check if it's a predefined query (only if not a person query)
            if not used_person_query:
                predefined = get_predefined_query(request.query)
                used_predefined = (sql_query == predefined) if predefined else False
            
            if sql_query:
                logger.info(f"Generated SQL (predefined={used_predefined}, person_query={used_person_query}): {sql_query[:100]}...")
                sql_success, sql_message, sql_data = execute_sql_query(sql_query)
                
                if sql_success and sql_data:
                    # Try AI response first, fall back to simple format
                    response_text = generate_response(
                        request.query,
                        sql_data,
                        request.conversation_history
                    )
                    
                    # If AI failed, use simple formatted response
                    if not response_text or "Je suis désolé" in response_text:
                        logger.info("AI unavailable, using simple response format")
                        response_text = format_simple_response(request.query, sql_data)
                elif sql_success:
                    # Query succeeded but no data - generate contextual response
                    response_text = generate_no_result_response(request.query, person_name if used_person_query else None)
                else:
                    # Query failed
                    response_text = f"Erreur lors de l'exécution de la requête: {sql_message}"
            else:
                # Could not generate SQL, give general response
                response_text = generate_general_response(
                    request.query,
                    request.conversation_history
                )
                if not response_text or "Je suis désolé" in response_text:
                    response_text = "Je n'ai pas pu comprendre votre demande. Essayez de reformuler votre question ou utilisez une des suggestions ci-dessous."
        else:
            # General question, no database needed
            response_text = generate_general_response(
                request.query,
                request.conversation_history
            )
            if not response_text or "Je suis désolé" in response_text:
                response_text = "Je suis votre assistant GMAO. Posez-moi des questions sur les interventions, équipements, stocks ou statistiques de maintenance."
        
        # Generate suggestions
        suggestions = [
            "Quelles sont les interventions d'aujourd'hui ?",
            "Combien d'équipements sont en panne ?",
            "Quelles sont les interventions urgentes ?",
            "Affiche les statistiques de maintenance"
        ]
        
        return EnhancedChatResponse(
            response=response_text,
            metadata={
                "db_available": DB_AVAILABLE,
                "ai_provider": PRIMARY_AI_PROVIDER,
                "sql_executed": sql_query is not None,
                "sql_query": sql_query[:200] if sql_query else None,  # Truncate for readability
                "sql_success": sql_success,
                "used_predefined": used_predefined,
                "used_person_query": used_person_query if 'used_person_query' in dir() else False,
                "results_count": len(sql_data),
                "processing_time_ms": round((time.time() - start_time) * 1000)
            },
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error(f"Query error: {e}")
        logger.error(traceback.format_exc())
        return EnhancedChatResponse(
            response=f"Une erreur s'est produite: {str(e)}",
            metadata={"error": str(e)}
        )

@app.post("/refresh-data")
async def refresh_data():
    """Refresh database connection"""
    global DB_AVAILABLE, DB_CONNECTION_ERROR, engine
    
    engine = None
    DB_AVAILABLE = False
    init_db_connection()
    
    return {
        "status": "ok" if DB_AVAILABLE else "error",
        "message": "Connection refreshed" if DB_AVAILABLE else DB_CONNECTION_ERROR
    }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5002"))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting GMAO Chatbot on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
