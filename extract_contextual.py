import os
import pdfplumber
import json
import re
from config import DECRETS_DIR, RAG_CONTEXTUAL_JSON, TITLE_PATTERNS

def is_title(line):
    """Vérifie si une ligne est un titre"""
    for pattern in TITLE_PATTERNS:
        if re.match(pattern, line.strip(), re.IGNORECASE):
            return True
    return False

def clean_text(text):
    """Nettoie le texte"""
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def extract_text_from_pdf(pdf_path):
    """Extrait le texte d'un PDF"""
    raw_text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    raw_text += page_text + "\n"
    except Exception as e:
        print(f"❌ Erreur : {e}")
    return raw_text

def create_context_blocks(text):
    """Crée des blocs contextuels"""
    lines = text.split("\n")
    context_blocks = []
    current_block_title = None
    current_block_text = ""
    
    for line in lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        
        if is_title(line_clean):
            if current_block_text:
                context_blocks.append({
                    "title": current_block_title,
                    "text": clean_text(current_block_text)
                })
            current_block_title = line_clean
            current_block_text = ""
        else:
            current_block_text += " " + line_clean
    
    if current_block_text:
        context_blocks.append({
            "title": current_block_title,
            "text": clean_text(current_block_text)
        })
    
    return context_blocks

def main():
    """Traite tous les PDFs"""
    if not os.path.exists(DECRETS_DIR):
        print(f"❌ Le dossier {DECRETS_DIR} n'existe pas!")
        return
    
    pdf_files = [f for f in os.listdir(DECRETS_DIR) if f.lower().endswith(".pdf")]
    
    if not pdf_files:
        print(f"❌ Aucun PDF trouvé dans {DECRETS_DIR}")
        return
    
    print(f"📂 Traitement de {len(pdf_files)} PDFs...")
    
    documents = []
    doc_counter = 0
    
    for filename in pdf_files:
        pdf_path = os.path.join(DECRETS_DIR, filename)
        print(f"  → {filename}")
        
        raw_text = extract_text_from_pdf(pdf_path)
        if not raw_text:
            continue
        
        context_blocks = create_context_blocks(raw_text)
        
        for i, block in enumerate(context_blocks):
            chunk_id = f"doc_{doc_counter:04d}_context_{i:03d}"
            documents.append({
                "id": chunk_id,
                "source": filename,
                "context_title": block["title"] or "no_title",
                "text": block["text"]
            })
        
        doc_counter += 1
        print(f"    ✓ {len(context_blocks)} blocs extraits")
    
    output_data = {
        "total_documents": len(documents),
        "total_pdfs": doc_counter,
        "documents": documents
    }
    
    with open(RAG_CONTEXTUAL_JSON, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Extraction terminée !")
    print(f"   📄 {doc_counter} PDFs traités")
    print(f"   📦 {len(documents)} chunks créés")
    print(f"   💾 Fichier : {RAG_CONTEXTUAL_JSON}")

if __name__ == "__main__":
    main()