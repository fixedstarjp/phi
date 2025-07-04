// ポップアップUI制御
class PopupUI {
  constructor() {
    this.chatHistory = [];
    this.isModelReady = false;
    this.initializeElements();
    this.setupEventListeners();
    this.loadChatHistory();
    this.checkModelStatus();
  }

  initializeElements() {
    this.modelStatusEl = document.getElementById('modelStatus');
    this.summarizeBtn = document.getElementById('summarizeBtn');
    this.translateBtn = document.getElementById('translateBtn');
    this.chatHistoryEl = document.getElementById('chatHistory');
    this.messageInput = document.getElementById('messageInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.clearBtn = document.getElementById('clearBtn');
  }

  setupEventListeners() {
    this.summarizeBtn.addEventListener('click', () => this.summarizePage());
    this.translateBtn.addEventListener('click', () => this.translateSelection());
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.clearBtn.addEventListener('click', () => this.clearHistory());
    
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });

    // バックグラウンドからの通知を受信
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'MODEL_READY') {
        this.onModelReady();
      } else if (message.type === 'MODEL_ERROR') {
        this.onModelError(message.error);
      }
    });
  }

  async checkModelStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_MODEL_STATUS' });
      
      if (response.isLoading) {
        this.updateStatus('loading', 'モデル読み込み中...');
      } else if (response.isReady) {
        this.onModelReady();
      } else {
        this.updateStatus('loading', 'モデルを初期化中...');
        await chrome.runtime.sendMessage({ type: 'LOAD_MODEL' });
      }
    } catch (error) {
      this.onModelError(error.message);
    }
  }

  onModelReady() {
    this.isModelReady = true;
    this.updateStatus('ready', '✅ モデル準備完了');
    this.enableUI();
  }

  onModelError(error) {
    this.isModelReady = false;
    this.updateStatus('error', `❌ エラー: ${error}`);
    this.disableUI();
  }

  updateStatus(status, message) {
    this.modelStatusEl.textContent = message;
    this.modelStatusEl.className = `status-${status}`;
  }

  enableUI() {
    this.summarizeBtn.disabled = false;
    this.translateBtn.disabled = false;
    this.messageInput.disabled = false;
    this.sendBtn.disabled = false;
  }

  disableUI() {
    this.summarizeBtn.disabled = true;
    this.translateBtn.disabled = true;
    this.messageInput.disabled = true;
    this.sendBtn.disabled = true;
  }

  async summarizePage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
      
      if (response.success) {
        this.addMessage('user', 'ページの要約をお願いします');
        this.addMessage('ai', 'ページを要約中...', true);
        
        const aiResponse = await chrome.runtime.sendMessage({
          type: 'SUMMARIZE_TEXT',
          text: response.content
        });
        
        this.updateLastMessage(aiResponse.success ? aiResponse.response : `エラー: ${aiResponse.error}`);
      }
    } catch (error) {
      this.addMessage('ai', `エラーが発生しました: ${error.message}`);
    }
  }

  async translateSelection() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
      
      if (response.success && response.text) {
        this.addMessage('user', `「${response.text}」を日本語に翻訳してください`);
        this.addMessage('ai', '翻訳中...', true);
        
        const aiResponse = await chrome.runtime.sendMessage({
          type: 'TRANSLATE_TEXT',
          text: response.text
        });
        
        this.updateLastMessage(aiResponse.success ? aiResponse.response : `エラー: ${aiResponse.error}`);
      } else {
        this.addMessage('ai', 'テキストが選択されていません');
      }
    } catch (error) {
      this.addMessage('ai', `エラーが発生しました: ${error.message}`);
    }
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    this.messageInput.value = '';
    this.addMessage('user', message);
    this.addMessage('ai', '考え中...', true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_TEXT',
        prompt: `Human: ${message}\nAssistant:`,
        maxTokens: 512
      });

      this.updateLastMessage(response.success ? response.response : `エラー: ${response.error}`);
    } catch (error) {
      this.updateLastMessage(`エラーが発生しました: ${error.message}`);
    }
  }

  addMessage(sender, content, isLoading = false) {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}-message`;
    
    if (isLoading) {
      messageEl.innerHTML = `${content} <span class="loading"></span>`;
    } else {
      messageEl.textContent = content;
    }
    
    this.chatHistoryEl.appendChild(messageEl);
    this.chatHistoryEl.scrollTop = this.chatHistoryEl.scrollHeight;
    
    // メッセージを履歴に追加
    this.chatHistory.push({ sender, content, timestamp: Date.now() });
    this.saveChatHistory();
  }

  updateLastMessage(content) {
    const lastMessage = this.chatHistoryEl.lastElementChild;
    if (lastMessage) {
      lastMessage.textContent = content;
      
      // 履歴も更新
      if (this.chatHistory.length > 0) {
        this.chatHistory[this.chatHistory.length - 1].content = content;
        this.saveChatHistory();
      }
    }
  }

  clearHistory() {
    this.chatHistory = [];
    this.chatHistoryEl.innerHTML = '';
    this.saveChatHistory();
  }

  saveChatHistory() {
    chrome.storage.local.set({ chatHistory: this.chatHistory });
  }

  loadChatHistory() {
    chrome.storage.local.get('chatHistory', (data) => {
      if (data.chatHistory) {
        this.chatHistory = data.chatHistory;
        this.renderChatHistory();
      }
    });
  }

  renderChatHistory() {
    this.chatHistoryEl.innerHTML = '';
    this.chatHistory.forEach(msg => {
      const messageEl = document.createElement('div');
      messageEl.className = `message ${msg.sender}-message`;
      messageEl.textContent = msg.content;
      this.chatHistoryEl.appendChild(messageEl);
    });
    this.chatHistoryEl.scrollTop = this.chatHistoryEl.scrollHeight;
  }
}

// DOMが読み込まれたらUI初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
});