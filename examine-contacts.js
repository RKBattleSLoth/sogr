const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function examineData() {
  console.log('=== CONTACT INFORMATION DATABASE EXAMINATION ===\n');
  
  try {
    // Examine People table
    console.log('👥 PEOPLE TABLE (Contact Information)');
    console.log('='.repeat(50));
    
    const people = await prisma.person.findMany({
      include: {
        currentRoles: {
          include: {
            organization: true
          }
        },
        previousRoles: {
          include: {
            organization: true
          }
        },
        socialMediaHandles: true,
        interactions: {
          orderBy: {
            date: 'desc'
          },
          take: 2
        }
      }
    });
    
    console.log(`📊 Total people: ${people.length}\n`);
    
    people.forEach((person, index) => {
      console.log(`👤 Person ${index + 1}: ${person.name}`);
      console.log(`   ID: ${person.id}`);
      console.log(`   First Name: ${person.firstName || 'NULL'}`);
      console.log(`   Last Name: ${person.lastName || 'NULL'}`);
      console.log(`   Middle Names: ${person.middleNames || 'NULL'}`);
      console.log(`   Nicknames: ${person.nicknames || 'NULL'}`);
      console.log(`   Bio: ${person.bio || 'NULL'}`);
      console.log(`   Email: ${person.email || 'NULL'}`);
      console.log(`   Phone: ${person.phone || 'NULL'}`);
      console.log(`   Created: ${person.createdAt}`);
      console.log(`   Updated: ${person.updatedAt}`);
      
      if (person.currentRoles.length > 0) {
        console.log(`   🏢 Current Roles:`);
        person.currentRoles.forEach(role => {
          console.log(`     - ${role.title} at ${role.organization?.name || 'Unknown'} (since ${role.startDate})`);
        });
      }
      
      if (person.previousRoles.length > 0) {
        console.log(`   🏢 Previous Roles:`);
        person.previousRoles.forEach(role => {
          console.log(`     - ${role.title} at ${role.organization?.name || 'Unknown'} (${role.startDate} - ${role.endDate || 'present'})`);
        });
      }
      
      if (person.socialMediaHandles.length > 0) {
        console.log(`   📱 Social Media:`);
        person.socialMediaHandles.forEach(social => {
          console.log(`     - ${social.platform}: ${social.handle}`);
        });
      }
      
      if (person.interactions.length > 0) {
        console.log(`   💬 Recent Interactions:`);
        person.interactions.forEach(interaction => {
          console.log(`     - ${interaction.summary} (${interaction.date})`);
          console.log(`       Context: ${interaction.context || 'NULL'}`);
          console.log(`       Full Text: ${interaction.fullText?.substring(0, 100) || 'NULL'}...`);
        });
      }
      
      console.log('\n' + '-'.repeat(50));
    });
    
    // Examine Organizations table
    console.log('\n🏢 ORGANIZATIONS TABLE');
    console.log('='.repeat(50));
    
    const organizations = await prisma.organization.findMany({
      include: {
        currentRoles: {
          include: {
            person: true
          }
        },
        previousRoles: {
          include: {
            person: true
          }
        }
      }
    });
    
    console.log(`📊 Total organizations: ${organizations.length}\n`);
    
    organizations.forEach((org, index) => {
      console.log(`🏢 Organization ${index + 1}: ${org.name}`);
      console.log(`   ID: ${org.id}`);
      console.log(`   Description: ${org.description || 'NULL'}`);
      console.log(`   Website: ${org.website || 'NULL'}`);
      console.log(`   Industry: ${org.industry || 'NULL'}`);
      console.log(`   Created: ${org.createdAt}`);
      
      if (org.currentRoles.length > 0) {
        console.log(`   👥 Current People:`);
        org.currentRoles.forEach(role => {
          console.log(`     - ${role.person.name}: ${role.title}`);
        });
      }
      
      console.log('\n' + '-'.repeat(30));
    });
    
    // Examine Interactions table
    console.log('\n💬 INTERACTIONS TABLE');
    console.log('='.repeat(50));
    
    const interactions = await prisma.interaction.findMany({
      include: {
        person: true,
        organization: true
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    });
    
    console.log(`📊 Total interactions: ${interactions.length}\n`);
    
    interactions.forEach((interaction, index) => {
      console.log(`💬 Interaction ${index + 1}:`);
      console.log(`   ID: ${interaction.id}`);
      console.log(`   Summary: ${interaction.summary}`);
      console.log(`   Context: ${interaction.context || 'NULL'}`);
      console.log(`   Date: ${interaction.date}`);
      console.log(`   Person: ${interaction.person?.name || 'NULL'}`);
      console.log(`   Organization: ${interaction.organization?.name || 'NULL'}`);
      console.log(`   Full Text: ${interaction.fullText?.substring(0, 100) || 'NULL'}...`);
      console.log(`   Snippet: ${interaction.snippet || 'NULL'}`);
      console.log(`   Created: ${interaction.createdAt}`);
      console.log('\n' + '-'.repeat(30));
    });
    
    console.log('\n🎯 KEY INSIGHTS:');
    console.log('='.repeat(30));
    
    // Check for data quality issues
    const peopleWithMissingNames = people.filter(p => !p.firstName && !p.lastName);
    const peopleWithIncompleteNames = people.filter(p => !p.lastName);
    const interactionsWithBadContext = interactions.filter(i => i.context && i.context.includes('Edit'));
    
    console.log(`📈 People with missing first/last names: ${peopleWithMissingNames.length}`);
    console.log(`📈 People with incomplete names (no last name): ${peopleWithIncompleteNames.length}`);
    console.log(`📈 Interactions with edit context: ${interactionsWithBadContext.length}`);
    
    if (peopleWithIncompleteNames.length > 0) {
      console.log('\n⚠️  PEOPLE WITH INCOMPLETE NAMES:');
      peopleWithIncompleteNames.forEach(person => {
        console.log(`   - ${person.name} (ID: ${person.id})`);
      });
    }
    
    if (interactionsWithBadContext.length > 0) {
      console.log('\n⚠️  INTERACTIONS WITH EDIT CONTEXT:');
      interactionsWithBadContext.forEach(interaction => {
        console.log(`   - ${interaction.summary} (Context: ${interaction.context})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error examining data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

examineData().catch(console.error);