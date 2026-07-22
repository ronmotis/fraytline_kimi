#!/usr/bin/env node
/**
 * restore-assets.mjs — fetches the binary image assets (8 PNGs) into public/.
 *
 * The GitHub mirror of this repo is pushed via a text-only API, so the PNGs
 * travel separately: they are downloaded from the live Cloudflare deployment.
 * Safe to run repeatedly — existing files are skipped.
 *
 * Override the source with FRAYTLINE_ASSET_BASE if you self-host elsewhere.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.FRAYTLINE_ASSET_BASE ?? 'https://fraytline.fraytline.workers.dev';
const FILES = [
  'avatar-amina.png',
  'avatar-david.png',
  'avatar-grace.png',
  'avatar-joseph.png',
  'avatar-kwabena.png',
  'avatar-wanjiru.png',
  'noise-texture.png',
  'signal-field-fallback.png',
];

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(pub, { recursive: true });

for (const f of FILES) {
  const dest = join(pub, f);
  if (existsSync(dest)) { console.log(`skip  ${f} (exists)`); continue; }
  try {
    const res = await fetch(`${BASE}/${f}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`fetch ${f} ok`);
  } catch (e) {
    console.warn(`warn  ${f}: ${e.message} — copy it manually from the deployment into public/`);
  }
}
console.log('assets ready');
