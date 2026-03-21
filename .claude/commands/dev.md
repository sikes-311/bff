# /dev - Issue 実装コマンド

`/planning` で生成した計画書をもとに、BDDテスト作成・シナリオ単位の並行実装・受け入れ検証までを自動化します。

**使い方**: `/dev <issue番号>`  例: `/dev 42`

**前提**: `docs/issues/{issue番号}/plan.md` が存在すること（`/planning <issue_url>` で生成）

---

## このコマンドが実行するプロセス

```
Step 1: plan.md 読み込み        → 計画書から設計・シナリオ・タスク計画を取得
         ↓
Step 2: BDDテストファイル作成   → Playwright + Cucumber の実行可能テストを生成
         ↓
         ┌─────────────────────────────────────────┐
         │  Step 3: シナリオループ（全シナリオ完了まで繰り返す）  │
         │                                         │
         │  3-1: 並行開発チーム起動（対象シナリオに絞る）    │
         │  3-2: BDDテスト実行                       │
         │  3-3: Fail → Playwright MCPで修正 (繰り返し) │
         │  3-4: Pass → ユーザーにコードレビュー確認      │
         │  3-5: OK → 次のシナリオへ                  │
         └─────────────────────────────────────────┘
         ↓
Step 4: 最終受け入れ検証         → 全シナリオPass確認・レポート作成
```

---

## Step 1: plan.md 読み込み

以下のファイルを読み込み、実装に必要な情報を取得してください。

```bash
cat docs/issues/$ARGUMENTS/plan.md
```

取得する情報:
- **機能概要・影響範囲**
- **APIコントラクト**: エンドポイント・型定義（`shared/types/` 参照）
- **BDD シナリオ一覧**: シナリオID（SC-1, SC-2, ...）・シナリオ詳細（Gherkin）
- **タスク計画**: 担当エージェント・依存関係
- **既存機能への影響調査結果**: High/Medium リスクへの対処が必要か確認

plan.md が存在しない場合は以下を出力して終了してください。

```
❌ docs/issues/$ARGUMENTS/plan.md が見つかりません。
先に /planning <issue_url> を実行して計画書を生成してください。
```

---

## Step 2: BDD テストファイル作成

plan.md の「シナリオ詳細（Gherkin）」をもとに、実行可能なテストファイルを生成します。

### 2-1. Feature ファイルの生成

**`frontend/e2e/features/{feature}.feature`**:
- plan.md の Gherkin をそのままファイルに書き出す

### 2-2. Step Definitions の生成

**`frontend/e2e/steps/{feature}.steps.ts`**:

```typescript
import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { chromium, Browser, Page } from '@playwright/test';
import { expect } from '@playwright/test';

let browser: Browser;
let page: Page;

Before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
});

After(async () => {
  await browser.close();
});

// Background
Given('ユーザーがログイン済みである', async () => {
  await page.goto('http://localhost:3000/login');
  // ログイン処理
});

// SC-1 のステップ定義
Given('{前提条件}', async () => { ... });
When('{操作}', async () => { ... });
Then('{期待結果}', async () => { ... });
```

### 2-3. Cucumber 設定（未作成の場合のみ生成）

**`frontend/cucumber.config.ts`**:
```typescript
export default {
  default: {
    paths: ['e2e/features/**/*.feature'],
    require: ['e2e/steps/**/*.steps.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress', 'json:e2e/reports/cucumber-report.json'],
  },
};
```

**`frontend/package.json` スクリプト追加**（未設定の場合）:
```json
{
  "scripts": {
    "test:e2e": "cucumber-js",
    "test:e2e:scenario": "cucumber-js --tags"
  }
}
```

生成後に `cd frontend && npx tsc --noEmit` で型エラーがないことを確認してください。

---

## Step 3: シナリオ単位の並行開発ループ

plan.md のシナリオIDリスト（SC-1, SC-2, ...）を取得し、**1シナリオずつ**以下のループを実行してください。

```
current_scenario = SC-1
while シナリオが残っている:
  3-1: 並行開発チーム起動
  3-2: BDDテスト実行
  3-3: Fail → 修正ループ
  3-4: Pass → ユーザーにコードレビュー確認
  3-5: OK → current_scenario = 次のシナリオ
```

### 3-1. 並行開発チームの起動

対象シナリオの実装に必要なエージェントを起動します。

**チーム作成**:
```
TeamCreate({ team_name: "issue-{issue番号}-{シナリオID}", description: "Issue #{issue番号} {シナリオID} 実装チーム" })
```

**タスク作成と起動エージェント**:

| タスクID | 担当エージェント | 内容 |
|---|---|---|
| #1 | backend-agent | BFF実装（対象シナリオに必要なエンドポイント・Usecase・Gateway・DTO） |
| #2 | frontend-agent | フロントエンド実装（対象シナリオに必要なページ・コンポーネント） |
| #3 | backend-test-agent | BFF ユニットテスト（#1完了後） |
| #4 | frontend-test-agent | フロントエンド ユニットテスト（#2完了後） |
| #5 | code-review-agent | 内部品質レビュー（#1〜#4完了後） |
| #6 | security-review-agent | セキュリティレビュー（#1〜#2完了後） |

