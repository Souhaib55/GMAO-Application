import os
import time
import logging
import json
import requests
import uuid
import sqlalchemy
from sqlalchemy import create_engine, text
from contextlib import contextmanager
from fastapi import FastAPI, Body, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Union, Tuple
import pathlib
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import matplotlib.pyplot as plt
import io
import base64
from matplotlib.figure import Figure
import seaborn as sns
import pandas as pd
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from fastapi import FastAPI
from contextlib import asynccontextmanager
from datetime import datetime
import pyodbc
import urllib.parse
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("gmao_chatbot.log")]
)
logger = logging.getLogger("gmao_chatbot")

# Create the FastAPI app
app = FastAPI(title="GMAO Chatbot Service", description="AI-powered chatbot for GMAO system")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Function to read settings from appsettings.Development.json
def read_app_settings():
    try:
        potential_paths = [
            pathlib.Path(__file__).parent.absolute().parent / 'API' / 'appsettings.Development.json',
            pathlib.Path.cwd() / 'gmao' / 'API' / 'appsettings.Development.json',
            pathlib.Path.cwd().parent / 'API' / 'appsettings.Development.json',
            pathlib.Path.cwd() / 'API' / 'appsettings.Development.json',
            # Ajout d'autres chemins potentiels
            pathlib.Path.cwd() / 'appsettings.Development.json',
            pathlib.Path(__file__).parent.absolute() / 'appsettings.Development.json',
            pathlib.Path.cwd() / '../API/appsettings.Development.json',
        ]
        
        appsettings_path = None
        for path in potential_paths:
            if path.exists():
                appsettings_path = path
                logger.info(f"Found appsettings at: {path}")
                break
        
        if not appsettings_path:
            logger.error("appsettings.Development.json not found in any expected location")
            for path in potential_paths:
                logger.error(f"Tried path: {path}")
            return {}, ""
        
        with open(appsettings_path, 'r') as f:
            settings = json.load(f)
        
        conn_string = settings.get('ConnectionStrings', {}).get('DefaultConnection', '')
        if not conn_string:
            logger.error("No DefaultConnection found in appsettings")
            return settings, ""
        
        # Masquer le mot de passe dans les logs
        safe_conn = conn_string
        if 'Password=' in conn_string:
            pwd_part = conn_string.split('Password=')[1].split(';')[0] if 'Password=' in conn_string else ''
            safe_conn = conn_string.replace(pwd_part, "***") if pwd_part else conn_string
        
        logger.info(f"Raw connection string from appsettings: {safe_conn}")
        
        # Analyse correcte de la chaîne de connexion
        params = {}
        # Gérer correctement les instances nommées (avec \\ dans le nom du serveur)
        server_part = ""
        db_part = ""
        other_parts = []
        
        for part in conn_string.split(';'):
            if part.strip():
                if part.lower().startswith('server='):
                    server_part = part
                elif part.lower().startswith('database='):
                    db_part = part
                else:
                    other_parts.append(part)
        
        # Reconstituer une chaîne propre
        clean_conn_parts = [server_part, db_part] + other_parts
        clean_conn_string = ';'.join([p for p in clean_conn_parts if p])
        
        # Extraire les paramètres individuels
        for part in clean_conn_string.split(';'):
            if '=' in part:
                key, value = part.split('=', 1)
                params[key.strip()] = value.strip()
        
        server = params.get('Server', params.get('Data Source', ''))
        database = params.get('Database', params.get('Initial Catalog', ''))
        user = params.get('User ID', '')
        password = params.get('Password', '')
        trusted = 'yes' if params.get('Trusted_Connection', 'False').lower() in ('true', 'yes') else 'no'
        trust_cert = 'yes' if params.get('TrustServerCertificate', 'False').lower() in ('true', 'yes') else 'no'
        
        if not server or not database:
            logger.error("Missing server or database in connection string")
            return settings, ""
        
        # Liste des drivers à essayer par ordre de préférence
        drivers = [
            "ODBC Driver 18 for SQL Server",
            "ODBC Driver 17 for SQL Server",
            "ODBC Driver for SQL Server",  # Ajouté pour compatibilité
            "SQL Server Native Client 11.0",
            "SQL Server"
        ]
        
        # Vérification des drivers disponibles
        available_drivers = []
        try:
            available_drivers = [driver for driver in pyodbc.drivers() if "SQL Server" in driver]
            logger.info(f"Available SQL Server ODBC drivers: {available_drivers}")
            # Choisir le premier driver disponible dans notre liste de préférence
            driver = next((d for d in drivers if d in available_drivers), available_drivers[0] if available_drivers else drivers[0])
            logger.info(f"Selected SQL Server driver: {driver}")
        except Exception as e:
            logger.warning(f"Could not list ODBC drivers: {e}")
            driver = drivers[0]
            logger.info(f"Defaulting to driver: {driver}")
        
        # Construction de la chaîne de connexion
        connection_options = []
        
        # Méthode 1: Connexion directe avec les paramètres
        if trusted == 'yes':
            # Gérer correctement le backslash dans le nom du serveur
            server_clean = server.replace('\\\\', '\\')
            odbc_conn = f"DRIVER={{{driver}}};SERVER={server_clean};DATABASE={database};Trusted_Connection=yes;TrustServerCertificate={trust_cert}"
            sqlalchemy_conn = f"mssql+pyodbc:///?odbc_connect={urllib.parse.quote_plus(odbc_conn)}"
            connection_options.append(("direct_trusted", odbc_conn, sqlalchemy_conn))
        else:
            if user and password:
                server_clean = server.replace('\\\\', '\\')
                odbc_conn = f"DRIVER={{{driver}}};SERVER={server_clean};DATABASE={database};UID={user};PWD={password};TrustServerCertificate={trust_cert}"
                sqlalchemy_conn = f"mssql+pyodbc:///?odbc_connect={urllib.parse.quote_plus(odbc_conn)}"
                connection_options.append(("direct_sql", odbc_conn, sqlalchemy_conn))
        
        # Méthode 2: Utiliser le DSN que vous avez créé
        odbc_dsn_conn = f"DSN=gmao_connection;DATABASE={database};Trusted_Connection=yes;TrustServerCertificate={trust_cert}"
        sqlalchemy_dsn_conn = f"mssql+pyodbc:///?odbc_connect={urllib.parse.quote_plus(odbc_dsn_conn)}"
        connection_options.append(("dsn", odbc_dsn_conn, sqlalchemy_dsn_conn))
        
        # Méthode 3: Alternative en cas d'échec des deux premières méthodes
        server_alt = server.replace('localhost', '.')  # parfois '.' fonctionne mieux que 'localhost'
        server_alt_clean = server_alt.replace('\\\\', '\\')
        odbc_alt_conn = f"DRIVER={{{driver}}};SERVER={server_alt_clean};DATABASE={database};Trusted_Connection=yes;TrustServerCertificate={trust_cert}"
        sqlalchemy_alt_conn = f"mssql+pyodbc:///?odbc_connect={urllib.parse.quote_plus(odbc_alt_conn)}"
        connection_options.append(("alternative", odbc_alt_conn, sqlalchemy_alt_conn))
        
        # Tester les connexions et choisir la première qui fonctionne
        working_sqlalchemy_conn = ""
        success_method = ""
        for method, odbc_conn, sqlalchemy_conn in connection_options:
            # Masquer le mot de passe dans les logs
            safe_odbc_conn = odbc_conn
            if 'PWD=' in odbc_conn:
                safe_odbc_conn = odbc_conn.replace(password, "***") if password else odbc_conn
            
            logger.info(f"Trying connection method: {method} with: {safe_odbc_conn}")
            
            try:
                with pyodbc.connect(odbc_conn, timeout=5) as test_conn:
                    with test_conn.cursor() as cursor:
                        cursor.execute("SELECT 1")
                        test_result = cursor.fetchone()
                        logger.info(f"Connection successful with method {method}: {test_result}")
                        working_sqlalchemy_conn = sqlalchemy_conn
                        success_method = method
                        break
            except Exception as e:
                logger.warning(f"Connection method {method} failed: {e}")
        
        if working_sqlalchemy_conn:
            logger.info(f"Selected connection method: {success_method}")
            return settings, working_sqlalchemy_conn
        else:
            logger.error("All connection methods failed")
            return settings, ""
            
    except Exception as e:
        logger.error(f"Error reading app settings: {e}")
        logger.error(traceback.format_exc())
        return {}, ""

