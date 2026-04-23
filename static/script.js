// ================================
// STATE
// ================================
let aoText = null;
let articles = null;
let messageCount = 0;

// Plus besoin de API_URL — le frontend et le backend
// tournent sur le même serveur (http://127.0.0.1:5000)
// Les fetch utilisent des chemins relatifs : '/analyze-pdf', '/ask'

// ================================
// DOM REFS
// ================================
const chatContainer = document.getElementById('chatContainer');
const messageInput  = document.getElementById('messageInput');
const sendBtn       = document.getElementById('sendBtn');
const emptyState    = document.getElementById('emptyState');
const sidebarStatus = document.getElementById('sidebarStatus');
const sidebarDoc    = document.getElementById('sidebarDoc');
const docName       = document.getElementById('docName');
const docMeta       = document.getElementById('docMeta');
const topbarSub     = document.getElementById('topbarSub');
const sidebarStats  = document.getElementById('sidebarStats');
const articlesCount = document.getElementById('articlesCount');
const messagesCount = document.getElementById('messagesCount');
const articlesPanel = document.getElementById('articlesPanel');
const articlesList  = document.getElementById('articlesList');
const quickActions  = document.getElementById('quickActions');
const navArticles   = document.getElementById('navArticles');
const navClear      = document.getElementById('navClear');
const themeToggle   = document.getElementById('themeToggle');

// ================================
// INIT
// ================================
document.addEventListener('DOMContentLoaded', function () {
  loadHistory();
  setupEventListeners();
});

function setupEventListeners() {
  // Textarea auto-resize
  messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 180) + 'px';
    updateSendButton();
  });

  messageInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled && this.value.trim()) sendMessage();
    }
  });

  // Quick actions
  document.querySelectorAll('.quick-action').forEach(btn => {
    btn.addEventListener('click', handleQuickAction);
  });

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Nav buttons
  if (navClear) {
    navClear.addEventListener('click', resetConversation);
  }

  if (navArticles) {
    navArticles.addEventListener('click', toggleArticlesPanel);
  }
}

// ================================
// QUICK ACTIONS
// ================================
function handleQuickAction(e) {
  const action = e.target.dataset.action;
  
  switch(action) {
    case 'analyze':
      messageInput.value = 'Analyse complètement ce document et identifie tous les problèmes de conformité.';
      break;
    case 'conformity':
      messageInput.value = 'Quels sont les articles juridiques applicables à ce document? Est-il conforme?';
      break;
    case 'articles':
      toggleArticlesPanel();
      return;
  }
  
  messageInput.focus();
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 180) + 'px';
  updateSendButton();
}

// ================================
// ARTICLES PANEL
// ================================
function toggleArticlesPanel() {
  if (articlesPanel.style.display === 'none') {
    articlesPanel.style.display = 'flex';
  } else {
    articlesPanel.style.display = 'none';
  }
}

function closeArticlesPanel() {
  articlesPanel.style.display = 'none';
}

function displayArticles(articlesList_data) {
  if (!articlesList_data || articlesList_data.length === 0) {
    articlesList.innerHTML = '<div class="articles-placeholder">Aucun article identifié</div>';
    return;
  }
  
  articlesList.innerHTML = '';
  articlesList_data.forEach((article, idx) => {
    const item = document.createElement('div');
    item.className = 'article-item';
    item.innerHTML = `
      <div class="article-item-header">Article ${idx + 1}</div>
      <div class="article-item-text">${article}</div>
    `;
    articlesList.appendChild(item);
  });
}

// ================================
// THEME TOGGLE
// ================================
function toggleTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  if (isDark) {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
    themeToggle.textContent = '🌙';
  } else {
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
    themeToggle.textContent = '☀️';
  }
}

// ================================
// HISTORY & RESET
// ================================
function saveHistory() {
  const messages = Array.from(document.querySelectorAll('.message')).map(msg => {
    const role = msg.classList.contains('user-message') ? 'user' : 'assistant';
    const text = msg.querySelector('.message-bubble')?.textContent || '';
    return { role, text };
  });
  localStorage.setItem('chatHistory', JSON.stringify({ messages, aoText, articles, messageCount }));
}

function loadHistory() {
  const saved = localStorage.getItem('chatHistory');
  if (saved) {
    try {
      const { messages, aoText: savedAoText, articles: savedArticles, messageCount: savedCount } = JSON.parse(saved);
      aoText = savedAoText;
      articles = savedArticles;
      messageCount = savedCount;
      
      if (messages && messages.length > 0) {
        removeEmptyState();
        messages.forEach(msg => addMessage(msg.role, msg.text));
        
        if (aoText) {
          messageInput.disabled = false;
          messageInput.placeholder = 'Posez votre question sur ce document…';
          showDoc('Document chargé', `${articles?.length ?? 0} articles`);
          quickActions.style.display = 'flex';
          navArticles.style.display = 'flex';
          navClear.style.display = 'flex';
          sidebarStats.style.display = 'flex';
          updateStats();
        }
      }
    } catch (e) {
      console.error('Erreur lors du chargement de l\'historique:', e);
    }
  }
  
  const theme = localStorage.getItem('theme') || 'light';
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
  }
}

