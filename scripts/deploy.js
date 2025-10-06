#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

// Create .nojekyll file to prevent Jekyll processing
const nojekyllPath = path.join(outDir, '.nojekyll');
if (!fs.existsSync(nojekyllPath)) {
  fs.writeFileSync(nojekyllPath, '');
  console.log('✅ Created .nojekyll file');
}

// Create CNAME file if CUSTOM_DOMAIN environment variable is set
const customDomain = process.env.CUSTOM_DOMAIN;
if (customDomain) {
  const cnamePath = path.join(outDir, 'CNAME');
  fs.writeFileSync(cnamePath, customDomain);
  console.log(`✅ Created CNAME file with domain: ${customDomain}`);
}

// Ensure proper routing for SPA
const indexPath = path.join(outDir, 'index.html');
const notFoundPath = path.join(outDir, '404.html');

if (fs.existsSync(indexPath) && !fs.existsSync(notFoundPath)) {
  fs.copyFileSync(indexPath, notFoundPath);
  console.log('✅ Created 404.html for SPA routing');
}

console.log('🚀 Deployment preparation complete!');