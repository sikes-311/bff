# コードレビューレポート - Issue #2 (SC-9)

レビュー日時: 2026-03-21
レビュアー: code-review-agent

## サマリー

| 重要度 | 件数 |
|---|---|
| 🔴 Must（リリース前に修正必須） | 1件 |
| 🟡 Should（できれば修正） | 3件 |
| 🟢 Nice to have（次回以降でOK） | 2件 |

## 指摘事項

### 🔴 Must

#### [bff/src/modules/stocks/stocks.controller.ts:16 + usecase/get-stock-chart.usecase.ts:17] VALID_PERIODS バリデーションの重複（DRY違反）
**問題**: `VALID_PERIODS` 定数と period バリデーションロジックが Controller（L16, L49-53）と Usecase（L17, L29-33）の両方に重複定義されている。
**理由**: 片方だけ更新してもう片方を更新し忘れるリスクがある。DEVELOPMENT_RULES では「Controller は HTTP リクエスト/レスポンスのみを担当」「ビジネスロジックは Service に委譲」と規定されている。バリデーションを両方で行うのは防御的プログラミングとも言えるが、同じ定数・ロジックの重複は避けるべき。
**修正案**: 以下のいずれかを選択する:
1. **推奨**: Controller では DTO クラス（class-validator の `@IsIn()` デコレータ）でバリデーションし、Usecase 側の重複バリデーションを削除する。Controller の `VALID_PERIODS` 定数も不要になる。
2. **代替**: Usecase のバリデーションに統一し、Controller からは `VALID_PERIODS` と if 文を削除する。

### 🟡 Should

#### [bff/src/modules/stocks/stocks.controller.ts:47] period パラメータに DTO クラスを使用していない
**問題**: `@Query('period') period: string = '6m'` とプリミティブで受け取り、手動で `as ChartPeriod` キャストしている。
**理由**: DEVELOPMENT_RULES では「DTOで入力バリデーション」「class-validator + class-transformer を使用」と規定されている。既存の `getPopularStocks` はクエリパラメータがないため問題なかったが、chart エンドポイントでは Query DTO クラスを作成して `@IsIn(['6m', '1y', '2y', '10y'])` 等で宣言的にバリデーションするのが規約に沿う。
**修正案**: `GetStockChartQueryDto` クラスを作成し、`@IsIn(VALID_PERIODS)` でバリデーションする。

#### [frontend/src/app/stocks/[name]/chart/page.tsx:23] `as ChartPeriod` の型キャスト
**問題**: `e.target.value as ChartPeriod` と型をキャストしている。select の option が固定値なので実行時には安全だが、`stocks/page.tsx` の `isSortOrder` 型ガードと実装方針が不統一。
**理由**: 同じプロジェクト内で型安全の扱いが不統一だと、どちらが正しいパターンか後から判断しにくくなる。DEVELOPMENT_RULES では「`as unknown as T` 等の強制キャストが使われていないか」を確認するよう求めている。
**修正案**: `stocks/page.tsx` と同様に `isChartPeriod` 型ガード関数を作成し、`setPeriod` の前に検証する。

#### [bff/src/modules/stocks/stocks.controller.ts:46] name パスパラメータのバリデーション不足
**問題**: `@Param('name') name: string` がそのまま Usecase に渡されており、長さ制限やパターン制限がない。
**理由**: DEVELOPMENT_RULES では「外部API・ユーザー入力の型は class-validator で実行時バリデーション」と規定されている。悪意のある長い文字列や特殊文字がそのままダウンストリームに転送される可能性がある。Gateway 側で `encodeURIComponent` が使われているためパストラバーサルのリスクは低いが、入力バリデーションは入口で行うべき。
**修正案**: Param DTO を作成し、`@MaxLength(50)` `@Matches(/^[\p{L}\p{N}\s]+$/u)` 等で銘柄名のバリデーションを行う。

### 🟢 Nice to have

#### [bff/src/modules/stocks/gateway/stock-chart-service-a.gateway.ts + stock-chart-service-b.gateway.ts] Gateway A/B のコード重複
**問題**: 2つの Gateway はロガー名・エラーメッセージ・ConfigService のキー以外が完全に同一。既存の `stocks-service-a/b.gateway.ts` も同じパターンなのでプロジェクト全体の一貫性はある。
**理由**: 現時点で2ファイルなので許容範囲だが、今後チャート以外のメソッドが増えた場合に保守コストが上がる。
**修正案**: 将来的に抽象基底クラスを導入してサービスURL・ラベルのみをサブクラスで指定するパターンを検討する。

#### [bff/src/modules/stocks/usecase/get-stock-chart.usecase.ts:15] ChartPeriod 型の export 先
**問題**: `ChartPeriod` 型が Usecase ファイルから export されており、Controller がこれを import している。型定義は独立したファイル（`types/` や `dto/`）に置く方が依存方向が整理される。
**理由**: Usecase がドメインロジックと型定義の両方を担っており、責務が混在している。
**修正案**: `ChartPeriod` 型を DTO ディレクトリまたは独立した型ファイルに移動する。

## 良かった点

1. **アーキテクチャ準拠**: Port → Gateway → Domain → Usecase → Controller の依存方向が正しく守られている。DIP が適切に実装されている。
2. **DTO の `!` マーク**: `stock-chart-response.dto.ts` の全プロパティに `!` が付与されており、DEVELOPMENT_RULES 準拠。
3. **Swagger デコレータ**: Controller に `@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery` が適切に付与されている。
4. **Domain モデルの設計**: `StockChartPoint` がプレーンな TypeScript クラスでフレームワーク依存がなく、テスト容易性が高い。
5. **フォールバック設計**: Usecase で `Promise.allSettled` を使い、片方のサービスが落ちても他方のデータで応答する設計が優れている。
6. **セキュリティ**: Gateway・API クライアント両方で `encodeURIComponent` を使用しており、パスインジェクション対策が適切。
7. **フロントエンド設計**: API クライアント（`lib/api/`）→ Hook（`hooks/`）→ Page の責務分離が明確。TanStack Query の queryKey 設計も適切。
8. **`data-testid` 属性**: チャートページの各要素に `data-testid` が付与されており、E2E テストとの連携が容易。
9. **エラー表示**: チャートページに Loading / Error / Success の3状態が適切にハンドリングされている。
10. **モジュール登録**: `stocks.module.ts` で Port → Gateway の DI バインディングが既存パターンと統一的に記述されている。
