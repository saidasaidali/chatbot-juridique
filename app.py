from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pdfplumber
import json
import faiss
import ollama
from sentence_transformers import SentenceTransformer
from config import FAISS_INDEX_PATH, METADATAS_PATH, EMBEDDING_MODEL, LLM_MODEL

# Flask cherche automatiquement :
#   - les HTML dans  backend/templates/
#   - les CSS/JS dans backend/static/
app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

# Charger FAISS + métadonnées
print("Chargement de l'index FAISS...")
index = faiss.read_index(FAISS_INDEX_PATH)
with open(METADATAS_PATH, "r", encoding="utf-8") as f:
    metadatas = json.load(f)
model = SentenceTransformer(EMBEDDING_MODEL)
print(f"Index chargé : {index.ntotal} vecteurs")

# ================================
# FONCTIONS UTILITAIRES
# ================================

def extract_text_from_pdf(file):
    text = ""
    with pdfplumber.open(file) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or ""
    return text

def retrieve_relevant_articles(text, k=8):
    vec = model.encode([text], convert_to_numpy=True).astype("float32")
    _, indices = index.search(vec, k)
    return [metadatas[i]["text"] for i in indices[0]]

def analyze_with_ollama(text, articles):
    prompt = f"""Analyse cet appel d'offre en te basant sur les articles juridiques.

 APPEL D'OFFRE :
{text[:3000]}

⚖️ ARTICLES PERTINENTS :
{chr(10).join([f"- {art}" for art in articles])}

 ANALYSE :
1. **Conformité** : Oui/Non/Partiellement
2. **Articles violés** : Liste des problèmes
3. **Recommandations** : Suggestions concrètes
"""
    res = ollama.chat(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}]
    )
    return res["message"]["content"]

def ask_question(question, ao_text=None, articles=None):
    prompt = "Tu es un expert juridique.\n\n"
    if ao_text:
        prompt += f"CONTEXTE - Appel d'offre :\n{ao_text[:3000]}\n\n"
    if articles:
        prompt += f"⚖️ ARTICLES :\n{chr(10).join([f'- {art}' for art in articles])}\n\n"
    prompt += f"❓ QUESTION :\n{question}\n\nRéponds de manière claire et précise."

    res = ollama.chat(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}]
    )
    return res["message"]["content"]

# ================================
# ROUTE PRINCIPALE — sert l'interface
# ================================

@app.route("/")
def home():
    """Sert l'interface web"""
    return render_template("index.html")

# ================================
# ROUTES API
# ================================

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "faiss_vectors": index.ntotal,
        "model": LLM_MODEL
    })

@app.route("/analyze-pdf", methods=["POST"])
def analyze_pdf():
    try:
        file = request.files["pdf"]
        text = extract_text_from_pdf(file)

        if not text or len(text) < 50:
            return jsonify({"error": "PDF vide ou illisible"}), 400

        articles = retrieve_relevant_articles(text, k=8)
        analysis = analyze_with_ollama(text, articles)

        return jsonify({
            "analysis": analysis,
            "ao_text": text,
            "articles": articles
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/ask", methods=["POST"])
def ask():
    try:
        data = request.json
        answer = ask_question(
            data["question"],
            data.get("ao_text"),
            data.get("articles")
        )
        return jsonify({"answer": answer})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/stats", methods=["GET"])
def stats():
    return jsonify({
        "total_vectors": index.ntotal,
        "dimension": index.d,
        "total_documents": len(metadatas),
        "embedding_model": EMBEDDING_MODEL,
        "llm_model": LLM_MODEL
    })

# ================================
# LANCEMENT
# ================================

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════╗
║   🏛️  CHATBOT JURIDIQUE - API PRÊTE    ║
╚══════════════════════════════════════════╝

🌐 Interface : http://127.0.0.1:5000
📊 Stats     : http://127.0.0.1:5000/stats
💚 Health    : http://127.0.0.1:5000/health

🚀 Prêt à recevoir des requêtes !
    """)
    app.run(host="127.0.0.1", port=5000, debug=True)