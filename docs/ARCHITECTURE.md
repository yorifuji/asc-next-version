# アーキテクチャ設計書

## 概要

App Store Connect Next Version は、クリーンアーキテクチャの原則に基づいて設計されたGitHub Actionです。

## レイヤー構造

```
src/
├── interfaces/          # 外部とのインターフェース層
│   ├── actions/        # GitHub Actions固有の処理
│   └── cli/           # CLI向けインターフェース（将来拡張用）
├── application/        # アプリケーション層（ユースケース）
│   └── usecases/      # ビジネスロジックの実装
├── domain/            # ドメイン層
│   ├── entities/      # ビジネスエンティティ
│   ├── valueObjects/  # 値オブジェクト
│   └── services/      # ドメインサービス
├── infrastructure/    # インフラストラクチャ層
│   ├── api/          # 外部API通信
│   └── auth/         # 認証関連
└── shared/           # 共有ユーティリティ
    ├── errors/       # カスタムエラー
    └── constants/    # 定数定義
```

## 設計原則

### 1. 依存性の方向
- 外側のレイヤーから内側のレイヤーへのみ依存
- ドメイン層は他のレイヤーに依存しない

### 2. 責任の分離
- **interfaces**: 外部との入出力処理
- **application**: ユースケースの調整
- **domain**: ビジネスルールの実装
- **infrastructure**: 外部サービスとの通信

### 3. テスタビリティ
- 各レイヤーは独立してテスト可能
- 依存性注入によるモックの容易性

## 命名規則

### ファイル名
- camelCase を使用（例: `appStoreClient.js`）
- テストファイルは `.test.js` サフィックス
- インターフェースは `.interface.js` サフィックス

### クラス・関数名
- クラス: PascalCase（例: `VersionManager`）
- 関数: camelCase（例: `calculateNextVersion`）
- プライベート関数: アンダースコアプレフィックス（例: `_validateVersion`）

### 変数名
- camelCase を使用
- 定数: UPPER_SNAKE_CASE（例: `MAX_RETRY_COUNT`）
- ブール値: is/has/can プレフィックス（例: `isValid`）

## エラーハンドリング

### カスタムエラークラス
```javascript
class AppStoreConnectError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'AppStoreConnectError';
    this.code = code;
    this.details = details;
  }
}
```

### エラーの種類
- `ValidationError`: 入力検証エラー
- `ApiError`: API通信エラー
- `BusinessLogicError`: ビジネスロジックエラー

## コーディング規約

### JavaScript
- ES6+ の機能を使用
- シングルクォートを使用
- セミコロンあり
- インデント: 2スペース

### 非同期処理
- async/await を使用
- Promise チェーンは避ける

### モジュール
- CommonJS形式（Node.js互換性のため）
- 名前付きエクスポートを推奨

## テスト戦略

### テストの種類
1. **単体テスト**: 各モジュール・関数の個別テスト
2. **統合テスト**: レイヤー間の連携テスト
3. **E2Eテスト**: 全体フローのテスト

### テストファイル構造
```
test/
├── unit/           # 単体テスト
├── integration/    # 統合テスト
└── e2e/           # E2Eテスト
```

### カバレッジ目標
- 単体テスト: 90%以上
- 統合テスト: 主要フローを網羅
- E2Eテスト: クリティカルパスを網羅