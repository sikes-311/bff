# /dev - Issue駆動チーム開発コマンド

GitHubのIssueを起点に、設計・BDDテスト作成・シナリオ単位の並行実装・受け入れ検証までを自動化します。

**使い方**: `/dev <issue_url>`  例: `/dev https://github.com/org/repo/issues/42`

---

## このコマンドが実行するプロセス

```
Step 1: Issue分析              → Issueの内容・受け入れ基準を把握
Step 2: 設計 & タスク分解       → アーキテクチャ影響範囲・APIコントラクト定義
Step 2.5: 既存機能への影響調査   → 既存コードへの破壊的変更リスクを洗い出す
           ↓ ユーザー確認・承認
Step 3: BDDテストファイル作成   → Playwright + Cucumber の実行可能テストを生成
         ↓
         ┌─────────────────────────────────────────┐
         │  Step 4: シナリオループ（全シナリオ完了まで繰り返す）  │
         │                                         │
         │  4-1: 並行開発チーム起動（対象シナリオに絞る）    │
         │  4-2: BDDテスト実行                       │
         │  4-3: Fail → Playwright MCPで修正 (繰り返し) │
         │  4-4: Pass → ユーザーにコードレビュー確認      │
         │  4-5: OK → 次のシナリオへ                  │
         └─────────────────────────────────────────┘
         ↓
Step 5: 最終受け入れ検証         → 全シナリオPass確認・レポート作成
```

---

## Step 1: Issue 分析

以下のコマンドでIssueの詳細を取得してください。

```bash
gh issue view $ARGUMENTS --json title,body,labels,assignees,milestone,comments
```

取得した内容から以下を抽出・整理してください。

- **機能概要**: 何を実装するか
- **受け入れ基準 (Acceptance Criteria)**: 完了条件のリスト（シナリオ候補）
- **影響範囲**: フロントエンド / BFF / 両方 / その他
- **非機能要件**: パフォーマンス・セキュリティ・アクセシビリティ等の要件

整理結果を `docs/issues/{issue番号}/analysis.md` に保存してください。

---

## Step 2: 設計 & タスク分解

`ARCHITECTURE.md` と `DEVELOPMENT_RULES.md` を参照し、以下を決定してください。

### 2-1. 設計判断

- 新規エンドポイントが必要か → BFF のどのモジュールに追加するか
- 新規ページ・コンポーネントが必要か → フロントエンドのどのディレクトリか
- 既存コードへの影響範囲（破壊的変更の有無）
- 必要であれば ADR を追加（`docs/adr/XXXX-*.md`）

### 2-2. 型・APIコントラクト定義（必須）

**実装エージェント起動前に** フロントエンドとBFF間のインターフェースを確定してください。

`shared/types/{feature}.ts` に以下を定義します。
```typescript
// リクエスト型
export type Create{Feature}Request = { ... };

// レスポンス型
export type {Feature}Response = { ... };
export type {Feature}ListResponse = { ... };
```

設計サマリーを `docs/issues/{issue番号}/design.md` に保存してください。

---

## Step 2.5: 既存機能への影響調査

**Step 3 に進む前に必ず実施してください。**

今回の実装変更が既存機能の振る舞いを壊す可能性を洗い出します。

### 調査方針

以下の観点でコードベースを調査し、リスクのある箇所を特定してください。

#### 1. ビジネスロジック・意味的な変更リスク（最重要）

コードが壊れなくても、**意味・振る舞いが変わってしまう**ケースを特定します。

調査すべき質問:

- **新しい値・状態の追加**: 新しいステータス・区分・状態が追加される場合、既存の条件分岐でその値が考慮されていないケースはないか？
  - 例: `if (status === 'active')` という条件が他の場所にある場合、新ステータスはこの条件を通過してしまわないか
  - 例: 特定ステータスのみ許可していた操作（購入・削除・承認など）が、新ステータスに対しても誤って許可・拒否されないか

