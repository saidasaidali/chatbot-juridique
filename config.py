import os

# Chemins de base
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
DECRETS_DIR = os.path.join(DATA_DIR, "decrets")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")

# Fichiers de sortie
RAG_CONTEXTUAL_JSON = os.path.join(PROCESSED_DIR, "rag_contextual.json")
FAISS_INDEX_PATH = os.path.join(PROCESSED_DIR, "faiss_index.bin")
METADATAS_PATH = os.path.join(PROCESSED_DIR, "metadatas.json")

# Configuration des modèles
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
LLM_MODEL = "mistral"

# Patterns pour la détection de titres
TITLE_PATTERNS = [
    r"ARTICLE\s+\d+",
    r"ART\.\s*\d+",
    r"CHAPITRE\s+\d+",
    r"SECTION\s+\d+",
    r"TITRE\s+\d+",
]

# Créer les dossiers s'ils n'existent pas
for directory in [DECRETS_DIR, PROCESSED_DIR]:
    os.makedirs(directory, exist_ok=True)