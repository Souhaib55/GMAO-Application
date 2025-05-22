import os
import time
import logging
import json
import requests
import uuid
import sqlalchemy
from sqlalchemy import create_engine, text
from contextlib import contextmanager
from fastapi import FastAPI, Body
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
from datetime import datetime  # Added for current date

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
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
        current_dir = pathlib.Path(__file__).parent.absolute()
        root_dir = current_dir.parent
        appsettings_path = root_dir / 'API' / 'appsettings.Development.json'
        
        if not appsettings_path.exists():
            alt_path = pathlib.Path.cwd() / 'gmao' / 'API' / 'appsettings.Development.json'
            if alt_path.exists():
                appsettings_path = alt_path
            else:
                logger.error("appsettings.Development.json not found")
                return {}, ""
        
        with open(appsettings_path, 'r') as f:
            settings = json.load(f)
        
        conn_string = settings.get('ConnectionStrings', {}).get('DefaultConnection', '')
        if not conn_string:
            return settings, ""
        
        params = {part.split('=', 1)[0].strip(): part.split('=', 1)[1].strip() for part in conn_string.split(';') if '=' in part}
        server = params.get('Server', '')
        database = params.get('Database', '')
        trusted = 'yes' if params.get('Trusted_Connection', 'False').lower() in ('true', 'yes') else 'no'
        trust_cert = 'yes' if params.get('TrustServerCertificate', 'False').lower() in ('true', 'yes') else 'no'
        
        odbc_conn = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};Trusted_Connection={trusted};TrustServerCertificate={trust_cert}"
        sqlalchemy_conn = f"mssql+pyodbc:///?odbc_connect={odbc_conn}"
        return settings, sqlalchemy_conn
    except Exception as e:
        logger.error(f"Error reading app settings: {e}")
        return {}, ""

# Load settings
app_settings, conn_string = read_app_settings()

# Database configuration
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING", conn_string or "mssql+pyodbc://username:password@server/database?driver=ODBC+Driver+17+for+SQL+Server")
engine = None
DB_AVAILABLE = False

# OpenRouter API configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", app_settings.get('OpenRouter', {}).get('ApiKey', ''))
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", app_settings.get('OpenRouter', {}).get('Model', 'deepseek/deepseek-r1:free'))
OPENROUTER_AVAILABLE = bool(OPENROUTER_API_KEY)
OPENROUTER_ERROR_MESSAGE = ""

openrouter_headers = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "HTTP-Referer": "https://gmao.alcodex.cloud",
    "Content-Type": "application/json"
}

# Define chat request and response models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    query: str
    conversation_history: Optional[List[Message]] = None

class EnhancedChatResponse(BaseModel):
    response: str
    metadata: Optional[Dict[str, Any]] = None
    visualizations: Optional[List[Dict[str, str]]] = None
    suggestions: Optional[List[str]] = None

# System prompt with dynamic current date
def get_system_prompt():
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")
    return f"""Tu es un assistant IA spécialisé dans la GMAO (Gestion de Maintenance Assistée par Ordinateur). La date et l'heure actuelles sont {current_date}. Tu as accès à des enregistrements spécifiques de la base de données GMAO, fournis dans le contexte. Utilise ces informations pour répondre précisément aux questions des utilisateurs. Si les données du contexte suffisent, base-toi dessus. Sinon, pour des données agrégées ou complexes, tu peux proposer une requête SQL à exécuter. Lorsqu'un résultat SQL est fourni, base ta réponse EXCLUSIVEMENT sur ce résultat.

- Réponds en langage naturel, sans mentionner les requêtes SQL dans les réponses.
- Pour les questions ambiguës, demande des précisions.
"""

# Function to fetch GMAO data
def fetch_gmao_data():
    with db_connection() as connection:
        if connection is None:
            logger.error("No database connection available")
            return []
        
        data_texts = []
        
        # Fetch Equipments
        try:
            equipments = connection.execute(text("SELECT * FROM Equipments WHERE IsDeleted = 0")).fetchall()
            for eq in equipments:
                text_str = f"Equipment: Code={eq['CodeEquipement']}, Designation={eq['Designation']}, Criticite={eq['IdCriticite']}"
                data_texts.append({"text": text_str, "metadata": {"table": "Equipments", "id": eq['IdEquipement']}})
        except Exception as e:
            logger.error(f"Error fetching Equipments: {e}")
        
        # Fetch Interventions
        try:
            interventions = connection.execute(text("SELECT * FROM DemandeInterventions WHERE IsActif = 1")).fetchall()
            for interv in interventions:
                text_str = f"Intervention: ID={interv['IdDemandeIntervention']}, Title={interv['Titre']}, Status={interv['StatusId']}"
                data_texts.append({"text": text_str, "metadata": {"table": "DemandeInterventions", "id": interv['IdDemandeIntervention']}})
        except Exception as e:
            logger.error(f"Error fetching Interventions: {e}")
        
        # Fetch Pieces
        try:
            pieces = connection.execute(text("SELECT * FROM Pieces WHERE IsActif = 1")).fetchall()
            for piece in pieces:
                text_str = f"Piece: Code={piece['CodePiece']}, Designation={piece['Designation']}, Stock={piece['Quantite_Stock']}"
                data_texts.append({"text": text_str, "metadata": {"table": "Pieces", "id": piece['IdPiece']}})
        except Exception as e:
            logger.error(f"Error fetching Pieces: {e}")
        
        return data_texts

