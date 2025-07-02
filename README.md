# App Store Connect 次のビルドバージョン

App Store Connect の情報に基づいて、次にリリースすべきバージョンとビルド番号を決定する GitHub Action です。必要に応じて、App Store Connect に新しいバージョンを作成する機能も提供します。

このアクションは、App Store Connect に存在する最新バージョンを基準に、パッチバージョンをインクリメントして次のバージョンを提案します。例えば、最新バージョンが `1.0.0` の場合、`1.0.1` を次のバージョンとして扱います。

- **`1.0.1` が存在しない場合**: 新しいバージョン `1.0.1` と、最新バージョンのビルド番号に 1 を加えた新しいビルド番号を提案します (例: `1.0.0 (1)` -> `1.0.1 (2)`)。
- **`1.0.1` が既に存在する場合**: `1.0.1` のビルド番号をインクリメントします (例: `1.0.1 (2)` があれば `1.0.1 (3)` を提案)。

## 機能

- App Store Connect に公開されている最新のアプリバージョンとビルド番号を取得します。
- 次のバージョン番号（例: `1.0.0` -> `1.0.1`）を計算します。
- 次のバージョンが App Store Connect に存在するかどうかを確認し、以下のいずれかのアクションを決定します。
  - **`new_version`**: 次のバージョンが存在しない場合。新しいバージョンを作成するオプションが有効な場合、自動的に作成します。
  - **`increment_build`**: 次のバージョンが存在し、かつ `PREPARE_FOR_SUBMISSION` などのインクリメント可能な状態にある場合。既存のビルド番号をインクリメントします。
  - **`skip`**: 次のバージョンが存在し、かつインクリメントできない状態にある場合（例: `READY_FOR_SALE`）。

## 入力

| 名前                 | 必須   | デフォルト | 説明                                                                                   |
| :------------------- | :----- | :--------- | :------------------------------------------------------------------------------------- |
| `issuer-id`          | はい   |            | App Store Connect API の Issuer ID。                                                   |
| `key-id`             | はい   |            | App Store Connect API の Key ID。                                                      |
| `key`                | はい   |            | App Store Connect API の秘密鍵。                                                       |
| `bundle-id`          | はい   |            | アプリのバンドル ID。                                                                  |
| `platform`           | いいえ | `IOS`      | アプリのプラットフォーム (例: `IOS`, `MAC_OS`, `TV_OS`)。                              |
| `create-new-version` | いいえ | `false`    | `true` に設定すると、新しい App Store バージョンが存在しない場合に自動的に作成します。 |

## 出力

| 名前             | 説明                                                                       |
| :--------------- | :------------------------------------------------------------------------- |
| `version`        | 次のビルドのために決定されたバージョン文字列。                             |
| `buildNumber`    | 次のビルドのために決定されたビルド番号。                                   |
| `action`         | 実行されたアクション (`new_version`, `increment_build`, `skip`)。          |
| `versionCreated` | 新しい App Store バージョンが作成された場合は `true`、それ以外は `false`。 |

## 使用方法

### GitHub Secrets の設定

このアクションを使用するには、以下の App Store Connect API 情報を GitHub Secrets に設定する必要があります。

- `ISSUER_ID`
- `KEY_ID`
- `KEY`
- `BUNDLE_ID`

これらの情報は、App Store Connect の「ユーザーとアクセス」セクションの「統合」タブにある「API キー」から取得できます。

### ワークフローの例

#### 基本的な使用法（単一ジョブ）

この例では、単一のジョブでアクションを使用して次のバージョンを決定し、後続のステップで使用する方法を示します。

```yaml
name: 次のビルドバージョンを決定

on:
  workflow_dispatch:

jobs:
  determine-version:
    runs-on: ubuntu-latest
    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4

      - name: 次のビルドバージョンを取得
        id: next_version
        uses: yorifuji/asc-next-version@main
        with:
          issuer-id: ${{ secrets.ISSUER_ID }}
          key-id: ${{ secrets.KEY_ID }}
          key: ${{ secrets.KEY }}
          bundle-id: ${{ secrets.BUNDLE_ID }}
          # platform: IOS # オプション: MAC_OS, TV_OS
          # create-new-version: false # オプション: 存在しない場合に新しいバージョンを作成するにはtrueに設定

      - name: 出力を使用
        run: |
          echo "次のバージョン: ${{ steps.next_version.outputs.version }}"
          echo "次のビルド番号: ${{ steps.next_version.outputs.buildNumber }}"
          echo "実行されたアクション: ${{ steps.next_version.outputs.action }}"
          echo "新しいバージョンが作成されました: ${{ steps.next_version.outputs.versionCreated }}"
```

#### ジョブ間で出力を渡す

この例では、このアクションの出力を後続のジョブに渡す方法を示します。これは、バージョン決定をビルド、テスト、デプロイのプロセスから分離するのに役立ちます。

