# ADR-0006: クライアントサイドデータ管理にTanStack Queryを採用

- **ステータス**: 採用
- **決定日**: 2026-03-15
- **決定者**: アーキテクチャチーム
- **関連ADR**: ADR-0003

## 背景・課題

Next.js App RouterではServer ComponentでBFFからデータを取得できるが、以下のユースケースではクライアントサイドでのデータフェッチが必要になる。

- ユーザー操作（フォーム送信、ボタンクリック）に応じたデータ更新後の画面再描画
- ページ遷移なしのリアルタイム的なデータ更新（楽観的更新）
- クライアントサイドでのキャッシュ・ローディング・エラー状態の管理

これらを `useState` + `useEffect` で手書きすると、ローディング状態、エラー状態、キャッシュ、再取得ロジックが各コンポーネントに散在し、コードの重複と不整合が発生する。

## 決定内容

クライアントサイドのサーバー状態管理に **TanStack Query（旧React Query）v5** を採用する。

使い方の原則:
- `useQuery`: データの取得（GET）
- `useMutation`: データの変更（POST/PUT/PATCH/DELETE）後に `queryClient.invalidateQueries` でキャッシュを無効化
- クエリキーは `src/hooks/` 内の各フックファイルで定数として管理（`userKeys`, `postKeys` 等）

```typescript
// クエリキーの管理例
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: GetUsersParams) => [...userKeys.lists(), params] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};
```

## 理由

- **ローディング・エラー・成功状態の自動管理**: `isLoading`, `error`, `data` が自動で管理され、コンポーネントは状態に応じたUIを描画するだけでよい
- **自動キャッシュ・再検証**: 同じクエリキーに対して一定時間内なら再フェッチせず、バックグラウンドでの再検証も自動化される
- **楽観的更新**: `useMutation` の `onMutate` / `onError` / `onSettled` でUI先行更新 → エラー時ロールバックが簡単に実装できる
- **Next.js App Routerとの住み分けが明確**:
  - 初期データ取得・SEO必要なデータ → Server Component + `fetch()`
  - ユーザー操作後の動的更新 → TanStack Query
- **DevTools**: `@tanstack/react-query-devtools` でキャッシュ状態を開発中に可視化できる

## 検討した代替案

| 案 | 概要 | 却下理由 |
|---|---|---|
| SWR | Vercel製のデータフェッチライブラリ | TanStack Queryの方が機能が豊富（楽観的更新、クエリの依存関係など）。Next.jsプロジェクトでも特にSWRが必須の理由はない |
| Zustand + 手動fetch | グローバル状態管理 + APIコール | サーバー状態（APIデータ）とクライアント状態（UIの状態）を混在させると複雑になる。TanStack Queryはサーバー状態に特化している |
| Redux Toolkit Query | RTKに組み込まれたデータフェッチ | Reduxの学習コスト・ボイラープレートが大きい。サーバー状態のみであればTanStack Queryの方がシンプル |
| useState + useEffect（手書き） | 自前でキャッシュ・ローディング管理 | キャッシュ制御・レース条件・エラーリカバリを正しく実装するのは難易度が高く、バグの温床になりやすい |

## 結果・影響

### メリット
- コンポーネント内のデータフェッチロジックが `useQuery(...)` 1行に集約される
- 同じデータを複数コンポーネントが取得しようとしても、重複リクエストが自動的に排除される（deduplication）
- ページをまたいだキャッシュの共有が可能

### デメリット・トレードオフ
- `QueryClientProvider` でアプリをラップする必要があり、Client Componentが必要（`'use client'`）
- Server ComponentとClient Component間でTanStack Queryのキャッシュを共有する場合、`dehydrate` / `HydrationBoundary` を使った追加実装が必要（現在は未実装）

### 対応が必要なこと
- Server ComponentでプリフェッチしたデータをTanStack Queryのキャッシュに注入する場合は `dehydrate()` + `HydrationBoundary` パターンを使う（必要時に実装）
- `staleTime` のデフォルト値（現在60秒）はエンドポイントの性質に応じて個別調整が必要
