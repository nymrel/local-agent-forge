/** Validate the npm tarball contract without publishing it. */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const npmExecPath = process.env.npm_execpath;
assert.ok(
  npmExecPath && fs.existsSync(npmExecPath),
  'npm package verification must run through npm so npm_execpath identifies the active CLI',
);

const result = spawnSync(
  process.execPath,
  [npmExecPath, 'pack', '--dry-run', '--json', '--ignore-scripts'],
  { encoding: 'utf8', shell: false },
);

if (result.error) throw result.error;
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const [pack] = JSON.parse(result.stdout || '[]');
assert.ok(pack, 'npm pack returned no package manifest');
const paths = new Set(pack.files.map((file) => file.path));
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const required of [
  'bin/local-forge.js',
  'dist/src/index.js',
  'dist/src/index.d.ts',
  'dist/src/utils/http-url.js',
  'package.json',
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'RELEASE_READINESS.md',
  'SECURITY.md',
  'llms.txt',
]) {
  assert.ok(paths.has(required), `npm package is missing required file: ${required}`);
}

for (const forbiddenPrefix of ['src/', 'test/', 'tests/', 'python/', '.github/', '.agent/', 'dist/test/']) {
  assert.ok(
    ![...paths].some((file) => file.startsWith(forbiddenPrefix)),
    `npm package unexpectedly contains ${forbiddenPrefix}`,
  );
}

for (const relativePath of [packageJson.main, packageJson.types, ...Object.values(packageJson.bin)]) {
  const packagePath = relativePath.replace(/^\.\//, '');
  assert.ok(paths.has(packagePath), `Published entry point is missing ${packagePath}`);
}

for (const target of Object.values(packageJson.exports)) {
  for (const relativePath of Object.values(target)) {
    const packagePath = relativePath.replace(/^\.\//, '');
    assert.ok(paths.has(packagePath), `Published export is missing ${packagePath}`);
  }
}

console.log(`npm package contract verified (${pack.entryCount} files, ${pack.size} bytes).`);
