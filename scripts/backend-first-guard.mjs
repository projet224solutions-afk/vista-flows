#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const baselinePath = path.join(root, 'scripts', 'config', 'backend-first-baseline.json');
const updateBaseline = process.argv.includes('--update-baseline');

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/i.test(entry.name)) {
      out.push(fullPath);
    }
  }

  return out;
}

function countInvokes(content) {
  const matches = content.match(/supabase\s*\.\s*functions\s*\.\s*invoke\s*\(/g);
  return matches ? matches.length : 0;
}

function snapshotCurrent() {
  const files = walk(srcDir);
  const map = {};

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const count = countInvokes(content);
    if (count > 0) {
      const rel = path.relative(root, file).replace(/\\/g, '/');
      map[rel] = count;
    }
  }

  return map;
}

function ensureBaselineDir() {
  const dir = path.dirname(baselinePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeBaseline(snapshot) {
  ensureBaselineDir();
  fs.writeFileSync(
    baselinePath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), files: snapshot }, null, 2)}\n`,
    'utf8'
  );
}

function readBaseline() {
  if (!fs.existsSync(baselinePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    return raw && raw.files ? raw.files : null;
  } catch {
    return null;
  }
}

function main() {
  const current = snapshotCurrent();

  if (updateBaseline) {
    writeBaseline(current);
    console.log(`Baseline updated: ${path.relative(root, baselinePath)}`);
    console.log(`Tracked files with invoke calls: ${Object.keys(current).length}`);
    process.exit(0);
  }

  const baseline = readBaseline();
  if (!baseline) {
    console.error('No baseline found. Run: node scripts/backend-first-guard.mjs --update-baseline');
    process.exit(1);
  }

  const regressions = [];

  for (const [file, count] of Object.entries(current)) {
    const baselineCount = baseline[file] || 0;
    if (count > baselineCount) {
      regressions.push({ file, baselineCount, currentCount: count });
    }
  }

  if (regressions.length > 0) {
    console.error('Backend-first guard failed: new direct supabase.functions.invoke usage detected.');
    for (const r of regressions) {
      console.error(`- ${r.file}: baseline=${r.baselineCount}, current=${r.currentCount}`);
    }
    process.exit(1);
  }

  console.log('Backend-first guard passed: no new direct supabase.functions.invoke usage.');
}

main();
