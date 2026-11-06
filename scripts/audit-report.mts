// Turns the two `pnpm audit --json` files written by the audit workflow into one markdown report
// and decides whether the run fails: any vulnerability in what ships (production) fails, and so does
// a high or critical one anywhere in the tree. Moderate and low ones in the tooling are only reported.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

const [productionFile = 'audit-production.json', fullFile = 'audit-full.json', reportFile = 'audit-report.md'] =
  process.argv.slice(2);

const MARKER = '<!-- open-wrimo-audit -->';
const SEVERITIES = ['critical', 'high', 'moderate', 'low', 'info'] as const;
const LABELS: Record<Severity, string> = {
  critical: '🔴 Critical',
  high: '🟠 High',
  moderate: '🟡 Moderate',
  low: '🔵 Low',
  info: '⚪ Info',
};
const MAX_ROWS = 10;

type Severity = (typeof SEVERITIES)[number];
type Advisory = {
  id?: number;
  github_advisory_id?: string;
  module_name?: string;
  severity?: Severity;
  title?: string;
  url?: string;
  vulnerable_versions?: string;
  patched_versions?: string;
};
type Audit = { advisories: Record<string, Advisory>; counts: Record<Severity, number> };

const readAudit = (file: string): Audit => {
  try {
    const json = JSON.parse(readFileSync(file, 'utf8')) as {
      advisories?: Record<string, Advisory>;
      metadata?: { vulnerabilities?: Partial<Record<Severity, number>> };
    };
    const found = json.metadata?.vulnerabilities ?? {};

    return {
      advisories: json.advisories ?? {},
      counts: Object.fromEntries(SEVERITIES.map((severity) => [severity, found[severity] ?? 0])) as Record<
        Severity,
        number
      >,
    };
  } catch {
    // A missing or broken file means the audit itself failed, which must not pass as clean.
    throw new Error(`Could not read ${file}; the audit did not finish`);
  }
};

const total = (counts: Record<Severity, number>): number =>
  SEVERITIES.reduce((sum, severity) => sum + counts[severity], 0);

// Backslashes first, or a "\|" in the text would turn into an escaped backslash and a bare pipe.
const cell = (text = ''): string => text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');

const table = (audit: Audit): string[] => {
  const rows = Object.values(audit.advisories).sort(
    (a, b) => SEVERITIES.indexOf(a.severity ?? 'info') - SEVERITIES.indexOf(b.severity ?? 'info'),
  );

  if (rows.length === 0) {
    return [];
  }

  const lines = [
    '| Severity | Package | Vulnerable | Patched | Advisory |',
    '| --- | --- | --- | --- | --- |',
    ...rows.slice(0, MAX_ROWS).map((advisory) => {
      const patched =
        advisory.patched_versions && advisory.patched_versions !== '<0.0.0'
          ? `\`${cell(advisory.patched_versions)}\``
          : 'no patch yet';
      const link = advisory.url ? `[${advisory.github_advisory_id ?? advisory.id}](${advisory.url})` : '';

      return `| ${LABELS[advisory.severity ?? 'info']} | \`${advisory.module_name}\` | \`${cell(advisory.vulnerable_versions)}\` | ${patched} | ${cell(advisory.title)} ${link} |`;
    }),
  ];

  if (rows.length > MAX_ROWS) {
    lines.push('', `And ${rows.length - MAX_ROWS} more; run \`pnpm audit\` for the full list.`);
  }

  return lines;
};

const production = readAudit(productionFile);
const full = readAudit(fullFile);
const productionTotal = total(production.counts);
const fullTotal = total(full.counts);
const highAnywhere = full.counts.critical + full.counts.high;
const fails = productionTotal > 0 || highAnywhere > 0;

const describeVerdict = (): string => {
  if (productionTotal > 0) {
    return `## 🚨 pnpm audit: ${productionTotal} in production\n\nThese ship to every writer. Update the package or add an override before merging.`;
  }

  if (highAnywhere > 0) {
    return `## ⚠️ pnpm audit: ${highAnywhere} high or critical in the tooling\n\nNothing ships to the browser, but a high one in the tooling still blocks the merge.`;
  }

  if (fullTotal > 0) {
    return `## 🟡 pnpm audit: production clean, ${fullTotal} in the tooling\n\nOnly moderate or low ones in development packages. Worth an override when a patch exists.`;
  }

  return '## 🛡️ pnpm audit: clean\n\nNo known vulnerability in production or in the tooling.';
};

const verdict = describeVerdict();

const report = [
  MARKER,
  '',
  verdict,
  '',
  '| Tree | Critical | High | Moderate | Low | Total |',
  '| --- | --- | --- | --- | --- | --- |',
  `| Production | ${production.counts.critical} | ${production.counts.high} | ${production.counts.moderate} | ${production.counts.low} | ${productionTotal} |`,
  `| Everything, with tooling | ${full.counts.critical} | ${full.counts.high} | ${full.counts.moderate} | ${full.counts.low} | ${fullTotal} |`,
  '',
  ...table(full),
  '',
  'Fix with `pnpm update <package>`, or an override with its reason in `pnpm-workspace.yaml`. Accepted risks go in `auditConfig.ignoreGhsas` and in `docs/security.md`.',
  '',
].join('\n');

writeFileSync(reportFile, report);
console.log(report);

if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
}

if (fails) {
  process.exitCode = 1;
}
