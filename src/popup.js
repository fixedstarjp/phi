// ポップアップUI制御
class PopupUI {
  constructor() {
    this.chatHistory = [];
    this.isModelReady = false;
    this.modelName = 'StableLM-2-Zephyr-1.6B';
    this.downloadProgress = 0;
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
    
    // 進捗バーを作成
    this.createProgressBar();
  }

  createProgressBar() {
    // 進捗バーのHTML要素を作成
    const progressContainer = document.createElement('div');
    progressContainer.id = 'progressContainer';
    progressContainer.style.cssText = `
      display: none;
      margin: 10px 0;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 8px;
    `;

    const progressLabel = document.createElement('div');
    progressLabel.id = 'progressLabel';
    progressLabel.style.cssText = `
      color: white;
      font-size: 12px;
      margin-bottom: 5px;
      text-align: center;
    `;
    progressLabel.textContent = 'モデルダウンロード中...';

    const progressBarContainer = document.createElement('div');
    progressBarContainer.style.cssText = `
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      height: 6px;
      overflow: hidden;
    `;

    const progressBar = document.createElement('div');
    progressBar.id = 'progressBar';
    progressBar.style.cssText = `
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      height: 100%;
      width: 0%;
      border-radius: 4px;
      transition: width 0.3s ease;
      box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
    `;

    const progressText = document.createElement('div');
    progressText.id = 'progressText';
    progressText.style.cssText = `
      color: white;
      font-size: 11px;
      text-align: center;
      margin-top: 5px;
    `;
    progressText.textContent = '0%';

    progressBarContainer.appendChild(progressBar);
    progressContainer.appendChild(progressLabel);
    progressContainer.appendChild(progressBarContainer);
    progressContainer.appendChild(progressText);

    // ヘッダーの後に挿入
    const header = document.querySelector('.header');
    header.appendChild(progressContainer);

    this.progressContainer = progressContainer;
    this.progressBar = progressBar;
    this.progressText = progressText;
    this.progressLabel = progressLabel;
  }