function resetConversation() {
  if (confirm('Êtes-vous sûr de vouloir réinitialiser la conversation?')) {
    aoText = null;
    articles = null;
    messageCount = 0;
    chatContainer.innerHTML = '';
    chatContainer.appendChild(emptyState);
    messageInput.disabled = true;
    messageInput.value = '';
    messageInput.placeholder = 'Posez votre question juridique…';
    messageInput.style.height = 'auto';
    updateSendButton();
    sidebarDoc.style.display = 'none';
    sidebarStatus.style.display = 'flex';
    setStatus('idle', 'En attente');
    quickActions.style.display = 'none';
    navArticles.style.display = 'none';
    navClear.style.display = 'none';
    sidebarStats.style.display = 'none';
    articlesPanel.style.display = 'none';
    localStorage.removeItem('chatHistory');
  }
}

// ================================
// FILE UPLOAD  →  /analyze-pdf
// ================================
document.getElementById('pdfFile').addEventListener('change', async function (e) {
  const file = e.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    addMessage('assistant', '❌ Veuillez sélectionner un fichier PDF valide.');
    return;
  }

  setStatus('loading', 'Analyse en cours…');
  removeEmptyState();
  addMessage('user', `Document importé : ${file.name}`);
  const thinkingId = addThinking();

  try {
    const formData = new FormData();
    formData.append('pdf', file);

    // Chemin relatif — fonctionne car Flask sert tout depuis /
    const res = await fetch('/analyze-pdf', {
      method: 'POST',
      body: formData
    });

    removeThinking(thinkingId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erreur HTTP ${res.status}`);
    }

    const data = await res.json();
    aoText   = data.ao_text;
    articles = data.articles;
    messageCount = 2; // Document importé + analyse assistant

    setStatus('ready', 'Document analysé');
    showDoc(file.name, `${articles?.length ?? 0} articles identifiés`);
    updateTopbar(`${file.name} · prêt pour les questions`);

    const response = data.analysis
      ? `Document analysé avec succès !\n\n${data.analysis}`
      : 'Document analysé avec succès ! Posez vos questions.';
    addMessage('assistant', response);

    messageInput.disabled = false;
    messageInput.placeholder = 'Posez votre question sur ce document…';
    messageInput.focus();
    updateSendButton();
    
    // Afficher articles, quick actions et stats
    displayArticles(articles);
    articlesPanel.style.display = 'flex';
    quickActions.style.display = 'flex';
    navArticles.style.display = 'flex';
    navClear.style.display = 'flex';
    sidebarStats.style.display = 'flex';
    updateStats();

  } catch (error) {
    removeThinking(thinkingId);
    setStatus('error', "Erreur d'analyse");
    addMessage('assistant', `Erreur lors de l'analyse : ${error.message}`);
  }

  e.target.value = '';
  saveHistory();
});

// ================================
// SEND MESSAGE  →  /ask
// ================================
async function sendMessage() {
  const question = messageInput.value.trim();
  if (!question) return;

  addMessage('user', question);
  messageInput.value = '';
  messageInput.style.height = 'auto';
  updateSendButton();
  messageCount++;

  const thinkingId = addThinking();

  try {
    // Chemin relatif — même origine
    const res = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, ao_text: aoText, articles })
    });

    removeThinking(thinkingId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erreur HTTP ${res.status}`);
    }

    const data = await res.json();
    addMessage('assistant', data.answer);
    messageCount++;

  } catch (error) {
    removeThinking(thinkingId);
    addMessage('assistant', `Erreur : ${error.message}`);
  }

  updateStats();
  saveHistory();
  messageInput.focus();
}

// ================================
// DOM HELPERS
// ================================
function addMessage(role, text) {
  removeEmptyState();

  const msg = document.createElement('div');
  msg.className = `message ${role}-message`;

  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${role}-avatar`;
  avatar.textContent = role === 'user' ? '👤' : '⚖️';

  const content = document.createElement('div');
  content.className = 'message-content';

  const header = document.createElement('div');
  header.className = 'message-header';
  header.textContent = role === 'user' ? 'Vous' : 'Assistant';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  content.appendChild(header);
  content.appendChild(bubble);
  msg.appendChild(avatar);
  msg.appendChild(content);
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addThinking() {
  const id = 'thinking-' + Date.now();
  const msg = document.createElement('div');
  msg.className = 'message assistant-message';
  msg.id = id;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar assistant-avatar';
  avatar.textContent = '⚖️';

  const content = document.createElement('div');
  content.className = 'message-content';

  const header = document.createElement('div');
  header.className = 'message-header';
  header.textContent = 'Assistant';

  const bubble = document.createElement('div');
  bubble.className = 'thinking-bubble';
  bubble.innerHTML = '<div class="thinking-dot"></div><div class="thinking-dot"></div><div class="thinking-dot"></div>';

  content.appendChild(header);
  content.appendChild(bubble);
  msg.appendChild(avatar);
  msg.appendChild(content);
  chatContainer.appendChild(msg);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  return id;
}

function removeThinking(id) {
  document.getElementById(id)?.remove();
}

function removeEmptyState() {
  emptyState?.parentNode && emptyState.remove();
}

function updateSendButton() {
  sendBtn.disabled = !messageInput.value.trim() || messageInput.disabled;
}

function setStatus(state, label) {
  const dot  = sidebarStatus.querySelector('.status-dot');
  const span = sidebarStatus.querySelector('span');
  dot.className = `status-dot ${state}`;
  span.textContent = label;
}

function showDoc(name, meta) {
  sidebarDoc.style.display = 'flex';
  docName.textContent = name;
  docMeta.textContent = meta;
  sidebarStatus.style.display = 'none';
}

function updateTopbar(text) {
  if (topbarSub) topbarSub.textContent = text;
}

function updateStats() {
  if (articlesCount) articlesCount.textContent = articles?.length ?? 0;
  if (messagesCount) messagesCount.textContent = messageCount;
}