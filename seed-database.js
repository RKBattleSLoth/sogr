const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create organizations
  const thinkFoundation = await prisma.organization.create({
    data: {
      name: 'Think Foundation',
      description: 'A non-profit organization focused on innovative thinking',
    },
  })

  const proof = await prisma.organization.create({
    data: {
      name: 'Proof',
      description: 'Technology company specializing in blockchain solutions',
    },
  })

  const moonbirds = await prisma.organization.create({
    data: {
      name: 'Moonbirds',
      description: 'NFT and digital collectibles company',
    },
  })

  const innovatex = await prisma.organization.create({
    data: {
      name: 'InnovateX',
      description: 'Startup focused on AI and machine learning',
    },
  })

  // Create people
  const felix = await prisma.person.create({
    data: {
      name: 'Felix',
      bio: 'CEO of Think Foundation, previously worked at Proof and Moonbirds',
      socialMediaHandles: {
        create: {
          platform: 'Twitter',
          handle: 'lefclicksave',
        },
      },
      currentRoles: {
        create: {
          title: 'CEO',
          organizationId: thinkFoundation.id,
          startDate: new Date('2023-01-01'),
        },
      },
      previousRoles: {
        create: [
          {
            title: 'Senior Developer',
            organizationId: proof.id,
            endDate: new Date('2022-12-31'),
          },
          {
            title: 'Product Manager',
            organizationId: moonbirds.id,
            endDate: new Date('2021-06-30'),
          },
        ],
      },
    },
  })

  const sarah = await prisma.person.create({
    data: {
      name: 'Sarah',
      bio: 'CTO at InnovateX',
      socialMediaHandles: {
        create: {
          platform: 'LinkedIn',
          handle: 'sj_innovate',
        },
      },
      currentRoles: {
        create: {
          title: 'CTO',
          organizationId: innovatex.id,
          startDate: new Date('2023-06-01'),
        },
      },
    },
  })

  // Create interactions
  await prisma.interaction.createMany({
    data: [
      {
        summary: 'Met Felix, the CEO of Think Foundation',
        date: new Date('2024-01-15'),
        personId: felix.id,
      },
      {
        summary: 'Coffee with Sarah from InnovateX',
        date: new Date('2024-01-10'),
        personId: sarah.id,
      },
    ],
  })

  console.log('✅ Database seeded successfully!')
  console.log('📊 Created:')
  console.log(`   - 4 organizations`)
  console.log(`   - 2 people`)
  console.log(`   - 2 interactions`)
  console.log(`   - 2 current roles`)
  console.log(`   - 2 previous roles`)
  console.log(`   - 2 social media handles`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })