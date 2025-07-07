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
  }

  async loadModel() {
    if (this.isLoading || this.isReady) return;
    
    this.isLoading = true;
    try {
      console.log('Loading StableLM-2-Zephyr-1.6B model...');
      this.notifyModelLoading();
      
      // StableLM Zephyr 1.6B モデルを読み込み（軽量で高性能）
      this.model = await pipeline(
        'text-generation',
        'Xenova/stablelm-2-zephyr-1_6b',
        {
          dtype: 'q4',
          use_cache: true
        }
      );
      
      this.isReady = true;
      this.isLoading = false;
      
      console.log('Model loaded successfully');
      this.notifyModelReady();
      
    } catch (error) {
      console.error('Model loading error:', error);
      this.isLoading = false;
      this.notifyModelError(error.message);
    }
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
    chrome.runtime.sendMessage({
      type: 'MODEL_LOADING'
    });
  }

  notifyModelReady() {
    chrome.runtime.sendMessage({
      type: 'MODEL_READY',
      modelName: this.currentModelName
    });
  }

  notifyModelError(error) {
    chrome.runtime.sendMessage({
      type: 'MODEL_ERROR',
      error: error
    });
  }
}

// グローバルAIモデルインスタンス
const aiModel = new AIModel();

// 拡張機能起動時にモデルを読み込み
chrome.runtime.onStartup.addListener(() => {
  aiModel.loadModel();
});

chrome.runtime.onInstalled.addListener(() => {
  aiModel.loadModel();
});

// メッセージハンドラー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);

  switch (request.type) {
    case 'LOAD_MODEL':
      aiModel.loadModel().then(() => {
        sendResponse({ success: true, ready: aiModel.isReady });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;

    case 'GET_MODEL_STATUS':
      sendResponse({
        isLoading: aiModel.isLoading,
        isReady: aiModel.isReady,
        modelName: aiModel.currentModelName
      });
      return true;

    case 'GENERATE_TEXT':
      if (!aiModel.isReady) {
        sendResponse({ success: false, error: 'Model is not ready' });
        return true;
      }

      aiModel.generateResponse(request.prompt, request.maxTokens || 512)
        .then(response => {
          sendResponse({ success: true, response: response });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'SUMMARIZE_TEXT':
      if (!aiModel.isReady) {
        sendResponse({ success: false, error: 'Model is not ready' });
        return true;
      }

      const summarizePrompt = `以下のテキストを日本語で簡潔に要約してください：

${request.text}

要約:`;

      aiModel.generateResponse(summarizePrompt, 256)
        .then(response => {
          sendResponse({ success: true, response: response });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case 'TRANSLATE_TEXT':
      if (!aiModel.isReady) {
        sendResponse({ success: false, error: 'Model is not ready' });
        return true;
      }

      const translatePrompt = `以下のテキストを自然な日本語に翻訳してください：

${request.text}

日本語翻訳:`;

      aiModel.generateResponse(translatePrompt, 256)
        .then(response => {
          sendResponse({ success: true, response: response });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
      return true;
  }
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