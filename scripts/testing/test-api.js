#!/usr/bin/env node

/**
 * SOGR API Testing Script
 * Tests all API endpoints for functionality and response correctness
 */

const fetch = require('node-fetch');
const fs = require('fs');

const BASE_URL = 'http://localhost:8000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
    log(`   ${details}`, passed ? 'green' : 'yellow');
  }
}

async function testEndpoint(endpoint, method = 'GET', body = null, expectedStatus = 200) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    
    return {
      status: response.status,
      ok: response.status === expectedStatus,
      data: response.status === 200 ? await response.json() : null,
      error: response.status !== expectedStatus ? await response.text() : null
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: null,
      error: error.message
    };
  }
}

async function runAPITests() {
  log('🧪 SOGR API Testing', 'bright');
  log('====================', 'bright');
  log('');

  let passedTests = 0;
  let totalTests = 0;

  // Test health endpoint
  totalTests++;
  log('Testing Health Endpoint...', 'blue');
  const healthResult = await testEndpoint('/api/health');
  if (healthResult.ok && healthResult.data?.status === 'ok') {
    logTest('Health Check', true, 'System is healthy');
    passedTests++;
  } else {
    logTest('Health Check', false, `Status: ${healthResult.status}, Error: ${healthResult.error}`);
  }

  // Test unified search endpoint
  totalTests++;
  log('Testing Unified Search Endpoint...', 'blue');
  const searchResult = await testEndpoint('/api/unified-search', 'POST', {
    query: 'Where does Mikey Anderson work?'
  });
  if (searchResult.ok && searchResult.data?.response) {
    logTest('Unified Search', true, 'Search query processed successfully');
    passedTests++;
  } else {
    logTest('Unified Search', false, `Status: ${searchResult.status}, Error: ${searchResult.error}`);
  }

  // Test semantic search endpoint
  totalTests++;
  log('Testing Semantic Search Endpoint...', 'blue');
  const semanticResult = await testEndpoint('/api/semantic-search', 'POST', {
    query: 'people with technology experience',
    limit: 5
  });
  if (semanticResult.ok) {
    logTest('Semantic Search', true, 'Semantic search completed');
    passedTests++;
  } else {
    logTest('Semantic Search', false, `Status: ${semanticResult.status}, Error: ${semanticResult.error}`);
  }

  // Test query endpoint
  totalTests++;
  log('Testing Query Endpoint...', 'blue');
  const queryResult = await testEndpoint('/api/query', 'POST', {
    query: 'Who works at Think?'
  });
  if (queryResult.ok && queryResult.data?.choices?.length > 0) {
    logTest('Query Processing', true, 'Query processed successfully');
    passedTests++;
  } else {
    logTest('Query Processing', false, `Status: ${queryResult.status}, Error: ${queryResult.error}`);
  }

  // Test import email endpoint
  totalTests++;
  log('Testing Email Import Endpoint...', 'blue');
  const emailResult = await testEndpoint('/api/import/email', 'POST', {
    emailContent: 'Test email content for import'
  });
  if (emailResult.ok || emailResult.status === 400) { // 400 is acceptable for invalid email format
    logTest('Email Import', true, 'Email import endpoint responding');
    passedTests++;
  } else {
    logTest('Email Import', false, `Status: ${emailResult.status}, Error: ${emailResult.error}`);
  }

  // Test interaction endpoints
  totalTests++;
  log('Testing Interaction Update Endpoint...', 'blue');
  const updateResult = await testEndpoint('/api/interaction/update', 'POST', {
    interactionId: 'test-id',
    updates: { notes: 'Updated test notes' }
  });
  if (updateResult.ok || updateResult.status === 400) { // 400 is acceptable for invalid ID
    logTest('Interaction Update', true, 'Interaction update endpoint responding');
    passedTests++;
  } else {
    logTest('Interaction Update', false, `Status: ${updateResult.status}, Error: ${updateResult.error}`);
  }

  // Test database test endpoints
  totalTests++;
  log('Testing Database Test Endpoint...', 'blue');
  const dbTestResult = await testEndpoint('/api/test-db');
  if (dbTestResult.ok) {
    logTest('Database Test', true, 'Database test endpoint working');
    passedTests++;
  } else {
    logTest('Database Test', false, `Status: ${dbTestResult.status}, Error: ${dbTestResult.error}`);
  }

  // Test node data endpoint
  totalTests++;
  log('Testing Node Data Endpoint...', 'blue');
  const nodeDataResult = await testEndpoint('/api/node-data', 'POST', {
    nodeId: 'test-node-id',
    nodeType: 'person'
  });
  if (nodeDataResult.ok || nodeDataResult.status === 404) { // 404 is acceptable for non-existent node
    logTest('Node Data', true, 'Node data endpoint responding');
    passedTests++;
  } else {
    logTest('Node Data', false, `Status: ${nodeDataResult.status}, Error: ${nodeDataResult.error}`);
  }

  // Results summary
  log('');
  log('📊 API Test Results', 'bright');
  log('==================', 'bright');
  log(`Passed: ${passedTests}/${totalTests}`);
  log('');

  if (passedTests === totalTests) {
    log('✅ All API tests passed!', 'green');
    log('');
    log('🚀 Your API endpoints are working correctly.');
    process.exit(0);
  } else {
    log(`❌ ${totalTests - passedTests} API tests failed.`, 'red');
    log('');
    log('💡 Make sure the development server is running:');
    log('   npm run dev');
    process.exit(1);
  }
}

// Check if development server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, { timeout: 5000 });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  log('🔍 Checking if development server is running...', 'blue');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    log('❌ Development server is not running.', 'red');
    log('');
    log('💡 Please start the development server first:');
    log('   npm run dev');
    log('');
    log('⏳ Waiting for server to start...');
    log('   (Run this script again after the server is ready)');
    process.exit(1);
  }

  log('✅ Development server is running.', 'green');
  log('');
  
  await runAPITests();
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    log(`❌ API testing failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runAPITests, testEndpoint };