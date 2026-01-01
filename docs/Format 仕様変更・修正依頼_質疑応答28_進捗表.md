# 仕様変更・修正依頼 質疑応答28 進捗管理表

---

## P134: 高速再起動ボタン（VRAM完全解放）（✅ 実装完了）

| 項目 | 内容 |
|------|------|
| ①タイトル | サイドバーに高速再起動ボタン追加 |
| ②背景 | 1.1GB CUDAコンテキストメモリはプロセス終了以外で解放不可 |
| ③要件① | サイドバーに「高速再起動」ボタンを追加 |
| ③要件② | 押下時にVue状態をlocalStorageに保存 |
| ③要件③ | アプリ再起動後に状態を復元 |
| ③要件④ | 自動実行は無し（ボタン押下のみ） |
| ④実装内容① | `Sidebar.vue` - 高速再起動ボタン追加、`fastRestart()`関数追加 |
| ④実装内容② | `App.vue` - `restoreStateAfterRestart()`で状態復元 |
| ④実装内容③ | `@tauri-apps/plugin-process`の`relaunch()`でアプリ再起動 |
| ④実装内容④ | 4言語ロケール追加（ja/en/zh/ko） |
| ⑤修正ファイル | `Sidebar.vue`, `App.vue`, `ja.ts`, `en.ts`, `zh.ts`, `ko.ts` |
| ⑤完了 | [x] 調査完了 [x] 実装完了 [ ] ユーザー確認 |

### P134 実装詳細

**状態保存（Sidebar.vue）:**
```typescript
async function fastRestart() {
  const appState = {
    currentRoute: router.currentRoute.value.path,
    settings: settingsStore.settings,
    timestamp: Date.now()
  }
  localStorage.setItem('terunslator_restart_state', JSON.stringify(appState))
  await relaunch()  // @tauri-apps/plugin-process
}
```

**状態復元（App.vue）:**
```typescript
function restoreStateAfterRestart() {
  const savedState = localStorage.getItem('terunslator_restart_state')
  if (savedState) {
    const state = JSON.parse(savedState)
    if (Date.now() - state.timestamp < 30000) {  // 30秒以内
      router.push(state.currentRoute)
    }
    localStorage.removeItem('terunslator_restart_state')
  }
}
```

---

## P135: OCR言語切り替えバグ修正 + 言語別自動選択（✅ 実装完了）

| 項目 | 内容 |
|------|------|
| ①タイトル | PaddleOCR/EasyOCRの言語切り替え問題 + 日中選択UI |
| ②現象① | PaddleOCR/CPUが日本語「ドキュメント翻訳」で空文字列を返す |
| ②現象② | EasyOCRの日本語精度が非常に低い |
| ②現象③ | 中国語・韓国語がPaddleOCR/EasyOCRで認識されない |
| ③根本原因① | PaddleOCR 3.3.2が`OCRResult`クラス（dict風オブジェクト）を返すが、`isinstance(dict)`でFalseになり旧フォーマット処理に入る |
| ③根本原因② | OCRインスタンスが一度初期化されると、別の言語でも最初の言語のまま |
| ③根本原因③ | EasyOCRの言語コード「zh」が「ch_sim」にマッピングされていない |
| ④対応内容① | PaddleOCR 3.3.2新フォーマット対応（`hasattr(first_result, 'rec_texts')`で検出、属性アクセスで値取得） |
| ④対応内容② | 言語追跡変数の追加（`_paddleocr_lang`, `_easyocr_langs`） |
| ④対応内容③ | 言語変更時にインスタンス再初期化 |
| ④対応内容④ | EasyOCR言語コードマッピング修正（zh→ch_sim, ch_tra） |
| ④対応内容⑤ | 繁体字中国語（zh-TW）オプション追加 |
| ④対応内容⑥ | 日中選択UI改善（明示的な言語選択メッセージ追加） |
| ④対応内容⑦ | manga-ocr言語制限（日本語以外選択時は自動でPaddleOCRに切替） |
| ⑤修正ファイル | `python/terunslator/ocr.py`, `src/views/SettingsView.vue`, `src/views/ImageView.vue`, `src/locales/*.ts` |
| ⑤完了 | [x] 調査完了 [x] 実装完了 [ ] ユーザー確認 |

### P135 実装詳細

**PaddleOCR 3.3.2新フォーマット対応:**
```python
# 新フォーマット: [{'rec_texts': [...], 'rec_scores': [...], 'rec_polys': [...]}]
first_result = result[0]
if isinstance(first_result, dict):
    rec_texts = first_result.get('rec_texts', [])
    rec_scores = first_result.get('rec_scores', [])
    rec_polys = first_result.get('rec_polys', [])
    # ... 座標抽出処理
```