# RAG Enhancer with FAISS and OpenAI Embeddings
class RAGEnhancer:
    def __init__(self):
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')  # Fallback if OpenAI embeddings unavailable
        self.knowledge_base = []
        self.index = None
        self.dimension = 384
        self.vectorstore = None
    
    def initialize_vectorstore(self, texts: List[str], metadata: List[Dict]):
        try:
            embeddings = OpenAIEmbeddings(openai_api_key=OPENROUTER_API_KEY, model="text-embedding-ada-002")
            documents = [dict(content=text, metadata=meta) for text, meta in zip(texts, metadata)]
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
            docs = text_splitter.create_documents([d["content"] for d in documents])
            self.vectorstore = FAISS.from_documents(docs, embeddings)
        except Exception as e:
            logger.error(f"OpenAI embeddings failed: {e}. Falling back to SentenceTransformer.")
            embeddings = self.embedding_model.encode(texts, convert_to_numpy=True)
            self.index = faiss.IndexFlatL2(self.dimension)
            self.index.add(embeddings)
            self.vectorstore = [
                {"text": text, "metadata": meta, "embedding": emb}
                for text, meta, emb in zip(texts, metadata, embeddings)
            ]
    
    def add_to_knowledge_base(self, texts: List[str], metadata: List[Dict] = None):
        if metadata is None:
            metadata = [{} for _ in texts]
        self.initialize_vectorstore(texts, metadata)
        self.knowledge_base.extend([{"text": text, "metadata": meta} for text, meta in zip(texts, metadata)])
    
    def search(self, query: str, k: int = 5) -> List[Dict]:
        if self.vectorstore is None:
            return []
        if isinstance(self.vectorstore, list):  # SentenceTransformer fallback
            query_embedding = self.embedding_model.encode([query], convert_to_numpy=True)
            distances, indices = self.index.search(query_embedding, k)
            return [
                {"text": self.vectorstore[idx]["text"], "metadata": self.vectorstore[idx]["metadata"]}
                for idx in indices[0] if idx < len(self.vectorstore)
            ]
        else:  # OpenAI embeddings
            docs = self.vectorstore.similarity_search(query, k=k)
            return [{"text": doc.page_content, "metadata": doc.metadata} for doc in docs]

# Visualization Generator
class VisualizationGenerator:
    def __init__(self):
        self.supported_types = ["bar", "line", "pie", "scatter"]
    
    def generate_chart(self, data: List[Dict], chart_type: str, title: str = "", x_column: str = None, y_column: str = None) -> str:
        if chart_type not in self.supported_types:
            return None
        
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
        return base64.b64encode(buf.read()).decode('utf-8')

# Initialize global classes
rag_enhancer = RAGEnhancer()
visualization_generator = VisualizationGenerator()

# Database connection
def init_db_connection():
    global engine, DB_AVAILABLE
    if engine is not None:
        return engine
    try:
        engine = create_engine(DB_CONNECTION_STRING)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        DB_AVAILABLE = True
        return engine
    except Exception as e:
        DB_AVAILABLE = False
        logger.error(f"Error connecting to database: {e}")
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
            yield None
    except Exception as e:
        logger.error(f"Error getting DB connection: {e}")
        yield None
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception as e:
                logger.error(f"Error closing DB connection: {e}")

# Execute SQL query
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
            output = [str(dict(row._mapping)) for row in rows[:100]]
            if len(rows) > 100:
                output.append("... (résultats tronqués à 100 lignes)")
            return "\n".join(output)
    except Exception as e:
        logger.error(f"SQL query execution error: {e}")
        return f"Erreur lors de l'exécution : {str(e)}"

# Query OpenRouter API
def query_openrouter(messages, max_retries=3, timeout=60):
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1000
    }
    for attempt in range(max_retries):
        try:
            response = requests.post(OPENROUTER_URL, headers=openrouter_headers, json=payload, timeout=timeout)
            if response.status_code == 200:
                result = response.json()
                if "choices" in result and result["choices"]:
                    return result["choices"][0]["message"]["content"]
            time.sleep(min(2 * (attempt + 1), 10))
        except Exception as e:
            logger.warning(f"OpenRouter attempt {attempt+1} failed: {e}")
            time.sleep(min(2 * (attempt + 1), 10))
    return "Désolé, impossible de répondre. Réessayez plus tard."

