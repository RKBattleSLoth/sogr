#!/usr/bin/env node

/**
 * SOGR Setup Validation Script
 * Validates that the development environment is properly configured
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, status = 'pending') {
  const statusColors = {
    pending: 'yellow',
    running: 'blue',
    success: 'green',
    error: 'red'
  };
  log(`[${status.toUpperCase()}] ${step}`, statusColors[status]);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Validation checks
const checks = [
  {
    name: 'Node.js Version',
    check: checkNodeVersion,
    required: true
  },
  {
    name: 'Dependencies Installation',
    check: checkDependencies,
    required: true
  },
  {
    name: 'Environment Configuration',
    check: checkEnvironment,
    required: true
  },
  {
    name: 'Database Connection',
    check: checkDatabase,
    required: true
  },
  {
    name: 'AI Service Connectivity',
    check: checkAIServices,
    required: false
  },
  {
    name: 'API Endpoints',
    check: checkAPIEndpoints,
    required: true
  }
];

async function checkNodeVersion() {
  logStep('Checking Node.js version', 'running');
  
  try {
    const version = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
    
    if (majorVersion < 18) {
      logError(`Node.js version ${version} is too old. Required: 18+`);
      return false;
    }
    
    logSuccess(`Node.js version ${version} is compatible`);
    return true;
  } catch (error) {
    logError('Node.js is not installed');
    return false;
  }
}

async function checkDependencies() {
  logStep('Checking dependencies installation', 'running');
  
  try {
    if (!fs.existsSync('node_modules')) {
      logError('node_modules directory not found. Run: npm install');
      return false;
    }
    
    if (!fs.existsSync('package-lock.json')) {
      logWarning('package-lock.json not found. Consider running: npm install');
    }
    
    // Check if key dependencies are installed
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    
    const requiredDeps = ['next', 'react', 'react-dom', '@prisma/client', 'openai'];
    const missingDeps = requiredDeps.filter(dep => !dependencies.includes(dep));
    
    if (missingDeps.length > 0) {
      logError(`Missing required dependencies: ${missingDeps.join(', ')}`);
      return false;
    }
    
    logSuccess('All required dependencies are installed');
    return true;
  } catch (error) {
    logError(`Error checking dependencies: ${error.message}`);
    return false;
  }
}

async function checkEnvironment() {
  logStep('Checking environment configuration', 'running');
  
  try {
    if (!fs.existsSync('.env')) {
      logError('.env file not found. Copy .env.example to .env and configure');
      return false;
    }
    
    const envContent = fs.readFileSync('.env', 'utf8');
    
    // Check for required environment variables
    const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
    const optionalVars = ['LLM_PROVIDER', 'LLM_API_KEY', 'LLM_MODEL', 'FALLBACK_LLM_PROVIDER', 'FALLBACK_LLM_API_KEY', 'FALLBACK_LLM_MODEL'];
    const missingVars = [];
    const placeholderVars = [];
    
    for (const varName of requiredVars) {
      const regex = new RegExp(`${varName}=([^\n\r]*)`);
      const match = envContent.match(regex);
      
      if (!match || !match[1]) {
        missingVars.push(varName);
      } else if (match[1].includes('your-') || match[1].includes('demo-')) {
        placeholderVars.push(varName);
      }
    }
    
    // Check optional LLM variables for placeholders
    for (const varName of optionalVars) {
      const regex = new RegExp(`${varName}=([^\n\r]*)`);
      const match = envContent.match(regex);
      
      if (match && match[1] && (match[1].includes('your-') || match[1].includes('demo-'))) {
        placeholderVars.push(varName);
      }
    }
    
    if (missingVars.length > 0) {
      logError(`Missing environment variables: ${missingVars.join(', ')}`);
      return false;
    }
    
    if (placeholderVars.length > 0) {
      logWarning(`Environment variables with placeholder values: ${placeholderVars.join(', ')}`);
    }
    
    logSuccess('Environment configuration is valid');
    return true;
  } catch (error) {
    logError(`Error checking environment: ${error.message}`);
    return false;
  }
}

async function checkDatabase() {
  logStep('Checking database connection', 'running');
  
  try {
    if (!fs.existsSync('prisma/schema.prisma')) {
      logError('Prisma schema not found');
      return false;
    }
    
    // Check if Prisma client is generated
    if (!fs.existsSync('node_modules/.prisma/client')) {
      logError('Prisma client not generated. Run: npx prisma generate');
      return false;
    }
    
    // Try to run db push to ensure database is set up
    execSync('npx prisma db push --accept-data-loss', { 
      stdio: 'pipe',
      timeout: 30000 
    });
    
    logSuccess('Database connection is working');
    return true;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    logInfo('Try running: npm run db:push');
    return false;
  }
}

async function checkAIServices() {
  logStep('Checking AI service connectivity', 'running');
  
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const providerMatch = envContent.match(/LLM_PROVIDER=([^\n\r]+)/);
    const apiKeyMatch = envContent.match(/LLM_API_KEY=([^\n\r]+)/);
    const fallbackProviderMatch = envContent.match(/FALLBACK_LLM_PROVIDER=([^\n\r]+)/);
    const fallbackApiKeyMatch = envContent.match(/FALLBACK_LLM_API_KEY=([^\n\r]+)/);
    
    let hasValidConfig = false;
    let testedServices = 0;
    
    // Test primary LLM provider
    if (providerMatch && apiKeyMatch && 
        !apiKeyMatch[1].includes('your-') && !apiKeyMatch[1].includes('demo-')) {
      testedServices++;
      const provider = providerMatch[1].toLowerCase();
      const apiKey = apiKeyMatch[1];
      
      try {
        if (provider === 'openai' || provider === 'openrouter') {
          const fetch = require('node-fetch');
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            logSuccess(`Primary LLM provider (${provider}) is working`);
            hasValidConfig = true;
          } else {
            logWarning(`Primary LLM provider (${provider}) API key appears invalid: ${response.status}`);
          }
        } else {
          logInfo(`Primary LLM provider (${provider}) connectivity check skipped`);
          hasValidConfig = true;
        }
      } catch (error) {
        logWarning(`Primary LLM provider check failed: ${error.message}`);
      }
    }
    
    // Test fallback LLM provider
    if (fallbackProviderMatch && fallbackApiKeyMatch && 
        !fallbackApiKeyMatch[1].includes('your-') && !fallbackApiKeyMatch[1].includes('demo-')) {
      testedServices++;
      const fallbackProvider = fallbackProviderMatch[1].toLowerCase();
      const fallbackApiKey = fallbackApiKeyMatch[1];
      
      try {
        if (fallbackProvider === 'openai' || fallbackProvider === 'openrouter') {
          const fetch = require('node-fetch');
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${fallbackApiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            logSuccess(`Fallback LLM provider (${fallbackProvider}) is working`);
            hasValidConfig = true;
          } else {
            logWarning(`Fallback LLM provider (${fallbackProvider}) API key appears invalid: ${response.status}`);
          }
        } else {
          logInfo(`Fallback LLM provider (${fallbackProvider}) connectivity check skipped`);
          hasValidConfig = true;
        }
      } catch (error) {
        logWarning(`Fallback LLM provider check failed: ${error.message}`);
      }
    }
    
    if (testedServices === 0) {
      logWarning('No AI service API keys configured. Skipping AI service check.');
      return true; // Not required for basic functionality
    }
    
    if (hasValidConfig) {
      logSuccess('AI service configuration is valid');
      return true;
    } else {
      logWarning('AI service configuration may have issues');
      return true; // Still not required for basic functionality
    }
  } catch (error) {
    logWarning(`AI service check failed (optional): ${error.message}`);
    return true; // Not required for basic functionality
  }
}

async function checkAPIEndpoints() {
  logStep('Checking API endpoints', 'running');
  
  try {
    // Check if key API files exist
    const apiFiles = [
      'src/app/api/unified-search/route.ts',
      'src/app/api/semantic-search/route.ts',
      'src/app/api/query/route.ts',
      'src/app/api/health/route.ts'
    ];
    
    const missingFiles = apiFiles.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
      logError(`Missing API endpoint files: ${missingFiles.join(', ')}`);
      return false;
    }
    
    logSuccess('All required API endpoints are present');
    return true;
  } catch (error) {
    logError(`Error checking API endpoints: ${error.message}`);
    return false;
  }
}

async function runValidation() {
  log('🚀 SOGR Setup Validation', 'bright');
  log('=============================', 'bright');
  log('');
  
  let passedChecks = 0;
  let totalChecks = 0;
  let hasCriticalFailures = false;
  
  for (const check of checks) {
    totalChecks++;
    const result = await check.check();
    
    if (result) {
      passedChecks++;
    } else if (check.required) {
      hasCriticalFailures = true;
    }
  }
  
  log('');
  log('📊 Validation Results', 'bright');
  log('======================', 'bright');
  log(`Passed: ${passedChecks}/${totalChecks}`);
  log('');
  
  if (hasCriticalFailures) {
    logError('❌ Setup validation failed. Please fix the required issues above.');
    log('');
    logInfo('For help, check the setup guide: docs/setup/SETUP.md');
    process.exit(1);
  } else if (passedChecks === totalChecks) {
    logSuccess('✅ All checks passed! Your SOGR setup is ready.');
    log('');
    logInfo('You can now start the development server:');
    logInfo('npm run dev');
    process.exit(0);
  } else {
    logWarning('⚠️  Setup validation passed with warnings. Some optional features may not work.');
    log('');
    logInfo('You can start the development server:');
    logInfo('npm run dev');
    process.exit(0);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runValidation().catch(error => {
    logError(`Validation failed with error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runValidation, checks };