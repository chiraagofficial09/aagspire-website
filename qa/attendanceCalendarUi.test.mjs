import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../server/node_modules/playwright/index.mjs';

// Run with local Vite on port 5175. All API traffic is intercepted; no live data is used.
const baseUrl = process.env.ATTENDANCE_QA_URL || 'http://127.0.0.1:5175';
const outputDir = new URL('../output/attendance-calendar/', import.meta.url);
await mkdir(outputDir, { recursive: true });
const employees = [
  { _id: 'employee-a', fullName: 'Asha Patel', employeeCode: 'EMP001', status: 'active' },
  { _id: 'employee-b', fullName: 'Dev Shah', employeeCode: 'EMP002', status: 'active' },
];
const fixture = (day, status, extra = {}) => ({
  _id: `record-${day}`, date: `2026-10-${day}T00:00:00.000Z`, status,
  ...(status !== 'absent' && status !== 'leave' ? {
    clockInAt: `2026-10-${day}T04:30:00.000Z`, clockOutAt: `2026-10-${day}T12:30:00.000Z`, totalMinutes: 480,
  } : {}), ...extra,
});
const records = {
  'employee-a': [fixture('01', 'present'), fixture('02', 'absent'), fixture('03', 'half_day', { totalMinutes: 180, autoClockedOut: true }), fixture('05', 'late'), fixture('06', 'leave'), fixture('11', 'present')],
  'employee-b': [fixture('01', 'absent')],
};
const holidays = [{ _id: 'holiday-1', date: '2026-10-09', name: 'Office Holiday' }];
const requests = [];
const failures = [];
const passed = [];
const browserErrors = [];
let clockedIn = false;
let failAttendance = false;
const browser = await chromium.launch({ executablePath: process.env.ATTENDANCE_QA_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });

async function check(name, fn) {
  try { await fn(); passed.push(name); console.log(`PASS ${name}`); }
  catch (error) { failures.push({ name, error: error.message }); console.log(`FAIL ${name}: ${error.message}`); }
}

async function makePage(role, viewport = { width: 1440, height: 1100 }) {
  const context = await browser.newContext({ viewport, timezoneId: 'Asia/Kolkata' });
  const user = { id: `${role}-user`, name: role === 'admin' ? 'Admin QA' : 'Asha Patel', email: `${role}@example.test`, role, employeeId: role === 'employee' ? 'employee-a' : undefined };
  await context.addInitScript((cachedUser) => {
    localStorage.setItem('aagspire_user', JSON.stringify(cachedUser));
    localStorage.setItem('aagspire_token', 'qa-mocked-session');
    localStorage.setItem('dashboard_show_all_data', 'true');
  }, user);
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      requests.push({ role, method: request.method(), path: url.pathname, query: Object.fromEntries(url.searchParams) });
      const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (url.pathname === '/api/auth/me') return json({ success: true, user: { ...user, employee: employees[0] } });
      if (url.pathname === '/api/notifications') return json({ success: true, data: [] });
      if (url.pathname.endsWith('/dashboard')) return json({ success: true, data: { kpis: {}, monthlyTrends: [], assignedProjects: [], recentWorkLogs: [] } });
      if (url.pathname === '/api/admin/employees') return json({ success: true, data: employees });
      if (url.pathname === '/api/employee/profile') return json({ success: true, data: { ...employees[0], designation: 'Designer' } });
      if (url.pathname === '/api/employee/projects') return json({ success: true, data: [] });
      if (url.pathname === '/api/employee/attendance/today') return json({ success: true, isClockedIn: clockedIn, clockInAt: clockedIn ? '2026-10-08T04:30:00.000Z' : null, clockOutAt: null, totalMinutes: 0 });
      if (url.pathname === '/api/employee/attendance/clock-in' && request.method() === 'POST') {
        clockedIn = true;
        records['employee-a'].push(fixture('08', 'present', { clockOutAt: undefined, totalMinutes: 0 }));
        return json({ success: true });
      }
      if (url.pathname.endsWith('/attendance')) {
        if (failAttendance) return json({ success: false, message: 'Mock temporary failure' }, 500);
        const employee = role === 'employee' ? 'employee-a' : url.searchParams.get('employeeId');
        const start = url.searchParams.get('startDate');
        const end = url.searchParams.get('endDate');
        return json({ success: true, data: (records[employee] || []).filter((record) => record.date.slice(0, 10) >= start && record.date.slice(0, 10) <= end) });
      }
      if (url.pathname.endsWith('/holidays')) {
        if (request.method() === 'POST') {
          assert.equal(role, 'admin', 'Employee must not submit a holiday');
          const payload = request.postDataJSON();
          holidays.push({ _id: `holiday-${holidays.length + 1}`, ...payload });
          return json({ success: true, data: holidays.at(-1) }, 201);
        }
        return json({ success: true, data: holidays.filter((holiday) => holiday.date >= url.searchParams.get('startDate') && holiday.date <= url.searchParams.get('endDate')) });
      }
      return json({ success: true, data: [] });
    }
    if (url.origin === new URL(baseUrl).origin) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (error) => browserErrors.push({ role, error: error.message }));
  await page.clock.setFixedTime(new Date('2026-10-08T06:30:00.000Z'));
  await page.goto(`${baseUrl}/${role}/dashboard`);
  const calendar = page.getByRole('region', { name: 'Attendance Calendar', exact: true });
  await calendar.getByRole('button', { name: '1 October 2026, Present', exact: true }).waitFor();
  return { context, page, calendar };
}

