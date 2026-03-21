/**
 * E2E テスト: 人気トップ5株銘柄のレート情報表示
 *
 * モック境界:
 *   - Downstream Service A (port 4001): mock-server.mjs で提供
 *   - Downstream Service B (port 4002): mock-server.mjs で提供
 *   - BFF (port 3001):         実サーバー（NestJS）
 *   - Frontend (port 3000):    実サーバー（Next.js）
 *   - 認証:                    実ログインフロー（test@example.com / password123）
 *
 * 事前準備:
 *   cd bff && node mock-server.mjs   # Service A (4001) + Service B (4002)
 *   cd bff && npm run start:dev      # BFF (3001)
 *   cd frontend && npm run dev       # Frontend (3000)
 *
 * BFF が計算する期待値（100株あたり）:
 *   トヨタ: A=350000, B=360000 → 平均 355000 → 表示: ¥355,000
 *   キーエンス: A=4000000, Bなし → そのまま 4000000 → 表示: ¥4,000,000
 */

import { test, expect, Page } from '@playwright/test';

const MOCK_ADMIN_A = 'http://localhost:4001/admin';
const MOCK_ADMIN_B = 'http://localhost:4002/admin';

/** 実ログインフォームを操作して認証する */
async function login(page: Page) {
  await page.goto('/login');
  // React のハイドレーション完了を待つ（ネットワークアイドル状態）
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  // ログイン後はトップページ(/)へリダイレクト
  await page.waitForURL('/');
}

/** ダウンストリームサーバーのエラーモードをリセットする */
async function clearErrorMode() {
  await Promise.all([
    fetch(`${MOCK_ADMIN_A}/clear-error`, { method: 'POST' }),
    fetch(`${MOCK_ADMIN_B}/clear-error`, { method: 'POST' }),
  ]);
}

// SC-6 のテスト後に確実にエラーモードを解除する
test.afterEach(async () => {
  await clearErrorMode();
});

// @SC-1: ログイン後トップページで人気上位5銘柄の株価カードが表示される
test('SC-1: ログイン後トップページで人気上位5銘柄の株価カードが表示される', async ({ page }) => {
  await login(page);

  const stockCards = page.locator('[data-testid="stock-card"]');
  await expect(stockCards).toHaveCount(5);
});

// @SC-2: 「その他の株価を見る」で株価一覧ページへ遷移
test('SC-2: 株価表示カードセクションの「その他の株価を見る」で株価一覧ページへ遷移', async ({
  page,
}) => {
  await login(page);

  await page.click('text=その他の株価を見る');
  await expect(page).toHaveURL('/stocks');
});

// @SC-3: カード内に銘柄名・円建て株価・ドル建て株価・前日比(%)が表示される
test('SC-3: カード内に銘柄名・円建て株価・ドル建て株価・前日比(%)が表示される', async ({
  page,
}) => {
  await login(page);

  const firstCard = page.locator('[data-testid="stock-card"]').first();
  await expect(firstCard.locator('[data-testid="stock-name"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-price-jpy"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-price-usd"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="stock-change-percent"]')).toBeVisible();
});

// @SC-4: 両システムに存在する銘柄は2システムの平均値が表示される
// トヨタ自動車: A=350000, B=360000 → BFF平均=355000 → 表示: ¥355,000
test('SC-4: 両システムに存在する銘柄は2システムの平均値が表示される', async ({ page }) => {
  await login(page);

  const toyotaCard = page
    .locator('[data-testid="stock-card"]')
    .filter({ has: page.locator('text=トヨタ自動車') });

  // 100株あたり平均: (350000 + 360000) / 2 = 355,000
  await expect(toyotaCard.locator('[data-testid="stock-price-jpy"]')).toContainText('355,000');
  // 100株あたり平均: (2400 + 2600) / 2 = 2500 (USD は toFixed(2) のため千区切りなし)
  await expect(toyotaCard.locator('[data-testid="stock-price-usd"]')).toContainText('2500');
});

// @SC-5: 片方のシステムにのみ存在する銘柄はその値がそのまま表示される
// キーエンス: Aのみ price_jpy=4000000 → 表示: ¥4,000,000
test('SC-5: 片方のシステムにのみ存在する銘柄はその値がそのまま表示される', async ({ page }) => {
  await login(page);

  const keyenceCard = page
    .locator('[data-testid="stock-card"]')
    .filter({ has: page.locator('text=キーエンス') });

  // A のみ: price_jpy=4000000 → そのまま表示
  await expect(keyenceCard.locator('[data-testid="stock-price-jpy"]')).toContainText('4,000,000');
  await expect(keyenceCard.locator('[data-testid="stock-price-usd"]')).toContainText('27000');
});

// @SC-6: 両システムともAPIエラー時に「現在株価を表示できません。」が表示される
test('SC-6: 両システムともAPIエラー時に「現在株価を表示できません。」が表示される', async ({
  page,
}) => {
  // ダウンストリームサーバーをエラーモードに切替（BFF が 500 を受け取り InternalServerErrorException を throw）
  await Promise.all([
    fetch(`${MOCK_ADMIN_A}/force-error`, { method: 'POST' }),
    fetch(`${MOCK_ADMIN_B}/force-error`, { method: 'POST' }),
  ]);

  await login(page);

  await expect(page.locator('[data-testid="stocks-error"]')).toContainText(
    '現在株価を表示できません。',
  );
});