# Database retry parameters
DB_CONNECT_RETRIES = 3
DB_CONNECT_RETRY_DELAY = 2  # seconds

# Load settings
app_settings, conn_string = read_app_settings()
if not conn_string:
    logger.error("Failed to generate valid connection string")

# Database configuration
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING", conn_string or "mssql+pyodbc:///?odbc_connect=Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=gmaoTrusted_Connection=yes")
engine = None
DB_AVAILABLE = False
DB_CONNECTION_ERROR = ""

# OpenRouter API configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", app_settings.get('OpenRouter', {}).get('ApiKey', ''))
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", app_settings.get('OpenRouter', {}).get('Model', 'deepseek/deepseek-r1:free'))
OPENROUTER_AVAILABLE = bool(OPENROUTER_API_KEY)
OPENROUTER_ERROR_MESSAGE = "" if OPENROUTER_AVAILABLE else "OpenRouter API key not configured"

openrouter_headers = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "HTTP-Referer": "https://gmao.alcodex.cloud",
    "Content-Type": "application/json"
}

# Define chat models
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

# System prompt
def get_system_prompt():
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")
    return f"""Tu es un assistant IA spécialisé dans la GMAO (Gestion de Maintenance Assistée par Ordinateur). La date et l'heure actuelles sont {current_date}. Tu as accès à des enregistrements spécifiques de la base de données GMAO, fournis dans le contexte. Utilise ces informations pour répondre précisément aux questions des utilisateurs. Si les données du contexte suffisent, base-toi dessus. Sinon, pour des données agrégées ou complexes, tu peux proposer une requête SQL à exécuter. Lorsqu'un résultat SQL est fourni, base ta réponse EXCLUSIVEMENT sur ce résultat.

- Réponds en langage naturel, sans mentionner les requêtes SQL dans les réponses.
- Pour les questions ambiguës, demande des précisions.
"""

