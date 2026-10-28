import assert from 'node:assert/strict';
import { chromium } from '../server/node_modules/playwright/index.mjs';

// Run with local Vite on port 5175 (ATTENDANCE_QA_URL to override). All API traffic is mocked.
const baseUrl = process.env.ATTENDANCE_QA_URL || 'http://localhost:5175';
const employees = [
  { _id: 'emp-a', fullName: 'Asha Patel', employeeCode: 'EMP001', status: 'active' },
  { _id: 'emp-b', fullName: 'Dev Shah', employeeCode: 'EMP002', status: 'active' },
];

// 20 days of attendance (2 people/day) and 45 work logs, newest first
const days = Array.from({ length: 20 }, (_, i) => `2026-10-${String(28 - i).padStart(2, '0')}`);
const attendance = days.flatMap((d) => employees.map((e) => ({
  _id: `att-${d}-${e._id}`, date: `${d}T00:00:00.000Z`, employeeId: e, status: 'present',
  clockInAt: `${d}T04:00:00.000Z`, clockOutAt: `${d}T12:00:00.000Z`, totalMinutes: 480, totalHours: 8,
})));
const logs = Array.from({ length: 45 }, (_, i) => ({
  _id: `log-${i}`, taskName: `Task ${i}`, status: i % 3 === 0 ? 'approved' : 'submitted',
  employeeId: employees[i % 2], workDate: `2026-10-${String(28 - (i % 28)).padStart(2, '0')}T05:00:00.000Z`, totalMinutes: 60,
}));

// 13 delivered projects over 12 delivery days (2 on the newest day) plus one in progress
const projects = [
  ...Array.from({ length: 12 }, (_, i) => ({ day: 25 - i, n: i })),
  { day: 25, n: 12 },
].map(({ day, n }) => ({
  _id: `prj-${n}`, projectName: `Delivered ${n}`, projectCode: `PRJ-${n}`, status: 'delivered',
  deliveredAt: `2026-10-${String(day).padStart(2, '0')}T06:00:00.000Z`, createdAt: '2026-09-01T06:00:00.000Z',
  clientId: { _id: 'cli-1', name: 'Acme' }, projectValue: 1000, totalAmount: 1000, assignedEmployees: [employees[0]],
}));
projects.push({
  _id: 'prj-open', projectName: 'Still Open', projectCode: 'PRJ-OPEN', status: 'in_process', createdAt: '2026-10-20T06:00:00.000Z',
  clientId: { _id: 'cli-1', name: 'Acme' }, projectValue: 500, totalAmount: 500, assignedEmployees: [employees[0]],
});

const requests = [];
const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message.split('\n')[0]}`); }
};

function paged(list, url, limit) {
  const page = Number(url.searchParams.get('page'));
  const size = Number(url.searchParams.get('limit')) || limit;
  const total = list.length;
  return { data: list.slice((page - 1) * size, page * size), pagination: { page, limit: size, total, totalPages: Math.max(1, Math.ceil(total / size)) } };
}

const browser = await chromium.launch({ executablePath: process.env.ATTENDANCE_QA_BROWSER || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });

async function makePage(role, path) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Kolkata' });
  const user = { id: `${role}-user`, name: 'QA', email: `${role}@example.test`, role, employeeId: role === 'employee' ? 'emp-a' : undefined };
  await context.addInitScript((u) => {
    localStorage.setItem('aagspire_user', JSON.stringify(u));
    localStorage.setItem('aagspire_token', 'qa-mocked-session');
  }, user);
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) {
      return url.origin === new URL(baseUrl).origin ? route.continue() : route.abort();
    }
    requests.push({ role, path: url.pathname, query: Object.fromEntries(url.searchParams) });
    const json = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, ...data }) });
    const q = (k) => url.searchParams.get(k);
    if (url.pathname === '/api/auth/me') return json({ user: { ...user, employee: employees[0] } });
    if (url.pathname === '/api/admin/employees') return json({ data: employees });
    if (url.pathname === '/api/admin/projects' || url.pathname === '/api/employee/projects') return json({ data: projects });
    if (url.pathname.endsWith('/attendance') && q('page')) {
      let rows = role === 'employee' ? attendance.filter((r) => r.employeeId._id === 'emp-a') : attendance;
      if (q('search')) rows = rows.filter((r) => r.employeeId.fullName.toLowerCase().includes(q('search').toLowerCase()));
      if (role === 'employee') {
        const res = paged(rows, url, 20);
        return json({ ...res, summary: { days: rows.length, records: rows.length, totalMinutes: rows.length * 480, totalHours: rows.length * 8 } });
      }
      const pageDays = [...new Set(rows.map((r) => r.date))];
      const res = paged(pageDays, url, 7);
      return json({ data: rows.filter((r) => res.data.includes(r.date)), pagination: res.pagination, summary: { days: pageDays.length, records: rows.length } });
    }
    if (url.pathname.endsWith('/work-logs') && q('page')) {
      let rows = role === 'employee' ? logs.filter((l) => l.employeeId._id === 'emp-a') : logs;
      if (q('status')) rows = rows.filter((l) => l.status === q('status'));
      if (q('search')) rows = rows.filter((l) => l.taskName.toLowerCase().includes(q('search').toLowerCase()));
      return json(paged(rows, url, 20));
    }
    return json({ data: [] });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${baseUrl}${path}`);
  return { context, page, errors };
}
const lastRequest = (path) => requests.filter((r) => r.path === path).at(-1);

