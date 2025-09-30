import { db } from './src/lib/db'
import { vectorDb } from './src/lib/vector-client'

async function cleanupTestData() {
  console.log('Starting cleanup of test data...')

  try {
    // Find the target people and organization
    const mikeyAnderson = await db.person.findFirst({
      where: { name: { contains: 'Mikey Anderson' } }
    })

    const jesseBryan = await db.person.findFirst({
      where: { name: { contains: 'Jesse Bryan' } }
    })

    const felix = await db.person.findFirst({
      where: { name: { contains: 'Felix' } }
    })

    const thinkOrg = await db.organization.findFirst({
      where: { name: { contains: 'Think' } }
    })

    const personIdsToDelete = []
    const organizationIdsToDelete = []

    if (mikeyAnderson) {
      console.log('Found Mikey Anderson:', mikeyAnderson.id)
      personIdsToDelete.push(mikeyAnderson.id)
    }

    if (jesseBryan) {
      console.log('Found Jesse Bryan:', jesseBryan.id)
      personIdsToDelete.push(jesseBryan.id)
    }

    if (felix) {
      console.log('Found Felix:', felix.id)
      personIdsToDelete.push(felix.id)
    }

    if (thinkOrg) {
      console.log('Found Think organization:', thinkOrg.id)
      organizationIdsToDelete.push(thinkOrg.id)
    }

    if (personIdsToDelete.length === 0 && organizationIdsToDelete.length === 0) {
      console.log('No test data found to delete.')
      return
    }

    // Delete all related data for the people
    if (personIdsToDelete.length > 0) {
      console.log('Deleting social media handles...')
      await db.socialMediaHandle.deleteMany({
        where: { personId: { in: personIdsToDelete } }
      })

      console.log('Deleting current roles...')
      await db.currentRole.deleteMany({
        where: { personId: { in: personIdsToDelete } }
      })

      console.log('Deleting previous roles...')
      await db.previousRole.deleteMany({
        where: { personId: { in: personIdsToDelete } }
      })

      console.log('Deleting interactions...')
      await db.interaction.deleteMany({
        where: { personId: { in: personIdsToDelete } }
      })

      console.log('Deleting relationships...')
      await db.relationship.deleteMany({
        where: {
          OR: [
            { personId: { in: personIdsToDelete } },
            { relatedToId: { in: personIdsToDelete } }
          ]
        }
      })

      console.log('Deleting people...')
      await db.person.deleteMany({
        where: { id: { in: personIdsToDelete } }
      })
    }

    // Delete the organization and its related data
    if (organizationIdsToDelete.length > 0) {
      console.log('Deleting organization current roles...')
      await db.currentRole.deleteMany({
        where: { organizationId: { in: organizationIdsToDelete } }
      })

      console.log('Deleting organization previous roles...')
      await db.previousRole.deleteMany({
        where: { organizationId: { in: organizationIdsToDelete } }
      })

      console.log('Deleting organization interactions...')
      await db.interaction.deleteMany({
        where: { organizationId: { in: organizationIdsToDelete } }
      })

      console.log('Deleting organizations...')
      await db.organization.deleteMany({
        where: { id: { in: organizationIdsToDelete } }
      })
    }

    // Clear vector storage as well
    console.log('Clearing vector storage...')
    try {
      if (process.env.VECTOR_DATABASE_URL) {
        // Use raw PostgreSQL connection for vector operations
        const { Client } = require('pg')
        const client = new Client({
          connectionString: process.env.VECTOR_DATABASE_URL
        })
        
        await client.connect()
        
        // Delete all embeddings from vector storage
        await client.query('TRUNCATE TABLE "interaction_embeddings" CASCADE')
        await client.query('TRUNCATE TABLE "search_cache" CASCADE')
        await client.query('TRUNCATE TABLE "interaction_clusters" CASCADE')
        await client.query('TRUNCATE TABLE "search_analytics" CASCADE')
        
        await client.end()
        console.log('✅ Vector storage cleared!')
      } else {
        console.log('⚠️ VECTOR_DATABASE_URL not set, skipping vector storage cleanup')
      }
    } catch (vectorError) {
      console.warn('⚠️ Could not clear vector storage:', vectorError)
    }

    console.log('✅ Cleanup completed successfully!')
    console.log(`Deleted ${personIdsToDelete.length} people and ${organizationIdsToDelete.length} organizations`)

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  }
}

// Run the cleanup
cleanupTestData()
  .then(() => {
    console.log('Cleanup script finished.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Cleanup script failed:', error)
    process.exit(1)
  })