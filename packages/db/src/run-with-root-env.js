const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function loadRootEnvFile() {
  // packages/db/src -> packages/db -> packages -> repo root
  const rootDir = path.resolve(__dirname, '../../..');
  const envPath = path.join(rootDir, '.env');

  if (!fs.existsSync(envPath)) {
    throw new Error(`.env not found at: ${envPath}`);
  }

  const raw = fs.readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();

    // Strip simple surrounding quotes (best-effort for common .env formats)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function resolveWindowsBin(command, binDir) {
  if (process.platform !== 'win32') return command;

  if (path.extname(command)) return command; // already has an extension
  const cmdPath = path.join(binDir, `${command}.CMD`);
  if (fs.existsSync(cmdPath)) return cmdPath;
  return command;
}

function main() {
  loadRootEnvFile();

  const binDir = path.resolve(__dirname, '..', 'node_modules', '.bin');
  const currentPath = process.env.PATH ?? '';
  process.env.PATH = `${binDir}${path.delimiter}${currentPath}`;

  const args = process.argv.slice(2);
  if (args.length < 1) {
    // eslint-disable-next-line no-console
    console.error('Usage: node run-with-root-env.js <command> [...args]');
    process.exit(1);
  }

  const command = resolveWindowsBin(args[0], binDir);
  const commandArgs = args.slice(1);

  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start command:', result.error);
    process.exit(1);
  }
  if (result.status === null) process.exit(1);
  if (result.status !== 0) process.exit(result.status);
  process.exit(0);
}

main();