# Database connection
def init_db_connection():
    global engine, DB_AVAILABLE, DB_CONNECTION_ERROR
    if engine is not None and DB_AVAILABLE:
        return engine
    
    for attempt in range(DB_CONNECT_RETRIES):
        try:
            logger.info(f"Attempting DB connection (attempt {attempt+1}/{DB_CONNECT_RETRIES})")
            engine = create_engine(DB_CONNECTION_STRING, connect_args={"timeout": 30})
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1 AS test_connection")).fetchone()
                if result and result[0] == 1:
                    logger.info("Database connection successful")
                    DB_AVAILABLE = True
                    DB_CONNECTION_ERROR = ""
                    
                    # Vérification supplémentaire: tester l'accès aux tables principales
                    try:
                        tables_check = conn.execute(text("""
                            SELECT TABLE_NAME 
                            FROM INFORMATION_SCHEMA.TABLES 
                            WHERE TABLE_TYPE = 'BASE TABLE' AND
                            TABLE_NAME IN ('Equipments', 'DemandeInterventions', 'Pieces')
                        """)).fetchall()
                        
                        table_names = [t[0] for t in tables_check]
                        logger.info(f"Found critical tables: {table_names}")
                        
                        if 'Equipments' not in table_names:
                            logger.warning("Table 'Equipments' not found in database")
                        if 'DemandeInterventions' not in table_names:
                            logger.warning("Table 'DemandeInterventions' not found in database")
                        if 'Pieces' not in table_names:
                            logger.warning("Table 'Pieces' not found in database")
                    except Exception as e:
                        logger.warning(f"Table verification failed: {e}")
                        
                    return engine
        except Exception as e:
            DB_CONNECTION_ERROR = str(e)
            logger.error(f"DB connection error (attempt {attempt+1}): {e}")
            logger.debug(traceback.format_exc())
            if attempt < DB_CONNECT_RETRIES - 1:
                time.sleep(DB_CONNECT_RETRY_DELAY)
    
    DB_AVAILABLE = False
    return None

@contextmanager
def db_connection():
    conn = None
    try:
        engine_instance = init_db_connection()
        if engine_instance is not None:
            conn = engine_instance.connect()
            yield conn
        else:
            logger.error("Failed to get DB engine instance")
            yield None
    except Exception as e:
        logger.error(f"Error getting DB connection: {e}")
        logger.debug(traceback.format_exc())
        yield None
    finally:
        if conn:
            try:
                conn.close()
            except Exception as e:
                logger.error(f"Error closing DB connection: {e}")

# Test database connection
def test_db_connection():
    try:
        with db_connection() as connection:
            if connection is None:
                return {"status": "error", "message": f"DB connection failed: {DB_CONNECTION_ERROR}"}
            
            tables = connection.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")).fetchall()
            tables = [row[0] for row in tables]
            
            test_results = {}
            critical_tables = ["Equipments", "DemandeInterventions", "Pieces"]
            for table in critical_tables:
                try:
                    if table in tables:
                        count = connection.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                        test_results[table] = {"status": "ok", "count": count}
                    else:
                        test_results[table] = {"status": "missing", "error": f"Table {table} not found"}
                except Exception as e:
                    test_results[table] = {"status": "error", "error": str(e)}
            
            # Test direct query
            try:
                current_date = connection.execute(text("SELECT GETDATE()")).scalar()
                test_results["direct_query"] = {"status": "ok", "current_date": str(current_date)}
            except Exception as e:
                test_results["direct_query"] = {"status": "error", "error": str(e)}
            
            return {
                "status": "ok",
                "message": "DB connection successful",
                "tables_count": len(tables),
                "tables": tables[:20],
                "critical_tables": test_results
            }
    except Exception as e:
        logger.error(f"Error testing DB connection: {e}")
        logger.error(traceback.format_exc())
        return {"status": "error", "message": f"Error testing DB: {str(e)}"}


