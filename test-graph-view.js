// Test script to verify Graph View functionality
const fetch = require('node-fetch');

async function testGraphView() {
  console.log('Testing Graph View functionality...');
  
  try {
    // Test 1: Add sample interactions
    console.log('\n1. Adding sample interactions...');
    
    const sampleInteractions = [
      {
        text: "Today I met Alice Johnson, the CTO of TechCorp. Her LinkedIn is @alice_tech."
      },
      {
        text: "Had coffee with Bob Smith from DataSystems. He used to work at Google."
      },
      {
        text: "Met Carol White, CEO of InnovateLabs. Her Twitter handle is @carol_innovates."
      }
    ];
    
    for (const interaction of sampleInteractions) {
      const response = await fetch('http://localhost:3000/api/smart-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: interaction.text }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to process interaction: ${interaction.text}`);
      }
      
      const data = await response.json();
      console.log(`✓ Processed: ${interaction.text.substring(0, 50)}...`);
      console.log(`  - Intent: ${data.intent}`);
      console.log(`  - Action: ${data.action}`);
      if (data.storedPerson) {
        console.log(`  - Person: ${data.storedPerson.name}`);
      }
    }
    
    // Test 2: Verify data is in database
    console.log('\n2. Verifying data in database...');
    
    const queryResponse = await fetch('http://localhost:3000/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: 'Show me all people in my network' }),
    });
    
    if (!queryResponse.ok) {
      throw new Error('Failed to query database');
    }
    
    const queryData = await queryResponse.json();
    console.log('✓ Query results:');
    console.log(queryData.response);
    
    // Test 3: Check Graph View tab accessibility
    console.log('\n3. Graph View should now be accessible with:');
    console.log('   - 3+ people nodes');
    console.log('   - 3+ organization nodes');
    console.log('   - 3+ interaction nodes');
    console.log('   - Social media connections');
    console.log('   - Interactive features (zoom, click, etc.)');
    
    console.log('\n✅ Graph View Test Complete!');
    console.log('\nTo test the Graph View:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Click on the "Graph View" tab');
    console.log('3. You should see:');
    console.log('   - A visual graph with colored nodes');
    console.log('   - Blue nodes for people');
    console.log('   - Amber nodes for organizations');
    console.log('   - Green nodes for interactions');
    console.log('   - Violet nodes for social media');
    console.log('4. Try clicking on nodes to see details');
    console.log('5. Use zoom controls to adjust the view');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testGraphView();