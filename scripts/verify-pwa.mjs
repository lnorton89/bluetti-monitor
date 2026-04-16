// PWA Verification Script
// Run from project root: node scripts/verify-pwa.mjs

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dashboard', 'dist');

console.log('=== PWA Verification ===\n');

const checks = [];

// Check manifest
const manifestPath = join(distDir, 'manifest.webmanifest');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  console.log('✓ manifest.webmanifest exists');
  
  const required = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color', 'icons'];
  const missing = required.filter(field => !manifest[field]);
  if (missing.length === 0) {
    console.log('✓ All required manifest fields present');
    checks.push(true);
  } else {
    console.log('✗ Missing fields:', missing.join(', '));
    checks.push(false);
  }
  
  if (manifest.icons && manifest.icons.length >= 2) {
    console.log('✓ Icons defined:', manifest.icons.length);
  }
} else {
  console.log('✗ manifest.webmanifest not found');
  checks.push(false);
}

// Check service worker files
const swPath = join(distDir, 'sw.js');
if (existsSync(swPath)) {
  console.log('✓ sw.js exists');
  checks.push(true);
} else {
  console.log('✗ sw.js not found');
  checks.push(false);
}

const registerSWPath = join(distDir, 'registerSW.js');
if (existsSync(registerSWPath)) {
  console.log('✓ registerSW.js exists');
  checks.push(true);
} else {
  console.log('✗ registerSW.js not found');
  checks.push(false);
}

// Check workbox
const workboxFiles = readdirSync(distDir).filter(f => f.startsWith('workbox-'));
if (workboxFiles.length > 0) {
  console.log('✓ Workbox files:', workboxFiles.join(', '));
  checks.push(true);
} else {
  console.log('✗ No workbox files found');
  checks.push(false);
}

// Check icons
const icon192 = join(distDir, 'pwa-192x192.png');
const icon512 = join(distDir, 'pwa-512x512.png');
if (existsSync(icon192)) {
  console.log('✓ pwa-192x192.png exists');
  checks.push(true);
} else {
  console.log('✗ pwa-192x192.png not found');
  checks.push(false);
}

if (existsSync(icon512)) {
  console.log('✓ pwa-512x512.png exists');
  checks.push(true);
} else {
  console.log('✗ pwa-512x512.png not found');
  checks.push(false);
}

// Summary
console.log('\n=== Summary ===');
const passed = checks.filter(c => c).length;
const total = checks.length;
console.log(`${passed}/${total} checks passed`);

if (passed === total) {
  console.log('✓ PWA setup verified successfully');
  process.exit(0);
} else {
  console.log('✗ Some checks failed');
  process.exit(1);
}