# Fetch GMAO data
def fetch_gmao_data():
    with db_connection() as connection:
        if connection is None:
            logger.error("No DB connection for fetching GMAO data")
            return []
        
        data_texts = []
        
        try:
            logger.info("Fetching Equipments")
            equipments = connection.execute(text("SELECT TOP 100 * FROM Equipments WHERE IsDeleted = 0")).fetchall()
            logger.info(f"Retrieved {len(equipments)} equipment records")
            for eq in equipments:
                text_str = f"Equipment: Code={eq['CodeEquipement']}, Designation={eq['Designation']}, Criticite={eq['IdCriticite']}"
                data_texts.append({"text": text_str, "metadata": {"table": "Equipments", "id": eq['IdEquipement']}})
        except Exception as e:
            logger.error(f"Error fetching Equipments: {e}")
        
        try:
            logger.info("Fetching Interventions")
            interventions = connection.execute(text("SELECT TOP 100 * FROM DemandeInterventions WHERE IsActif = 1")).fetchall()
            logger.info(f"Retrieved {len(interventions)} intervention records")
            for interv in interventions:
                text_str = f"Intervention: ID={interv['IdDemandeIntervention']}, Title={interv['Titre']}, Status={interv['StatusId']}"
                data_texts.append({"text": text_str, "metadata": {"table": "DemandeInterventions", "id": interv['IdDemandeIntervention']}})
        except Exception as e:
            logger.error(f"Error fetching Interventions: {e}")
        
        try:
            logger.info("Fetching Pieces")
            pieces = connection.execute(text("SELECT TOP 100 * FROM Pieces WHERE IsActif = 1")).fetchall()
            logger.info(f"Retrieved {len(pieces)} piece records")
            for piece in pieces:
                text_str = f"Piece: Code={piece['CodePiece']}, Designation={piece['Designation']}, Stock={piece['Quantite_Stock']}"
                data_texts.append({"text": text_str, "metadata": {"table": "Pieces", "id": piece['IdPiece']}})
        except Exception as e:
            logger.error(f"Error fetching Pieces: {e}")
        
        logger.info(f"Total GMAO data fetched: {len(data_texts)}")
        return data_texts

# RAG Enhancer
class RAGEnhancer:
    def __init__(self):
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        self.knowledge_base = []
        self.index = None
        self.dimension = 384
        self.vectorstore = None
        logger.info("RAG Enhancer initialized")
    
    def initialize_vectorstore(self, texts: List[str], metadata: List[Dict]):
        try:
            logger.info(f"Initializing vector store with {len(texts)} texts")
            if not texts:
                logger.warning("No texts for vector store init")
                return
            embeddings = OpenAIEmbeddings(openai_api_key=OPENROUTER_API_KEY, model="text-embedding-ada-002")
            documents = [dict(content=text, metadata=meta) for text, meta in zip(texts, metadata)]
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
            docs = text_splitter.create_documents([d["content"] for d in documents])
            self.vectorstore = FAISS.from_documents(docs, embeddings)
            logger.info("Vector store initialized with OpenAI embeddings")
        except Exception as e:
            logger.error(f"OpenAI embeddings failed: {e}. Using SentenceTransformer.")
            try:
                embeddings = self.embedding_model.encode(texts, convert_to_numpy=True)
                self.index = faiss.IndexFlatL2(self.dimension)
                self.index.add(embeddings)
                self.vectorstore = [{"text": text, "metadata": meta, "embedding": emb} for text, meta, emb in zip(texts, metadata, embeddings)]
                logger.info("Vector store initialized with SentenceTransformer")
            except Exception as inner_e:
                logger.error(f"SentenceTransformer failed: {inner_e}")
    
    def add_to_knowledge_base(self, texts: List[str], metadata: List[Dict] = None):
        if not texts:
            logger.warning("No texts to add to knowledge base")
            return
        if metadata is None:
            metadata = [{} for _ in texts]
        logger.info(f"Adding {len(texts)} items to knowledge base")
        self.initialize_vectorstore(texts, metadata)
        self.knowledge_base.extend([{"text": text, "metadata": meta} for text, meta in zip(texts, metadata)])
        logger.info(f"Knowledge base size: {len(self.knowledge_base)}")
    
    def search(self, query: str, k: int = 5) -> List[Dict]:
        if self.vectorstore is None:
            logger.warning("Vector store not initialized")
            return []
        
        logger.info(f"Searching for: '{query}' (k={k})")
        if isinstance(self.vectorstore, list):
            try:
                query_embedding = self.embedding_model.encode([query], convert_to_numpy=True)
                distances, indices = self.index.search(query_embedding, k)
                results = [{"text": self.vectorstore[idx]["text"], "metadata": self.vectorstore[idx]["metadata"]} for idx in indices[0] if idx < len(self.vectorstore)]
                logger.info(f"Search returned {len(results)} results (SentenceTransformer)")
                return results
            except Exception as e:
                logger.error(f"SentenceTransformer search error: {e}")
                return []
        else:
            try:
                docs = self.vectorstore.similarity_search(query, k=k)
                results = [{"text": doc.page_content, "metadata": doc.metadata} for doc in docs]
                logger.info(f"Search returned {len(results)} results (OpenAI)")
                return results
            except Exception as e:
                logger.error(f"OpenAI embeddings search error: {e}")
                return []

