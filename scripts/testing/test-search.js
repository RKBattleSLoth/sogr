#!/usr/bin/env node

/**
 * SOGR Search Testing Script
 * Tests unified search and semantic search functionality
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

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

async function testSearch(endpoint, query, testName) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data: data,
      response: data.response || data.results || data
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

async function runSearchTests() {
  log('🔍 SOGR Search Testing', 'bright');
  log('======================', 'bright');
  log('');

  let passedTests = 0;
  let totalTests = 0;

  // Test queries for unified search
  const unifiedSearchTests = [
    {
      query: 'Where does Mikey Anderson work?',
      expectedKeywords: ['Mikey', 'Anderson', 'Think', 'work'],
      name: 'Workplace Query'
    },
    {
      query: 'Who works at Think?',
      expectedKeywords: ['Think', 'Felix', 'Mikey', 'Jesse'],
      name: 'Organization Query'
    },
    {
      query: 'Tell me about Felix',
      expectedKeywords: ['Felix', 'CEO', 'Think'],
      name: 'Person Information Query'
    },
    {
      query: 'What is John\'s Twitter?',
      expectedKeywords: ['John', 'Twitter', '@johndoe'],
      name: 'Social Media Query'
    },
    {
      query: 'Where does Mikey Anderson work and what are his thoughts on building?',
      expectedKeywords: ['Mikey', 'Anderson', 'Think', 'building'],
      name: 'Complex Multi-part Query'
    }
  ];

  // Test unified search
  log('🧪 Testing Unified Search...', 'blue');
  log('============================', 'blue');
  
  for (const test of unifiedSearchTests) {
    totalTests++;
    log(`Testing: ${test.query}`, 'cyan');
    
    const result = await testSearch('/api/unified-search', test.query, test.name);
    
    if (result.ok && result.response) {
      const responseText = JSON.stringify(result.response).toLowerCase();
      const hasExpectedKeywords = test.expectedKeywords.some(keyword => 
        responseText.includes(keyword.toLowerCase())
      );
      
      if (hasExpectedKeywords) {
        logTest(test.name, true, `Found relevant information in response`);
        passedTests++;
      } else {
        logTest(test.name, false, `Response missing expected keywords: ${test.expectedKeywords.join(', ')}`);
      }
    } else {
      logTest(test.name, false, `Status: ${result.status}, Error: ${result.error || 'No response'}`);
    }
    
    log('');
  }

  // Test semantic search
  log('🧪 Testing Semantic Search...', 'blue');
  log('=============================', 'blue');
  
  const semanticSearchTests = [
    {
      query: 'people with technology experience',
      expectedType: 'array',
      name: 'Technology Experience Search'
    },
    {
      query: 'CEOs and executives',
      expectedType: 'array',
      name: 'Executive Search'
    },
    {
      query: 'building and systems',
      expectedType: 'array',
      name: 'Building Expertise Search'
    },
    {
      query: 'social media presence',
      expectedType: 'array',
      name: 'Social Media Search'
    }
  ];

  for (const test of semanticSearchTests) {
    totalTests++;
    log(`Testing: ${test.query}`, 'cyan');
    
    const result = await testSearch('/api/semantic-search', test.query, test.name);
    
    if (result.ok && result.data) {
      if (Array.isArray(result.data)) {
        logTest(test.name, true, `Found ${result.data.length} results`);
        passedTests++;
      } else {
        logTest(test.name, false, `Expected array but got ${typeof result.data}`);
      }
    } else {
      logTest(test.name, false, `Status: ${result.status}, Error: ${result.error || 'No response'}`);
    }
    
    log('');
  }

  // Test query endpoint
  log('🧪 Testing Query Endpoint...', 'blue');
  log('==========================', 'blue');
  
  const queryTests = [
    {
      query: 'Who works at Think?',
      name: 'Basic Query'
    },
    {
      query: 'Show me all CEOs',
      name: 'Title Query'
    },
    {
      query: 'What is Felix\'s Twitter?',
      name: 'Social Media Query'
    }
  ];

  for (const test of queryTests) {
    totalTests++;
    log(`Testing: ${test.query}`, 'cyan');
    
    const result = await testSearch('/api/query', test.query, test.name);
    
    if (result.ok && result.data?.choices?.length > 0) {
      const response = result.data.choices[0].message?.content;
      if (response && response.length > 0) {
        logTest(test.name, true, `Query processed successfully`);
        passedTests++;
      } else {
        logTest(test.name, false, 'Empty response from query');
      }
    } else {
      logTest(test.name, false, `Status: ${result.status}, Error: ${result.error || 'No response'}`);
    }
    
    log('');
  }

  // Results summary
  log('📊 Search Test Results', 'bright');
  log('======================', 'bright');
  log(`Passed: ${passedTests}/${totalTests}`);
  log('');

  if (passedTests === totalTests) {
    log('✅ All search tests passed!', 'green');
    log('');
    log('🚀 Your search functionality is working correctly.');
    log('');
    log('💡 Try these queries in the application:');
    log('   - "Where does Mikey Anderson work?"');
    log('   - "Who works at Think?"');
    log('   - "Tell me about Felix"');
    log('   - "What is John\'s Twitter?"');
    process.exit(0);
  } else {
    log(`❌ ${totalTests - passedTests} search tests failed.`, 'red');
    log('');
    log('💡 Make sure:');
    log('   1. The development server is running (npm run dev)');
    log('   2. Database is seeded with sample data (npm run db:seed)');
    log('   3. AI services are configured in .env');
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
  
  await runSearchTests();
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    log(`❌ Search testing failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runSearchTests, testSearch };