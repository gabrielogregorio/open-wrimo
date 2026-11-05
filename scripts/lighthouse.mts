// Audits the public pages of the production build served on BASE_URL and fails below the thresholds.
import { writeFileSync } from 'node:fs';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:8921';
const PAGES = ['/', '/login'];
const REPORT_FILE = 'lighthouseReport.html';
const MAX_FIRST_CONTENTFUL_PAINT_IN_MS = 30000;

const minimumScores = new Map([
  ['accessibility', 95],
  ['best-practices', 95],
  ['seo', 90],
  ['performance', 40],
]);

const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });

const auditPage = async (path: string): Promise<string[]> => {
  const result = await lighthouse(`${BASE_URL}${path}`, {
    port: chrome.port,
    output: 'html',
    logLevel: 'error',
    onlyCategories: [...minimumScores.keys()],
    formFactor: 'desktop',
    screenEmulation: { disabled: true },
    throttling: { rttMs: 40, throughputKbps: 11024, cpuSlowdownMultiplier: 1 },
  });

  if (!result) {
    throw new Error(`Lighthouse returned no result for ${path}`);
  }

  const { lhr, report } = result;

  writeFileSync(
    path === '/' ? REPORT_FILE : REPORT_FILE.replace('.html', `${path.replaceAll('/', '-')}.html`),
    String(report),
  );

  const categories = new Map(Object.entries(lhr.categories));

  const failures = [...minimumScores].flatMap(([category, minimum]) => {
    const score = Math.round((categories.get(category)?.score ?? 0) * 100);
    console.log(`${path} ${category}: ${score} (minimum ${minimum})`);

    return score < minimum ? [`${path} ${category} ${score} < ${minimum}`] : [];
  });

  const firstContentfulPaint = Math.round(lhr.audits['first-contentful-paint'].numericValue ?? Infinity);
  console.log(
    `${path} first-contentful-paint: ${firstContentfulPaint} ms (maximum ${MAX_FIRST_CONTENTFUL_PAINT_IN_MS})`,
  );

  if (firstContentfulPaint > MAX_FIRST_CONTENTFUL_PAINT_IN_MS) {
    failures.push(`${path} first-contentful-paint ${firstContentfulPaint} ms`);
  }

  return failures;
};

try {
  const failures: string[] = [];

  for (const path of PAGES) {
    await fetch(`${BASE_URL}${path}`);
    failures.push(...(await auditPage(path)));
  }

  if (failures.length > 0) {
    console.error(`Lighthouse failed: ${failures.join(', ')} (see ${REPORT_FILE})`);
    process.exitCode = 1;
  }
} finally {
  chrome.kill();
}
