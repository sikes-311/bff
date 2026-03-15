# アーキテクチャ設計書

## システム概要

```
┌─────────────────────────────────────────────────────────────────┐
│                        ブラウザ / クライアント                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14+)                        │
│  ・App Router                                                    │
│  ・Server Components / Client Components                         │
│  ・TanStack Query (クライアントサイドデータフェッチ)                  │
│  ・Tailwind CSS                                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API (JSON)
                             │ /api/v1/*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BFF (NestJS)                                │
│  ・認証・認可 (JWT / Session)                                     │
│  ・リクエストバリデーション (class-validator)                       │
│  ・レスポンス変換・集約                                             │
│  ・エラーハンドリング統一                                           │
│  ・Swagger / OpenAPI ドキュメント                                 │
│  ・ロギング (pino)                                               │
│  ・レート制限                                                     │
└─────────┬──────────────────┬──────────────────┬─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │  Service A  │   │  Service B  │   │  Service C  │
   │  (REST/gRPC)│   │  (REST/gRPC)│   │  (REST/gRPC)│
   └─────────────┘   └─────────────┘   └─────────────┘
         バックエンドマイクロサービス群（別サービス想定）
```

## ディレクトリ構成

```
/
├── ARCHITECTURE.md          # 本ファイル
├── DEVELOPMENT_RULES.md     # 開発ルール
├── docker-compose.yml       # ローカル開発環境
├── frontend/                # Next.js アプリ
│   ├── src/
│   │   ├── app/             # App Router ページ
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── (features)/  # 機能別ルートグループ
│   │   ├── components/      # UIコンポーネント
│   │   │   ├── ui/          # 汎用UIコンポーネント
│   │   │   └── features/    # 機能別コンポーネント
│   │   ├── lib/
│   │   │   ├── api/         # BFF APIクライアント
│   │   │   └── utils/       # ユーティリティ
│   │   ├── hooks/           # カスタムフック
│   │   └── types/           # 型定義
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
├── bff/                     # NestJS BFF
│   ├── src/
│   │   ├── main.ts          # エントリポイント
│   │   ├── app.module.ts    # ルートモジュール
│   │   ├── common/          # 共通機能
│   │   │   ├── filters/     # 例外フィルタ
│   │   │   ├── guards/      # 認証ガード
│   │   │   ├── interceptors/ # ロギング・変換
│   │   │   ├── decorators/  # カスタムデコレータ
│   │   │   └── dto/         # 共通DTO
│   │   ├── config/          # 設定管理 (@nestjs/config)
│   │   ├── auth/            # 認証モジュール
│   │   └── modules/         # 機能モジュール
│   │       └── {feature}/
│   │           ├── {feature}.module.ts
│   │           ├── {feature}.controller.ts   # Presentation層: HTTP入出力・DTO変換
│   │           ├── usecase/                  # Usecase層: 単一ユースケース単位
│   │           │   ├── get-{feature}.usecase.ts
│   │           │   ├── create-{feature}.usecase.ts
│   │           │   └── ...
│   │           ├── gateway/                  # Gateway層: ダウンストリーム通信実装
│   │           │   └── {feature}.gateway.ts
│   │           ├── port/                     # Port: Gatewayのインターフェース定義
│   │           │   └── {feature}.gateway.port.ts
│   │           └── dto/                      # DTO: リクエスト・レスポンス型
│   ├── test/                # e2e テスト
│   ├── package.json
│   └── tsconfig.json
└── shared/                  # 共有型定義 (オプション)
    └── types/
```

## BFF の責務

### 担うもの
- **認証・認可**: JWTトークンの検証、ロールベースアクセス制御
- **リクエスト集約**: 複数バックエンドサービスへの並列リクエスト & 結果集約
- **レスポンス変換**: バックエンドAPIレスポンスをフロントエンド向けに整形
- **エラー統一**: バックエンドの各種エラーをフロントエンド向け統一フォーマットに変換
- **バリデーション**: 入力値の検証 (class-validator + class-transformer)
- **レート制限**: DoS対策

### 担わないもの
- ビジネスロジックの実装（バックエンドサービスに委譲）
- データの永続化（バックエンドサービスに委譲）

## BFF クリーンアーキテクチャ設計

BFF は機能モジュール内を **3層** に分離する。ビジネスロジックは持たないが、集約・変換ロジックをテスト可能な形で整理するために採用する。

