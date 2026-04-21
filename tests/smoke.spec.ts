import { test, expect } from '@playwright/test';

const PAGES = [
  { name: 'Home', url: '/' },
  { name: 'CX360 Dashboard', url: '/cx360' },
  { name: 'Demand Forecast', url: '/demand' },
  { name: 'Price Intelligence', url: '/price' },
  { name: 'Inventory', url: '/inventory' },
  { name: 'Settings', url: '/settings' },
  { name: 'Debug', url: '/debug' },
];

const DETAIL_PAGES = [
  { name: 'CX360 Customer Detail', url: '/cx360/customer/CUST-00001' },
  { name: 'Demand Product', url: '/demand/product/PRD-000001' },
  { name: 'Price Product', url: '/price/product/PRD-000001' },
];

test.describe('Smoke tests - all main pages render without errors', () => {
  for (const page of PAGES) {
    test(`${page.name} renders without crashing`, async ({ page: browser }) => {
      const errors: string[] = [];

      // Capture console errors
      browser.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Capture page errors (uncaught exceptions)
      browser.on('pageerror', err => {
        errors.push(err.message);
      });

      const response = await browser.goto(`http://localhost:3000${page.url}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Page should load successfully
      expect(response?.status()).toBeLessThan(500);

      // Wait for content to render
      await browser.waitForTimeout(2000);

      // No Next.js error overlay should appear
      const errorOverlay = await browser.$('nextjs-portal');
      if (errorOverlay) {
        const overlayText = await errorOverlay.textContent();
        if (overlayText?.includes('Unhandled Runtime Error')) {
          errors.push(`Next.js error overlay: ${overlayText.slice(0, 200)}`);
        }
      }

      // Check for "TypeError" or "Cannot read properties" in body
      const bodyText = await browser.textContent('body');
      if (bodyText?.includes('Cannot read properties of undefined')) {
        errors.push('Body contains "Cannot read properties of undefined"');
      }

      // No critical console errors related to rendering
      const renderErrors = errors.filter(e =>
        e.includes('Cannot read properties') ||
        e.includes('is not a function') ||
        e.includes('undefined') && e.includes('TypeError') ||
        e.includes('is not defined')
      );

      if (renderErrors.length > 0) {
        console.log(`Errors on ${page.name}:`);
        renderErrors.forEach(e => console.log(`  - ${e}`));
      }

      expect(renderErrors).toEqual([]);
    });
  }
});

test.describe('Smoke tests - detail pages handle missing data gracefully', () => {
  for (const page of DETAIL_PAGES) {
    test(`${page.name} handles invalid ID gracefully`, async ({ page: browser }) => {
      const errors: string[] = [];

      browser.on('pageerror', err => {
        errors.push(err.message);
      });

      const response = await browser.goto(`http://localhost:3000${page.url}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Should not be a 500 error
      expect(response?.status()).toBeLessThan(500);

      // Wait for content
      await browser.waitForTimeout(2000);

      // Should show either content or a graceful "not found" state
      const bodyText = await browser.textContent('body');
      const hasCrash = bodyText?.includes('Unhandled Runtime Error') ||
                       bodyText?.includes('Cannot read properties of undefined');

      expect(hasCrash).toBeFalsy();
    });
  }
});

test.describe('API smoke tests', () => {
  test('Health check API returns valid response', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health-check');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBeGreaterThan(0);
    expect(data.results).toBeDefined();
  });

  test('Health API returns Databricks status', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.databricks).toBeDefined();
    expect(data.cache).toBeDefined();
  });

  const API_ENDPOINTS = [
    '/api/inventory/kpis',
    '/api/inventory/alerts',
    '/api/inventory/dos-distribution',
    '/api/demand/kpis',
    '/api/demand/alerts',
    '/api/cx360/kpis',
  ];

  for (const endpoint of API_ENDPOINTS) {
    test(`${endpoint} returns valid JSON`, async ({ request }) => {
      const response = await request.get(`http://localhost:3000${endpoint}`);

      // Should not be a 500 error
      expect(response.status()).toBeLessThan(500);

      // Should return valid JSON
      if (response.ok()) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    });
  }
});

test.describe('Smoke tests - critical interactions', () => {
  test('Sidebar navigation works', async ({ page }) => {
    await page.goto('http://localhost:3000/cx360');
    await page.waitForTimeout(1000);

    // Click on Inventory in sidebar
    const inventoryLink = page.locator('a[href="/inventory"]');
    if (await inventoryLink.isVisible()) {
      await inventoryLink.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/inventory');
    }
  });

  test('Settings page loads without error', async ({ page }) => {
    await page.goto('http://localhost:3000/settings');
    await page.waitForTimeout(1000);

    // Should have settings content
    const heading = page.locator('h1, h2').first();
    const headingText = await heading.textContent();
    expect(headingText?.toLowerCase()).toContain('settings');
  });
});

test.describe('Data contract validation', () => {
  test('All cache files pass contract validation', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health-check');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();

    // Log any errors for debugging
    const errorFiles = Object.entries(data.results)
      .filter(([, r]) => (r as { status: string }).status === 'error')
      .map(([name, r]) => ({ name, errors: (r as { errors: string[] }).errors }));

    if (errorFiles.length > 0) {
      console.log('Cache files with errors:');
      errorFiles.forEach(f => {
        console.log(`  ${f.name}: ${f.errors.join(', ')}`);
      });
    }

    // Warn but don't fail on warnings
    const warningFiles = Object.entries(data.results)
      .filter(([, r]) => (r as { status: string }).status === 'warning')
      .map(([name, r]) => ({ name, warnings: (r as { warnings: string[] }).warnings }));

    if (warningFiles.length > 0) {
      console.log('Cache files with warnings:');
      warningFiles.forEach(f => {
        console.log(`  ${f.name}: ${f.warnings.join(', ')}`);
      });
    }

    // All files should be at least "ok" or "warning" (not "error" or "missing")
    expect(data.summary.errors).toBe(0);
    expect(data.summary.missing).toBe(0);
  });
});
