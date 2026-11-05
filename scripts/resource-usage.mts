// Uses the production build served on BASE_URL like a person would, reads what Chrome really takes
// from the machine and fails when the site goes over the memory limit. CPU is reported, not enforced,
// because it depends on the machine running the check.
import { execSync } from 'node:child_process';
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { setTimeout as wait } from 'node:timers/promises';
import { Launcher } from 'chrome-launcher';
import { chromium, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:8921';
const MAX_SITE_MEMORY_IN_MB = Number(process.env.MAX_SITE_MEMORY_IN_MB ?? 300);
const REPORT_FILE = 'resourceUsageReport.json';
const SAMPLE_INTERVAL_IN_MS = 500;
const TIME_FOR_THE_SCREEN_TO_SETTLE_IN_MS = 300;
const IDLE_TIME_IN_MS = 5000;
const ROUNDS_OF_USE = 5;
const KB_IN_A_MB = 1024;
const FIRST_TIME_FIELD_AFTER_THE_NAME = 11;
const SITE_HOST = new URL(BASE_URL).host;

if (process.platform !== 'linux') {
  throw new Error('This check reads /proc, so it only runs on Linux');
}

const clockTicksPerSecond = Number(execSync('/usr/bin/getconf CLK_TCK').toString());

const readProcessFile = (pid: number, file: string): string => {
  try {
    return readFileSync(`/proc/${pid}/${file}`, 'utf8');
  } catch {
    // Chrome starts and ends processes all the time, so one can vanish between two reads.
    return '';
  }
};

const listThreads = (pid: number): string[] => {
  try {
    return readdirSync(`/proc/${pid}/task`);
  } catch {
    return [];
  }
};

const listProcessTree = (pid: number): number[] => {
  const children = listThreads(pid).flatMap((thread) =>
    readProcessFile(pid, `task/${thread}/children`).trim().split(/\s+/).filter(Boolean),
  );

  return [pid, ...children.flatMap((child) => listProcessTree(Number(child)))];
};

const readMemoryInMb = (pid: number): number => {
  const proportionalSetSize = /^Pss:\s+(\d+)/m.exec(readProcessFile(pid, 'smaps_rollup'));

  return proportionalSetSize ? Number(proportionalSetSize[1]) / KB_IN_A_MB : 0;
};

const readCpuTicks = (pid: number): number => {
  const stat = readProcessFile(pid, 'stat');
  const fieldsAfterTheName = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
  const userTicks = Number(fieldsAfterTheName[FIRST_TIME_FIELD_AFTER_THE_NAME]);
  const systemTicks = Number(fieldsAfterTheName[FIRST_TIME_FIELD_AFTER_THE_NAME + 1]);

  return userTicks + systemTicks || 0;
};

const isRenderer = (pid: number): boolean => readProcessFile(pid, 'cmdline').includes('--type=renderer');

const createMonitor = (chromePid: number) => {
  const usage = { peakSiteMemoryInMb: 0, peakChromeMemoryInMb: 0, peakCpuPercent: 0, cpuSeconds: 0 };
  const lastTicksByPid = new Map<number, number>();
  let lastSampleAt = performance.now();

  const sample = () => {
    const now = performance.now();
    let siteMemoryInMb = 0;
    let chromeMemoryInMb = 0;
    let newTicks = 0;

    listProcessTree(chromePid).forEach((pid) => {
      const memoryInMb = readMemoryInMb(pid);
      const ticks = readCpuTicks(pid);

      chromeMemoryInMb += memoryInMb;
      siteMemoryInMb += isRenderer(pid) ? memoryInMb : 0;
      newTicks += Math.max(ticks - (lastTicksByPid.get(pid) ?? ticks), 0);
      lastTicksByPid.set(pid, ticks);
    });

    const cpuSeconds = newTicks / clockTicksPerSecond;
    const elapsedSeconds = (now - lastSampleAt) / 1000;

    usage.cpuSeconds += cpuSeconds;
    usage.peakSiteMemoryInMb = Math.max(usage.peakSiteMemoryInMb, siteMemoryInMb);
    usage.peakChromeMemoryInMb = Math.max(usage.peakChromeMemoryInMb, chromeMemoryInMb);
    usage.peakCpuPercent = Math.max(usage.peakCpuPercent, (cpuSeconds / elapsedSeconds) * 100);
    lastSampleAt = now;
  };

  return { sample, usage };
};

const settle = (): Promise<void> => wait(TIME_FOR_THE_SCREEN_TO_SETTLE_IN_MS);

const signUp = async (page: Page): Promise<void> => {
  await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle' });
  await page.getByLabel('Name').fill('Resource Reader');
  await page.getByLabel('Email').fill(`resources-${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('a long enough secret');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL('**/shelf');
};

const readABook = async (page: Page, round: number): Promise<void> => {
  await page.getByRole('link', { name: 'Add a book' }).first().click();
  await page.getByLabel('Title').fill(`Round ${round}: The Long Afternoon`);
  await page.getByLabel('Author').fill('Resource Reader');
  await page.getByLabel('Total pages').fill('320');
  await page.getByRole('button', { name: 'Add to shelf' }).click();
  await page.waitForURL(/\/shelf\/[0-9a-f]{24}$/);
  await page.getByLabel('I am on page').fill(String(40 + round));
  await page.getByRole('button', { name: 'Update' }).click();
  await page.getByText('Progress saved.').waitFor();
  await page.getByLabel('Bookmark page').fill('12');
  await page.getByRole('button', { name: 'Add bookmark' }).click();
  await page.getByRole('button', { name: 'Remove bookmark on page 12' }).waitFor();
  await settle();
  await page.getByLabel('Theme').selectOption(round % 2 === 0 ? 'night' : 'light');
  await page.getByRole('link', { name: 'My shelf' }).click();
  await page.waitForURL('**/shelf');
  await page.getByRole('link', { name: /^Reading/ }).click();
  await settle();
};

const unexpectedHosts = new Set<string>();

// A browser server exposes the Chrome process, so its whole process tree can be measured.
const server = await chromium.launchServer({
  executablePath: Launcher.getFirstInstallation(),
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--lang=en-US'],
});
const browser = await chromium.connect(server.wsEndpoint());

const chromePid = server.process().pid;

if (!chromePid) {
  throw new Error('Chrome started without a process id');
}

const { sample, usage } = createMonitor(chromePid);
const sampling = setInterval(sample, SAMPLE_INTERVAL_IN_MS);
const startedAt = performance.now();
let idleCpuSeconds = 0;

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, locale: 'en-US' });

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());

    if (url.host === SITE_HOST || url.protocol === 'data:' || url.protocol === 'blob:') {
      await route.continue();

      return;
    }

    unexpectedHosts.add(url.host);
    await route.abort();
  });

  await signUp(page);

  for (let round = 0; round < ROUNDS_OF_USE; round += 1) {
    await readABook(page, round);
  }

  // Idle CPU shows animations that run forever, which the flow above hides.
  const cpuBeforeIdle = usage.cpuSeconds;
  await wait(IDLE_TIME_IN_MS);
  sample();
  idleCpuSeconds = usage.cpuSeconds - cpuBeforeIdle;
} finally {
  clearInterval(sampling);
  sample();
  await browser.close();
  await server.close();
}

const durationInSeconds = (performance.now() - startedAt) / 1000;

const report = {
  maxSiteMemoryInMb: MAX_SITE_MEMORY_IN_MB,
  peakSiteMemoryInMb: Math.round(usage.peakSiteMemoryInMb),
  peakChromeMemoryInMb: Math.round(usage.peakChromeMemoryInMb),
  peakCpuPercentOfOneCore: Math.round(usage.peakCpuPercent),
  averageCpuPercentOfOneCore: Math.round((usage.cpuSeconds / durationInSeconds) * 100),
  idleCpuPercentOfOneCore: Math.round((idleCpuSeconds / (IDLE_TIME_IN_MS / 1000)) * 100),
  durationInSeconds: Math.round(durationInSeconds),
  unexpectedHosts: [...unexpectedHosts],
};

writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
console.log(`site memory peak: ${report.peakSiteMemoryInMb} MB (maximum ${MAX_SITE_MEMORY_IN_MB} MB)`);
console.log(`whole Chrome peak: ${report.peakChromeMemoryInMb} MB (report only)`);
console.log(
  `CPU of one core: ${report.averageCpuPercentOfOneCore}% on average, ${report.peakCpuPercentOfOneCore}% at peak, ${report.idleCpuPercentOfOneCore}% idle (report only)`,
);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      '### Resource usage',
      '',
      '| Metric | Value |',
      '|---|---|',
      `| Site memory peak (limit ${MAX_SITE_MEMORY_IN_MB} MB) | ${report.peakSiteMemoryInMb} MB |`,
      `| Whole Chrome peak | ${report.peakChromeMemoryInMb} MB |`,
      `| CPU average, one core | ${report.averageCpuPercentOfOneCore}% |`,
      `| CPU peak, one core | ${report.peakCpuPercentOfOneCore}% |`,
      `| CPU idle, one core | ${report.idleCpuPercentOfOneCore}% |`,
      '',
    ].join('\n'),
  );
}

if (unexpectedHosts.size > 0) {
  console.error(`The site called hosts outside the machine: ${[...unexpectedHosts].join(', ')}`);
  process.exitCode = 1;
}

if (report.peakSiteMemoryInMb > MAX_SITE_MEMORY_IN_MB) {
  console.error(`The site used ${report.peakSiteMemoryInMb} MB, over the ${MAX_SITE_MEMORY_IN_MB} MB limit`);
  process.exitCode = 1;
}