# Visualization Generator
class VisualizationGenerator:
    def __init__(self):
        self.supported_types = ["bar", "line", "pie", "scatter"]
        logger.info("Visualization Generator initialized")
    
    def generate_chart(self, data: List[Dict], chart_type: str, title: str = "", x_column: str = None, y_column: str = None) -> str:
        if chart_type not in self.supported_types or not data:
            logger.warning(f"Unsupported chart type {chart_type} or no data")
            return None
        
        try:
            logger.info(f"Generating {chart_type} chart with {len(data)} points")
            fig = Figure(figsize=(10, 6))
            ax = fig.subplots()
            df = pd.DataFrame(data)
            
            if chart_type == "bar" and x_column and y_column:
                sns.barplot(x=x_column, y=y_column, data=df, ax=ax)
            elif chart_type == "pie" and x_column and y_column:
                ax.pie(df[y_column], labels=df[x_column], autopct='%1.1f%%')
            elif chart_type == "line" and x_column and y_column:
                sns.lineplot(x=x_column, y=y_column, data=df, ax=ax)
            elif chart_type == "scatter" and x_column and y_column:
                sns.scatterplot(x=x_column, y=y_column, data=df, ax=ax)
            
            ax.set_title(title)
            buf = io.BytesIO()
            fig.savefig(buf, format="png")
            buf.seek(0)
            logger.info("Chart generated successfully")
            return base64.b64encode(buf.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"Error generating chart: {e}")
            return None

# Initialize global classes
rag_enhancer = RAGEnhancer()
visualization_generator = VisualizationGenerator()

# Execute SQL query
def execute_sql_query(query: str) -> str:
    if not query.strip().upper().startswith("SELECT"):
        logger.warning(f"Rejected non-SELECT query: {query}")
        return "Erreur : Seules les requêtes SELECT sont autorisées."
    
    try:
        with db_connection() as connection:
            if connection is None:
                logger.error("DB connection failed during SQL execution")
                return "Erreur : Connexion à la base de données échouée."
            logger.info(f"Executing SQL query: {query}")
            result = connection.execute(text(query))
            rows = result.fetchall()
            
            if not rows:
                logger.info("No results from SQL query")
                return "Aucun résultat trouvé."
            
            logger.info(f"SQL query returned {len(rows)} rows")
            output = [str(dict(row._mapping)) for row in rows[:100]]
            if len(rows) > 100:
                output.append("... (résultats tronqués à 100 lignes)")
            return "\n".join(output)
    except Exception as e:
        logger.error(f"SQL execution error: {e}")
        return f"Erreur SQL: {str(e)}"

# Query OpenRouter API
def query_openrouter(messages, max_retries=3, timeout=60):
    if not OPENROUTER_AVAILABLE:
        logger.error("OpenRouter API key not configured")
        return "Service AI indisponible."
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    for attempt in range(max_retries):
        try:
            logger.info(f"OpenRouter request (attempt {attempt+1}/{max_retries})")
            response = requests.post(OPENROUTER_URL, headers=openrouter_headers, json=payload, timeout=timeout)
            if response.status_code == 200:
                result = response.json()
                if "choices" in result and result["choices"]:
                    logger.info("OpenRouter request successful")
                    return result["choices"][0]["message"]["content"]
            logger.warning(f"OpenRouter status {response.status_code}: {response.text}")
            time.sleep(min(2 * (attempt + 1), 10))
        except Exception as e:
            logger.warning(f"OpenRouter attempt {attempt+1} failed: {e}")
            time.sleep(min(2 * (attempt + 1), 10))
    
    logger.error("All OpenRouter attempts failed")
    return "Erreur de communication avec le service IA."

# Extract SQL query
def extract_sql_query(response_text: str) -> Tuple[bool, Optional[str], str]:
    import re
    sql_pattern = r"\[EXECUTE_SQL:\s*(.*?)\]"
    match = re.search(sql_pattern, response_text, re.DOTALL)
    if match:
        sql_query = match.group(1).strip()
        clean_response = re.sub(sql_pattern, "", response_text, re.DOTALL).strip()
        logger.info(f"Extracted SQL query: {sql_query}")
        return True, sql_query, clean_response
    return False, None, response_text

