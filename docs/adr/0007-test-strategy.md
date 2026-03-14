# ADR-0007: テスト戦略とフレームワーク選定

- **ステータス**: 採用
- **決定日**: 2026-03-15
- **決定者**: アーキテクチャチーム
- **関連ADR**: ADR-0002, ADR-0003

## 背景・課題

BFFとフロントエンドそれぞれに適したテスト戦略とフレームワークを決定する必要があった。要件は以下の通り。

- 単体テストでビジネスロジックを高速に検証できること
- 外部サービスへの依存（ダウンストリームサービス、ブラウザAPI）をテスト環境で安全にモックできること
- テストコードが読みやすく、「何をテストしているか」が明確であること
- CI/CDで自動実行できること

## 決定内容

### BFF（NestJS）: Jest + @nestjs/testing

- **フレームワーク**: Jest（NestJSデフォルト）
- **ユニットテスト**: `*.spec.ts`、`@nestjs/testing` の `Test.createTestingModule()` でDI環境を構築
- **e2eテスト**: `test/*.e2e-spec.ts`、`supertest` でHTTPリクエストを実際に送信
- **モック**: `jest.fn()` / `jest.spyOn()` でダウンストリームHTTPクライアントをモック
- **カバレッジ目標**: 80%以上

### フロントエンド（Next.js）: Vitest + Testing Library + MSW

- **フレームワーク**: Vitest（Viteベース、高速）
- **コンポーネントテスト**: `@testing-library/react` でユーザー視点のテスト
- **ユーザー操作**: `@testing-library/user-event` でリアルなユーザーインタラクションをシミュレート
- **APIモック**: MSW（Mock Service Worker）v2 でネットワークレベルのモック
- **カバレッジ目標**: 70%以上

### テスト命名規則と構造

```typescript
describe('UsersService', () => {
  describe('getUser', () => {
    it('正常系: IDに対応するユーザーを返す', async () => { ... });
    it('異常系: 存在しないIDの場合はNotFoundExceptionをスロー', async () => { ... });
  });
});
```

テストの構造は **AAA（Arrange-Act-Assert）パターン** を必須とする。

## 理由

### BFF: JestとNestJS Testingを選んだ理由
- NestJSのDIコンテナをそのままテストに活用でき、本番コードの構造を変えずにモックを注入できる
- `jest.fn()` で `HttpService.get` をモックし、`of()` / `throwError()` で成功・失敗ケースを制御するパターンが直感的
- e2eテストで `supertest` を使えば実際のHTTPリクエストをサーバーに送り、バリデーション・ガード・フィルターの動作を含めた統合テストができる

### フロントエンド: Vitestを選んだ理由（Jestではなく）
- ViteベースのNext.jsプロジェクトではVitestの方がビルド設定と一致しており、設定が少ない
- Jestより高速（特にCold start）でウォッチモードが快適

### フロントエンド: MSWを選んだ理由
- **ネットワークレベルのモック**: `axios.get` を直接モックする（実装の詳細をモック）のではなく、実際のHTTPリクエストをインターセプトする。これによりAPIクライアントの実装が変わってもテストが壊れない
- **テスト・Storybook・開発環境での共有**: 同じハンドラー定義をテスト・Storybook・ブラウザ開発環境（Service Worker）で使い回せる
- **型安全**: TypeScriptでリクエスト/レスポンスの型を明示できる

### Testing Library を選んだ理由
- **ユーザー視点のテスト**: `getByRole`, `getByLabelText` などのクエリは「ユーザーがどう見るか」に基づいており、実装の詳細（クラス名、コンポーネント構造）に依存しない
- **アクセシビリティとの連携**: `getByRole` を使うことで、セマンティックなHTMLのテストが自然にアクセシビリティの検証にもなる

## 検討した代替案

| 案 | 概要 | 却下理由 |
|---|---|---|
| フロントエンドにJest | 従来のReactテスト | Vitestと比べてNext.js + Viteプロジェクトでの設定が複雑になる。コミュニティもVitestに移行傾向 |
| Enzyme | React コンポーネントのshallowレンダリング | React 18非対応。実装の詳細（コンポーネントの内部構造）に依存するテストを書きやすく、リファクタリング耐性が低い |
| Playwright / Cypress（E2E only） | ブラウザを使ったE2Eテスト | ユニット・統合テストの代替にはならない。将来的にE2Eテスト追加時はPlaywrightを検討 |
| `jest.mock('axios')` | axiosを直接モック | 実装の詳細に依存し、APIクライアントを変更するとテストが壊れる。MSWのほうが堅牢 |

## 結果・影響

### メリット
- BFFのユニットテストはDIモックにより高速（ネットワーク通信なし）
- フロントエンドのテストはMSWにより、APIクライアントの実装変更に対して堅牢
- テスト名を日本語にすることで「何の機能を」「どういう条件で」テストするかが一目でわかる

### デメリット・トレードオフ
- MSWのセットアップ（`handlers.ts`, `server.ts`）に初期コストがある
- Vitestは設定ファイルが別（`vitest.config.ts`）になり、`next.config.ts` と二本立ての管理が必要

### 対応が必要なこと
- **E2Eテスト（将来対応）**: Playwright でブラウザ自動化テストを追加することを推奨。特に認証フローや画面遷移のテストに有効
- カバレッジレポートをCI/CDパイプライン（GitHub Actions）に組み込む
- `src/mocks/handlers.ts` のモックデータはテストデータファクトリ（`test/factories/`）として整理することを推奨
