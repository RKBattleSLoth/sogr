#!/usr/bin/env node

// Test script to verify the editing functionality
const fetch = require('node-fetch');

async function testEditing() {
  const baseUrl = 'http://localhost:3005';
  
  console.log('=== Testing Social Life Information Management System ===\n');
  
  // Test 1: Add a new person with complete information
  console.log('1. Adding a new person (Mikey) with complete information...');
  try {
    const response1 = await fetch(`${baseUrl}/api/smart-process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: 'I met Mikey Chen today, he\'s the CEO of Think Foundation. His LinkedIn is @mikeychen.'
      })
    });
    
    const result1 = await response1.json();
    console.log('✅ Add Result:', JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error('❌ Add Error:', error.message);
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Edit Mikey's role (should NOT create an interaction, should preserve name)
  console.log('\n2. Editing Mikey\'s role (should preserve name and not create interaction)...');
  try {
    const response2 = await fetch(`${baseUrl}/api/smart-process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: 'Update Mikey\'s role at Think, he\'s now a Story Samurai'
      })
    });
    
    const result2 = await response2.json();
    console.log('✅ Edit Result:', JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('❌ Edit Error:', error.message);
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Query Mikey's information to verify the edit worked
  console.log('\n3. Querying Mikey\'s information to verify edits...');
  try {
    const response3 = await fetch(`${baseUrl}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        question: 'Tell me about Mikey'
      })
    });
    
    const result3 = await response3.json();
    console.log('✅ Query Result:', JSON.stringify(result3, null, 2));
  } catch (error) {
    console.error('❌ Query Error:', error.message);
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 4: Add a real interaction (should create interaction record)
  console.log('\n4. Adding a real interaction (should create interaction record)...');
  try {
    const response4 = await fetch(`${baseUrl}/api/smart-process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: 'I had coffee with Mikey yesterday and we discussed the new project'
      })
    });
    
    const result4 = await response4.json();
    console.log('✅ Real Interaction Result:', JSON.stringify(result4, null, 2));
  } catch (error) {
    console.error('❌ Real Interaction Error:', error.message);
  }
  
  console.log('\n=== Test Complete ===');
}

testEditing().catch(console.error);