- **既存の網羅条件の崩れ**: `switch` 文・ガード節・フィルタ条件が「既存の全パターンを網羅している前提」で書かれていないか？
  - 例: `switch(status) { case 'A': ... case 'B': ... default: throw }` の `default` が新ステータスで予期せずスローする
  - 例: `status !== 'inactive'` という否定条件が、新ステータスを誤って「inactive でない = 有効」と扱う

- **集計・一覧の意味変化**: 今回の追加・変更により、既存の一覧取得・集計結果が変わらないか？
  - 例: 全会員数の集計に新ステータスの会員が含まれることが適切か
  - 例: 「有効な○○の一覧」に新しく追加されたデータが混入することが適切か

- **権限・アクセス制御の穴**: 新機能の追加により、認可ルールに抜け穴が生まれないか？
  - 例: 新ロールが既存の `@Roles('admin', 'user')` ガードを通過してしまわないか

- **外部サービス・連携への影響**: 今回の変更が外部 API・メール送信・通知などの連携処理に影響しないか？
  - 例: 新ステータスの場合にも通知メールが送られてしまわないか

調査方法:
```bash
# 変更対象のモデル・ステータス・区分を参照している条件分岐を検索
grep -rn "status\|role\|type\|state" --include="*.ts" --include="*.tsx" . | grep -i "{変更対象キーワード}"

# switch 文や if 条件でハードコードされた値を検索
grep -rn "case '{既存の値}'\|=== '{既存の値}'\|!== '{既存の値}'" --include="*.ts" --include="*.tsx" .
```

#### 2. データモデル・型の変更リスク

- 今回追加・変更するフィールドが既存コードから参照されていないか
- nullable / optional になるフィールドがあれば、既存の参照箇所で `null` チェックが漏れていないか
- 型の変更（string → number など）がある場合、既存の利用箇所で型エラーが発生しないか

```bash
# 変更予定のフィールド名・型名を既存コードから検索
grep -r "{変更予定のフィールド名}" --include="*.ts" --include="*.tsx" .
```

#### 3. API レスポンス変更のリスク

- 今回変更・追加するエンドポイントを既存のフロントエンドコードが利用していないか
- レスポンス構造が変わる場合、既存のクライアントコードが壊れないか
- 既存のテスト（spec.ts / test.tsx）でハードコードされたレスポンス形式がないか

```bash
# 変更予定のエンドポイントパスを検索
grep -r "{エンドポイントパス}" --include="*.ts" --include="*.tsx" .
```

#### 4. 共有モジュール・共通コンポーネントの変更リスク

- 今回変更するモジュール・コンポーネントを他の機能が import していないか
- 共通 DTO / 型定義を変更する場合、他の機能への波及がないか

```bash
# 変更予定のモジュール名・コンポーネント名の import を検索
grep -r "from.*{変更予定のモジュール}" --include="*.ts" --include="*.tsx" .
```

#### 5. 既存テストへの影響

- 既存のユニットテスト・e2e テストが今回の変更により失敗しないか
- モックデータが今回の型変更と整合しているか
- 既存テストのアサーションが今回の意味的変化を検知できているか（できていない場合、テストが通っても実は壊れているケース）

### 調査結果のドキュメント化

`docs/issues/{issue番号}/impact-analysis.md` に以下の形式で保存してください。

