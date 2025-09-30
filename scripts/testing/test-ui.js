#!/usr/bin/env node

/**
 * SOGR UI Testing Script
 * Tests UI components and frontend functionality
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${status} ${testName}`, color);
  if (details) {
    log(`   ${details}`, passed ? 'cyan' : 'yellow');
  }
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function checkFileContains(filePath, content) {
  if (!fs.existsSync(filePath)) return false;
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return fileContent.includes(content);
}

function checkComponentStructure(componentPath) {
  const requiredFiles = ['page.tsx', 'layout.tsx'];
  const requiredDirs = ['components', 'lib'];
  
  return {
    files: requiredFiles.filter(file => checkFileExists(path.join(componentPath, file))),
    dirs: requiredDirs.filter(dir => checkFileExists(path.join(componentPath, dir)))
  };
}

async function runUITests() {
  log('🎨 SOGR UI Testing', 'bright');
  log('==================', 'bright');
  log('');

  let passedTests = 0;
  let totalTests = 0;

  // Test project structure
  totalTests++;
  log('Testing Project Structure...', 'blue');
  const structure = checkComponentStructure('src');
  if (structure.files.length === 2 && structure.dirs.length === 2) {
    logTest('Project Structure', true, 'All required files and directories present');
    passedTests++;
  } else {
    logTest('Project Structure', false, `Missing files: ${2 - structure.files.length}, Missing dirs: ${2 - structure.dirs.length}`);
  }

  // Test key components
  const keyComponents = [
    { path: 'src/components/unified-search.tsx', name: 'Unified Search Component' },
    { path: 'src/components/graph-view.tsx', name: 'Graph View Component' },
    { path: 'src/components/semantic-search.tsx', name: 'Semantic Search Component' },
    { path: 'src/components/connection-dashboard.tsx', name: 'Connection Dashboard' },
    { path: 'src/components/import-dashboard.tsx', name: 'Import Dashboard' }
  ];

  log('Testing Key Components...', 'blue');
  for (const component of keyComponents) {
    totalTests++;
    if (checkFileExists(component.path)) {
      logTest(component.name, true, 'Component file exists');
      passedTests++;
    } else {
      logTest(component.name, false, 'Component file missing');
    }
  }

  // Test UI components
  totalTests++;
  log('Testing UI Components Directory...', 'blue');
  const uiComponentsPath = 'src/components/ui';
  if (checkFileExists(uiComponentsPath)) {
    const uiFiles = fs.readdirSync(uiComponentsPath);
    const uiComponentCount = uiFiles.filter(file => file.endsWith('.tsx')).length;
    if (uiComponentCount > 10) {
      logTest('UI Components', true, `Found ${uiComponentCount} UI components`);
      passedTests++;
    } else {
      logTest('UI Components', false, `Only ${uiComponentCount} UI components found (expected > 10)`);
    }
  } else {
    logTest('UI Components', false, 'UI components directory not found');
  }

  // Test API routes
  const apiRoutes = [
    { path: 'src/app/api/unified-search/route.ts', name: 'Unified Search API' },
    { path: 'src/app/api/semantic-search/route.ts', name: 'Semantic Search API' },
    { path: 'src/app/api/query/route.ts', name: 'Query API' },
    { path: 'src/app/api/health/route.ts', name: 'Health API' },
    { path: 'src/app/api/import/email/route.ts', name: 'Email Import API' }
  ];

  log('Testing API Routes...', 'blue');
  for (const route of apiRoutes) {
    totalTests++;
    if (checkFileExists(route.path)) {
      logTest(route.name, true, 'API route file exists');
      passedTests++;
    } else {
      logTest(route.name, false, 'API route file missing');
    }
  }

  // Test service files
  const serviceFiles = [
    { path: 'src/lib/services/llm.ts', name: 'LLM Service' },
    { path: 'src/lib/services/gmail.ts', name: 'Gmail Service' },
    { path: 'src/lib/services/outlook.ts', name: 'Outlook Service' },
    { path: 'src/lib/vector-client.ts', name: 'Vector Client' },
    { path: 'src/lib/vector-db.ts', name: 'Vector Database' },
    { path: 'src/lib/query-analyzer.ts', name: 'Query Analyzer' },
    { path: 'src/lib/search-strategy.ts', name: 'Search Strategy' },
    { path: 'src/lib/result-fusion.ts', name: 'Result Fusion' }
  ];

  log('Testing Service Files...', 'blue');
  for (const service of serviceFiles) {
    totalTests++;
    if (checkFileExists(service.path)) {
      logTest(service.name, true, 'Service file exists');
      passedTests++;
    } else {
      logTest(service.name, false, 'Service file missing');
    }
  }

  // Test configuration files
  const configFiles = [
    { path: 'tailwind.config.ts', name: 'Tailwind Config' },
    { path: 'tsconfig.json', name: 'TypeScript Config' },
    { path: 'next.config.ts', name: 'Next.js Config' },
    { path: 'prisma/schema.prisma', name: 'Prisma Schema' },
    { path: 'components.json', name: 'Components Config' }
  ];

  log('Testing Configuration Files...', 'blue');
  for (const config of configFiles) {
    totalTests++;
    if (checkFileExists(config.path)) {
      logTest(config.name, true, 'Configuration file exists');
      passedTests++;
    } else {
      logTest(config.name, false, 'Configuration file missing');
    }
  }

  // Test documentation
  const docFiles = [
    { path: 'README.md', name: 'Main README' },
    { path: 'docs/setup/SETUP.md', name: 'Setup Guide' },
    { path: 'docs/PRD.md', name: 'Product Requirements' },
    { path: '.env.example', name: 'Environment Example' }
  ];

  log('Testing Documentation...', 'blue');
  for (const doc of docFiles) {
    totalTests++;
    if (checkFileExists(doc.path)) {
      logTest(doc.name, true, 'Documentation file exists');
      passedTests++;
    } else {
      logTest(doc.name, false, 'Documentation file missing');
    }
  }

  // Test scripts
  const scriptFiles = [
    { path: 'scripts/validate-setup.js', name: 'Setup Validation Script' },
    { path: 'scripts/seed-database.ts', name: 'Database Seed Script' },
    { path: 'scripts/testing/test-api.js', name: 'API Test Script' },
    { path: 'scripts/testing/test-search.js', name: 'Search Test Script' },
    { path: 'scripts/testing/test-ui.js', name: 'UI Test Script' },
    { path: 'scripts/testing/test-database.js', name: 'Database Test Script' }
  ];

  log('Testing Scripts...', 'blue');
  for (const script of scriptFiles) {
    totalTests++;
    if (checkFileExists(script.path)) {
      logTest(script.name, true, 'Script file exists');
      passedTests++;
    } else {
      logTest(script.name, false, 'Script file missing');
    }
  }

  // Test package.json scripts
  totalTests++;
  log('Testing Package.json Scripts...', 'blue');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredScripts = ['dev', 'build', 'start', 'lint', 'typecheck', 'setup', 'validate'];
  const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
  
  if (missingScripts.length === 0) {
    logTest('Package Scripts', true, 'All required scripts are present');
    passedTests++;
  } else {
    logTest('Package Scripts', false, `Missing scripts: ${missingScripts.join(', ')}`);
  }

  // Results summary
  log('');
  log('📊 UI Test Results', 'bright');
  log('==================', 'bright');
  log(`Passed: ${passedTests}/${totalTests}`);
  log('');

  if (passedTests === totalTests) {
    log('✅ All UI tests passed!', 'green');
    log('');
    log('🚀 Your UI structure is complete and well-organized.');
    log('');
    log('💡 Next steps:');
    log('   1. Start the development server: npm run dev');
    log('   2. Open http://localhost:3000 in your browser');
    log('   3. Test the application functionality');
    process.exit(0);
  } else {
    log(`❌ ${totalTests - passedTests} UI tests failed.`, 'red');
    log('');
    log('💡 Some files or components are missing.');
    log('   Check the test results above for details.');
    process.exit(1);
  }
}

// Main execution
async function main() {
  await runUITests();
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    log(`❌ UI testing failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runUITests };