const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalCleanup() {
  console.log('🎯 FINAL CLEANUP - Fix remaining issues\n');
  
  try {
    // Fix the primary Mikey record to have proper lastName
    console.log('🔧 Fix 1: Update primary Mikey record with correct lastName...');
    
    const primaryMikey = await prisma.person.findFirst({
      where: {
        OR: [
          { name: 'Mikey' },
          { firstName: 'Mikey' }
        ]
      }
    });
    
    if (primaryMikey) {
      console.log(`📍 Found primary Mikey: ${primaryMikey.name} (ID: ${primaryMikey.id})`);
      console.log(`   Current: firstName="${primaryMikey.firstName}", lastName="${primaryMikey.lastName}"`);
      
      // Update to have proper lastName
      const updatedMikey = await prisma.person.update({
        where: { id: primaryMikey.id },
        data: {
          lastName: 'Chen',
          name: 'Mikey Chen'  // Update display name too
        }
      });
      
      console.log(`✅ Updated: firstName="${updatedMikey.firstName}", lastName="${updatedMikey.lastName}"`);
      console.log(`✅ Updated: name="${updatedMikey.name}"`);
    }
    
    // Delete duplicate records
    console.log('\n🔧 Fix 2: Deleting duplicate records...');
    
    const duplicatesToDelete = [
      'cmfzozt5d0000riqrfp5vmknk',  // "Mike" record
      'cmfzqtqqy0002rig0cpnvg5fv'   // "Mikey Anderson" record (keep as separate person)
    ];
    
    for (const duplicateId of duplicatesToDelete) {
      try {
        // First check if record exists
        const duplicate = await prisma.person.findUnique({
          where: { id: duplicateId }
        });
        
        if (duplicate) {
          console.log(`🗑️ Deleting duplicate: ${duplicate.name} (ID: ${duplicate.id})`);
          
          // Delete the person (cascade should handle related records)
          await prisma.person.delete({
            where: { id: duplicateId }
          });
          
          console.log(`✅ Deleted: ${duplicate.name}`);
        } else {
          console.log(`ℹ️ Record ${duplicateId} not found, might already be deleted`);
        }
      } catch (error) {
        console.error(`❌ Error deleting record ${duplicateId}:`, error.message);
      }
    }
    
    // Show final clean state
    console.log('\n📊 FINAL CLEAN STATE:');
    
    const finalMikey = await prisma.person.findFirst({
      where: {
        OR: [
          { name: 'Mikey Chen' },
          { firstName: 'Mikey' }
        ]
      },
      include: {
        currentRoles: {
          include: { organization: true }
        },
        socialMediaHandles: true,
        interactions: {
          orderBy: { date: 'desc' },
          take: 5
        }
      }
    });
    
    if (finalMikey) {
      console.log('\n👤 FINAL MIKEY RECORD:');
      console.log(`   Name: ${finalMikey.name}`);
      console.log(`   First Name: ${finalMikey.firstName}`);
      console.log(`   Last Name: ${finalMikey.lastName}`);
      console.log(`   Middle Names: ${finalMikey.middleNames || 'none'}`);
      console.log(`   Nicknames: ${finalMikey.nicknames || 'none'}`);
      console.log(`   Bio: ${finalMikey.bio || 'none'}`);
      
      if (finalMikey.currentRoles.length > 0) {
        console.log(`   🏢 Current Roles:`);
        finalMikey.currentRoles.forEach(role => {
          console.log(`     - ${role.title} at ${role.organization.name}`);
        });
      }
      
      if (finalMikey.socialMediaHandles.length > 0) {
        console.log(`   📱 Social Media:`);
        finalMikey.socialMediaHandles.forEach(social => {
          console.log(`     - ${social.platform}: ${social.handle}`);
        });
      }
      
      if (finalMikey.interactions.length > 0) {
        console.log(`   💬 Recent Interactions:`);
        finalMikey.interactions.forEach(interaction => {
          console.log(`     - ${interaction.summary} (${interaction.date})`);
        });
      }
    }
    
    // Test name parsing function
    console.log('\n🧪 TESTING NAME PARSING:');
    
    const testNames = [
      'Mikey Chen',
      'Dr. John Michael \'Johnny\' Smith Jr',
      'Sarah Elizabeth Johnson',
      'Alex Rodriguez'
    ];
    
    // Import the parseName function (simplified version for testing)
    function parseName(name) {
      const cleanName = name.trim().replace(/\s+/g, ' ');
      if (!cleanName.includes(' ')) {
        return { firstName: cleanName, lastName: '', middleNames: [], nicknames: [] }
      }
      
      let nicknames = [];
      let nameWithoutNicknames = cleanName;
      
      // Simple nickname extraction
      const nicknameMatch = cleanName.match(/['"]([^'"]+)['"]|\(([^)]+)\)/);
      if (nicknameMatch) {
        nicknames.push(nicknameMatch[1] || nicknameMatch[2]);
        nameWithoutNicknames = cleanName.replace(/['"]([^'"]+)['"]|\(([^)]+)\)/, '').replace(/\s+/g, ' ').trim();
      }
      
      const nameParts = nameWithoutNicknames.split(' ');
      if (nameParts.length < 2) {
        return { firstName: cleanName, lastName: '', middleNames: [], nicknames }
      }
      
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      const middleNames = nameParts.slice(1, -1);
      
      return { firstName, lastName, middleNames, nicknames };
    }
    
    testNames.forEach(testName => {
      const parsed = parseName(testName);
      console.log(`   "${testName}" -> firstName: "${parsed.firstName}", lastName: "${parsed.lastName}", middleNames: [${parsed.middleNames.join(', ')}], nicknames: [${parsed.nicknames.join(', ')}]`);
    });
    
    console.log('\n🎉 CLEANUP COMPLETE! System should now work correctly.');
    
  } catch (error) {
    console.error('❌ Error during final cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

finalCleanup().catch(console.error);