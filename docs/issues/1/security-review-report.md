# セキュリティレビューレポート - Issue #1

レビュー日時: 2026-03-21
レビュアー: security-review-agent
参照: OWASP Top 10 2021

## サマリー

| 重要度 | 件数 |
|---|---|
| 🔴 Critical（即時修正必須） | 0件 |
| 🔴 High（リリース前に修正必須） | 1件 |
| 🟡 Medium（次スプリントまでに修正） | 2件 |
| 🟢 Low（改善推奨） | 1件 |

## npm audit 結果

### BFF

| パッケージ | 重要度 | 脆弱性 | 対応 |
|---|---|---|---|
| flatted <=3.4.1 | High | Prototype Pollution via parse() | `npm audit fix` で修正可能 |
| glob 10.2.0-10.4.5 | High | Command injection via -c/--cmd | 開発依存のみ（@nestjs/cli経由）、本番影響なし |
| ajv 7.0.0-alpha.0 - 8.17.1 | Moderate | ReDoS with `$data` option | 開発依存のみ |
| file-type 13.0.0-21.3.1 | Moderate | ASF parser infinite loop / ZIP DoS | @nestjs/common 経由、要監視 |

### Frontend

| パッケージ | 重要度 | 脆弱性 | 対応 |
|---|---|---|---|
| flatted <=3.4.1 | High | Prototype Pollution via parse() | `npm audit fix` で修正可能 |
| glob 10.2.0-10.4.5 | High | Command injection via -c/--cmd | 開発依存のみ（eslint-config-next経由） |
| minimatch 9.0.0-9.0.6 | High | ReDoS（複数パターン） | `npm audit fix` で修正可能 |
| esbuild <=0.24.2 | Moderate | 開発サーバーへの任意リクエスト | 開発依存のみ（vitest経由） |

**判定**: flatted の Prototype Pollution は `npm audit fix` で修正可能。glob / minimatch は開発依存のみで本番影響なし。

## 指摘事項

### 🔴 High

#### [OWASP A05] [`bff/src/config/configuration.ts:5`] JWT_SECRET にハードコードされたフォールバック値
**問題**: `process.env.JWT_SECRET ?? 'default-secret'` により、環境変数が未設定の場合に推測可能な固定シークレットが使用される。
**攻撃シナリオ**: 本番環境で `JWT_SECRET` 環境変数の設定が漏れた場合、攻撃者は `'default-secret'` を使って任意のJWTトークンを生成し、全ユーザーになりすませる。
**修正案**: フォールバック値を削除し、環境変数が未設定の場合はアプリケーション起動を失敗させる。
```typescript
secret: process.env.JWT_SECRET ?? (() => { throw new Error('JWT_SECRET must be set'); })(),
```
または `@nestjs/config` の `Joi` バリデーションで必須にする。
**参考**: https://owasp.org/Top10/A05_2021-Security_Misconfiguration/

### 🟡 Medium

#### [OWASP A04] [`bff/src/app.module.ts`] ThrottlerGuard が APP_GUARD として登録されていない
**問題**: `ThrottlerModule.forRoot()` は設定されているが、`APP_GUARD` として `ThrottlerGuard` が登録されていないため、レート制限が実際には適用されていない。
**攻撃シナリオ**: 攻撃者が認証エンドポイントや株価取得エンドポイントに対してブルートフォース攻撃やDoS攻撃を行える。
**修正案**: `AppModule` の providers に以下を追加:
```typescript
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

providers: [
  { provide: APP_GUARD, useClass: ThrottlerGuard },
],
```
**参考**: https://docs.nestjs.com/security/rate-limiting

#### [OWASP A07] [`frontend/src/lib/api/client.ts:14`] アクセストークンを localStorage に保存
**問題**: JWT アクセストークンが `localStorage` に保存されている。XSS脆弱性が存在した場合、攻撃者が `localStorage` からトークンを窃取できる。
**攻撃シナリオ**: サードパーティライブラリ等を経由したXSS攻撃により、`localStorage.getItem('accessToken')` でトークンが盗まれ、セッションハイジャックが行われる。
**修正案**: 将来的にはBFFでHttpOnly Cookie を使ったセッション管理への移行を検討する。現時点では以下の緩和策を推奨:
- CSPヘッダーの厳格な設定
- サードパーティスクリプトの最小化
- トークンの有効期限を短く設定（現状1hは許容範囲）
**参考**: https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/

### 🟢 Low

#### [OWASP A05] [`bff/src/modules/stocks/gateway/stocks-service-a.gateway.ts`, `stocks-service-b.gateway.ts`] axios インスタンスにタイムアウト未設定
**問題**: Gateway の axios インスタンスに `timeout` が設定されていない。ダウンストリームサービスの応答が遅延した場合、BFFのリソースが枯渇する可能性がある。
**修正案**: axios.create に `timeout: 5000` を追加する（ARCHITECTURE.md の設定例にも timeout: 5000 と記載あり）。
```typescript
this.axiosInstance = axios.create({
  baseURL: configService.get<string>('services.serviceA.url'),
  timeout: 5000,
});
```

## 確認済み（問題なし）の項目

### A01: アクセス制御の不備 ✅
- `StocksController` にクラスレベルで `@UseGuards(JwtAuthGuard)` が正しく適用されている（`stocks.controller.ts:7`）
- `JwtAuthGuard` は `@nestjs/passport` の `AuthGuard('jwt')` を正しく継承し、未認証時に適切な `UnauthorizedException` をスローしている

### A02: 暗号化の失敗 ✅
- `.env` ファイルは `.gitignore` に含まれている
- センシティブ情報のログ出力は確認されなかった

### A03: インジェクション ✅
- ダウンストリームへのリクエストはクエリパラメータ `limit` のみで、ユーザー入力を直接埋め込んでいない（limit はハードコード値 `5`）
- `ValidationPipe` が `whitelist: true`, `forbidNonWhitelisted: true` で設定されている（`main.ts:24-28`）
- フロントエンドで `dangerouslySetInnerHTML` / `innerHTML` の使用なし

### A04: 安全でない設計 ✅ (一部)
- `GlobalExceptionFilter` が未処理例外のスタックトレースをクライアントに返さず、サーバーログのみに記録している
- エラーレスポンスは統一フォーマットで内部情報を隠蔽

### A05: セキュリティの設定ミス ✅ (一部)
- CORS の `origin` が `process.env.FRONTEND_URL || 'http://localhost:3000'` で特定ドメインに制限されている（`main.ts:18`）
- `helmet()` が有効化されている（`main.ts:16`）

### A08: ソフトウェアとデータの整合性の失敗 ✅
- `ValidationPipe` の `whitelist: true` が設定されており、未定義プロパティは自動的に除去される

### A09: セキュリティログと監視の失敗 ✅
- `LoggingInterceptor` がリクエストのメソッド・URL・所要時間を記録している
- `GlobalExceptionFilter` がエラーを適切にログ記録している

### A10: サーバサイドリクエストフォージェリ (SSRF) ✅
- ダウンストリームURLは `ConfigService` 経由で環境変数から取得しており、ユーザー入力からは生成されていない
