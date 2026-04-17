#!/usr/bin/env node
// Thin wrapper that delegates to extract-template-prompt.mjs --check
// so the same parser is used in regen + verification.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const result = spawnSync(
  process.execPath,
  [path.join(__dirname, 'extract-template-prompt.mjs'), '--check'],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
