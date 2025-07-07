import { pipeline, env } from '@xenova/transformers';

// WebAssemblyとWebGPUを使用するための設定
env.allowLocalModels = true;
env.useBrowserCache = true;

class AIModel {
  constructor() {
    this.model = null;
    this.isLoading = false;
    this.isReady = false;
    this.currentModelName = 'StableLM-2-Zephyr-1.6B';
    this.downloadProgress = 0;
  }

  async loadModel() {
    if (this.isLoading || this.isReady) return;
    
    this.isLoading = true;
    this.downloadProgress = 0;
    
    try {
      console.log('Loading StableLM-2-Zephyr-1.6B model...');
      this.notifyModelLoading();
      
      // StableLM Zephyr 1.6B モデルを読み込み（軽量で高性能）
      this.model = await pipeline(
        'text-generation',
        'Xenova/stablelm-2-zephyr-1_6b',
        {
          dtype: 'q4',
          use_cache: true,
          progress_callback: (progress) => {
            this.handleDownloadProgress(progress);
          }
        }
      );
      
      this.isReady = true;
      this.isLoading = false;
      this.downloadProgress = 100;
      
      console.log('Model loaded successfully');
      this.notifyModelReady();
      
    } catch (error) {
      console.error('Model loading error:', error);
      this.isLoading = false;
      this.downloadProgress = 0;
      this.notifyModelError(error.message);
    }
  }

  handleDownloadProgress(progress) {
    // 進捗情報を処理
    if (progress && progress.progress !== undefined) {
      this.downloadProgress = Math.round(progress.progress * 100);
    } else if (progress && progress.loaded && progress.total) {
      this.downloadProgress = Math.round((progress.loaded / progress.total) * 100);
    }
    
    // 進捗を通知
    this.notifyDownloadProgress();
  }

  async generateResponse(prompt, maxTokens = 512) {
    if (!this.isReady) {
      throw new Error('Model is not ready');
    }

    try {
      // StableLM用のプロンプト形式に調整
      const formattedPrompt = `<|user|>\n${prompt}\n<|assistant|>\n`;
      
      const response = await this.model(formattedPrompt, {
        max_new_tokens: maxTokens,
        do_sample: true,
        temperature: 0.7,
        top_p: 0.9,
        repetition_penalty: 1.1,
        return_full_text: false
      });

      return response[0].generated_text;
    } catch (error) {
      console.error('Generation error:', error);
      throw error;
    }
  }

  notifyModelLoading() {
    // すべてのタブに通知（タイムアウト回避）
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'MODEL_LOADING'
        }).catch(() => {
          // エラーを無視（タブがアクティブでない場合）
        });
      });
    });
  }

  notifyDownloadProgress() {
    // 進捗を通知
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'DOWNLOAD_PROGRESS',
          progress: this.downloadProgress
        }).catch(() => {
          // エラーを無視
        });
      });
    });
  }

  notifyModelReady() {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'MODEL_READY',
          modelName: this.currentModelName
        }).catch(() => {
          // エラーを無視
        });
      });
    });
  }

  notifyModelError(error) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'MODEL_ERROR',
          error: error
        }).catch(() => {
          // エラーを無視
        });
      });
    });
  }
}

// グローバルAIモデルインスタンス
const aiModel = new AIModel();

// 拡張機能起動時にモデルを読み込み
chrome.runtime.onStartup.addListener(() => {
  // 遅延実行でタイムアウト回避
  setTimeout(() => {
    aiModel.loadModel();
  }, 1000);
});

chrome.runtime.onInstalled.addListener(() => {
  // 遅延実行でタイムアウト回避
  setTimeout(() => {
    aiModel.loadModel();
  }, 1000);
});

// メッセージハンドラー（改善版）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  // 即座にtrueを返してメッセージチャンネルを保持
  const handleAsync = async () => {
    try {
      switch (request.type) {
        case 'LOAD_MODEL':
          if (!aiModel.isLoading && !aiModel.isReady) {
            aiModel.loadModel();
          }
          sendResponse({ 
            success: true, 
            ready: aiModel.isReady,
            loading: aiModel.isLoading,
            progress: aiModel.downloadProgress
          });
          break;

        case 'GET_MODEL_STATUS':
          sendResponse({
            isLoading: aiModel.isLoading,
            isReady: aiModel.isReady,
            modelName: aiModel.currentModelName,
            progress: aiModel.downloadProgress
          });
          break;

        case 'GENERATE_TEXT':
          if (!aiModel.isReady) {
            sendResponse({ success: false, error: 'Model is not ready' });
            break;
          }

          try {
            const response = await aiModel.generateResponse(request.prompt, request.maxTokens || 512);
            sendResponse({ success: true, response: response });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'SUMMARIZE_TEXT':
          if (!aiModel.isReady) {
            sendResponse({ success: false, error: 'Model is not ready' });
            break;
          }

          const summarizePrompt = `以下のテキストを日本語で簡潔に要約してください：

${request.text}

要約:`;

          try {
            const response = await aiModel.generateResponse(summarizePrompt, 256);
            sendResponse({ success: true, response: response });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'TRANSLATE_TEXT':
          if (!aiModel.isReady) {
            sendResponse({ success: false, error: 'Model is not ready' });
            break;
          }

          const translatePrompt = `以下のテキストを自然な日本語に翻訳してください：

${request.text}

日本語翻訳:`;

          try {
            const response = await aiModel.generateResponse(translatePrompt, 256);
            sendResponse({ success: true, response: response });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
          break;
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  };

  // 非同期処理を実行
  handleAsync();
  return true; // 非同期レスポンスを示す
});

// コンテキストメニューの設定
chrome.contextMenus.create({
  id: "summarize",
  title: "🤖 AIで要約",
  contexts: ["selection"]
});

chrome.contextMenus.create({
  id: "translate",
  title: "🈯 AIで日本語翻訳",
  contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize" || info.menuItemId === "translate") {
    chrome.tabs.sendMessage(tab.id, {
      type: info.menuItemId.toUpperCase(),
      text: info.selectionText
    });
  }
});