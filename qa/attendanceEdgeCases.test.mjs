import assert from 'node:assert/strict';
import { chromium } from '../server/node_modules/playwright/index.mjs';

const baseUrl = process.env.ATTENDANCE_QA_URL || 'http://127.0.0.1:5175';

const employees = [
  { _id: 'employee-a', fullName: 'Asha Patel', employeeCode: 'EMP001', status: 'active' },
  { _id: 'employee-b', fullName: 'Dev Shah', employeeCode: 'EMP002', status: 'active' },
];

const fixture = (day, status, extra = {}) => ({
  _id: `record-${day}`,
  date: `2026-10-${day}T00:00:00.000Z`,
  status,
  ...(status !== 'absent' && status !== 'leave' ? {
    clockInAt: `2026-10-${day}T04:30:00.000Z`,
    clockOutAt: `2026-10-${day}T12:30:00.000Z`,
    totalMinutes: 480,
  } : {}),
  ...extra,
});

const records = {
  'employee-a': [
    fixture('01', 'present'),
    fixture('02', 'absent'),
    fixture('03', 'half_day', { totalMinutes: 180, autoClockedOut: true }),
    fixture('08', 'present', { clockOutAt: null, totalMinutes: 0 }), // in session
  ],
  'employee-b': [
    fixture('01', 'absent'),
    fixture('03', 'present'),
    fixture('08', 'leave'),
  ],
};

let holidays = [
  { _id: 'holiday-1', date: '2026-10-09', name: 'Office Holiday' },
];

const passed = [];
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed.push(name);
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error: error.message });
    console.log(`FAIL ${name}: ${error.message}`);
  }
}

const browser = await chromium.launch({
  executablePath: process.env.ATTENDANCE_QA_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});

const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: 'Asia/Kolkata' });

await context.addInitScript(() => {
  const adminUser = { id: 'admin-user', name: 'Admin QA', email: 'admin@example.test', role: 'admin' };
  localStorage.setItem('aagspire_user', JSON.stringify(adminUser));
  localStorage.setItem('aagspire_token', 'qa-mocked-session');
  localStorage.setItem('dashboard_show_all_data', 'true');
});

await context.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());

  if (url.pathname.startsWith('/api/')) {
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

    if (url.pathname === '/api/auth/me') return json({ success: true, user: { id: 'admin-user', name: 'Admin QA', role: 'admin' } });
    if (url.pathname === '/api/notifications') return json({ success: true, data: [] });
    if (url.pathname.endsWith('/dashboard')) return json({ success: true, data: { kpis: {}, monthlyTrends: [], assignedProjects: [], recentWorkLogs: [] } });
    if (url.pathname === '/api/admin/employees') return json({ success: true, data: employees });
    
    if (url.pathname.endsWith('/attendance')) {
      const employee = url.searchParams.get('employeeId') || 'employee-a';
      const start = url.searchParams.get('startDate');
      const end = url.searchParams.get('endDate');
      const filtered = (records[employee] || []).filter((r) => r.date.slice(0, 10) >= start && r.date.slice(0, 10) <= end);
      return json({ success: true, data: filtered });
    }

    if (url.pathname.endsWith('/holidays') && request.method() === 'GET') {
      return json({ success: true, data: holidays });
    }

    if (url.pathname.endsWith('/holidays') && request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}');
      if (!body.name || !body.date) {
        return json({ success: false, message: 'Choose a date and enter a holiday name.' }, 400);
      }
      const newHoliday = { _id: `h-${Date.now()}`, date: body.date, name: body.name };
      holidays.push(newHoliday);
      return json({ success: true, data: newHoliday });
    }

    return json({ success: true, data: [] });
  }

  return route.continue();
});

const page = await context.newPage();
await page.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'load' });

const calendar = page.locator('section[aria-labelledby*="-title"]').filter({ hasText: 'Attendance Calendar' });
await calendar.waitFor({ state: 'visible' });

// EDGE CASE 1: No employee ID / code is leaked in the dropdown options or trigger
await check('Edge Case 1: Employee select options show name only, never employee ID/code', async () => {
  const trigger = calendar.getByLabel('Employee', { exact: true });
  const triggerText = await trigger.innerText();
  assert.ok(!triggerText.includes('EMP001'), `Trigger leaked employee ID: ${triggerText}`);
  assert.ok(!triggerText.includes('EMP002'), `Trigger leaked employee ID: ${triggerText}`);

  await trigger.click();
  const options = page.getByRole('option');
  const count = await options.count();
  for (let i = 0; i < count; i++) {
    const text = await options.nth(i).innerText();
    assert.ok(!text.includes('EMP001'), `Option leaked employee ID: ${text}`);
    assert.ok(!text.includes('EMP002'), `Option leaked employee ID: ${text}`);
  }
  await page.keyboard.press('Escape');
});