依存関係:
```
TaskUpdate({ taskId: '3', addBlockedBy: ['1'] })
TaskUpdate({ taskId: '4', addBlockedBy: ['2'] })
TaskUpdate({ taskId: '5', addBlockedBy: ['1', '2', '3', '4'] })
TaskUpdate({ taskId: '6', addBlockedBy: ['1', '2'] })
```

各エージェントへの指示に必ず含めること:
- 対象シナリオID と `docs/issues/{issue番号}/plan.md` への参照
- `frontend/e2e/features/{feature}.feature` と `frontend/e2e/steps/{feature}.steps.ts` への参照
- `ARCHITECTURE.md`, `DEVELOPMENT_RULES.md` への参照
- `shared/types/{feature}.ts` への参照（型コントラクト）
- **完了条件**: `npx tsc --noEmit` エラーなし + lint エラーなし + ユニットテスト全パス
- **完了後**: TaskUpdate(completed) → SendMessage で team-lead に結果報告

全エージェント完了後、チームをシャットダウンしてください。

### 3-2. BDD テスト実行

BFF・Frontend サーバーを起動し、対象シナリオのテストを実行します。

```bash
# BFF 起動（バックグラウンド）
cd bff && npm run start:dev &

# Frontend 起動（バックグラウンド）
cd frontend && npm run dev &

# サーバー起動待機
sleep 5

# 対象シナリオのみ実行
cd frontend && npm run test:e2e:scenario "@{シナリオID}"
```

### 3-3. Fail の場合 — 修正ループ

テストが失敗した場合、以下を繰り返します（最大5回）。

```
while テスト Fail かつ 試行回数 < 5:
  a) Playwright MCP でブラウザを操作し、実際の画面・エラーを確認する
  b) 失敗原因を特定する:
     - Step Definition のセレクタ・アサーションが間違い → frontend/e2e/steps/ を修正
     - 実装コードのバグ → backend-agent / frontend-agent に修正依頼
     - サーバーが起動していない / API エラー → 環境を確認
  c) 修正後、テストを再実行する
  d) Pass になれば 3-4 へ進む
```

**Playwright MCP の使い方**:
- `playwright_navigate` でページを開く
- `playwright_screenshot` でスクリーンショットを取得して画面状態を確認
- `playwright_click` / `playwright_fill` で操作を再現

修正試行が5回を超えても Pass しない場合は、ユーザーに状況を報告して判断を仰いでください。

### 3-4. Pass — ユーザーにコードレビュー確認

テストが Pass したら、以下をユーザーに提示して確認を求めてください。

```
シナリオ {シナリオID}: {シナリオ名} ✅ Pass しました。

## 変更ファイル一覧
{git diff --stat の出力}

## ユニットテスト結果
BFF: {N}件パス
Frontend: {N}件パス

## BDD テスト結果
✅ {シナリオ名} — Pass

コードレビューをお願いします。
次のシナリオ（{次のシナリオID}: {次のシナリオ名}）に進んでよいですか？ [yes/no]
```

ユーザーが **yes** と回答したら次のシナリオへ進みます。
**no** の場合は指摘内容に従い修正してから再度確認を求めてください。

### 3-5. 次のシナリオへ

全シナリオが完了するまで 3-1〜3-4 を繰り返します。

---

## Step 4: 最終受け入れ検証

全シナリオのコードレビューが承認されたら実施します。

### 4-1. ビルド検証

```bash
cd bff && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```

### 4-2. 全ユニットテスト実行

```bash
cd bff && npm test -- --coverage
cd ../frontend && npm test -- --coverage
```

### 4-3. 全 BDD シナリオ一括実行

```bash
cd frontend && npm run test:e2e
```

全シナリオが Pass することを確認します。

### 4-4. 検証レポート作成

`docs/issues/{issue番号}/acceptance-report.md` に保存:

```markdown
# 受け入れ検証レポート - Issue #{issue番号}

検証日時: YYYY-MM-DD
検証者: Claude Code

## BDD シナリオ検証結果

| シナリオID | シナリオ名 | 結果 | 備考 |
|---|---|---|---|
| SC-1 | {シナリオ名} | ✅ Pass | |
| SC-2 | {シナリオ名} | ✅ Pass | |

## カバレッジ
- BFF: XX%
- Frontend: XX%

## 総合判定
✅ 全シナリオ Pass → Issue クローズ可能
```

### 4-5. Issue にレポートをコメント（ユーザーの承認後）

ユーザーに確認を求めてから実行してください。

```bash
gh issue comment $ARGUMENTS --body "$(cat docs/issues/$ARGUMENTS/acceptance-report.md)"
```

---

## 各エージェントの役割定義

詳細は `.claude/agents/` 配下の各ファイルを参照してください。

- [backend-agent](./../agents/backend-agent.md)
- [frontend-agent](./../agents/frontend-agent.md)
- [backend-test-agent](./../agents/backend-test-agent.md)
- [frontend-test-agent](./../agents/frontend-test-agent.md)
- [code-review-agent](./../agents/code-review-agent.md)
- [security-review-agent](./../agents/security-review-agent.md)