```markdown
# 影響調査レポート - Issue #{issue番号}

## 調査対象の変更内容
{今回追加・変更する機能の概要}

## リスク一覧

> リスク種別:
> - 🧠 意味的リスク … コードは動くが、ビジネス上の振る舞い・意味が変わってしまうリスク
> - 💥 技術的リスク … 型エラー・null 参照・API 破壊など、コードが壊れるリスク

### 🔴 High リスク（既存機能への影響が確実・または高確率）

| # | 種別 | 影響機能 | ファイルパス:行 | リスク内容 | 対処方針 |
|---|------|---------|--------------|-----------|---------|
| 1 | 🧠 意味的 | {機能名} | {パス}:{行} | 例: 新ステータス追加により、既存の `if (status === 'active')` が新ステータスを誤って処理する | {修正方針} |
| 2 | 💥 技術的 | {機能名} | {パス}:{行} | 例: nullable になったフィールドを null チェックなしで参照している | {修正方針} |

### 🟡 Medium リスク（条件次第で影響する可能性がある）

| # | 種別 | 影響機能 | ファイルパス:行 | リスク内容 | 対処方針 |
|---|------|---------|--------------|-----------|---------|

### 🟢 Low リスク（影響なしと判断するが念のため確認）

| # | 種別 | 影響機能 | ファイルパス:行 | リスク内容 | 対処方針 |
|---|------|---------|--------------|-----------|---------|

## 影響なしと判断した根拠
{変更が既存機能に影響しないと判断した理由。「調査したが該当コードなし」も明記すること}

## タスク追加提案
{High/Medium リスクへの対処を Step 4 のタスクに追加する提案。意味的リスクへの対処は必ず含めること}
```

### タスク計画への反映

High / Medium リスクが見つかった場合、Step 2 で作成したタスク計画に追加タスクを組み込みます。

例:
```
TaskCreate({ subject: "既存{機能名}の{フィールド名} null チェック追加", description: "..." })
TaskUpdate({ taskId: '新タスクID', addBlockedBy: ['関連するタスクID'] })
```

### ユーザーへの確認（必須）

調査結果をユーザーに提示し、**計画の承認を得てから Step 3 へ進んでください**。

提示フォーマット:
```
## 既存機能への影響調査結果

{impact-analysis.md の内容サマリー}

## 更新後のタスク計画

| タスクID | 内容 | 担当 | ブロッカー |
|---------|------|------|---------|
{タスク一覧}

この計画で問題ありませんか？ [yes / 修正内容を記載]
```

ユーザーが **yes** と回答したら Step 3 へ進みます。
修正が必要な場合は指示に従い計画を更新し、再度確認を求めてください。

---

## Step 3: BDD テストファイル作成

受け入れ基準をもとに、**Playwright + Cucumber の実行可能なテストファイル**を生成します。

### 3-1. シナリオ一覧の整理

`docs/issues/{issue番号}/bdd-scenarios.md` に全シナリオを Gherkin 形式で定義します。
各シナリオには **シナリオID（SC-1, SC-2, ...）** を付与します。

```gherkin
Feature: {機能名}
  {Issueから読み取った機能の概要}

  Background:
    Given ユーザーがログイン済みである

  # 受け入れ基準ごとにシナリオIDを付与
  @SC-1
  Scenario: {正常系シナリオ名}
    Given {前提条件}
    When  {操作}
    Then  {期待結果}

  @SC-2
  Scenario: {異常系シナリオ名}
    Given {前提条件}
    When  {不正な操作}
    Then  {エラーが表示される}
```

**ルール**:
- 受け入れ基準を**1つ残らず**シナリオに対応させること
- 正常系・異常系・境界値を網羅すること
- 各シナリオに `@SC-N` タグを付与すること（Step 4 のループで使用）

### 3-2. Feature ファイルと Step Definitions の生成

以下のファイルを生成してください。

**Feature ファイル** (`e2e/features/{feature}.feature`):
- 3-1 で定義した Gherkin をそのままファイルに書き出す

**Step Definitions** (`e2e/steps/{feature}.steps.ts`):
```typescript
import { Given, When, Then, Before } from '@cucumber/cucumber';
import { chromium, Browser, Page } from '@playwright/test';
import { expect } from '@playwright/test';

let browser: Browser;
let page: Page;

Before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
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

**Cucumber 設定** (`cucumber.config.ts`) — 未作成の場合のみ生成:
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

**package.json スクリプト追加** — 未設定の場合:
```json
{
  "scripts": {
    "test:e2e": "cucumber-js",
    "test:e2e:scenario": "cucumber-js --tags"
  }
}
```

生成後に `npx tsc --noEmit` でステップ定義の型エラーがないことを確認してください。

---

## Step 4: シナリオ単位の並行開発ループ

`bdd-scenarios.md` のシナリオIDリスト（SC-1, SC-2, ...）を取得し、**1シナリオずつ**以下のループを実行してください。

```
current_scenario = SC-1
while シナリオが残っている:
  4-1: 並行開発チーム起動
  4-2: BDDテスト実行
  4-3: Fail → 修正ループ
  4-4: Pass → ユーザーにコードレビュー確認
  4-5: OK → current_scenario = 次のシナリオ
