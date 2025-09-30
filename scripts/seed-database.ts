/**
 * SOGR Database Seed Script
 * Populates the database with sample data for testing and demonstration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with sample data...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.socialMediaHandle.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.previousRole.deleteMany();
  await prisma.currentRole.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.person.deleteMany();

  // Create organizations
  console.log('🏢 Creating organizations...');
  const thinkOrg = await prisma.organization.create({
    data: {
      name: 'Think',
      description: 'Technology and innovation company',
      website: 'https://think.com',
      industry: 'Technology'
    }
  });

  const proofOrg = await prisma.organization.create({
    data: {
      name: 'Proof',
      description: 'Digital proof and verification services',
      website: 'https://proof.com',
      industry: 'Technology'
    }
  });

  const moonbirdsOrg = await prisma.organization.create({
    data: {
      name: 'Moonbirds',
      description: 'NFT and digital collectibles platform',
      website: 'https://moonbirds.com',
      industry: 'NFT/Blockchain'
    }
  });

  // Create people
  console.log('👥 Creating people...');
  const felix = await prisma.person.create({
    data: {
      name: 'Felix',
      firstName: 'Felix',
      lastName: '',
      bio: 'CEO of Think Foundation, technology entrepreneur',
      avatarUrl: 'https://ui-avatars.com/api/?name=Felix&background=3b82f6&color=fff'
    }
  });

  const mikey = await prisma.person.create({
    data: {
      name: 'Mikey Anderson',
      firstName: 'Mikey',
      lastName: 'Anderson',
      bio: 'Constant Gardener at Think, building enthusiast',
      avatarUrl: 'https://ui-avatars.com/api/?name=Mikey+Anderson&background=3b82f6&color=fff'
    }
  });

  const jesse = await prisma.person.create({
    data: {
      name: 'Jesse Bryan',
      firstName: 'Jesse',
      lastName: 'Bryan',
      bio: 'Technology professional and team member',
      avatarUrl: 'https://ui-avatars.com/api/?name=Jesse+Bryan&background=3b82f6&color=fff'
    }
  });

  const john = await prisma.person.create({
    data: {
      name: 'John',
      firstName: 'John',
      lastName: '',
      bio: 'Technology professional with social media presence',
      avatarUrl: 'https://ui-avatars.com/api/?name=John&background=3b82f6&color=fff'
    }
  });

  // Create current roles
  console.log('💼 Creating current roles...');
  await prisma.currentRole.create({
    data: {
      personId: felix.id,
      organizationId: thinkOrg.id,
      title: 'CEO',
      startDate: new Date('2023-01-01'),
      description: 'Chief Executive Officer of Think Foundation'
    }
  });

  await prisma.currentRole.create({
    data: {
      personId: mikey.id,
      organizationId: thinkOrg.id,
      title: 'Constant Gardener',
      startDate: new Date('2023-03-15'),
      description: 'Building and maintaining systems at Think'
    }
  });

  await prisma.currentRole.create({
    data: {
      personId: jesse.id,
      organizationId: thinkOrg.id,
      title: 'Team Member',
      startDate: new Date('2023-02-01'),
      description: 'Contributing to various projects at Think'
    }
  });

  // Create previous roles
  console.log('📅 Creating previous roles...');
  await prisma.previousRole.create({
    data: {
      personId: felix.id,
      organizationId: proofOrg.id,
      title: 'CEO',
      startDate: new Date('2021-01-01'),
      endDate: new Date('2022-12-31'),
      description: 'Led Proof as CEO'
    }
  });

  await prisma.previousRole.create({
    data: {
      personId: felix.id,
      organizationId: moonbirdsOrg.id,
      title: 'Team Member',
      startDate: new Date('2020-06-01'),
      endDate: new Date('2021-06-30'),
      description: 'Early team member at Moonbirds'
    }
  });

  // Create social media handles
  console.log('📱 Creating social media handles...');
  await prisma.socialMediaHandle.create({
    data: {
      personId: felix.id,
      platform: 'Twitter',
      handle: '@lefclicksave',
      url: 'https://twitter.com/lefclicksave'
    }
  });

  await prisma.socialMediaHandle.create({
    data: {
      personId: john.id,
      platform: 'Twitter',
      handle: '@johndoe',
      url: 'https://twitter.com/johndoe'
    }
  });

  await prisma.socialMediaHandle.create({
    data: {
      personId: john.id,
      platform: 'LinkedIn',
      handle: 'john-doe',
      url: 'https://linkedin.com/in/john-doe'
    }
  });

  // Create interactions
  console.log('🤝 Creating interactions...');
  await prisma.interaction.create({
    data: {
      personId: felix.id,
      summary: 'Initial meeting to discuss Think Foundation vision',
      context: 'Felix shared his vision for Think Foundation and his background at Proof and Moonbirds. Very passionate about technology and innovation.',
      date: new Date('2023-01-15'),
      location: 'Coffee shop downtown'
    }
  });

  await prisma.interaction.create({
    data: {
      personId: mikey.id,
      summary: 'Discussion about building and systems architecture',
      context: 'Mikey talked about his approach to building and maintaining systems. Very knowledgeable about infrastructure and scaling.',
      date: new Date('2023-03-20'),
      location: 'Think office'
    }
  });

  await prisma.interaction.create({
    data: {
      personId: jesse.id,
      summary: 'Introduced by Felix to the team',
      context: 'Jesse was introduced as a new team member. Seems very capable and eager to contribute to projects.',
      date: new Date('2023-02-10'),
      location: 'Team meeting'
    }
  });

  await prisma.interaction.create({
    data: {
      personId: john.id,
      summary: 'Met at technology conference',
      context: 'Met John at a tech conference. We discussed industry trends and potential collaborations.',
      date: new Date('2023-04-05'),
      location: 'Tech Conference 2023'
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('');
  console.log('📊 Sample Data Summary:');
  console.log(`   - Organizations: ${await prisma.organization.count()}`);
  console.log(`   - People: ${await prisma.person.count()}`);
  console.log(`   - Current Roles: ${await prisma.currentRole.count()}`);
  console.log(`   - Previous Roles: ${await prisma.previousRole.count()}`);
  console.log(`   - Social Media Handles: ${await prisma.socialMediaHandle.count()}`);
  console.log(`   - Interactions: ${await prisma.interaction.count()}`);
  console.log('');
  console.log('🚀 You can now start the application and test the features!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });