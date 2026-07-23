import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const FIRST_PARTY_WWW = 'www.freezerbatchcocktails.com';
const scanRoots = ['src', 'functions', 'public', 'n8n', 'astro.config.mjs'];
const excludedDirectories = new Set([
  'node_modules',
  'dist',
  '.astro',
  'playwright-report',
  'test-results',
]);

function trackedSourceFiles() {
  const files = execFileSync('git', ['ls-files', '-z', '--', ...scanRoots], {
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean);

  return files.filter((file) => !file.split(/[\\/]/).some((part) => excludedDirectories.has(part)));
}

const offenders = [];
for (const file of trackedSourceFiles()) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes(FIRST_PARTY_WWW)) {
      offenders.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (offenders.length > 0) {
  console.error(`First-party www host references found:\n${offenders.join('\n')}`);
  process.exitCode = 1;
}