```

### 4-1. 並行開発チームの起動

対象シナリオ（例: SC-1）の実装に必要なエージェントを起動します。

**チーム作成**:
```
TeamCreate({ team_name: "issue-{issue番号}-{シナリオID}", description: "Issue #{issue番号} {シナリオID} 実装チーム" })
```

**タスク作成と起動エージェント**:

| タスクID | 担当エージェント | 内容 |
|---|---|---|
| #1 | backend-agent | BFF実装（対象シナリオに必要なエンドポイント・サービス・DTO） |
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
- 対象シナリオID と `docs/issues/{issue番号}/bdd-scenarios.md` への参照
- `e2e/features/{feature}.feature` と `e2e/steps/{feature}.steps.ts` への参照
- `ARCHITECTURE.md`, `DEVELOPMENT_RULES.md` への参照
- `shared/types/{feature}.ts` への参照（型コントラクト）
- **完了条件**: `npx tsc --noEmit` エラーなし + lint エラーなし + ユニットテスト全パス
- **完了後**: TaskUpdate(completed) → SendMessage で team-lead に結果報告

全エージェント完了後、チームをシャットダウンしてください。

### 4-2. BDD テスト実行

BFF・Frontend サーバーを起動し、対象シナリオのテストを実行します。

```bash
# BFF 起動（バックグラウンド）
cd bff && npm run start:dev &

# Frontend 起動（バックグラウンド）
cd frontend && npm run dev &

# サーバー起動待機（数秒）
sleep 5

# 対象シナリオのみ実行
cd frontend && npm run test:e2e:scenario "@{シナリオID}"
```

### 4-3. Fail の場合 — 修正ループ

テストが失敗した場合、以下を繰り返します（最大5回）。

```
while テスト Fail かつ 試行回数 < 5:
  a) Playwright MCP でブラウザを操作し、実際の画面・エラーを確認する
  b) 失敗原因を特定する:
     - Step Definition のセレクタ・アサーションが間違い → e2e/steps/ を修正
     - 実装コードのバグ → backend-agent / frontend-agent に修正依頼
     - サーバーが起動していない / API エラー → 環境を確認
  c) 修正後、テストを再実行する
  d) Pass になれば 4-4 へ進む
```

**Playwright MCP の使い方**:
- `playwright_navigate` でページを開く
- `playwright_screenshot` でスクリーンショットを取得して画面状態を確認
- `playwright_click` / `playwright_fill` で操作を再現
- `playwright_get_visible_text` でテキストを確認

修正試行が5回を超えても Pass しない場合は、ユーザーに状況を報告して判断を仰いでください。

### 4-4. Pass — ユーザーにコードレビュー確認

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
ユーザーが **no** と回答した場合は、指摘内容に従い修正してから再度確認を求めてください。

### 4-5. 次のシナリオへ

全シナリオが完了するまで 4-1〜4-4 を繰り返します。

---

## Step 5: 最終受け入れ検証

全シナリオのコードレビューが承認されたら実施します。

### 5-1. ビルド検証

```bash
cd bff && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```

### 5-2. 全ユニットテスト実行

```bash
cd bff && npm test -- --coverage
cd ../frontend && npm test -- --coverage
```

### 5-3. 全 BDD シナリオ一括実行

```bash
cd frontend && npm run test:e2e
```

全シナリオが Pass することを確認します。

### 5-4. 検証レポート作成

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

### 5-5. Issue にレポートをコメント（ユーザーの承認後）

ユーザーに確認を求めてから実行してください。

```bash
gh issue comment $ARGUMENTS --body "$(cat docs/issues/{issue番号}/acceptance-report.md)"
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