# Test endpoint
@app.get("/test")
async def test_endpoint():
    db_test_result = test_db_connection()
    db_status = db_test_result.get("status", "unknown")
    openrouter_status = "ok" if OPENROUTER_AVAILABLE else "error"
    vector_store_status = "ok" if rag_enhancer.vectorstore is not None else "error"
    
    return {
        "status": "ok" if db_status == "ok" and openrouter_status == "ok" else "error",
        "message": "GMAO Chatbot running",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "database": db_test_result,
            "openrouter": {"status": openrouter_status, "message": OPENROUTER_ERROR_MESSAGE or "Configured"},
            "vector_store": {"status": vector_store_status, "message": f"{len(rag_enhancer.knowledge_base)} records"}
        }
    }

@app.post("/query", response_model=EnhancedChatResponse)
async def query_chatbot(request: ChatRequest = Body(...)):
    try:
        start_time = time.time()
        
        if not DB_AVAILABLE:
            init_db_connection()
            if not DB_AVAILABLE:
                return EnhancedChatResponse(
                    response="Impossible d'accéder à la base GMAO. Vérifiez la connexion.",
                    metadata={"error": "database_unavailable", "details": DB_CONNECTION_ERROR}
                )
        
        if not OPENROUTER_AVAILABLE:
            return EnhancedChatResponse(
                response="Service IA indisponible.",
                metadata={"error": "openrouter_unavailable"}
            )
        
        logger.info(f"Processing query: {request.query}")
        
        # Vérifier si la requête concerne des données à une date spécifique
        date_match = False
        sql_query = None
        
        # Pré-processeur pour les requêtes fréquentes
        query_lower = request.query.lower()
        
        # Détection des questions sur les interventions à une date spécifique
        if "intervention" in query_lower and any(date_term in query_lower for date_term in ["aujourd'hui", "demain", "hier", "juin", "mai", "avril", "2 juin", "du jour"]):
            date_match = True
            
            # Construire une requête SQL adaptée
            if "aujourd'hui" in query_lower or "du jour" in query_lower:
                sql_query = """
                SELECT di.IdDemandeIntervention, di.Titre, s.Libelle as Status, 
                       u.NomComplet as Demandeur, di.DateCreation
                FROM DemandeInterventions di
                LEFT JOIN Status s ON di.StatusId = s.Id
                LEFT JOIN Users u ON di.DemandeursID = u.Id
                WHERE CONVERT(date, di.DateCreation) = CONVERT(date, GETDATE())
                  AND di.IsActif = 1
                ORDER BY di.DateCreation DESC
                """
            elif "2 juin" in query_lower or "deux juin" in query_lower:
                sql_query = """
                SELECT di.IdDemandeIntervention, di.Titre, s.Libelle as Status, 
                       u.NomComplet as Demandeur, di.DateCreation
                FROM DemandeInterventions di
                LEFT JOIN Status s ON di.StatusId = s.Id
                LEFT JOIN Users u ON di.DemandeursID = u.Id
                WHERE CONVERT(date, di.DateCreation) = '2025-06-02'
                  AND di.IsActif = 1
                ORDER BY di.DateCreation DESC
                """
            elif "juin" in query_lower:
                sql_query = """
                SELECT di.IdDemandeIntervention, di.Titre, s.Libelle as Status, 
                       u.NomComplet as Demandeur, di.DateCreation
                FROM DemandeInterventions di
                LEFT JOIN Status s ON di.StatusId = s.Id
                LEFT JOIN Users u ON di.DemandeursID = u.Id
                WHERE MONTH(di.DateCreation) = 6 AND YEAR(di.DateCreation) = 2025
                  AND di.IsActif = 1
                ORDER BY di.DateCreation DESC
                """
        
        # Détection des questions sur les équipements
        elif "équipement" in query_lower or "equipement" in query_lower:
            if "critique" in query_lower or "criticité" in query_lower:
                sql_query = """
                SELECT e.IdEquipement, e.CodeEquipement, e.Designation,
                       ec.Libelle as Criticite
                FROM Equipments e
                LEFT JOIN EquipmentCriticites ec ON e.IdCriticite = ec.Id
                WHERE e.IsDeleted = 0 AND ec.Id = 3
                ORDER BY e.Designation
                """
            else:
                sql_query = """
                SELECT e.IdEquipement, e.CodeEquipement, e.Designation,
                       ec.Libelle as Criticite, ee.Libelle as Etat
                FROM Equipments e
                LEFT JOIN EquipmentCriticites ec ON e.IdCriticite = ec.Id
                LEFT JOIN EtatEquipements ee ON e.IdEtat = ee.Id
                WHERE e.IsDeleted = 0
                ORDER BY e.Designation
                OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
                """
        
        # Détection des questions sur les pièces en stock
        elif ("pièce" in query_lower or "piece" in query_lower) and ("stock" in query_lower):
            if "faible" in query_lower or "critique" in query_lower:
                sql_query = """
                SELECT p.IDPiece, p.CodePiece, p.Designation, p.Quantite_Stock,
                       cp.Libelle as Criticite
                FROM Pieces p
                LEFT JOIN CriticitePieces cp ON p.IDCriticitePiece = cp.Id
                WHERE p.IsActif = 1 AND p.Quantite_Stock < 5
                ORDER BY p.Quantite_Stock
                """
            else:
                sql_query = """
                SELECT p.IDPiece, p.CodePiece, p.Designation, p.Quantite_Stock,
                       cp.Libelle as Criticite
                FROM Pieces p
                LEFT JOIN CriticitePieces cp ON p.IDCriticitePiece = cp.Id
                WHERE p.IsActif = 1
                ORDER BY p.Designation
                OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
                """
        
        if sql_query:
            # Exécuter directement la requête SQL
            logger.info(f"Direct SQL execution for query: {request.query}")
            sql_result = execute_sql_query(sql_query)
            
            if sql_result and not sql_result.startswith("Erreur"):
                # Préparer un message pour l'IA avec les résultats
                system_prompt = get_system_prompt()
                messages = [{"role": "system", "content": system_prompt}]
                
                data_interpretation = f"""Utilise UNIQUEMENT ces données issues de la base GMAO pour répondre à la question: "{request.query}"

Résultat SQL:
{sql_result}

Analyse ces données et réponds à l'utilisateur de façon claire et concise, comme si tu étais un expert en GMAO.
N'invente pas de données qui ne figurent pas dans les résultats.
"""
                messages.append({"role": "user", "content": data_interpretation})
                
                # Générer une visualisation si possible
                visualizations = []
                try:
                    result_data = [json.loads(row.replace("'", "\"")) for row in sql_result.split("\n") if row and not row.startswith("...")]
                    if len(result_data) > 1 and len(result_data[0].keys()) > 1:
                        chart_type = "bar"
                        if "today" in request.query.lower():
                            chart_type = "bar"
                        elif "tendance" in request.query.lower():
                            chart_type = "line"
                        x_column = next(iter(result_data[0].keys()))
                        y_column = list(result_data[0].keys())[1]
                        img_b64 = visualization_generator.generate_chart(result_data, chart_type, f"Visualisation: {request.query[:30]}...", x_column, y_column)
                        if img_b64:
                            visualizations.append({"type": "image", "format": "base64", "data": img_b64, "title": f"Visualisation: {request.query[:30]}..."})
                except Exception as e:
                    logger.error(f"Visualization error: {e}")
                
                # Obtenir la réponse de l'IA
                response_text = query_openrouter(messages)
                
                return EnhancedChatResponse(
                    response=response_text,
                    metadata={
                        "db_available": DB_AVAILABLE,
                        "model_used": OPENROUTER_MODEL,
                        "sql_executed": True,
                        "sql_query": sql_query,
                        "direct_execution": True,
                        "total_time_ms": round((time.time() - start_time) * 1000)
                    },
                    visualizations=visualizations or None,
                    suggestions=[
                        "Quelles sont les interventions prévues aujourd'hui ?",
                        "Quels équipements ont une criticité élevée ?",
                        "Quelles pièces sont en stock faible ?"
                    ]
                )
        
        # Traitement standard avec RAG si pas de requête directe
        relevant_docs = rag_enhancer.search(request.query, k=5)
        context_enrichment = "\n\nInformations pertinentes:\n" + "\n".join(f"{i+1}. {doc['text']}" for i, doc in enumerate(relevant_docs)) if relevant_docs else ""
        
        system_prompt = get_system_prompt()
        messages = [{"role": "system", "content": system_prompt + f"\n\nLa base GMAO est {'accessible' if DB_AVAILABLE else 'inaccessible'}."}]
        if relevant_docs:
            messages.append({"role": "system", "content": context_enrichment})
        
        if request.conversation_history:
            messages.extend({"role": msg["role"], "content": msg["content"]} for msg in request.conversation_history[-5:] if isinstance(msg, dict) and "role" in msg and "content" in msg)
        
        messages.append({"role": "user", "content": request.query})
        
        max_retries = 3
        visualizations = []
        retry_count = 0
        sql_executed = False
        sql_query_used = None
        sql_result = None
        
        while retry_count < max_retries:
            response_text = query_openrouter(messages)
            has_sql, sql_query, clean_response = extract_sql_query(response_text)
            
            if has_sql:
                logger.info(f"Executing SQL: {sql_query}")
                sql_query_used = sql_query
                sql_result = execute_sql_query(sql_query)
                sql_executed = True
                
                if not sql_result.startswith("Erreur"):
                    follow_up_messages = messages + [{"role": "assistant", "content": clean_response}]
                    data_interpretation = f"Résultat SQL: \n{sql_result}\n\nUtilise UNIQUEMENT ces données pour répondre."
                    try:
                        result_data = [json.loads(row.replace("'", "\"")) for row in sql_result.split("\n") if row and not row.startswith("...")]
                        if len(result_data) > 1 and len(result_data[0].keys()) > 1:
                            chart_type = "bar"
                            if "today" in request.query.lower():
                                chart_type = "bar"
                            elif "tendance" in request.query.lower():
                                chart_type = "line"
                            x_column = next(iter(result_data[0].keys()))
                            y_column = list(result_data[0].keys())[1]
                            img_b64 = visualization_generator.generate_chart(result_data, chart_type, f"Visualisation: {request.query[:30]}...", x_column, y_column)
                            if img_b64:
                                visualizations.append({"type": "image", "format": "base64", "data": img_b64, "title": f"Visualisation: {request.query[:30]}..."})
                                data_interpretation += f" Un graphique {chart_type} est disponible."
                    except Exception as e:
                        logger.error(f"Visualization error: {e}")
                    
                    follow_up_messages.append({"role": "user", "content": data_interpretation})
                    response_text = query_openrouter(follow_up_messages)
                    break
                else:
                    messages.append({"role": "assistant", "content": clean_response})
                    messages.append({"role": "user", "content": f"SQL échoué: {sql_result}. Corrige la requête."})
                    retry_count += 1
            else:
                break
        
        if retry_count == max_retries:
            response_text = "Échec après plusieurs tentatives. Reformulez votre question."
        
        suggestions = [
            "Quelles sont les interventions prévues aujourd'hui ?",
            "Quels équipements ont une criticité élevée ?",
            "Quelles pièces sont en stock faible ?"
        ]
        
        metadata = {
            "db_available": DB_AVAILABLE,
            "model_used": OPENROUTER_MODEL,
            "sql_executed": sql_executed,
            "sql_query": sql_query_used,
            "total_time_ms": round((time.time() - start_time) * 1000)
        }
        
        return EnhancedChatResponse(
            response=response_text,
            metadata=metadata,
            visualizations=visualizations or None,
            suggestions=suggestions
        )
    except Exception as e:
        logger.error(f"Query error: {e}")
        logger.error(traceback.format_exc())
        return EnhancedChatResponse(response=f"Erreur: {str(e)}", metadata={"error": str(e)})