```
┌─────────────────────────────────────────┐
│  Presentation層 (Controller)            │
│  ・HTTPリクエスト/レスポンスのマッピング   │
│  ・class-validator による入力バリデーション│
│  ・認証ガードの適用                       │
│  ・Usecase の呼び出し（1エンドポイント = 1Usecase）│
└───────────────────┬─────────────────────┘
                    │ 呼び出し
                    ▼
┌─────────────────────────────────────────┐
│  Usecase層 (*.usecase.ts)               │
│  ・1クラス = 1ユースケース (execute メソッド)│
│  ・複数Gatewayの集約・レスポンス変換       │
│  ・依存はPortインターフェースのみ          │
└───────────────────┬─────────────────────┘
                    │ Port経由で呼び出し
                    ▼
┌─────────────────────────────────────────┐
│  Gateway層 (*.gateway.ts)               │
│  ・Portインターフェースの実装              │
│  ・@nestjs/axios によるHTTP通信           │
│  ・ダウンストリームのレスポンスをドメイン型に変換│
└─────────────────────────────────────────┘
```

### 設計ルール

**Usecase**
- 1ファイル1クラス。`execute(input): Promise<output>` のみ持つ。
- コンストラクタには、そのユースケースで使う Port インターフェースだけを注入する。
- 他の Usecase を直接 import・注入しない。

**Port（インターフェース）**
- `port/` ディレクトリに `interface` として定義する。
- Gateway の実装詳細（axios 等）を Usecase から隠蔽する。
- テスト時はこの interface を jest.fn() で実装したモックに差し替えるだけでよい。

**Gateway**
- Port インターフェースを `implements` する形で実装する。
- ダウンストリームサービスの HTTP/gRPC 通信のみを担当する。

### Usecase テストの構造

各 Usecase のユニットテストで注入が必要なモックは **そのユースケースが依存する Port のみ** に限定される。

```typescript
// get-user.usecase.spec.ts — 注入するモックは1つだけ
describe('GetUserUsecase', () => {
  let usecase: GetUserUsecase;
  let userGateway: jest.Mocked<UserGatewayPort>;

  beforeEach(() => {
    userGateway = { findById: jest.fn() };
    usecase = new GetUserUsecase(userGateway); // DI コンテナ不要
  });

  it('ユーザーを返す', async () => {
    userGateway.findById.mockResolvedValue({ id: '1', name: 'Alice' });
    const result = await usecase.execute({ id: '1' });
    expect(result.name).toBe('Alice');
  });
});
```

### モジュール登録例

```typescript
// {feature}.module.ts
@Module({
  imports: [HttpModule],
  controllers: [FeatureController],
  providers: [
    FeatureGateway,
    { provide: FEATURE_GATEWAY_PORT, useExisting: FeatureGateway },
    GetFeatureUsecase,
    CreateFeatureUsecase,
  ],
})
export class FeatureModule {}
```

## API設計方針

### エンドポイント規則
- `GET /api/v1/{resource}` - 一覧取得
- `GET /api/v1/{resource}/:id` - 単件取得
- `POST /api/v1/{resource}` - 作成
- `PUT /api/v1/{resource}/:id` - 全体更新
- `PATCH /api/v1/{resource}/:id` - 部分更新
- `DELETE /api/v1/{resource}/:id` - 削除

### レスポンスフォーマット

成功時:
```json
{
  "data": { ... },
  "meta": { "timestamp": "2024-01-01T00:00:00Z" }
}
```

一覧取得時:
```json
{
  "data": [ ... ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

エラー時:
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "指定されたリソースが見つかりません",
    "details": {}
  },
  "meta": { "timestamp": "2024-01-01T00:00:00Z" }
}
```

## 認証フロー

```
Frontend          BFF              Auth Service
   │                │                   │
   │ POST /auth/login                   │
   │───────────────>│                   │
   │                │ verify credentials│
   │                │──────────────────>│
   │                │<──────────────────│
   │                │ issue JWT         │
   │<───────────────│                   │
   │ (accessToken,  │                   │
   │  refreshToken) │                   │
   │                │                   │
   │ GET /api/v1/me │                   │
   │ Authorization: Bearer {accessToken}│
   │───────────────>│                   │
   │                │ validate JWT      │
   │                │ (local verify)    │
   │<───────────────│                   │
```

## ダウンストリームサービス通信

```typescript
// BFF → バックエンドサービスの通信パターン
// @nestjs/axios を使用し、HttpModule で管理

// 設定例
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        baseURL: config.get('SERVICE_A_URL'),
        timeout: 5000,
        headers: { 'X-Service-Name': 'bff' },
      }),
      inject: [ConfigService],
    }),
  ],
})
```

## 環境変数

### BFF (.env)
```
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ダウンストリームサービス
SERVICE_A_URL=http://localhost:4001
SERVICE_B_URL=http://localhost:4002
SERVICE_C_URL=http://localhost:4003

# ロギング
LOG_LEVEL=debug
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```
