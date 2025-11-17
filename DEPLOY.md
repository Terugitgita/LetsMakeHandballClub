# GitHub Pagesでゲームを公開する手順

このガイドでは、「ズッキュン中学物語」をGitHub Pagesで無料公開する方法を説明します。

## 📋 必要なもの

- GitHubアカウント（既にお持ちです✓）
- このゲームのファイル一式（このフォルダ）

## 🚀 公開手順

### 方法1: GitHub Desktop使用（推奨・初心者向け）

#### Step 1: GitHub Desktopをインストール
1. [GitHub Desktop](https://desktop.github.com/)をダウンロード
2. インストールして起動
3. GitHubアカウントでサインイン

#### Step 2: リポジトリを作成
1. GitHub Desktopで「File」→「Add Local Repository」
2. 「Choose」ボタンをクリック
3. このフォルダ（`F:\LetsMakeHandballClub`）を選択
4. 「The directory does not appear to be a Git repository」と表示されたら
5. 「create a repository」をクリック
6. リポジトリ名: `LetsMakeHandballClub` （またはお好きな名前）
7. 「Create Repository」をクリック

#### Step 3: GitHubに公開
1. GitHub Desktopで「Publish repository」をクリック
2. 「Name」: `LetsMakeHandballClub` （URLに使われます）
3. 「Description」: ハンドボールシミュレーションゲーム
4. ✅ 「Keep this code private」のチェックを**外す**（公開する）
5. 「Publish Repository」をクリック
6. 完了を待つ（数秒〜数分）

#### Step 4: GitHub Pagesを有効化
1. ブラウザで [github.com](https://github.com) を開く
2. 右上のプロフィールアイコンをクリック→「Your repositories」
3. 「LetsMakeHandballClub」リポジトリをクリック
4. 「Settings」タブをクリック（右上の方）
5. 左サイドバーの「Pages」をクリック
6. 「Source」で「Deploy from a branch」を選択
7. 「Branch」で「main」（または「master」）を選択
8. フォルダは「/ (root)」を選択
9. 「Save」をクリック

#### Step 5: 公開URLを確認
1. 数分待つと、緑色のバーが表示されます
2. 「Your site is live at https://あなたのユーザー名.github.io/LetsMakeHandballClub/」
3. このURLをクリックしてアクセス！
4. スマホでも同じURLで遊べます📱

---

### 方法2: GitHub Web UIで直接アップロード（簡単）

#### Step 1: GitHubでリポジトリを作成
1. [github.com](https://github.com) にログイン
2. 右上の「+」→「New repository」
3. Repository name: `LetsMakeHandballClub`
4. Description: ハンドボールシミュレーションゲーム
5. Public を選択
6. 「Create repository」をクリック

#### Step 2: ファイルをアップロード
1. 「uploading an existing file」をクリック
2. エクスプローラーで `F:\LetsMakeHandballClub` を開く
3. **すべてのファイルとフォルダ**を選択してドラッグ＆ドロップ
   - index.html
   - css/
   - js/
   - README.md
   - .gitignore
   - など全部
4. 下の方にある「Commit changes」をクリック

#### Step 3: GitHub Pagesを有効化
1. リポジトリページで「Settings」→「Pages」
2. 「Source」で「Deploy from a branch」
3. 「Branch」で「main」を選択
4. 「Save」をクリック
5. 数分待つと公開完了！

---

## 🔗 公開後のURL

公開されると、以下のURLでアクセスできます：

```
https://あなたのGitHubユーザー名.github.io/LetsMakeHandballClub/
```

例: ユーザー名が `taro123` なら：
```
https://taro123.github.io/LetsMakeHandballClub/
```

このURLを友達にシェアすれば、誰でもスマホ・PCで遊べます！

---

## 📝 README.mdを更新

公開URLが確定したら、README.mdの9行目を更新しましょう：

```markdown
👉 [今すぐプレイする](https://あなたのGitHubユーザー名.github.io/LetsMakeHandballClub/)
```

→

```markdown
👉 [今すぐプレイする](https://実際のユーザー名.github.io/LetsMakeHandballClub/)
```

更新後、再度GitHubにプッシュ（Publish）すれば反映されます。

---

## 🔄 ゲームを更新する方法

ゲームを修正・改善した後の更新方法：

### GitHub Desktop使用の場合
1. ファイルを編集・保存
2. GitHub Desktopを開く
3. 変更されたファイルが左側に表示される
4. 下の「Summary」に変更内容を書く（例: "バグ修正"）
5. 「Commit to main」をクリック
6. 「Push origin」をクリック
7. 数分でWebサイトに反映！

### Web UIの場合
1. GitHubのリポジトリページを開く
2. 更新したいファイルをクリック
3. 鉛筆アイコン（Edit）をクリック
4. 編集して「Commit changes」
5. 数分で反映！

---

## ❓ トラブルシューティング

### 「404 Not Found」と表示される
- GitHub Pagesの設定が完了するまで10分程度かかることがあります
- Settings → Pages で緑色のバーが表示されているか確認
- リポジトリが「Public」になっているか確認

### ゲームが正しく動作しない
- index.htmlが**ルートフォルダ**にあることを確認
- すべてのファイル（css/, js/ フォルダ含む）がアップロードされているか確認
- ブラウザの開発者ツール（F12）でエラーを確認

### スマホで表示が崩れる
- キャッシュをクリアして再読み込み
- プライベートブラウジングモードで試す

---

## 🎉 完了！

これで世界中どこからでも、スマホ一つで「ズッキュン中学物語」をプレイできます！

友達や家族にURLをシェアして、一緒に楽しみましょう！

---

**何か問題があれば、GitHubのIssuesで質問してください！**