# Extract SQL query from response
def extract_sql_query(response_text: str) -> Tuple[bool, Optional[str], str]:
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
        start_time = time.time()
        
        # Retrieve relevant GMAO data using RAG
        relevant_docs = rag_enhancer.search(request.query, k=5)
        context_enrichment = "\n\nInformations pertinentes pour répondre à cette question:\n"
        for i, doc in enumerate(relevant_docs):
            context_enrichment += f"{i+1}. {doc['text']}\n"
        
        if not OPENROUTER_AVAILABLE:
            return EnhancedChatResponse(
                response=f"Service indisponible. Erreur: {OPENROUTER_ERROR_MESSAGE}",
                metadata={"error": "OpenRouter client not available"}
            )
        
        # Format messages for OpenRouter with dynamic system prompt
        system_prompt = get_system_prompt()
        messages = [{"role": "system", "content": system_prompt}]
        if relevant_docs:
            messages.append({"role": "system", "content": context_enrichment})
        if request.conversation_history:
            messages.extend({"role": msg.role, "content": msg.content} for msg in request.conversation_history[-5:])
        messages.append({"role": "user", "content": request.query})
        
        # Process response
        max_retries = 3
        visualizations = []
        retry_count = 0
        sql_executed = False
        sql_query_used = None
        sql_result = None  # To store the result for metadata
        
        while retry_count < max_retries:
            response_text = query_openrouter(messages)
            has_sql, sql_query, clean_response = extract_sql_query(response_text)
            
            if has_sql:
                logger.info(f"Executing SQL query: {sql_query}")
                sql_query_used = sql_query
                sql_result = execute_sql_query(sql_query)
                logger.info(f"SQL result: {sql_result}")  # Log the result for debugging
                sql_executed = True
                
                if not sql_result.startswith("Erreur"):
                    follow_up_messages = messages + [{"role": "assistant", "content": clean_response}]
                    data_interpretation = f"Résultat de ta requête SQL: \n{sql_result}\n\nUtilise UNIQUEMENT ces données pour répondre à la question de l'utilisateur. Ne génère pas de données supplémentaires. Si les données sont insuffisantes, dis-le clairement."
                    
                    # Try to parse the SQL result into structured data for visualization
                    try:
                        result_data = []
                        for row in sql_result.split("\n"):
                            if row and not row.startswith("..."):
                                json_str = row.replace("'", "\"")
                                try:
                                    result_data.append(json.loads(json_str))
                                except json.JSONDecodeError:
                                    logger.warning(f"Could not parse row as JSON: {row}")
                        
                        if result_data and len(result_data) > 1:
                            chart_type = "bar"
                            if "tendance" in request.query.lower() or "évolution" in request.query.lower():
                                chart_type = "line"
                            elif "répartition" in request.query.lower() or "proportion" in request.query.lower():
                                chart_type = "pie"
                            
                            x_column = next(iter(result_data[0].keys()))
                            y_column = list(result_data[0].keys())[1] if len(result_data[0].keys()) > 1 else None
                            
                            if y_column:
                                viz_title = f"Visualisation pour: {request.query[:30]}..."
                                img_b64 = visualization_generator.generate_chart(
                                    data=result_data, chart_type=chart_type, title=viz_title, x_column=x_column, y_column=y_column
                                )
                                if img_b64:
                                    visualizations.append({"type": "image", "format": "base64", "data": img_b64, "title": viz_title})
                                    data_interpretation += f" Un graphique {chart_type} est disponible."
                    except Exception as viz_error:
                        logger.error(f"Error generating visualization: {viz_error}")
                    
                    follow_up_messages.append({"role": "user", "content": data_interpretation})
                    response_text = query_openrouter(follow_up_messages)
                    break
                else:
                    error_message = f"La requête SQL a échoué: {sql_result}. Corrige-la et essaie à nouveau avec une requête valide."
                    messages.append({"role": "user", "content": error_message})
                    retry_count += 1
            else:
                break
        
        if retry_count == max_retries:
            response_text = "Désolé, échec après plusieurs tentatives. J'ai essayé d'exécuter une requête SQL mais elle a échoué. Veuillez reformuler votre question."
        
        suggestions = ["Quels équipements sont critiques ?", "Interventions en cours ?", "Stock faible ?"]
        metadata = {
            "db_available": DB_AVAILABLE,
            "model_used": OPENROUTER_MODEL,
            "sql_executed": sql_executed,
            "sql_query": sql_query_used if sql_executed else None,
            "sql_result": sql_result if sql_executed else None,  # Include raw result for verification
            "total_time_ms": round((time.time() - start_time) * 1000)
        }
        
        return EnhancedChatResponse(
            response=response_text,
            metadata=metadata,
            visualizations=visualizations if visualizations else None,
            suggestions=suggestions
        )
    except Exception as e:
        logger.error(f"Error processing query: {e}", exc_info=True)
        return EnhancedChatResponse(
            response=f"Erreur : {str(e)}",
            metadata={"error": str(e)}
        )

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GMAO Chatbot service...")
    init_db_connection()
    gmao_data = fetch_gmao_data()
    if gmao_data:
        texts = [item["text"] for item in gmao_data]
        metadata = [item["metadata"] for item in gmao_data]
        rag_enhancer.add_to_knowledge_base(texts, metadata)
    logger.info(f"Loaded {len(gmao_data)} GMAO records into RAG")
    yield
    logger.info("Shutting down GMAO Chatbot service...")

app.lifespan = lifespan

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5002"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)