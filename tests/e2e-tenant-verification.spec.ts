import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// ── CONFIG ────────────────────────────────────────────────────────
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const AUTH_PASSWORD = process.env.E2E_PASSWORD ?? 'rct-demo-2025';

const TENANTS = {
  india_grocery: {
    cookie: 'india_grocery',
    currency: '₹',
    skuPrefix: 'PRD-',
    label: 'India Grocery',
  },
  us_apparel: {
    cookie: 'us_apparel',
    currency: '$',
    skuPrefix: 'APR-',
    label: 'US Apparel',
  },
  us_retail: {
    cookie: 'us_retail',
    currency: '$',
    skuPrefix: 'USR-',
    label: 'US Retail',
  },
} as const;

type TenantKey = keyof typeof TENANTS;

// ── HELPERS ───────────────────────────────────────────────────────

async function primeContext(context: BrowserContext, tenant: TenantKey) {
  // Get auth cookie by hitting /api/auth server-side.
  const res = await context.request.post(`${BASE_URL}/api/auth`, {
    data: { password: AUTH_PASSWORD },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok()) {
    throw new Error(`Auth failed: HTTP ${res.status()} — check E2E_PASSWORD`);
  }
  // Add tenant cookie (auth cookie already stored by request context).
  const host = new URL(BASE_URL).hostname;
  await context.addCookies([
    { name: 'rct_tenant', value: TENANTS[tenant].cookie, domain: host, path: '/' },
  ]);
}

async function goTo(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
}

// Return only visible text — excludes <script> RSC payload where Next.js
// embeds serialization tokens like "$5", "$L2", etc. that look like currency.
async function visibleText(page: Page): Promise<string> {
  return await page.evaluate(() => document.body.innerText ?? '');
}

async function checkNoCurrencyMismatch(page: Page, tenant: TenantKey, pageName: string) {
  const content = (await visibleText(page)) ?? '';
  if (tenant === 'india_grocery') {
    // Look for USD currency values in headline/metric contexts.
    const wrong = content.match(/\$\d[\d,.]*[KMB]?/);
    if (wrong) {
      throw new Error(`[${pageName}][${tenant}] Found USD value "${wrong[0]}" — expected ₹`);
    }
  } else {
    // us_apparel / us_retail should not carry ₹N values.
    const wrong = content.match(/₹\d/);
    if (wrong) {
      throw new Error(`[${pageName}][${tenant}] Found INR value "${wrong[0]}" — expected $`);
    }
  }
}

async function checkNoCrossTenantDepts(page: Page, tenant: TenantKey, pageName: string) {
  const content = (await visibleText(page)) ?? '';
  const INDIA_DEPTS = ['Grocery & Staples', 'Snacks & Biscuits', 'Dairy & Frozen', 'Personal Care'];
  const RETAIL_DEPTS = ['Electronics', 'Beauty & Personal Care', 'Home & Garden', 'Sports & Outdoor', 'Toys & Games'];

  if (tenant === 'us_retail' || tenant === 'us_apparel') {
    for (const dept of INDIA_DEPTS) {
      if (content.includes(dept)) {
        throw new Error(`[${pageName}][${tenant}] Found India dept "${dept}" — wrong tenant`);
      }
    }
  }
  if (tenant === 'india_grocery') {
    for (const dept of RETAIL_DEPTS) {
      if (content.includes(dept)) {
        throw new Error(`[${pageName}][india_grocery] Found US retail dept "${dept}" — wrong tenant`);
      }
    }
  }
}

async function expectNoError(page: Page) {
  const body = (await visibleText(page)) ?? '';
  expect(body).not.toContain('Unhandled Runtime Error');
  expect(body).not.toContain('Cannot read properties of undefined');
  // Next.js error overlay
  const overlay = await page.$('nextjs-portal');
  if (overlay) {
    const text = await overlay.textContent();
    expect(text?.includes('Unhandled Runtime Error')).toBeFalsy();
  }
}

// ── PER-TENANT TESTS ──────────────────────────────────────────────

for (const tenantKey of Object.keys(TENANTS) as TenantKey[]) {
  const t = TENANTS[tenantKey];

  test.describe(`Tenant: ${t.label}`, () => {
    test.beforeEach(async ({ context }) => {
      await primeContext(context, tenantKey);
    });

    // ── PRICE INTEL ──────────────────────────────────────────────
    test(`[${t.label}] /price-intel Overview — currency + data`, async ({ page }) => {
      await goTo(page, '/price-intel');
      await page.waitForTimeout(3000);
      await expectNoError(page);
      await checkNoCurrencyMismatch(page, tenantKey, '/price-intel');
      await checkNoCrossTenantDepts(page, tenantKey, '/price-intel');
    });

    for (const tab of ['promo', 'markdown', 'forecasting', 'agents']) {
      test(`[${t.label}] /price-intel?tab=${tab} — no mismatch`, async ({ page }) => {
        await goTo(page, `/price-intel?tab=${tab}`);
        await page.waitForTimeout(2500);
        await expectNoError(page);
        await checkNoCurrencyMismatch(page, tenantKey, `/price-intel?tab=${tab}`);
      });
    }

    for (const section of ['overview', 'promo', 'markdown', 'forecasting']) {
      test(`[${t.label}] /price-intel/deep-dive/${section} — loads`, async ({ page }) => {
        await goTo(page, `/price-intel/deep-dive/${section}`);
        await page.waitForTimeout(2500);
        await expectNoError(page);
        await checkNoCurrencyMismatch(page, tenantKey, `/price-intel/deep-dive/${section}`);
      });
    }

    for (const chartId of ['promo-roi', 'sell-through', 'margin-leakage', 'forecast']) {
      test(`[${t.label}] /price-intel/chart/${chartId} — loads`, async ({ page }) => {
        await goTo(page, `/price-intel/chart/${chartId}`);
        await page.waitForTimeout(2500);
        await expectNoError(page);
        await checkNoCurrencyMismatch(page, tenantKey, `/price-intel/chart/${chartId}`);
      });
    }

    // ── MERCHANDISE DEMAND ───────────────────────────────────────
    test(`[${t.label}] /merchandise/demand — departments`, async ({ page }) => {
      await goTo(page, '/merchandise/demand');
      // Wait for actual data-loaded signal (chart / svg), not a fixed delay.
      await page
        .waitForSelector('[data-testid="demand-loaded"], .demand-chart, svg', { timeout: 20000 })
        .catch(() => page.waitForTimeout(6000));
      await expectNoError(page);
      await checkNoCurrencyMismatch(page, tenantKey, '/merchandise/demand');
      await checkNoCrossTenantDepts(page, tenantKey, '/merchandise/demand');
    });

    // ── COLD START ───────────────────────────────────────────────
    if (tenantKey === 'india_grocery') {
      test(`[india_grocery] /merchandise/cold-start — visible + loads`, async ({ page }) => {
        await goTo(page, '/merchandise/cold-start');
        await page.waitForTimeout(3000);
        await expectNoError(page);
      });
    } else {
      test(`[${t.label}] /merchandise/cold-start — hidden from nav`, async ({ page }) => {
        await goTo(page, '/price-intel');
        await page.waitForTimeout(2000);
        const link = await page.$('a[href="/merchandise/cold-start"]');
        expect(link).toBeNull();
      });
    }

    // ── CX360 ────────────────────────────────────────────────────
    test(`[${t.label}] /cx360 — loads, correct segments`, async ({ page }) => {
      await goTo(page, '/cx360');
      await page.waitForTimeout(4000);
      await expectNoError(page);
      await checkNoCurrencyMismatch(page, tenantKey, '/cx360');
      const content = (await visibleText(page)) ?? '';
      if (tenantKey === 'us_retail') {
        // Retail-specific segments live in cx360_customer_table (mirrored from apparel with segment swap).
        expect(content).toMatch(/Premium Loyalist|Deal Seeker|Omnichannel Shopper|High Returner/);
      }
    });

    test(`[${t.label}] /cx360/deep/channels — loads`, async ({ page }) => {
      await goTo(page, '/cx360/deep/channels');
      await page.waitForTimeout(3000);
      await expectNoError(page);
      await checkNoCurrencyMismatch(page, tenantKey, '/cx360/deep/channels');
    });

    test(`[${t.label}] /cx360/deep/categories — loads`, async ({ page }) => {
      await goTo(page, '/cx360/deep/categories');
      await page.waitForTimeout(3000);
      await expectNoError(page);
    });

    // ── INVENTORY ────────────────────────────────────────────────
    test(`[${t.label}] /inventory — loads`, async ({ page }) => {
      await goTo(page, '/inventory');
      await page.waitForTimeout(3000);
      await expectNoError(page);
    });

    // ── ASK / AGENTS ─────────────────────────────────────────────
    test(`[${t.label}] /ask — loads with tenant context`, async ({ page }) => {
      await goTo(page, '/ask');
      await page.waitForTimeout(4000);
      await expectNoError(page);
      const content = (await visibleText(page)) ?? '';
      if (tenantKey === 'us_retail') {
        expect(content).toMatch(/US retail|Meridian/i);
      } else if (tenantKey === 'india_grocery') {
        expect(content).toMatch(/India grocery|Databricks/i);
      } else if (tenantKey === 'us_apparel') {
        expect(content).toMatch(/US apparel/i);
      }
    });

    test(`[${t.label}] /agents — shows tenant currency label`, async ({ page }) => {
      await goTo(page, '/agents');
      await page.waitForTimeout(4000);
      await expectNoError(page);
      const content = (await visibleText(page)) ?? '';
      if (tenantKey === 'india_grocery') {
        expect(content).toMatch(/₹INR|India Grocery/);
      } else if (tenantKey === 'us_retail') {
        expect(content).toMatch(/\$|USD|Retail|Meridian|us_retail/i);
      } else if (tenantKey === 'us_apparel') {
        expect(content).toMatch(/\$|USD|Apparel/i);
      }
    });

    // ── SETTINGS ─────────────────────────────────────────────────
    test(`[${t.label}] /settings — shows all 3 tenant tiles`, async ({ page }) => {
      await goTo(page, '/settings');
      await page.waitForTimeout(2000);
      await expectNoError(page);
      const content = (await visibleText(page)) ?? '';
      expect(content).toContain('India');
      expect(content).toContain('Apparel');
      expect(content).toMatch(/Retail|Meridian/);
    });
  });
}

// ── CROSS-TENANT ISOLATION ────────────────────────────────────────

test.describe('Cross-tenant data isolation', () => {
  test('us_retail never shows India department names', async ({ page, context }) => {
    await primeContext(context, 'us_retail');
    const INDIA_DEPTS = ['Grocery & Staples', 'Snacks & Biscuits', 'Dairy & Frozen'];
    const paths = ['/price-intel', '/price-intel?tab=promo', '/price-intel?tab=markdown', '/merchandise/demand', '/cx360'];
    for (const path of paths) {
      await goTo(page, path);
      await page.waitForTimeout(2500);
      const content = (await visibleText(page)) ?? '';
      for (const dept of INDIA_DEPTS) {
        expect(content, `Found India dept "${dept}" on ${path} for us_retail`).not.toContain(dept);
      }
    }
  });

  test('india_grocery never shows USD values', async ({ page, context }) => {
    await primeContext(context, 'india_grocery');
    const paths = ['/price-intel', '/price-intel?tab=promo', '/merchandise/demand'];
    for (const path of paths) {
      await goTo(page, path);
      await page.waitForTimeout(2500);
      const content = (await visibleText(page)) ?? '';
      const usdMatch = content.match(/\$\d[\d,]*(?:\.\d+)?[KMB]?/);
      expect(usdMatch, `Found USD value "${usdMatch?.[0]}" on ${path} for india_grocery`).toBeNull();
    }
  });

  test('us_retail never shows India SKU IDs (PRD-*)', async ({ page, context }) => {
    await primeContext(context, 'us_retail');
    await goTo(page, '/price-intel');
    await page.waitForTimeout(3500);
    const content = (await visibleText(page)) ?? '';
    const prd = content.match(/PRD-\d{6}/);
    expect(prd, `Found India SKU "${prd?.[0]}" on price-intel for us_retail`).toBeNull();
  });

  test('us_apparel never shows US retail-only departments', async ({ page, context }) => {
    await primeContext(context, 'us_apparel');
    await goTo(page, '/price-intel');
    await page.waitForTimeout(3500);
    const content = (await visibleText(page)) ?? '';
    // Apparel doesn't stock these categories
    expect(content).not.toContain('Toys & Games');
    expect(content).not.toContain('Grocery & Snacks');
  });
});
