# ADR-0002: BFFフレームワークにNestJSを採用

- **ステータス**: 採用
- **決定日**: 2026-03-15
- **決定者**: アーキテクチャチーム
- **関連ADR**: ADR-0001

## 背景・課題

BFFレイヤー（ADR-0001）をNode.jsで実装するにあたり、フレームワークを選定する必要があった。要件は以下の通り。

- TypeScriptとの親和性が高いこと
- 認証・バリデーション・HTTPクライアントなど、BFFに必要な機能がエコシステムとして揃っていること
- Swagger（OpenAPI）ドキュメントを自動生成できること
- チームの学習コストが許容範囲内であること
- テストが書きやすい構造であること

## 決定内容

BFFフレームワークに **NestJS** を採用する。

採用する主要モジュール:
- `@nestjs/config` — 環境変数の型付き管理
- `@nestjs/swagger` — OpenAPIドキュメント自動生成
- `@nestjs/axios` — ダウンストリームサービスへのHTTP通信
- `@nestjs/jwt` + `@nestjs/passport` — JWT認証
- `@nestjs/throttler` — レート制限
- `class-validator` + `class-transformer` — DTOベースのバリデーション

## 理由

- **デコレータベースの設計**: `@Controller`, `@UseGuards`, `@ApiOperation` などのデコレータにより、コードとドキュメントが一体化し、BFFの実装がスッキリする
- **モジュールシステム**: `@Module` による明確なモジュール境界と依存性注入(DI)が、BFFの機能単位（auth, users, ...）の分離を自然に実現する
- **テスタビリティ**: DIコンテナにより、ユニットテスト時にモックを簡単に注入できる
- **Swagger統合**: `@nestjs/swagger` のデコレータをコントローラーに付けるだけでOpenAPI仕様が自動生成され、フロントエンドチームとの型共有が容易になる
- **Angular的構造**: Angular経験者には親しみやすく、未経験者も構造化されたファイル配置で迷いにくい

## 検討した代替案

| 案 | 概要 | 却下理由 |
|---|---|---|
| Express.js（素） | 軽量・高い自由度 | ボイラープレートが多く、BFFとして必要な認証・バリデーション・DI・Swaggerをすべて自前で組み合わせる必要がある。チームの規模・速度を考慮して却下 |
| Fastify + Plugins | 高パフォーマンスなNode.jsフレームワーク | NestJSはFastifyアダプターを使えるため、必要なら後からFastifyに切り替え可能。構造化の恩恵を優先した |
| Hono | 超軽量・エッジランタイム対応 | エコシステムがまだ発展途上。BFFに必要なDIや大規模構造化には不向きと判断 |
| tRPC | 型安全なRPC（フロントとバックのt型共有） | フロントエンドとBFFを同一リポジトリで管理する場合は有力候補。ただし、今回はBFFと複数のダウンストリームサービスをまたいだ変換が主な責務であり、tRPCのメリットが薄い |

## 結果・影響

### メリット
- Swagger UIが `/api` で自動生成されるため、フロントエンドチームやQAチームがAPIを手動で確認できる
- `GlobalExceptionFilter`, `TransformInterceptor` などグローバルな横断関心事を1箇所に集中できる
- テスト時に `@nestjs/testing` の `Test.createTestingModule()` でDI環境をそのまま使えるため、テストコードが簡潔になる

### デメリット・トレードオフ
- Express/Fastify素のフレームワークと比べてバンドルサイズが大きい（Cold start に影響する場合あり）
- デコレータ・メタデータへの依存があり、`emitDecoratorMetadata: true` が必須
- NestJS固有の概念（Module, Provider, Guard, Interceptor）の学習コストが初期にある

### 対応が必要なこと
- `tsconfig.json` で `emitDecoratorMetadata: true`, `experimentalDecorators: true` を有効化（実施済み）
- 本番環境でのCold start最適化が必要な場合は `@nestjs/platform-fastify` への切り替えを検討
