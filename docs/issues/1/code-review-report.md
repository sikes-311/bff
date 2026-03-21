# コードレビューレポート - Issue #1

レビュー日時: 2026-03-21
レビュアー: code-review-agent

## サマリー

| 重要度 | 件数 |
|---|---|
| 🔴 Must（リリース前に修正必須） | 2件 |
| 🟡 Should（できれば修正） | 2件 |
| 🟢 Nice to have（次回以降でOK） | 2件 |

## 指摘事項

### 🔴 Must

#### [bff/src/modules/stocks/stocks.controller.ts:6-17] Swaggerデコレータの欠落
**問題**: Controller に `@ApiTags`, `@ApiOperation`, `@ApiResponse` デコレータが付与されていない。
**理由**: DEVELOPMENT_RULES.md の「Controller」セクションで「必ず `@ApiTags`, `@ApiOperation`, `@ApiResponse` デコレータを付与（Swagger）」と明記されている。Swagger UIでAPIドキュメントが正しく生成されない。
**修正案**:
```typescript
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('api/v1/stocks')
@ApiTags('stocks')
@UseGuards(JwtAuthGuard)
export class StocksController {
  // ...
  @Get('popular')
  @ApiOperation({ summary: '人気上位5銘柄の株価レート一覧取得' })
  @ApiResponse({ status: 200, type: PopularStocksResponseDto })
  async getPopularStocks(): Promise<PopularStocksResponseDto> {
    return this.getPopularStocksUsecase.execute();
  }
}
```

#### [bff/src/modules/stocks/dto/stock-response.dto.ts:1-11] DTOに `@ApiProperty` デコレータが欠落
**問題**: `StockRateDto` および `PopularStocksResponseDto` の全プロパティに `@ApiProperty` デコレータが付与されていない。
**理由**: DEVELOPMENT_RULES.md の「DTO」セクションで Swagger デコレータの付与が求められている。Swagger UIのレスポンス型ドキュメントが正しく生成されない。
**修正案**:
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class StockRateDto {
  @ApiProperty({ description: '銘柄名', example: 'トヨタ自動車' })
  name!: string;

  @ApiProperty({ description: '100株あたり円建て株価', example: 250000 })
  priceJpy!: number;

  @ApiProperty({ description: '100株あたりドル建て株価', example: 1700.50 })
  priceUsd!: number;

  @ApiProperty({ description: '前日比(%)', example: 1.25 })
  changePercent!: number;
}

export class PopularStocksResponseDto {
  @ApiProperty({ type: [StockRateDto], description: '人気銘柄レート一覧' })
  data!: StockRateDto[];

  @ApiProperty({ description: 'メタ情報' })
  meta!: { timestamp: string };
}
```

### 🟡 Should

#### [bff/src/modules/stocks/usecase/get-popular-stocks.usecase.ts:43-48,63-69] `priceJpy * 100` ラウンドトリップによる可読性・精度の低下
**問題**: Domain の `Stock` は constructor で `priceJpyPer100 / 100` して1株あたりに変換している。Usecase の `mergeAndAverage` で平均値の新 `Stock` を作る際に `(stockA.priceJpy + stockB.priceJpy) * 100 / 2` と100倍して戻し（L67）、constructor で再び100で割る。さらに `execute()` の DTO 変換でも `stock.priceJpy * 100`（L45）と再度100倍している。
**理由**: `÷100 → ×100 → ÷100 → ×100` のラウンドトリップが発生し、浮動小数点誤差が蓄積するリスクがある。また、コードの意図が読み取りにくい。
**修正案**: 以下のいずれかを検討:
1. **Domain に静的メソッド `Stock.average(a, b)` を追加**: 内部値を直接使って平均を計算し、新しい Stock を返す。ラウンドトリップが不要になる。
2. **Domain に `toPer100()` アクセサを追加**: DTO 変換時の `* 100` を明示的なメソッドにして意図を明確化。
3. **Domain のフィールドを100株あたりのまま保持**: ダウンストリームとレスポンスDTO両方が100株あたりなので、内部変換自体を見直す。

#### [bff/src/modules/stocks/gateway/stocks-service-a.gateway.ts, stocks-service-b.gateway.ts] Gateway A/B のコード重複
**問題**: Gateway A と B は設定キー（`services.serviceA.url` vs `services.serviceB.url`）とクラス名/ロガー名以外が完全に同一（47行中45行が同一）。
**理由**: 現時点では2ファイルのみだが、将来 Gateway C が追加された場合に同一修正を3箇所に行う必要があり、保守性が低下する。
**修正案**: 抽象基底クラス `AbstractStocksGateway` を作成し、コンストラクタで `baseURL` を受け取るパターンに変更する。各サブクラスは `super(configService.get('services.serviceX.url'))` を呼ぶだけにする。

### 🟢 Nice to have

#### [frontend/src/components/features/stocks/stock-card.tsx:1] 不要な `'use client'` ディレクティブ
**問題**: `StockCard` は hooks・イベントハンドラ・ブラウザ API を使用しない純粋な表示コンポーネントだが、`'use client'` が付与されている。
**理由**: DEVELOPMENT_RULES.md で「Server Component を優先。インタラクティブな部分のみ `'use client'`」と規定されている。親コンポーネントが Client Component なので実害はないが、ルールとの整合性の観点で指摘。
**修正案**: `'use client'` を削除する。

#### [frontend/src/app/stocks/page.tsx] 株価一覧ページがトップページと同じフックを使用
**問題**: `StocksPage` が `usePopularStocks()` を使用しており、トップページと同一の人気TOP5データのみを表示する。「株価一覧」ページとしての機能（全銘柄表示・検索・ソート等）が未実装。
**理由**: 現時点の Issue #1 のスコープでは問題ないが、「その他の株価を見る」リンクの遷移先として、将来的に差別化が必要。
**修正案**: Issue #1 のスコープ外として、別 Issue で対応を検討。

## 良かった点

- **DIP の正しい実装**: Port（interface）→ Gateway（implements）の依存逆転が正しく構成されており、Usecase は具象 Gateway に一切依存していない。Symbol トークンによる DI 登録も ARCHITECTURE.md のパターンに準拠。
- **Promise.allSettled による耐障害設計**: 片方の Gateway がエラーでも、もう片方の結果で処理を継続できる優れた設計。両方失敗した場合のみ例外をスローする判断も適切。
- **Domain モデルの純粋性**: `Stock` クラスは NestJS/axios への依存がゼロで、プリミティブ値のみを受け取るコンストラクタにより DIP を遵守。単体テストが容易。
- **フロントエンドの責務分離**: API クライアント (`lib/api/`) → フック (`hooks/`) → コンポーネント (`components/features/`) → ページ (`app/`) の層構造が明確で、各層の責務が適切に分離されている。
- **TanStack Query のキーファクトリパターン**: `stockKeys` オブジェクトによるクエリキー管理は、キャッシュ無効化の拡張性が高い良い実装。
- **エラー UI の実装**: フロントエンドで `isError` 時に「現在株価を表示できません。」を表示しており、BDD シナリオ SC-6 の要件を満たしている。
