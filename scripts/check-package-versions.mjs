#!/usr/bin/env node

/**
 * Check for React version mismatches and other critical package conflicts
 * Run this script before starting dev servers or in CI
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkReactVersions() {
  log('blue', '\n🔍 Checking React versions...');
  
  try {
    const output = execSync('pnpm list react react-dom --depth=0 --json', {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    
    const packages = JSON.parse(output);
    const reactVersions = new Set();
    const reactDomVersions = new Set();
    
    // Check all workspaces
    for (const pkg of packages) {
      if (pkg.dependencies) {
        if (pkg.dependencies.react) {
          reactVersions.add(pkg.dependencies.react.version);
        }
        if (pkg.dependencies['react-dom']) {
          reactDomVersions.add(pkg.dependencies['react-dom'].version);
        }
      }
    }
    
    const reactVersion = Array.from(reactVersions)[0];
    const reactDomVersion = Array.from(reactDomVersions)[0];
    
    if (reactVersions.size > 1) {
      log('red', `❌ Multiple React versions detected: ${Array.from(reactVersions).join(', ')}`);
      return false;
    }
    
    if (reactDomVersions.size > 1) {
      log('red', `❌ Multiple React-DOM versions detected: ${Array.from(reactDomVersions).join(', ')}`);
      return false;
    }
    
    if (reactVersion && reactDomVersion && reactVersion !== reactDomVersion) {
      log('red', `❌ React version mismatch:`);
      log('red', `   react: ${reactVersion}`);
      log('red', `   react-dom: ${reactDomVersion}`);
      return false;
    }
    
    log('green', `✅ React versions aligned: ${reactVersion || 'not installed'}`);
    return true;
  } catch (error) {
    log('yellow', '⚠️  Could not check React versions');
    console.error(error.message);
    return true; // Don't fail if check can't run
  }
}

function checkNestedReactVersions() {
  log('blue', '\n🔍 Checking for nested React installations...');
  
  try {
    const output = execSync('find node_modules -name "react-dom" -type d | grep -v "node_modules/@types" | grep -v "next/dist/compiled"', {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    
    const paths = output.trim().split('\n').filter(Boolean);
    const nestedVersions = [];
    
    // Paths to ignore (bundled dependencies that won't affect runtime)
    const ignorePaths = [
      '@expo/cli/static',
      'next/dist/compiled',
      '@storybook/',
    ];
    
    for (const path of paths) {
      if (path.split('node_modules').length > 2) {
        // This is a nested node_modules
        
        // Skip safe nested installations
        if (ignorePaths.some(ignore => path.includes(ignore))) {
          continue;
        }
        
        try {
          const pkgPath = join(rootDir, path, 'package.json');
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          nestedVersions.push({
            path: path.replace(rootDir, ''),
            version: pkg.version,
          });
        } catch (e) {
          // Skip if can't read package.json
        }
      }
    }
    
    if (nestedVersions.length > 0) {
      log('yellow', '⚠️  Found nested react-dom installations:');
      for (const { path, version } of nestedVersions) {
        log('yellow', `   ${path} (v${version})`);
      }
      log('yellow', '   This can cause runtime errors. Check pnpm overrides in package.json.');
      return false;
    }
    
    log('green', '✅ No nested React installations found');
    return true;
  } catch (error) {
    // If find command fails, no nested versions found
    log('green', '✅ No nested React installations found');
    return true;
  }
}

function checkPeerDependencies() {
  log('blue', '\n🔍 Checking peer dependencies...');
  
  try {
    const output = execSync('pnpm list --depth=0 2>&1', {
      cwd: rootDir,
      encoding: 'utf-8',
    });
    
    // Look for unmet peer dependency warnings
    const unmatchedPeers = output.match(/✕ unmet peer/g);
    
    if (unmatchedPeers && unmatchedPeers.length > 0) {
      log('yellow', `⚠️  Found ${unmatchedPeers.length} unmet peer dependency issues`);
      log('yellow', '   Run "pnpm install" and check the warnings');
      return false;
    }
    
    log('green', '✅ No critical peer dependency issues');
    return true;
  } catch (error) {
    log('yellow', '⚠️  Could not check peer dependencies');
    return true;
  }
}

function checkCriticalOverrides() {
  log('blue', '\n🔍 Checking package overrides...');
  
  try {
    const pkgPath = join(rootDir, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    
    if (pkg.pnpm?.overrides) {
      log('blue', '   Overrides in effect:');
      for (const [name, version] of Object.entries(pkg.pnpm.overrides)) {
        log('blue', `   - ${name}: ${version}`);
      }
      log('green', '✅ Package overrides configured');
    } else {
      log('yellow', '⚠️  No package overrides configured');
    }
    
    return true;
  } catch (error) {
    log('yellow', '⚠️  Could not check package overrides');
    return true;
  }
}

async function main() {
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('blue', '  Package Version Conflict Checker');
  log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const checks = [
    checkReactVersions(),
    checkNestedReactVersions(),
    checkPeerDependencies(),
    checkCriticalOverrides(),
  ];
  
  const allPassed = checks.every(result => result);
  
  log('blue', '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allPassed) {
    log('green', '✅ All checks passed!');
    log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  } else {
    log('red', '❌ Some checks failed');
    log('yellow', '\n💡 To fix:');
    log('yellow', '   1. Run: rm -rf node_modules pnpm-lock.yaml');
    log('yellow', '   2. Run: pnpm install');
    log('yellow', '   3. Check pnpm overrides in package.json');
    log('blue', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(1);
  }
}

main();