  setupEventListeners() {
    this.summarizeBtn.addEventListener('click', () => this.summarizePage());
    this.translateBtn.addEventListener('click', () => this.translateSelection());
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.clearBtn.addEventListener('click', () => this.clearHistory());
    
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // バックグラウンドからの通知を受信
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'MODEL_LOADING') {
        this.onModelLoading();
      } else if (message.type === 'MODEL_READY') {
        this.onModelReady(message.modelName);
      } else if (message.type === 'MODEL_ERROR') {
        this.onModelError(message.error);
      } else if (message.type === 'DOWNLOAD_PROGRESS') {
        this.updateDownloadProgress(message.progress);
      }
    });
  }

  async checkModelStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_MODEL_STATUS' });
      
      if (response.isLoading) {
        this.onModelLoading();
        if (response.progress) {
          this.updateDownloadProgress(response.progress);
        }
      } else if (response.isReady) {
        this.onModelReady(response.modelName);
      } else {
        this.updateStatus('loading', '🔄 モデルを初期化中...');
        await chrome.runtime.sendMessage({ type: 'LOAD_MODEL' });
      }
    } catch (error) {
      this.onModelError(error.message);
    }
  }

  onModelLoading() {
    this.isModelReady = false;
    this.updateStatus('loading', '⏳ StableLM-2-Zephyr-1.6B ダウンロード中...');
    this.showProgressBar();
    this.disableUI();
  }

  onModelReady(modelName) {
    this.isModelReady = true;
    this.modelName = modelName || 'StableLM-2-Zephyr-1.6B';
    this.updateStatus('ready', `✅ ${this.modelName} 準備完了`);
    this.hideProgressBar();
    this.enableUI();
    
    // 初回起動時のウェルカムメッセージ
    if (this.chatHistory.length === 0) {
      this.addMessage('ai', `こんにちは！${this.modelName}モデルの準備が完了しました。\n\n以下の機能が利用できます：\n• 📄 ページ要約\n• 🈯 選択テキスト翻訳\n• 💬 自由な質問や会話\n\n何かお手伝いできることはありますか？`);
    }
  }

  onModelError(error) {
    this.isModelReady = false;
    this.updateStatus('error', `❌ エラー: ${error}`);
    this.hideProgressBar();
    this.disableUI();
    this.addMessage('ai', `申し訳ございません。モデルの読み込みでエラーが発生しました：\n${error}\n\n拡張機能を再起動してお試しください。`);
  }

  updateDownloadProgress(progress) {
    this.downloadProgress = progress;
    if (this.progressBar && this.progressText) {
      this.progressBar.style.width = `${progress}%`;
      this.progressText.textContent = `${progress}% (約800MB)`;
      
      // 進捗に応じてラベルを更新
      if (progress < 10) {
        this.progressLabel.textContent = 'モデルダウンロード開始中...';
      } else if (progress < 50) {
        this.progressLabel.textContent = 'モデルダウンロード中...';
      } else if (progress < 90) {
        this.progressLabel.textContent = 'ダウンロード完了間近...';
      } else if (progress < 100) {
        this.progressLabel.textContent = 'モデル初期化中...';
      }
    }
  }

  showProgressBar() {
    if (this.progressContainer) {
      this.progressContainer.style.display = 'block';
    }
  }

  hideProgressBar() {
    if (this.progressContainer) {
      this.progressContainer.style.display = 'none';
    }
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
    this.messageInput.placeholder = 'メッセージを入力...';
  }

  disableUI() {
    this.summarizeBtn.disabled = true;
    this.translateBtn.disabled = true;
    this.messageInput.disabled = true;
    this.sendBtn.disabled = true;
    this.messageInput.placeholder = 'モデル読み込み中...';
  }

  async summarizePage() {
    if (!this.isModelReady) {
      this.addMessage('ai', 'モデルの準備ができていません。しばらくお待ちください。');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.addMessage('user', '📄 このページを要約してください');
      this.addMessage('ai', '📄 ページ内容を取得して要約中...', true);
      
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
      
      if (response.success) {
        const aiResponse = await chrome.runtime.sendMessage({
          type: 'SUMMARIZE_TEXT',
          text: response.content
        });
        
        this.updateLastMessage(aiResponse.success ? 
          `**ページ要約:**\n\n${aiResponse.response}` : 
          `エラーが発生しました: ${aiResponse.error}`);
      } else {
        this.updateLastMessage('ページ内容の取得に失敗しました。');
      }
    } catch (error) {
      this.updateLastMessage(`エラーが発生しました: ${error.message}`);
    }
  }

  async translateSelection() {
    if (!this.isModelReady) {
      this.addMessage('ai', 'モデルの準備ができていません。しばらくお待ちください。');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
      
      if (response.success && response.text) {
        this.addMessage('user', `🈯 「${response.text}」を日本語に翻訳してください`);
        this.addMessage('ai', '🈯 翻訳中...', true);
        
        const aiResponse = await chrome.runtime.sendMessage({
          type: 'TRANSLATE_TEXT',
          text: response.text
        });
        
        this.updateLastMessage(aiResponse.success ? 
          `**翻訳結果:**\n\n${aiResponse.response}` : 
          `エラーが発生しました: ${aiResponse.error}`);
      } else {
        this.addMessage('ai', '翻訳するテキストを選択してください。');
      }
    } catch (error) {
      this.addMessage('ai', `エラーが発生しました: ${error.message}`);
    }
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    if (!this.isModelReady) {
      this.addMessage('ai', 'モデルの準備ができていません。しばらくお待ちください。');
      return;
    }

    this.messageInput.value = '';
    this.addMessage('user', message);
    this.addMessage('ai', '🤔 考え中...', true);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_TEXT',
        prompt: message,
        maxTokens: 512
      });

      this.updateLastMessage(response.success ? 
        response.response : 
        `エラーが発生しました: ${response.error}`);
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
      // マークダウンライクなフォーマットを簡単に処理
      const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      messageEl.innerHTML = formattedContent;
    }
    
    this.chatHistoryEl.appendChild(messageEl);
    this.chatHistoryEl.scrollTop = this.chatHistoryEl.scrollHeight;
    
    // メッセージを履歴に追加
    if (!isLoading) {
      this.chatHistory.push({ sender, content, timestamp: Date.now() });
      this.saveChatHistory();
    }
  }

  updateLastMessage(content) {
    const lastMessage = this.chatHistoryEl.lastElementChild;
    if (lastMessage) {
      const formattedContent = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      lastMessage.innerHTML = formattedContent;
      
      // 履歴も更新
      if (this.chatHistory.length > 0) {
        this.chatHistory[this.chatHistory.length - 1].content = content;
      } else {
        this.chatHistory.push({ sender: 'ai', content, timestamp: Date.now() });
      }
      this.saveChatHistory();
    }
  }

  clearHistory() {
    if (confirm('会話履歴を削除しますか？')) {
      this.chatHistory = [];
      this.chatHistoryEl.innerHTML = '';
      this.saveChatHistory();
      this.addMessage('ai', '会話履歴をクリアしました。新しい会話を開始できます！');
    }
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
      const formattedContent = msg.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      messageEl.innerHTML = formattedContent;
      this.chatHistoryEl.appendChild(messageEl);
    });
    this.chatHistoryEl.scrollTop = this.chatHistoryEl.scrollHeight;
  }
}

// DOMが読み込まれたらUI初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
});