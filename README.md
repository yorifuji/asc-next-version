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
