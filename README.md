# 🤖 StableLM AI Assistant Chrome Extension

**ローカル環境で動作するAIアシスタント Chrome拡張機能（ダウンロード進捗表示付き）**

## 🚀 機能

- **📄 ページ要約**: 現在のWebページの内容を日本語で要約
- **🈯 テキスト翻訳**: 選択したテキストを日本語に翻訳
- **💬 チャットボット**: 自由な質問や会話（会話履歴保持）
- **🌐 完全ローカル実行**: サーバー不要、ブラウザ内で動作
- **📊 進捗表示**: モデルダウンロードの視覚的進捗バー

## 🛠️ 使用技術

- **モデル**: StableLM-2-Zephyr-1.6B
- **実行環境**: WebAssembly (Transformers.js)
- **フレームワーク**: Chrome Extension Manifest V3
- **UI**: HTML/CSS/JavaScript

## 📦 インストール方法

### 1. ファイルの取得

**必要なファイル:**
```
StableLM-Chrome-Extension/
├── manifest.json          # 拡張機能設定
├── popup.html             # ポップアップUI
├── popup.css              # UIスタイル
├── popup.js               # ポップアップ制御（ビルド済み）
├── background.js          # バックグラウンドスクリプト（ビルド済み）
├── content.js             # コンテンツスクリプト（ビルド済み）
├── icons/                 # アイコンファイル
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # このファイル
```

### 2. Chrome拡張機能として読み込み

1. Chromeで `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をON
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. 作成した `StableLM-Chrome-Extension` フォルダを選択

### 3. 拡張機能の起動

1. 拡張機能アイコンをクリック
2. 初回起動時、モデルのダウンロード（約800MB）が開始
3. **🆕 進捗バー**でダウンロード状況を確認
4. 「✅ StableLM-2-Zephyr-1.6B 準備完了」が表示されたら使用可能

## 🎯 使用方法

### ページ要約
1. 要約したいページを開く
2. 拡張機能アイコンをクリック
3. 「📄 ページ要約」ボタンをクリック

### テキスト翻訳
1. 翻訳したいテキストを選択
2. 拡張機能アイコンをクリック
3. 「🈯 選択テキスト翻訳」ボタンをクリック

### チャットボット
1. 拡張機能アイコンをクリック
2. 下部のテキストボックスに質問を入力
3. 「送信」ボタンをクリック

### 右クリックメニュー
- テキスト選択後、右クリックで「🤖 AIで要約」「🈯 AIで日本語翻訳」

## 🆕 新機能: ダウンロード進捗表示

### ビジュアル進捗バー
- **リアルタイム進捗**: ダウンロード進行状況を%で表示
- **段階別メッセージ**: 進捗に応じた説明文
- **ファイルサイズ表示**: 約800MBのダウンロード容量を明示

### 進捗段階
1. **0-10%**: モデルダウンロード開始中...
2. **10-50%**: モデルダウンロード中...
3. **50-90%**: ダウンロード完了間近...
4. **90-100%**: モデル初期化中...

## ⚠️ 注意事項

### 初回起動について
- モデルのダウンロードに1-3分かかります
- インターネット接続が必要（初回のみ）
- ダウンロード後はオフラインで動作

### システム要件
- **Chrome**: バージョン 88以降
- **メモリ**: 最低4GB推奨
- **WebAssembly**: 対応ブラウザ

### パフォーマンス
- 初回レスポンスに10-30秒かかることがあります
- モデルのウォームアップ後は高速化します
- 複数タブで同時実行可能

## 🐛 トラブルシューティング

### WebAssemblyエラー
```
❌ エラー: no available backend found. ERR: [wasm] RuntimeError: Aborted(CompileError: WebAssembly.instantiate(): Refused to compile or instantiate WebAssembly module because neither 'wasm-eval' nor 'unsafe-eval' is an allowed source of script in the following Content Security Policy directive: "script-src 'self'")
```
**解決方法**: 
1. **manifest.json確認**: Content Security Policyが正しく設定されていることを確認
2. **拡張機能再読み込み**: chrome://extensions/ で拡張機能を無効化→再有効化
3. **ブラウザ再起動**: Chromeを完全に再起動
4. **フォールバックモデル**: StableLMが失敗した場合、GPT-2モデルが自動的に読み込まれます

### ダウンロード進捗が止まる
```
進捗バーが動かない場合
```
**解決方法**: 
1. インターネット接続を確認
2. 拡張機能を無効化→再有効化
3. ブラウザを再起動
4. キャッシュクリア: chrome://settings/content/all でデータをクリア

### メッセージチャンネルエラー
```
❌ エラー: A listener indicated an asynchronous response...
```
**解決方法**:
1. 拡張機能を再読み込み
2. Chrome Developer Tools でエラー確認
3. 必要に応じてブラウザ再起動

### モデル切り替えについて
- **プライマリ**: StableLM-2-Zephyr-1.6B（高性能）
- **フォールバック**: GPT-2（軽量、互換性重視）
- 自動的にフォールバックモデルに切り替わります

### メモリ不足エラー
```
❌ エラー: Out of memory
```
**解決方法**:
1. 他のタブを閉じる
2. 他の拡張機能を無効化
3. ブラウザを再起動

### 応答が遅い
**解決方法**:
1. 数回使用してモデルをウォームアップ
2. 短いテキストで試行
3. バックグラウンドアプリを終了

## 🔧 技術的改善点

### v1.1での修正
- ✅ **メッセージタイムアウト解決**: 非同期処理の改善
- ✅ **進捗表示追加**: ダウンロード状況の視覚化
- ✅ **エラーハンドリング強化**: より安定した動作
- ✅ **UI/UX改善**: ユーザーフレンドリーな表示

## 📁 ファイル構成

```
/app/
├── manifest.json          # 拡張機能設定
├── popup.html            # ポップアップUI
├── popup.css             # UIスタイル
├── background.js         # バックグラウンドスクリプト
├── popup.js              # ポップアップ制御
├── content.js            # コンテンツスクリプト
├── icons/                # アイコンファイル
└── README.md             # このファイル
```

## 🔄 更新履歴

### v1.1 (2025-01-xx)
- 🆕 ダウンロード進捗表示機能追加
- 🔧 メッセージタイムアウトエラー修正
- 🎨 UI/UX改善
- 🛡️ エラーハンドリング強化

### v1.0 (2025-01-xx)
- 初回リリース
- StableLM-2-Zephyr-1.6B実装
- ページ要約機能
- テキスト翻訳機能
- チャットボット機能
- 会話履歴保持

## 🤝 貢献

バグレポートや機能追加の提案は、お気軽にお知らせください。

## 📄 ライセンス

MIT License

---

**🎉 ローカル環境でAIを活用しましょう！**