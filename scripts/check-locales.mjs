/**
 * Guards the translation files: every locale must carry exactly the keys the
 * Dutch master file has, with the same `{{placeholders}}` and no blanks.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales');
const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const placeholders = (s) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort().join(',');

const master = read('nl.json');
const masterKeys = Object.keys(master);
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();

let failed = false;
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  failed = true;
};

for (const file of files) {
  const data = read(file);
  const keys = Object.keys(data);

  for (const key of masterKeys) {
    if (!(key in data)) {
      fail(`${file}: missing key "${key}"`);
      continue;
    }
    const value = data[key];
    if (typeof value !== 'string' || !value.trim()) {
      fail(`${file}: key "${key}" is empty`);
      continue;
    }
    if (placeholders(value) !== placeholders(master[key])) {
      fail(
        `${file}: key "${key}" has placeholders {${placeholders(value)}}, ` +
          `expected {${placeholders(master[key])}}`
      );
    }
  }
  for (const key of keys) {
    if (!(key in master)) fail(`${file}: unknown key "${key}"`);
  }
}

if (failed) process.exit(1);
console.log(`✓ ${files.length} locales × ${masterKeys.length} keys all match`);
