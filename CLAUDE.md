# CLAUDE.md

## プロジェクト概要

App Store Connect Next Version - App Store Connectの次期バージョンとビルド番号を自動決定するGitHub Action

## 作業完了条件

コード変更を行った際は、以下のチェックを必ず実行してください：

### 1. テストの確認・更新 ⚠️ 重要
**実装を変更した場合は、必ず関連するテストも確認・更新すること**
- 新しいエラーケースを追加した場合 → エラーケースのテストを追加
- 既存の動作を変更した場合 → 既存テストの期待値を更新
- 新機能を追加した場合 → 新機能のテストを追加

```bash
npm run test          # 全テスト実行
npm run test:watch    # ウォッチモード（開発中推奨）
npm run test:coverage # カバレッジ確認
```

### 2. コードフォーマット
```bash
npm run format:check  # チェックのみ
npm run format        # 自動修正
```

### 3. Lint チェック
```bash
npm run lint          # チェックのみ
npm run lint:fix      # 自動修正
```

### 4. 型チェック
```bash
npm run typecheck
```

### 5. ビルド
```bash
npm run build         # プロダクションビルド
npm run build:check   # TypeScriptコンパイルチェックのみ
```

### 6. 統合チェック
```bash
npm run verify        # lint + format:check + test を一括実行
npm run verify:fix    # lint:fix + format + test を一括実行
```

## 重要な実行コマンド

**これらすべてのチェックがパスして初めて作業完了とします。**

特に以下のコマンドは必須：
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## プロジェクト固有の注意事項

1. **エラーハンドリング**
   - READY_FOR_SALEバージョンには必ずビルドが存在するという前提
   - ビルドが見つからない場合はエラーを投げる設計

2. **アーキテクチャ**
   - クリーンアーキテクチャを採用
   - ドメイン層、アプリケーション層、インフラストラクチャ層、インターフェース層

3. **テスト戦略**
   - ユニットテストとインテグレーションテストを分離
   - モックを活用した外部依存の分離
   - **実装変更時は必ずテストも同時に更新する**

## テスト更新の具体例

### エラーハンドリングを追加した場合
```typescript
// 実装
if (buildNumber.getValue() === 0) {
  throw createBusinessLogicError('READY_FOR_SALE version has no build');
}

// テストも追加
test('throws error when READY_FOR_SALE version has no build', async () => {
  // ...
  await expect(service.getLiveVersion('app-id')).rejects.toThrow(
    'READY_FOR_SALE version has no build'
  );
});
```

### 既存の動作を変更した場合
```typescript
// 以前: エラーを返さずに0を返す
// 現在: エラーを投げる

// テストも更新
// 以前: expect(result).toBe(0)
// 現在: expect(...).rejects.toThrow()
```