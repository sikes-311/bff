# ADR-0003: フロントエンドにNext.js App Routerを採用

- **ステータス**: 採用
- **決定日**: 2026-03-15
- **決定者**: アーキテクチャチーム
- **関連ADR**: ADR-0006

## 背景・課題

フロントエンドフレームワークとして、BFFと連携するSPA/SSRアプリケーションを構築する必要があった。要件は以下の通り。

- TypeScriptサポートが充実していること
- SEO対応（SSR/SSG）が可能なこと
- BFF（NestJS）との通信が自然に実装できること
- 開発者体験（DX）が良好であること
- App Router（Next.js 13+）の使用で、React Server Componentsの恩恵を受けられること

## 決定内容

フロントエンドに **Next.js 14+（App Router）** を採用する。

ルーティング方針:
- `src/app/` 配下のファイルシステムベースルーティング
- 機能別 Route Group `(feature)` でページをグループ化
- デフォルトは **Server Component**。インタラクティブな部分のみ `'use client'` を付与

## 理由

- **React Server Components (RSC)**: サーバーサイドでデータを取得・レンダリングすることで、クライアントへのJavaScriptバンドルを削減し、初期表示を高速化できる
- **Next.js rewrites**: `next.config.ts` の `rewrites` を使い、フロントエンドから `/api/*` へのリクエストをBFFへ透過的にプロキシできる。これにより本番環境のCORS問題を回避し、ブラウザからBFFのURLが見えない
- **ファイルシステムルーティング**: `app/` 配下のディレクトリ構造がそのままURLになり、ページの追加・削除が直感的
- **`error.tsx` / `not-found.tsx`**: ページレベルのエラーハンドリングがファイル規約で統一され、漏れがなくなる
- **TypeScript first**: 設定なしでTypeScriptが使える

## 検討した代替案

| 案 | 概要 | 却下理由 |
|---|---|---|
| Next.js Pages Router | 旧来のNext.jsルーティング | App RouterはReact Server ComponentsとSuspenseに対応しており、今後のReactエコシステムの方向性と一致している。新規プロジェクトでPages Routerを選ぶ理由がない |
| Remix | React Router v7ベースのフルスタックフレームワーク | loader/action パターンは強力だが、チームのNext.js経験を活かすためNext.jsを優先 |
| Vite + React SPA | 軽量・高速な開発環境 | SSR・SSG・ファイルシステムルーティングが標準提供されないため、BFFとの統合やSEO対応で追加実装が必要になる |
| Nuxt.js (Vue) | Vue.jsベースのフルスタックフレームワーク | チームがReact/TypeScriptに習熟しているため却下 |

## 結果・影響

### メリット
- BFF（`localhost:3001`）へのプロキシを `next.config.ts` の `rewrites` で設定することで、開発中のCORS設定が不要になる
- Server Componentでの `fetch()` キャッシュ制御（`next: { revalidate: 60 }`）により、BFFへの不要なリクエストを削減できる
- `app/loading.tsx` と `Suspense` でローディングUIの実装が容易

### デメリット・トレードオフ
- App Routerの「Server Component と Client Component の境界」に関する学習コストがある（特に `useState` / `useEffect` はClient Componentのみ）
- Pages Routerとの混在は不可。既存Pages Routerプロジェクトからの移行は別途計画が必要

### 対応が必要なこと
- Server ComponentとClient Componentの使い分けをチームで共通認識にする
  - 原則: データ取得・静的表示 → Server Component
  - インタラクション・ブラウザAPI・React hooks → Client Component (`'use client'`)
- `next.config.ts` の `rewrites` で本番環境のBFF URLを環境変数から読み込むよう設定する（実施済み）
