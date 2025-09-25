// Test script to verify the enhanced Graph View with detailed node dialog
const fetch = require('node-fetch');

async function testNodeDialog() {
  console.log('Testing Enhanced Graph View with Node Dialog...');
  
  try {
    // Step 1: Add a sample interaction
    console.log('\n1. Adding sample interaction...');
    
    const interactionResponse = await fetch('http://localhost:3000/api/smart-process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text: "Today I met David Chen, the Senior Engineer at Google. His LinkedIn is @david_google and Twitter is @david_dev." 
      }),
    });
    
    if (!interactionResponse.ok) {
      throw new Error('Failed to process interaction');
    }
    
    const interactionData = await interactionResponse.json();
    console.log('✓ Interaction processed successfully');
    console.log(`  - Person ID: ${interactionData.storedPerson?.id}`);
    console.log(`  - Interaction ID: ${interactionData.storedInteraction?.id}`);
    
    // Step 2: Test the node-data API
    if (interactionData.storedPerson?.id) {
      console.log('\n2. Testing node-data API...');
      
      const nodeDataResponse = await fetch('http://localhost:3000/api/node-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: interactionData.storedPerson.id,
          nodeType: 'person'
        }),
      });
      
      if (!nodeDataResponse.ok) {
        throw new Error('Failed to fetch node data');
      }
      
      const nodeData = await nodeDataResponse.json();
      console.log('✓ Node data fetched successfully');
      console.log(`  - Type: ${nodeData.type}`);
      console.log(`  - Table: ${nodeData.table}`);
      console.log(`  - Name: ${nodeData.formatted?.firstName} ${nodeData.formatted?.lastName}`);
      
      if (nodeData.formatted?.currentRoles?.length > 0) {
        console.log(`  - Current Role: ${nodeData.formatted.currentRoles[0].title} at ${nodeData.formatted.currentRoles[0].organization}`);
      }
      
      if (nodeData.formatted?.socialMedia?.length > 0) {
        console.log(`  - Social Media: ${nodeData.formatted.socialMedia.length} accounts`);
        nodeData.formatted.socialMedia.forEach((social, index) => {
          console.log(`    ${index + 1}. ${social.platform}: ${social.handle}`);
        });
      }
    }
    
    // Step 3: Instructions for manual testing
    console.log('\n3. Manual Testing Instructions:');
    console.log('✅ Enhanced Graph View is ready!');
    console.log('\nTo test the new features:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Click on the "Graph View" tab');
    console.log('3. You should see the new interaction visualized');
    console.log('4. Click on any node (person, organization, social media, or interaction)');
    console.log('5. A detailed dialog should appear showing:');
    console.log('   - Complete database information');
    console.log('   - Formatted view with organized sections');
    console.log('   - Raw data view for debugging');
    console.log('   - Copy data functionality');
    console.log('6. Toggle between "Formatted" and "Raw Data" views');
    console.log('7. Use the "Copy Data" button to export the information');
    
    console.log('\n🎯 Key Features for Debugging:');
    console.log('- View complete database records for any entity');
    console.log('- See all relationships (current roles, previous work, social media)');
    console.log('- Access raw JSON data for technical debugging');
    console.log('- Identify data inconsistencies or missing information');
    console.log('- Understand how AI is structuring your social network data');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testNodeDialog();