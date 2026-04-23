import json
import faiss
import os
from sentence_transformers import SentenceTransformer
from config import RAG_CONTEXTUAL_JSON, FAISS_INDEX_PATH, METADATAS_PATH, EMBEDDING_MODEL

def main():
    """Construit l'index FAISS"""
    
    # 1. Charger les documents
    if not os.path.exists(RAG_CONTEXTUAL_JSON):
        print(f"❌ Le fichier {RAG_CONTEXTUAL_JSON} n'existe pas!")
        print("   Exécutez d'abord: python extract_contextual.py")
        return
    
    with open(RAG_CONTEXTUAL_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    documents = data.get("documents", [])
    
    if not documents:
        print("❌ Aucun document à indexer!")
        return
    
    print(f"📊 Construction de l'index pour {len(documents)} documents...")
    
    # 2. Charger le modèle
    print(f"   → Chargement du modèle : {EMBEDDING_MODEL}")
    model = SentenceTransformer(EMBEDDING_MODEL)
    
    # 3. Générer les embeddings
    texts = [doc["text"] for doc in documents]
    print("   → Génération des embeddings...")
    embeddings = model.encode(texts, show_progress_bar=True, batch_size=32, convert_to_numpy=True)
    embeddings = embeddings.astype("float32")
    
    # 4. Créer l'index FAISS
    print("   → Construction de l'index FAISS...")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    
    # 5. Sauvegarder l'index
    faiss.write_index(index, FAISS_INDEX_PATH)
    print(f"   ✓ Index sauvegardé : {FAISS_INDEX_PATH}")
    
    # 6. Sauvegarder les métadonnées
    metadatas = []
    for doc in documents:
        metadatas.append({
            "id": doc["id"],
            "source": doc["source"],
            "title": doc["context_title"],
            "text": doc["text"]
        })
    
    with open(METADATAS_PATH, "w", encoding="utf-8") as f:
        json.dump(metadatas, f, ensure_ascii=False, indent=2)
    
    print(f"   ✓ Métadonnées sauvegardées : {METADATAS_PATH}")
    
    # 7. Statistiques
    print(f"\n✅ Index FAISS créé !")
    print(f"   📦 Vecteurs : {index.ntotal}")
    print(f"   📏 Dimension : {dimension}")
    print(f"   💾 Taille : {os.path.getsize(FAISS_INDEX_PATH) / 1024:.2f} KB")

if __name__ == "__main__":
    main()