try {
  const admin = await makePage('admin', '/admin/attendance');
  const { page } = admin;

  await check('admin attendance: first page shows 7 days and server totals', async () => {
    await page.getByText('Showing 1–7 of 20 days').waitFor();
    await page.getByText('40 records across 20 days').waitFor();
    assert.equal(lastRequest('/api/admin/attendance').query.page, '1');
  });

  await check('admin attendance: next page loads page 2 and puts it in the URL', async () => {
    await page.getByRole('button', { name: 'Next page' }).click();
    await page.getByText('Showing 8–14 of 20 days').waitFor();
    assert.match(page.url(), /[?&]page=2\b/);
    assert.equal(lastRequest('/api/admin/attendance').query.page, '2');
  });

  await check('admin attendance: refresh keeps the page; Back returns to page 1', async () => {
    await page.reload();
    await page.getByText('Showing 8–14 of 20 days').waitFor();
    await page.goBack();
    await page.getByText('Showing 1–7 of 20 days').waitFor();
  });

  await check('admin attendance: numbered page jump and last-page bounds', async () => {
    await page.getByRole('button', { name: 'Page 3', exact: true }).click();
    await page.getByText('Showing 15–20 of 20 days').waitFor();
    assert.ok(await page.getByRole('button', { name: 'Next page' }).isDisabled());
  });

  await check('admin attendance: search is debounced, sent to the server, and resets to page 1', async () => {
    const before = requests.length;
    await page.getByPlaceholder('Search by team member name...').pressSequentially('dev', { delay: 40 });
    await page.getByText('20 records across 20 days').waitFor();
    const searches = requests.slice(before).filter((r) => r.path === '/api/admin/attendance' && r.query.search);
    assert.ok(searches.length >= 1 && searches.every((r) => r.query.search === 'dev'), 'one request per keystroke');
    assert.equal(lastRequest('/api/admin/attendance').query.page, '1');
    assert.doesNotMatch(page.url(), /page=/);
  });

  const logsPage = await makePage('admin', '/admin/work-logs');
  await check('admin work logs: 20 per page with numbered pagination', async () => {
    await logsPage.page.getByText('Showing 1–20 of 45 work logs').waitFor();
    await logsPage.page.getByRole('button', { name: 'Page 3', exact: true }).click();
    await logsPage.page.getByText('Showing 41–45 of 45 work logs').waitFor();
  });

  await check('admin work logs: status filter goes to the server and resets to page 1', async () => {
    await logsPage.page.getByRole('button', { name: /All statuses/ }).click();
    await logsPage.page.getByRole('option', { name: 'Approved' }).click();
    await logsPage.page.getByText('Showing 1–15 of 15 work logs').waitFor();
    const last = lastRequest('/api/admin/work-logs');
    assert.equal(last.query.status, 'approved');
    assert.equal(last.query.page, '1');
  });

  await check('admin work logs: links from attendance (?employeeId=&date=) still filter', async () => {
    await logsPage.page.goto(`${baseUrl}/admin/work-logs?employeeId=emp-b&date=2026-10-05`);
    await logsPage.page.waitForResponse((r) => r.url().includes('/api/admin/work-logs'));
    const last = lastRequest('/api/admin/work-logs');
    assert.equal(last.query.employeeId, 'emp-b');
    assert.equal(last.query.date, '2026-10-05');
  });

  const emp = await makePage('employee', '/employee/attendance');
  await check('employee attendance: totals cover all history; no Load more once everything is shown', async () => {
    await emp.page.getByText('Showing 20 of 20 Days').waitFor();
    await emp.page.getByText('160.0 hrs').waitFor();
    assert.equal(await emp.page.getByRole('button', { name: 'Load more' }).count(), 0);
  });

  const work = await makePage('employee', '/employee/work');
  await check('employee work: Load more appends the next page without duplicates', async () => {
    await work.page.getByText('Showing 20 of 23 logs').waitFor();
    await work.page.getByRole('button', { name: 'Load more' }).click();
    await work.page.getByText('Showing 23 of 23 logs').waitFor();
    assert.equal(await work.page.getByRole('button', { name: 'Load more' }).count(), 0);
  });

  await check('employee work: search restarts from page 1 on the server', async () => {
    await work.page.getByPlaceholder('Search by project or task...').fill('Task 4');
    await work.page.getByText(/Showing \d+ of \d+ logs?/).filter({ hasText: /of [1-9] log/ }).waitFor();
    const last = lastRequest('/api/employee/work-logs');
    assert.equal(last.query.search, 'Task 4');
    assert.equal(last.query.page, '1');
  });

  const dayBoxes = (p) => p.getByText(/^\d+ projects? delivered$/);
  const projectViews = [];
  for (const [role, path] of [['admin', '/admin/projects'], ['employee', '/employee/projects']]) {
    const view = await makePage(role, path);
    projectViews.push(view);
    const p = view.page;

    await check(`${role} projects: only the 5 latest delivery days show, newest first`, async () => {
      await p.getByText('Showing 1–5 of 12 delivery days').waitFor();
      assert.equal(await dayBoxes(p).count(), 5);
      assert.deepEqual(await dayBoxes(p).allInnerTexts(), ['2 projects delivered', '1 project delivered', '1 project delivered', '1 project delivered', '1 project delivered']);
      assert.ok(await p.getByText('25 Oct 2026').count() >= 1, 'newest day on page 1');
      assert.equal(await p.getByText('14 Oct 2026').count(), 0, 'oldest day must not be on page 1');
    });

    await check(`${role} projects: in-progress projects and the delivered total are unaffected`, async () => {
      assert.ok(await p.getByText('Still Open').count() >= 1);
      assert.ok(await p.getByText('Delivered Projects').locator('..').getByText('13', { exact: true }).count() === 1);
    });

    await check(`${role} projects: older delivery days are on later pages`, async () => {
      await p.getByRole('button', { name: 'Page 3', exact: true }).click();
      await p.getByText('Showing 11–12 of 12 delivery days').waitFor();
      assert.equal(await dayBoxes(p).count(), 2);
      assert.ok(await p.getByText('14 Oct 2026').count() >= 1);
      assert.ok(await p.getByRole('button', { name: 'Next page' }).isDisabled());
      await p.getByRole('button', { name: 'Previous page' }).click();
      await p.getByText('Showing 6–10 of 12 delivery days').waitFor();
    });

    await check(`${role} projects: searching returns to page 1 and hides pagination when it fits`, async () => {
      await p.getByPlaceholder('Search projects...').fill('Delivered 1');
      // "Delivered 1", "10", "11", "12" -> 4 different days, fits on one page
      await p.waitForFunction(() => !document.body.innerText.includes('delivery days'));
      assert.equal(await dayBoxes(p).count(), 4);
      await p.getByPlaceholder('Search projects...').fill('');
      await p.getByText('Showing 1–5 of 12 delivery days').waitFor();
    });
  }

  await check('no uncaught browser errors', async () => {
    const all = [admin, logsPage, emp, work, ...projectViews].flatMap((v) => v.errors);
    assert.deepEqual(all, []);
  });
} finally {
  await browser.close();
}

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
