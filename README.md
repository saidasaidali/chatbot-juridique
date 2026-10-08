# ⚖️ Chatbot Juridique d'Analyse de Conformité des Appels d'Offres

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-black?logo=flask)
![FAISS](https://img.shields.io/badge/FAISS-IndexFlatL2-green)
![Ollama](https://img.shields.io/badge/LLM-Mistral_via_Ollama-orange)
![Local](https://img.shields.io/badge/100%25-local_confidentiel-success)

> **Assistant juridique local basé sur le RAG** : il compare un appel d'offre PDF à un corpus réglementaire (décrets) indexé dans FAISS, puis fait rédiger par un LLM local (Mistral via Ollama) une analyse de conformité structurée — et répond à vos questions en gardant le contexte.

**Démarrage rapide (5 min) :**
```bash
git clone https://github.com/saidasaidali/chatbot-juridique.git
cd chatbot-juridique
py -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
ollama pull mistral
# 1) déposez vos décrets PDF dans data/decrets/
python extract_contextual.py && python build_faiss_index.py
python app.py
# → http://127.0.0.1:5000
```

## 📋 Sommaire

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#️-architecture)
- [Structure du projet](#-structure-du-projet)
- [Prérequis](#-prérequis)
- [Installation](#️-installation)
- [Préparation des données](#-préparation-des-données-pipeline-offline)
- [Lancement](#-lancement)
- [Guide d'utilisation](#️-guide-dutilisation)
- [Référence API](#-référence-api)
- [Configuration](#-configuration)
- [Comment marche l'IA ?](#-comment-marche-lia--vulgarisation-rag)
- [Dépannage](#-dépannage)
- [Limites connues](#️-limites-connues)
- [Feuille de route](#-feuille-de-route)
- [Confidentialité](#-confidentialité)
- [Contribution & Licence](#-contribution--licence)

## 🖼️ Aperçu

| Vue | Description |
|-----|-------------|
| `templates/index.html` (1041 lignes, ~47 Ko, CSS/JS inline) | Sidebar historique + zone chat + panneau **Articles Juridiques Pertinents** + toggle clair/sombre |
| `POST /analyze-pdf` | Bulle d'analyse + 8 articles affichés |
| `POST /ask` | Chat de suivi avec mémoire `ao_text + articles` |


## ✨ Fonctionnalités

- 📄 **Upload PDF** + extraction texte via `pdfplumber` (rejet si < 50 caractères : `PDF vide ou illisible`)
- 🔍 **Recherche sémantique top-k=8** dans FAISS `IndexFlatL2` (distance euclidienne exacte)
- 🤖 **Analyse structurée** via Ollama/Mistral : 1. Conformité Oui/Non/Partiellement 2. Articles violés 3. Recommandations
- 💬 **Chat follow-up** avec contexte conservé côté frontend (`aoText`, `articles`)
- 📜 **Panneau latéral** des articles pertinents + métadonnées (source, titre)
- 📊 **Observabilité** : `GET /health`, `GET /stats`
- 🌙 **UX** : thème clair/sombre (`localStorage theme`), historique (`chatHistory`, `analysesHistory` max 20), actions rapides, responsive
- 🔒 **100% local** : embeddings + LLM + index sur la machine, aucune donnée envoyée au cloud



## 📁 Structure du projet

```
chatbot_juridique/
├── app.py                  # Backend Flask (5 routes + prompts Ollama)
├── config.py               # Chemins data/, modèles, regex, auto-mkdir
├── extract_contextual.py   # PDF décrets → blocs → rag_contextual.json
├── build_faiss_index.py    # Embeddings → faiss_index.bin + metadatas.json
├── requirements.txt        # 8 dépendances épinglées
├── .gitignore              # data/, *.bin, *.pdf, venv/ (⚠️ encodage UTF-16 à corriger → voir Dépannage)
├── README.md
├── templates/
│   ├── index.html          # App LexAI monofichier (1041 lignes : HTML+CSS+JS inline)
│   └── index.backup.html   # Sauvegarde (~6 Ko)
└── static/                 # ⚠️ Vide : script.js / style.css à extraire (voir Feuille de route)

# Générés localement (absents du repo, à reconstruire) :
# data/decrets/*.pdf
# data/processed/rag_contextual.json
# data/processed/faiss_index.bin
# data/processed/metadatas.json
```

## ✅ Prérequis

- **Python 3.11** (vérifié : `py --version` → `Python 3.11.6`)
- **Ollama** installé + daemon démarré + modèle tiré :
```bash
ollama pull mistral
ollama serve
```
- **PDFs de décrets** pour construire la base (non fournis — gitignorés)
- Navigateur moderne + ~2 Go RAM libres (embeddings `torch` + FAISS en mémoire)

## ⚙️ Installation

```bash
git clone https://github.com/saidasaidali/chatbot-juridique.git
cd chatbot-juridique
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
ollama pull mistral
```

> `data/decrets/` et `data/processed/` sont créés automatiquement au premier `import config` (`os.makedirs(..., exist_ok=True)`).
> ⚠️ **Point d'attention `config.py`** : `BASE_DIR = dirname(dirname(abspath(__file__)))` pointe vers le **parent** du projet (`projets/data` et non `chatbot_juridique/data`). Corrigez en `dirname(abspath(__file__))` si vos `data/` doivent vivre dans le repo — voir [Dépannage](#-dépannage).

## 📚 Préparation des données (pipeline offline, une fois)

```bash
# 1. Copiez vos décrets PDF dans data/decrets/
#    (vérifiez le chemin réel : voir avertissement BASE_DIR ci-dessus)
# 2. Extraction + chunking par titres (ARTICLE, CHAPITRE, SECTION, ...)
python extract_contextual.py
# Sortie : data/processed/rag_contextual.json
#   {total_documents, total_pdfs, documents:[{id: doc_XXXX_context_YYY, source, context_title, text}]}

# 3. Embeddings MiniLM (384d, batch_size=32, float32) + index FAISS
python build_faiss_index.py
# Sorties : data/processed/faiss_index.bin + metadatas.json [{id, source, title, text}]
```

## 🚀 Lancement

```bash
python app.py
```
```
Chargement de l'index FAISS...
Index chargé : N vecteurs
Interface : http://127.0.0.1:5000
Stats     : http://127.0.0.1:5000/stats
Health    : http://127.0.0.1:5000/health
```

## 🖥️ Guide d'utilisation

1. Cliquez **Importer / Joindre un PDF**, sélectionnez un AO (`application/pdf`).
2. Patientez : bulle `Document importé` → `Document analysé avec succès !` + panneau **Articles Juridiques Pertinents** (8 articles).
3. Actions rapides : **Analyser complètement / Vérifier conformité / Afficher articles**, ou posez une question libre.
4. Historique persisté en `localStorage` (`chatHistory` + `analysesHistory` max 20) — bouton **Réinitialiser** pour effacer, toggle ☾/☀ pour le thème.




## 🔧 Configuration

`config.py` (valeurs actuelles) :
```python
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # 384 dimensions
LLM_MODEL = "mistral"                 # via Ollama
TITLE_PATTERNS = [r"ARTICLE\s+\d+", r"ART\.\s*\d+", r"CHAPITRE\s+\d+",
                  r"SECTION\s+\d+", r"TITRE\s+\d+"]
```

- `k=8` codé en dur dans `app.py` (`retrieve_relevant_articles(text, k=8)` + `analyze_pdf`) — rendez-le paramétrable via query param `?k=`.
- Troncature LLM `text[:3000]` dans `analyze_with_ollama()` et `ask_question()` — augmentez ou chunkez pour les longs AO.
- `BASE_DIR` pointe vers le **parent** — à corriger si besoin (voir Dépannage).
- Changer de modèle : éditez `config.py` + `ollama pull <nom>` (+ reconstruisez l'index si vous changez l'embedding model).
- `requirements.txt` : 8 dépendances épinglées — `Flask 3.0.0`, `flask-cors 4.0.0`, `pdfplumber 0.10.3`, `faiss-cpu 1.7.4`, `sentence-transformers 2.2.2`, `torch 2.1.0`, `numpy 1.24.3`, `ollama 0.1.6` (+ `torch` ~2 Go, prévoyez `pip install` long sous Windows).

## 🧠 Comment marche l'IA ? (vulgarisation RAG)

1. **Découpage** (`extract_contextual.py`) : chaque décret PDF est découpé par titre (`ARTICLE`, `CHAPITRE`...) en blocs `{source, context_title, text}` nettoyés.
2. **Embeddings** (`build_faiss_index.py`) : `all-MiniLM-L6-v2` convertit chaque bloc en vecteur 384d `float32` — deux textes au sens proche ont des vecteurs proches.
3. **Index FAISS** : `IndexFlatL2` (Meta) stocke les vecteurs et retrouve les 8 plus proches par distance euclidienne (`index.search(vec, 8)`).
4. **Requête** (`app.py`) : l'AO uploadé est encodé en 1 vecteur → top-8 articles récupérés.
5. **Génération** (Ollama/Mistral) : prompt `AO[:3000] + 8 ARTICLES` → analyse en 3 parties. Le RAG ancre la réponse : moins d'hallucinations.
6. **Chat** : `/ask` réutilise `ao_text + articles` renvoyés au frontend (pas de nouveau retrieval) + `question` → réponse d'expert.

.



## 🛠️ Stack technique

| Technologie | Version | Utilisation |
|---|---|---|
| Flask | 3.0.0 | Serveur + 5 routes |
| flask-cors | 4.0.0 | `CORS(app)` |
| pdfplumber | 0.10.3 | Extraction PDF (décrets + AO) |
| faiss-cpu | 1.7.4 | `IndexFlatL2` + `search(vec, 8)` |
| sentence-transformers | 2.2.2 | Embeddings `all-MiniLM-L6-v2` 384d |
| torch | 2.1.0 | Backend embeddings |
| numpy | 1.24.3 | Vecteurs `float32` |
| ollama | 0.1.6 | Client LLM local `ollama.chat` |
| HTML/CSS/JS vanilla | — | UI monofichier, `fetch`, `localStorage` |
| JSON | — | `rag_contextual.json`, `metadatas.json` |




