// コンテンツスクリプト - Webページと拡張機能の橋渡し
class ContentScript {
  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Content script received message:', request);

      switch (request.type) {
        case 'GET_PAGE_CONTENT':
          this.getPageContent(sendResponse);
          return true;

        case 'GET_SELECTION':
          this.getSelection(sendResponse);
          return true;

        case 'SUMMARIZE':
          this.handleContextMenuSummarize(request.text);
          return true;

        case 'TRANSLATE':
          this.handleContextMenuTranslate(request.text);
          return true;

        default:
          sendResponse({ success: false, error: 'Unknown request type' });
          return true;
      }
    });
  }

  getPageContent(sendResponse) {
    try {
      // ページの主要コンテンツを抽出
      const content = this.extractMainContent();
      sendResponse({ success: true, content: content });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  extractMainContent() {
    // メインコンテンツを抽出する優先順序
    const selectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '.main-content',
      '#content',
      '#main',
      'body'
    ];

    let content = '';
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        content = this.extractTextFromElement(element);
        if (content.length > 100) {
          break;
        }
      }
    }

    // もしコンテンツが短すぎる場合は、body全体から抽出
    if (content.length < 100) {
      content = this.extractTextFromElement(document.body);
    }

    // 長すぎる場合は切り詰める (約2000文字)
    if (content.length > 2000) {
      content = content.substring(0, 2000) + '...';
    }

    return content;
  }

  extractTextFromElement(element) {
    // スクリプトやスタイルタグを除外
    const scripts = element.querySelectorAll('script, style, noscript');
    scripts.forEach(script => script.remove());

    // テキストコンテンツを抽出
    let text = element.innerText || element.textContent || '';
    
    // 複数の空白や改行を整理
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  getSelection(sendResponse) {
    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      sendResponse({ 
        success: true, 
        text: selectedText,
        hasSelection: selectedText.length > 0
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  handleContextMenuSummarize(text) {
    this.showToast('要約を生成中...', 'info');
    
    chrome.runtime.sendMessage({
      type: 'SUMMARIZE_TEXT',
      text: text
    }, (response) => {
      if (response.success) {
        this.showToast('要約完了', 'success');
        this.showResultModal('要約結果', response.response);
      } else {
        this.showToast('要約エラー', 'error');
      }
    });
  }

  handleContextMenuTranslate(text) {
    this.showToast('翻訳中...', 'info');
    
    chrome.runtime.sendMessage({
      type: 'TRANSLATE_TEXT',
      text: text
    }, (response) => {
      if (response.success) {
        this.showToast('翻訳完了', 'success');
        this.showResultModal('翻訳結果', response.response);
      } else {
        this.showToast('翻訳エラー', 'error');
      }
    });
  }

  showToast(message, type = 'info') {
    // 既存のトーストを削除
    const existingToast = document.getElementById('phi4-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'phi4-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
    `;

    // CSS Animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    toast.textContent = message;
    document.body.appendChild(toast);

    // 3秒後に自動削除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }

  showResultModal(title, content) {
    // 既存のモーダルを削除
    const existingModal = document.getElementById('phi4-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'phi4-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 10001;
      display: flex;
      justify-content: center;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 500px;
      max-height: 70vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    modalContent.innerHTML = `
      <h3 style="margin-top: 0; color: #333; font-size: 18px;">${title}</h3>
      <div style="margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; line-height: 1.6; color: #333;">
        ${content}
      </div>
      <button id="phi4-close-modal" style="
        background: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        float: right;
      ">閉じる</button>
      <div style="clear: both;"></div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 閉じるボタンのイベントリスナー
    document.getElementById('phi4-close-modal').addEventListener('click', () => {
      modal.remove();
    });

    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

// コンテンツスクリプト初期化
new ContentScript();