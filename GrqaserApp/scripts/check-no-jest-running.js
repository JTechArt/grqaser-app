#!/usr/bin/env node
/**
 * Pretest guard: prevents running Jest if a Jest process is already running.
 * Root cause: GrqaserApp tests can hang on open handles; running `npm test`
 * again while one is stuck spawns duplicate processes (observed 10+ processes).
 * This script exits with code 1 if Jest appears to be running, so `npm test`
 * aborts before starting a second run.
 * Skips check when CI=true (GitHub Actions, etc.) where only one run exists.
 */
const {execSync} = require('child_process');

if (process.env.CI === 'true' || process.env.CI === '1') {
  process.exit(0); // Skip in CI
}

function checkUnix() {
  try {
    const out = execSync('pgrep -fl "jest" 2>/dev/null || true', {
      encoding: 'utf8',
      maxBuffer: 256 * 1024,
    });
    const lines = out.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      // Match Jest running from this GrqaserApp (not other projects)
      if (line.includes('GrqaserApp') && line.includes('jest')) {
        return true; // Jest is already running
      }
    }
  } catch {
    // pgrep exits 1 when no match = no jest running
  }
  return false;
}

function check() {
  if (process.platform === 'win32') {
    try {
      const out = execSync(
        'wmic process where "name=\'node.exe\'" get commandline 2>nul',
        {encoding: 'utf8', maxBuffer: 256 * 1024},
      );
      if (out.includes('GrqaserApp') && out.includes('jest')) {
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }
  return checkUnix();
}

if (check()) {
  console.error(
    'Jest is already running for GrqaserApp. Wait for it to finish or kill it:\n' +
      '  pkill -f "node.*jest"\n' +
      'Then run npm test again.',
  );
  process.exit(1);
}