```yaml
name: ビルドとリリース

on:
  workflow_dispatch:

jobs:
  determine-version:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.next_version.outputs.version }}
      buildNumber: ${{ steps.next_version.outputs.buildNumber }}
    steps:
      - name: リポジトリをチェックアウト
        uses: actions/checkout@v4

      - name: 次のビルドバージョンを取得
        id: next_version
        uses: yorifuji/asc-next-version@main
        with:
          issuer-id: ${{ secrets.ISSUER_ID }}
          key-id: ${{ secrets.KEY_ID }}
          key: ${{ secrets.KEY }}
          bundle-id: ${{ secrets.BUNDLE_ID }}

  build:
    runs-on: ubuntu-latest
    needs: determine-version
    steps:
      - name: アプリケーションをビルド
        env:
          APP_VERSION: ${{ needs.determine-version.outputs.version }}
          BUILD_NUMBER: ${{ needs.determine-version.outputs.buildNumber }}
        run: |
          echo "バージョン ${APP_VERSION} (${BUILD_NUMBER}) をビルド中..."
          # ここにビルドコマンドを追加します
          # 例:
          # xcodebuild -project MyApp.xcodeproj -scheme MyApp -archivePath /path/to/archive \
          #   -currentProjectVersion "${BUILD_NUMBER}" \
          #   -marketingVersion "${APP_VERSION}"
```

## 開発ワークフロー

このプロジェクトへの貢献や開発を行う際のワークフローガイドです。

### 環境セットアップ

1. **リポジトリのクローン**

   ```bash
   git clone https://github.com/yorifuji/asc-next-version.git
   cd asc-next-version
   ```

2. **依存関係のインストール**

   ```bash
   npm install
   ```

3. **開発環境の確認**
   ```bash
   node --version  # v20.0.0以上が必要
   npm --version   # v10.0.0以上を推奨
   ```

4. **TypeScriptのビルド**
   ```bash
   npm run build
   ```

### 開発フロー

#### 1. 新機能開発・バグ修正

```bash
# 新しいブランチを作成
git checkout -b feature/your-feature-name

# 開発モードでビルドを監視
npm run watch

# 別ターミナルでテストを監視モードで実行
npm run test:watch
```

#### 2. コード品質の確保

開発中は以下のコマンドを使用してコード品質を維持：

```bash
# ESLintでコードをチェック
npm run lint

# 自動修正可能な問題を修正
npm run lint:fix

# Prettierでコードをフォーマット
npm run format

# TypeScriptの型チェック
npm run typecheck

# 全ての品質チェックを実行
npm run verify
```

#### 3. テストの実行

```bash
# 全テストを実行
npm test

# 特定の種類のテストのみ実行
npm run test:unit        # 単体テストのみ
npm run test:integration # 統合テストのみ

# カバレッジレポート付きでテスト
npm run test:coverage

# CI環境向けのテスト
npm run test:ci
```

#### 4. ビルド

```bash
# 開発ビルド（ソースマップ付き）
npm run build:dev

# 本番ビルド（最適化・圧縮）
npm run build

# ビルド成果物をクリーンアップ
npm run clean
```

### コミット前のチェックリスト

1. **コードスタイルの確認**

   ```bash
   npm run verify
   ```

2. **自動修正の適用**

   ```bash
   npm run verify:fix
   ```

3. **最終確認**
   - [ ] 全テストが通過している
   - [ ] ESLintエラーがない
   - [ ] コードがフォーマットされている
   - [ ] 不要なconsole.logが削除されている
   - [ ] 秘匿情報が含まれていない

### プルリクエストの作成

1. **変更をコミット**

   ```bash
   git add .
   git commit -m "feat: 新機能の説明"
   ```

2. **リモートにプッシュ**

   ```bash
   git push origin feature/your-feature-name
   ```

3. **プルリクエストを作成**
   - テンプレートに従って説明を記載
   - 関連するIssueがあればリンク
   - レビュアーを指定

### よく使うnpmスクリプト

| コマンド             | 説明                                          |
| -------------------- | --------------------------------------------- |
| `npm test`           | 全テストを実行                                |
| `npm run test:watch` | ファイル変更を監視してテストを自動実行        |
| `npm run build`      | 本番用ビルド                                  |
| `npm run watch`      | ファイル変更を監視して自動ビルド              |
| `npm run lint:fix`   | ESLintの自動修正                              |
| `npm run format`     | Prettierでコードをフォーマット                |
| `npm run typecheck`  | TypeScriptの型チェック                        |
| `npm run verify`     | リント、フォーマット、型チェック、テストを実行 |
| `npm run clean`      | ビルド成果物とカバレッジレポートを削除        |

### トラブルシューティング

#### ビルドエラーが発生する場合

```bash
npm run clean
npm install
npm run build
```

#### テストが失敗する場合

```bash
# キャッシュをクリアしてテストを実行
npm test -- --clearCache
npm test
```

#### ESLintエラーが解決できない場合

```bash
# 自動修正を試す
npm run lint:fix

# それでも解決しない場合は手動で修正
npm run lint
```

### アーキテクチャガイドライン

このプロジェクトはクリーンアーキテクチャの原則に従っています。詳細は[アーキテクチャドキュメント](docs/ARCHITECTURE.md)を参照してください。

### 貢献ガイドライン

詳細な貢献方法については[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。