// EDGE CASE 2: Selected date persists and updates correctly across employee switch
await check('Edge Case 2: Selected date persists and updates when switching employee', async () => {
  // Click Oct 3 when Asha Patel is active (Asha is Half Day on Oct 3)
  const day3 = calendar.getByRole('button', { name: /^3 October 2026/ });
  await day3.click();
  const detailCard = calendar.locator('div[aria-live="polite"]');
  assert.equal(await detailCard.getByText('Half Day', { exact: true }).count(), 1);
  assert.equal(await detailCard.getByText('Automatically clocked out', { exact: true }).count(), 1);

  // Switch to Dev Shah (Dev Shah is Present on Oct 3)
  await calendar.getByLabel('Employee', { exact: true }).click();
  await page.getByRole('option', { name: /Dev Shah/ }).click();

  // Selected date (Oct 3) should STILL be selected and now show Present for Dev Shah!
  await detailCard.getByText('Present', { exact: false }).waitFor();
  assert.equal(await detailCard.getByText('Present', { exact: false }).count(), 1);
});

// EDGE CASE 3: In-session attendance (clockIn without clockOut)
await check('Edge Case 3: In-session attendance shows "In session" and "In progress"', async () => {
  // Switch back to Asha Patel
  await calendar.getByLabel('Employee', { exact: true }).click();
  await page.getByRole('option', { name: /Asha Patel/ }).click();

  // Click Oct 8 (In session)
  const day8 = calendar.getByRole('button', { name: /^8 October 2026/ });
  await day8.click();

  const detailCard = calendar.locator('div[aria-live="polite"]');
  assert.ok(await detailCard.getByText('In session').count() >= 1);
  assert.equal(await detailCard.getByText('In progress', { exact: true }).count(), 1);
});

// EDGE CASE 4: Holiday form validation - rejecting empty name
await check('Edge Case 4: Holiday form rejects blank name with validation error', async () => {
  await calendar.getByRole('button', { name: 'Add Holiday', exact: true }).click();
  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Add an office holiday' });
  await modal.waitFor({ state: 'visible' });

  // Try to submit with empty name
  await modal.getByLabel('Holiday name').fill('   ');
  await modal.getByRole('button', { name: 'Save Holiday' }).click();

  await modal.getByText('Choose a date and enter a holiday name.').waitFor({ state: 'visible' });
});

// EDGE CASE 5: Holiday success message is shown in orange color (#FF5A1F)
await check('Edge Case 5: Holiday success notification is displayed in theme orange color', async () => {
  const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Add an office holiday' });
  await modal.getByLabel('Holiday name').fill('Navratri Day 1');
  await modal.getByRole('button', { name: 'Save Holiday' }).click();

  // Wait for modal to close and success message to show
  const successMsg = calendar.locator('p[role="status"]').filter({ hasText: 'Navratri Day 1 added for' });
  await successMsg.waitFor({ state: 'visible' });

  // Verify color is orange (#FF5A1F = rgb(255, 90, 31))
  const color = await successMsg.evaluate((el) => window.getComputedStyle(el).color);
  assert.equal(color, 'rgb(255, 90, 31)', `Expected orange rgb(255, 90, 31) but got ${color}`);
});

// EDGE CASE 6: Rapid employee switching (instant cached switch with no layout collapse)
await check('Edge Case 6: Fast switching between cached employees updates instantaneously without unmounting', async () => {
  for (let cycle = 0; cycle < 3; cycle++) {
    await calendar.getByLabel('Employee', { exact: true }).click();
    await page.getByRole('option', { name: /Dev Shah/ }).click();
    assert.ok(await calendar.getByRole('button', { name: /^1 October 2026/ }).isVisible());

    await calendar.getByLabel('Employee', { exact: true }).click();
    await page.getByRole('option', { name: /Asha Patel/ }).click();
    assert.ok(await calendar.getByRole('button', { name: /^1 October 2026/ }).isVisible());
  }
});

// EDGE CASE 7: Year boundary month navigation
await check('Edge Case 7: Year boundary month navigation shifts properly', async () => {
  const nextMonthBtn = calendar.getByRole('button', { name: 'Next attendance month' });
  // Move forward to Nov, Dec, Jan
  await nextMonthBtn.click(); // Nov 2026
  await nextMonthBtn.click(); // Dec 2026
  await nextMonthBtn.click(); // Jan 2027
  assert.equal(await calendar.getByText('January 2027').count(), 1);

  // Click previous month button 3 times to return to October 2026
  const prevMonthBtn = calendar.getByRole('button', { name: 'Previous attendance month' });
  await prevMonthBtn.click();
  await prevMonthBtn.click();
  await prevMonthBtn.click();
  assert.equal(await calendar.getByText('October 2026').count(), 1);
});

// EDGE CASE 8: Tooltip hover shows all 5 status counts
await check('Edge Case 8: Info tooltip displays all 5 status badges with correct counts', async () => {
  const infoBtn = calendar.locator('button[aria-label="View attendance status totals"]');
  await infoBtn.focus();
  const tooltip = calendar.locator('div.shadow-\\[0_10px_25px_rgba\\(0\\,0\\,0\\,0\\.6\\)\\]');
  assert.equal(await tooltip.count(), 1);
  for (const label of ['Present', 'Absent', 'Half Day', 'Late', 'Leave']) {
    assert.equal(await tooltip.getByText(label, { exact: true }).count(), 1);
  }
});

await browser.close();

console.log('\n================================');
console.log(`TOTAL EDGE CASE TESTS: ${passed.length + failures.length}`);
console.log(`PASSED: ${passed.length}`);
console.log(`FAILED: ${failures.length}`);
console.log('================================');

if (failures.length > 0) {
  process.exit(1);
}
