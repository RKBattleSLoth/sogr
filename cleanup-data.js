const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupData() {
  console.log('🧹 DATABASE CLEANUP AND FIXING\n');
  
  try {
    // Fix 1: Merge duplicate Mikey records
    console.log('🔧 Fix 1: Merging duplicate Mikey records...');
    
    // Find all Mikey-related records
    const mikeyRecords = await prisma.person.findMany({
      where: {
        OR: [
          { name: { contains: 'mikey' } },
          { name: { contains: 'mike' } },
          { firstName: { contains: 'mikey' } },
          { firstName: { contains: 'mike' } }
        ]
      },
      include: {
        currentRoles: true,
        previousRoles: true,
        socialMediaHandles: true,
        interactions: true
      }
    });
    
    console.log(`📊 Found ${mikeyRecords.length} Mikey-related records:`);
    mikeyRecords.forEach(record => {
      console.log(`  - ${record.name} (ID: ${record.id})`);
      console.log(`    firstName: ${record.firstName}, lastName: ${record.lastName}`);
    });
    
    // Identify the primary record (most complete one)
    const primaryRecord = mikeyRecords.find(r => r.firstName === 'Mikey' && r.lastName === 'Chen') ||
                         mikeyRecords.find(r => r.name.includes('Chen')) ||
                         mikeyRecords[0];
    
    if (!primaryRecord) {
      console.log('❌ No Mikey records found to fix');
      return;
    }
    
    console.log(`\n✅ Primary record selected: ${primaryRecord.name} (ID: ${primaryRecord.id})`);
    
    // Fix 2: Update the primary record to have correct name components
    console.log('\n🔧 Fix 2: Updating primary record name components...');
    
    const updateData = {};
    
    // If primary record is "Mike" with lastName "Chen", fix firstName to "Mikey"
    if (primaryRecord.firstName === 'Mike' && primaryRecord.lastName === 'Chen') {
      updateData.firstName = 'Mikey';
      updateData.name = 'Mikey Chen';  // Fix display name too
      console.log('  📝 Fixed: firstName "Mike" -> "Mikey"');
      console.log('  📝 Fixed: name "Mike" -> "Mikey Chen"');
    }
    
    // If primary record has no lastName but should have one
    if (!primaryRecord.lastName && primaryRecord.name.includes('Chen')) {
      updateData.lastName = 'Chen';
      console.log('  📝 Fixed: Added lastName "Chen"');
    }
    
    if (Object.keys(updateData).length > 0) {
      const updatedPrimary = await prisma.person.update({
        where: { id: primaryRecord.id },
        data: updateData
      });
      console.log(`✅ Updated primary record: ${updatedPrimary.name}`);
    }
    
    // Fix 3: Handle duplicate records
    console.log('\n🔧 Fix 3: Handling duplicate records...');
    
    const duplicateRecords = mikeyRecords.filter(r => r.id !== primaryRecord.id);
    console.log(`📊 Found ${duplicateRecords.length} duplicate records to process`);
    
    for (const duplicate of duplicateRecords) {
      console.log(`\n🔄 Processing duplicate: ${duplicate.name} (ID: ${duplicate.id})`);
      
      // Move current roles to primary if they don't exist
      for (const role of duplicate.currentRoles) {
        const existingRole = await prisma.currentRole.findFirst({
          where: {
            personId: primaryRecord.id,
            organizationId: role.organizationId
          }
        });
        
        if (!existingRole) {
          await prisma.currentRole.create({
            data: {
              title: role.title,
              description: role.description,
              startDate: role.startDate,
              personId: primaryRecord.id,
              organizationId: role.organizationId
            }
          });
          console.log(`  📝 Moved current role: ${role.title} at ${role.organizationId}`);
        }
      }
      
      // Move social media handles to primary if they don't exist
      for (const social of duplicate.socialMediaHandles) {
        const existingSocial = await prisma.socialMediaHandle.findFirst({
          where: {
            personId: primaryRecord.id,
            platform: social.platform
          }
        });
        
        if (!existingSocial) {
          await prisma.socialMediaHandle.create({
            data: {
              platform: social.platform,
              handle: social.handle,
              url: social.url,
              personId: primaryRecord.id
            }
          });
          console.log(`  📝 Moved social media: ${social.platform} - ${social.handle}`);
        }
      }
      
      // Update interactions to point to primary record
      for (const interaction of duplicate.interactions) {
        await prisma.interaction.update({
          where: { id: interaction.id },
          data: { personId: primaryRecord.id }
        });
        console.log(`  📝 Updated interaction: ${interaction.summary} -> primary record`);
      }
      
      console.log(`✅ Processed duplicate: ${duplicate.name}`);
    }
    
    // Fix 4: Clean up bad interaction contexts
    console.log('\n🔧 Fix 4: Cleaning up interaction contexts...');
    
    const badContextInteractions = await prisma.interaction.findMany({
      where: {
        context: {
          contains: 'Edit'
        }
      }
    });
    
    console.log(`📊 Found ${badContextInteractions.length} interactions with edit context`);
    
    for (const interaction of badContextInteractions) {
      // Check if this is actually a real interaction or an edit command
      const isRealInteraction = interaction.fullText && 
        !interaction.fullText.toLowerCase().includes('update') &&
        !interaction.fullText.toLowerCase().includes('edit') &&
        !interaction.fullText.toLowerCase().includes('change') &&
        !interaction.fullText.toLowerCase().includes('correct');
      
      if (!isRealInteraction) {
        // Delete edit command interactions
        await prisma.interaction.delete({
          where: { id: interaction.id }
        });
        console.log(`  🗑️ Deleted edit interaction: ${interaction.summary}`);
      } else {
        // Fix context for real interactions
        await prisma.interaction.update({
          where: { id: interaction.id },
          data: { context: 'Natural interaction' }
        });
        console.log(`  ✅ Fixed context for: ${interaction.summary}`);
      }
    }
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    
    // Show final state
    console.log('\n📊 FINAL STATE:');
    
    const finalPrimary = await prisma.person.findUnique({
      where: { id: primaryRecord.id },
      include: {
        currentRoles: {
          include: { organization: true }
        },
        socialMediaHandles: true,
        interactions: {
          orderBy: { date: 'desc' },
          take: 3
        }
      }
    });
    
    console.log(`\n👤 Primary Record: ${finalPrimary.name}`);
    console.log(`   firstName: ${finalPrimary.firstName}`);
    console.log(`   lastName: ${finalPrimary.lastName}`);
    console.log(`   Current Roles: ${finalPrimary.currentRoles.length}`);
    console.log(`   Social Media: ${finalPrimary.socialMediaHandles.length}`);
    console.log(`   Interactions: ${finalPrimary.interactions.length}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupData().catch(console.error);