# Health check
@app.get("/health")
async def health_check():
    db_status = "ok" if DB_AVAILABLE else "error"
    return {
        "status": "ok" if DB_AVAILABLE and OPENROUTER_AVAILABLE else "degraded",
        "database": {"status": db_status, "error": DB_CONNECTION_ERROR if not DB_AVAILABLE else None},
        "ai_service": {"status": "ok" if OPENROUTER_AVAILABLE else "error", "error": OPENROUTER_ERROR_MESSAGE},
        "rag": {"status": "ok" if rag_enhancer.vectorstore is not None else "error", "records": len(rag_enhancer.knowledge_base)}
    }

# Refresh data
@app.post("/refresh-data")
async def refresh_gmao_data():
    try:
        logger.info("Refreshing GMAO data")
        gmao_data = fetch_gmao_data()
        if gmao_data:
            texts = [item["text"] for item in gmao_data]
            metadata = [item["metadata"] for item in gmao_data]
            rag_enhancer.add_to_knowledge_base(texts, metadata)
            logger.info(f"Refreshed RAG with {len(gmao_data)} records")
            return {"status": "ok", "message": f"Refreshed {len(gmao_data)} records"}
        return {"status": "warning", "message": "No GMAO data found"}
    except Exception as e:
        logger.error(f"Refresh error: {e}")
        return {"status": "error", "message": f"Error: {str(e)}"}

# Lifespan handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GMAO Chatbot...")
    engine_instance = init_db_connection()
    if engine_instance:
        logger.info("DB connection initialized")
        gmao_data = fetch_gmao_data()
        if gmao_data:
            texts = [item["text"] for item in gmao_data]
            metadata = [item["metadata"] for item in gmao_data]
            rag_enhancer.add_to_knowledge_base(texts, metadata)
            logger.info(f"Loaded {len(gmao_data)} records into RAG")
    else:
        logger.warning("Failed to initialize DB")
    yield
    logger.info("Shutting down GMAO Chatbot...")

app.lifespan = lifespan

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5002"))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting on {host}:{port}")
    uvicorn.run(app, host=host, port=port)