async function day(calendar, label) {
  return calendar.getByRole('button', { name: label, exact: true });
}

try {
  const admin = await makePage('admin');
  const employee = await makePage('employee');
  await check('Both dashboards render calendar and employee has no holiday editing controls', async () => {
    assert.equal(await admin.calendar.count(), 1);
    assert.equal(await employee.calendar.count(), 1);
    assert.equal(await employee.calendar.getByRole('button', { name: 'Add Holiday', exact: true }).count(), 0);
  });
  await check('All five saved status colors are distinct; unrecorded dates are transparent', async () => {
    const colors = [];
    for (const label of ['1 October 2026, Present', '2 October 2026, Absent', '3 October 2026, Half Day', '5 October 2026, Late', '6 October 2026, Leave']) {
      colors.push(await (await day(employee.calendar, label)).evaluate((node) => getComputedStyle(node).backgroundColor));
    }
    assert.equal(new Set(colors).size, 5);
    assert.ok(colors.every((color) => color !== 'rgba(0, 0, 0, 0)'));
    assert.equal(await (await day(employee.calendar, '7 October 2026, No attendance record')).evaluate((node) => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
  });
  await check('Only Sundays show weekly off; attendance on a Sunday retains its status', async () => {
    await (await day(employee.calendar, '4 October 2026, No attendance record, Sunday Off')).waitFor();
    await (await day(employee.calendar, '10 October 2026, No attendance record')).waitFor();
    await (await day(employee.calendar, '11 October 2026, Present, Sunday Off')).waitFor();
  });
  await check('Selected date shows IST clock times, duration, and automatic clock-out note', async () => {
    await (await day(employee.calendar, '3 October 2026, Half Day')).click();
    assert.equal(await employee.calendar.getByText('10:00 am', { exact: true }).count(), 1);
    assert.equal(await employee.calendar.getByText('3h 0m', { exact: true }).count(), 1);
    assert.equal(await employee.calendar.getByText('Automatically clocked out', { exact: true }).count(), 1);
  });
  await check('Admin employee selection changes only selected employee attendance', async () => {
    await admin.calendar.getByLabel('Employee', { exact: true }).click();
    await admin.page.getByRole('option', { name: /Dev Shah/ }).click();
    await admin.calendar.getByRole('button', { name: '1 October 2026, Absent', exact: true }).waitFor();
    assert.equal(await admin.calendar.getByRole('button', { name: '2 October 2026, No attendance record', exact: true }).count(), 1);
    await admin.calendar.getByLabel('Employee', { exact: true }).click();
    await admin.page.getByRole('option', { name: /Asha Patel/ }).click();
    await admin.calendar.getByRole('button', { name: '1 October 2026, Present', exact: true }).waitFor();
  });
  await check('Month navigation requests correct full month ranges and returns to current month', async () => {
    await employee.calendar.getByRole('button', { name: 'Previous attendance month' }).click();
    await employee.calendar.getByRole('button', { name: '30 September 2026, No attendance record', exact: true }).waitFor();
    assert.ok(requests.some((request) => request.role === 'employee' && request.path.endsWith('/attendance') && request.query.startDate === '2026-09-01' && request.query.endDate === '2026-09-30'));
    await employee.calendar.getByRole('button', { name: 'Next attendance month' }).click();
    await employee.calendar.getByRole('button', { name: '1 October 2026, Present', exact: true }).waitFor();
  });
  await check('Admin adds holiday; employee refresh shows shared holiday without attendance color', async () => {
    await (await day(admin.calendar, '10 October 2026, No attendance record')).click();
    await admin.calendar.getByRole('button', { name: 'Add Holiday', exact: true }).click();
    await admin.calendar.getByLabel('Date', { exact: true }).click();
    await admin.page.getByRole('button', { name: '10', exact: true }).click();
    assert.match(await admin.calendar.getByLabel('Date', { exact: true }).innerText(), /10 Oct 2026/);
    await admin.calendar.getByLabel('Holiday name', { exact: true }).fill('Team Festival');
    await admin.calendar.getByRole('button', { name: 'Save Holiday', exact: true }).click();
    await admin.calendar.getByRole('button', { name: '10 October 2026, No attendance record, Team Festival', exact: true }).waitFor();
    await employee.calendar.getByRole('button', { name: 'Refresh attendance calendar' }).click();
    const holidayCell = employee.calendar.getByRole('button', { name: '10 October 2026, No attendance record, Team Festival', exact: true });
    await holidayCell.waitFor();
    assert.equal(await holidayCell.evaluate((node) => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
  });
  await check('Clock-in callback refreshes employee calendar immediately', async () => {
    await employee.page.getByRole('button', { name: 'Clock In', exact: true }).click();
    await employee.calendar.getByRole('button', { name: '8 October 2026, Present, In session', exact: true }).waitFor();
  });
  await check('Failed attendance request shows retry; successful retry restores calendar', async () => {
    failAttendance = true;
    await employee.calendar.getByRole('button', { name: 'Refresh attendance calendar' }).click();
    await employee.calendar.getByText('Could not load the attendance calendar. Please retry.', { exact: true }).waitFor();
    failAttendance = false;
    await employee.calendar.getByRole('button', { name: 'Retry', exact: true }).click();
    await employee.calendar.getByRole('button', { name: '8 October 2026, Present, In session', exact: true }).waitFor();
  });
  await check('Employee calendar refetches current holidays on window focus', async () => {
    holidays.push({ _id: 'holiday-focus', date: '2026-10-12', name: 'Focus Refresh Holiday' });
    await employee.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await employee.calendar.getByRole('button', { name: '12 October 2026, No attendance record, Focus Refresh Holiday', exact: true }).waitFor();
  });
  for (const [role, view] of [['admin', admin], ['employee', employee]]) {
    await view.calendar.screenshot({ path: new URL(`${role}-desktop.png`, outputDir).pathname.replace(/^\//, ''), animations: 'disabled' });
    await check(`${role} calendar and dashboard fit mobile width without horizontal overflow`, async () => {
      for (const width of [375, 320]) {
        await view.page.setViewportSize({ width, height: 900 });
        await view.calendar.scrollIntoViewIfNeeded();
        const bounds = await view.calendar.evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth, right: element.getBoundingClientRect().right, document: document.documentElement.scrollWidth, viewport: innerWidth }));
        assert.ok(bounds.scroll <= bounds.client + 1, JSON.stringify({ width, ...bounds }));
        assert.ok(bounds.document <= bounds.viewport + 1, JSON.stringify({ width, ...bounds }));
        assert.ok(bounds.right <= bounds.viewport + 1, JSON.stringify({ width, ...bounds }));
      }
    });
    await view.calendar.screenshot({ path: new URL(`${role}-mobile.png`, outputDir).pathname.replace(/^\//, ''), animations: 'disabled' });
  }
  await check('No uncaught browser errors', async () => assert.deepEqual(browserErrors, []));
} finally {
  await browser.close();
  await writeFile(new URL('results.json', outputDir), JSON.stringify({ passed, failures, browserErrors, requests }, null, 2));
}
console.log(`${passed.length} passed, ${failures.length} failed`);
if (failures.length) process.exitCode = 1;
