# 受け入れ検証レポート - Issue #1

検証日時: 2026-03-21
検証者: Claude Code

## 機能概要

人気トップ5株銘柄のレート情報表示

- ログイン後トップページに人気上位5銘柄の株価カードを表示
- 2つのダウンストリームサービス（Service A / B）からデータを取得し、共通銘柄は平均値、片方のみ存在する銘柄はそのまま表示
- BFF（NestJS）→ Frontend（Next.js）の Clean Architecture 実装

## BDD シナリオ検証結果

| シナリオID | シナリオ名 | 結果 |
|---|---|---|
| SC-1 | ログイン後トップページで人気上位5銘柄の株価カードが表示される | ✅ Pass |
| SC-2 | 株価表示カードセクションの「その他の株価を見る」で株価一覧ページへ遷移 | ✅ Pass |
| SC-3 | カード内に銘柄名・円建て株価・ドル建て株価・前日比(%)が表示される | ✅ Pass |
| SC-4 | 両システムに存在する銘柄は2システムの平均値が表示される | ✅ Pass |
| SC-5 | 片方のシステムにのみ存在する銘柄はその値がそのまま表示される | ✅ Pass |
| SC-6 | 両システムともAPIエラー時に「現在株価を表示できません。」が表示される | ✅ Pass |

## ユニットテスト結果

| 対象 | テスト数 | 結果 |
|---|---|---|
| BFF (NestJS) | 37 | ✅ 全Pass (9 suites) |
| Frontend (Next.js) | 19 | ✅ 全Pass (6 files) |

## カバレッジ

- BFF: Jest デフォルト（カバレッジレポート別途）
- Frontend: 44.62% (Statements) / 67.85% (Branch) / 38.88% (Functions)

## 型チェック

- BFF: `npx tsc --noEmit` → ✅ エラーなし
- Frontend: `npx tsc --noEmit` → ✅ エラーなし

## モック境界

- **モック対象**: Downstream Service A (port 4001) / Service B (port 4002) — `mock-server.mjs` で提供
- **実サーバー**: BFF (port 3001 / NestJS)、Frontend (port 3000 / Next.js)、認証フロー

## 実装ファイル一覧

### BFF (NestJS)

- `bff/src/modules/stocks/domain/stock.ts` — ドメインモデル（100株→1株変換）
- `bff/src/modules/stocks/port/stocks.gateway.port.ts` — Gateway インターフェース
- `bff/src/modules/stocks/gateway/stocks-service-a.gateway.ts` — Service A クライアント
- `bff/src/modules/stocks/gateway/stocks-service-b.gateway.ts` — Service B クライアント
- `bff/src/modules/stocks/usecase/get-popular-stocks.usecase.ts` — ユースケース（平均値計算）
- `bff/src/modules/stocks/dto/stock-response.dto.ts` — レスポンス DTO
- `bff/src/modules/stocks/stocks.controller.ts` — コントローラー
- `bff/src/modules/stocks/stocks.module.ts` — モジュール定義
- `bff/src/arch/arch.spec.ts` — アーキテクチャテスト（DIP検証）

### Frontend (Next.js)

- `frontend/src/types/stock.ts` — 型定義
- `frontend/src/lib/api/stocks.ts` — API クライアント
- `frontend/src/hooks/use-popular-stocks.ts` — React Query フック
- `frontend/src/components/features/stocks/stock-card.tsx` — 株価カードコンポーネント
- `frontend/src/components/features/stocks/popular-stocks-section.tsx` — セクションコンポーネント
- `frontend/src/app/stocks/page.tsx` — 株価一覧ページ
- `frontend/src/app/page.tsx` — トップページ（PopularStocksSection 追加）

### その他

- `bff/mock-server.mjs` — Downstream モックサーバー（Service A/B）
- `frontend/e2e/stocks.spec.ts` — E2E テスト（Playwright）
- `frontend/e2e/features/stocks.feature` — BDD Feature ファイル

## 総合判定

✅ 全シナリオ Pass → Issue #1 クローズ可能