**PaddleOCR言語切り替え:**
```python
def _get_paddleocr(lang: str = "ja"):
    global _paddleocr, _paddleocr_lang
    paddle_lang = lang_map.get(lang, "en")

    # P135: 言語変更時に再初期化
    if _paddleocr is not None and _paddleocr_lang != paddle_lang:
        del _paddleocr
        _paddleocr = None

    if _paddleocr is None:
        _paddleocr = PaddleOCR(use_textline_orientation=True, lang=paddle_lang)
        _paddleocr_lang = paddle_lang
```

**EasyOCR言語コードマッピング:**
```python
lang_map = {
    "ja": "ja",
    "en": "en",
    "zh": "ch_sim",      # P135: 修正
    "zh-CN": "ch_sim",
    "zh-TW": "ch_tra",   # 繁体字対応
    "ko": "ko",
}
```

**日中選択UI:**
- 設定画面に「日本語と中国語は漢字が類似しているため、明示的に言語を選択してください」メッセージ追加
- 繁体字中国語（zh-TW）オプション追加
- manga-ocr選択時に日本語以外を選ぶと自動でPaddleOCRに切替

---

## P136: PaddleOCR GPU環境分離（✅ 実装完了）

| 項目 | 内容 |
|------|------|
| ①タイトル | PaddleOCR GPU高速化（cuDNN競合回避） |
| ②背景 | PaddlePaddle-gpu 3.xはcuDNN 9.xを使用、PyTorch 2.xはcuDNN 8.xを使用 → 同一プロセスでDLL競合 |
| ③要件① | PaddleOCR GPU版を利用可能にする |
| ③要件② | PyTorch/ctranslate2との競合を回避する |
| ③要件③ | 自動フォールバック（GPU環境がなければCPU版を使用） |
| ④実装方針 | 環境分離アーキテクチャ（別conda環境でsubprocess呼び出し） |
| ④実装内容① | `python/.conda_env_paddle/` - PaddleOCR GPU専用環境 |
| ④実装内容② | `python/scripts/paddleocr_gpu.py` - subprocess用OCRスクリプト |
| ④実装内容③ | `python/terunslator/ocr.py` - `ocr_paddleocr_gpu()`関数追加 |
| ④実装内容④ | メイン環境は`paddlepaddle==3.2.0`（CPU版）に変更 |
| ⑤速度結果 | CPU: 5.77秒、GPU(subprocess): 10.97秒 ※毎回プロセス起動のためCPUの方が速い |
| ⑤修正ファイル | `ocr.py`, `paddleocr_gpu.py`, `setup_paddleocr_env.bat` |
| ⑤完了 | [x] 調査完了 [x] 実装完了 [ ] ユーザー確認 |

### P136 アーキテクチャ

```
メインアプリ環境 (.conda_env)
├── PyTorch 2.6.0+cu124 (cuDNN 8.x) ✅
├── ctranslate2 ✅
├── paddlepaddle 3.2.0 (CPU版) ✅
└── subprocess呼び出し
       ↓
PaddleOCR専用環境 (.conda_env_paddle)
├── paddlepaddle-gpu 3.2.0 (cuDNN 9.x)
└── paddleocr 3.3.2
```

### P136 備考

- GPU版は環境は構築済みだが、subprocess起動オーバーヘッドによりCPU版の方が高速
- 将来的にバッチ処理や永続サーバー方式で高速化可能
- 現時点ではCPU版（`paddleocr`）をデフォルトとして推奨

---

## P134追加修正: Tauri relaunch()問題対応（✅ 実装完了）

| 項目 | 内容 |
|------|------|
| ①問題 | 高速再起動ボタン押下後、白い画面のみ表示される |
| ②原因 | Tauri 2.xの`relaunch()` APIにバグあり（Issue #12310） |
| ③対応① | `process:allow-restart`権限を明示的に追加 |
| ③対応② | 開発モードでは警告ダイアログを表示 |
| ③対応③ | 失敗時のエラーハンドリングとユーザー通知 |
| ⑤修正ファイル | `Sidebar.vue`, `default.json`, `ja.ts`, `en.ts`, `zh.ts`, `ko.ts` |
| ⑤完了 | [x] 調査完了 [x] 実装完了 [ ] ユーザー確認 |

---

## 全体進捗サマリー

| No | 項目 | 種別 | 調査 | 実装 | ユーザー確認 | 備考 |
|----|------|------|------|------|--------------|------|
| P134 | 高速再起動ボタン | 新機能 | [x] | [x] | [ ] | ✅ 実装完了（追加修正含む） |
| P135 | OCR言語切り替え + 日中選択UI | バグ修正+機能追加 | [x] | [x] | [ ] | ✅ 実装完了 |
| P136 | PaddleOCR GPU環境分離 | 新機能 | [x] | [x] | [ ] | ✅ 実装完了（CPUの方が高速） |

**最終更新:** 2025-12-31

---
