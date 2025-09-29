import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Clear existing data first
    await db.interaction.deleteMany()
    await db.currentRole.deleteMany()
    await db.previousRole.deleteMany()
    await db.socialMediaHandle.deleteMany()
    await db.person.deleteMany()
    await db.organization.deleteMany()

    // Seed organizations
    const organizations = [
      { name: 'Think', description: null },
      { name: 'TechCorp', description: null },
      { name: 'StartupXYZ', description: null },
      { name: 'InnovateCo', description: null },
      { name: 'DataTech', description: null },
      { name: 'CloudScale', description: null },
      { name: 'FinTech Solutions', description: null },
      { name: 'BioTech Innovations', description: null },
      { name: 'GreenTech', description: null },
      { name: 'DataCorp', description: null },
      { name: 'Think Foundation', description: 'A non-profit organization focused on innovative thinking' },
      { name: 'Proof', description: 'Technology company specializing in blockchain solutions' },
      { name: 'Moonbirds', description: 'NFT and digital collectibles company' },
      { name: 'InnovateX', description: 'Startup focused on AI and machine learning' }
    ]

    const createdOrgs = await db.organization.createMany({
      data: organizations.map(org => ({
        name: org.name,
        description: org.description,
        website: null,
        industry: null
      }))
    })

    // Get created organizations for mapping
    const allOrgs = await db.organization.findMany()
    const orgMap = new Map()
    allOrgs.forEach(org => {
      orgMap.set(org.name, org.id)
    })

    // Seed people
    const people = [
      { name: 'Test Person', email: 'test@example.com', bio: null },
      { name: 'Mikey Anderson', email: null, bio: 'Master Gardener at Think' },
      { name: 'Jesse Bryan', email: null, bio: 'Story Samurai at Think' },
      { name: 'Sarah Chen', email: null, bio: 'undefined at TechCorp' },
      { name: 'Alex Johnson', email: null, bio: 'undefined at StartupXYZ' },
      { name: 'Maria Garcia', email: null, bio: 'undefined at InnovateCo' },
      { name: 'David Kim', email: null, bio: 'undefined at DataTech' },
      { name: 'Lisa Wang', email: null, bio: 'undefined at CloudScale' },
      { name: 'Tom Wilson', email: null, bio: 'undefined at FinTech Solutions' },
      { name: 'Amy Zhang', email: null, bio: 'null at BioTech Innovations' },
      { name: 'James Liu', email: null, bio: 'null at GreenTech' },
      { name: 'Felix', email: null, bio: 'CEO of Think Foundation, previously worked at Proof and Moonbirds' },
      { name: 'Sarah', email: null, bio: 'CTO at InnovateX' }
    ]

    const createdPeople = await db.person.createMany({
      data: people.map(person => {
        const nameParts = person.name.split(' ')
        const firstName = nameParts[0]
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : null
        
        return {
          name: person.name,
          firstName,
          lastName,
          email: person.email,
          bio: person.bio
        }
      })
    })

    // Get created people for mapping
    const allPeople = await db.person.findMany()
    const personMap = new Map()
    allPeople.forEach(person => {
      personMap.set(person.name, person.id)
    })

    // Add current roles
    const currentRoles = [
      { person: 'Mikey Anderson', organization: 'Think', title: 'Constant Gardener' },
      { person: 'Jesse Bryan', organization: 'Think', title: 'Story Samurai' },
      { person: 'Felix', organization: 'Think Foundation', title: 'CEO' },
      { person: 'Sarah', organization: 'InnovateX', title: 'CTO' }
    ]

    await db.currentRole.createMany({
      data: currentRoles.map(role => {
        const personId = personMap.get(role.person)
        const organizationId = orgMap.get(role.organization)
        
        if (!personId || !organizationId) {
          throw new Error(`Missing person or organization for role: ${role.title}`)
        }
        
        return {
          title: role.title,
          description: null,
          startDate: new Date(),
          personId,
          organizationId
        }
      })
    })

    // Add previous roles for Felix
    const previousRoles = [
      { person: 'Felix', organization: 'Proof', title: 'Senior Developer', endDate: '2022-12-31' },
      { person: 'Felix', organization: 'Moonbirds', title: 'Product Manager', endDate: '2021-06-30' }
    ]

    await db.previousRole.createMany({
      data: previousRoles.map(role => {
        const personId = personMap.get(role.person)
        const organizationId = orgMap.get(role.organization)
        
        if (!personId || !organizationId) {
          throw new Error(`Missing person or organization for previous role: ${role.title}`)
        }
        
        return {
          title: role.title,
          description: null,
          startDate: null,
          endDate: new Date(role.endDate),
          personId,
          organizationId
        }
      })
    })

    // Add social media handles
    const socialMedia = [
      { person: 'Felix', platform: 'Twitter', handle: 'lefclicksave' },
      { person: 'Mikey Anderson', platform: 'Twitter', handle: 'Mikey Anderson' }
    ]

    await db.socialMediaHandle.createMany({
      data: socialMedia.map(social => {
        const personId = personMap.get(social.person)
        
        if (!personId) {
          throw new Error(`Missing person for social media: ${social.handle}`)
        }
        
        return {
          platform: social.platform,
          handle: social.handle,
          url: null,
          personId
        }
      })
    })

    // Add interactions
    const interactions = [
      { person: 'Mikey Anderson', summary: 'Met Mikey Anderson', fullText: 'Today I met Mikey Anderson. He\'s the Master Gardener at Think. He\'s doing some really exciting stuff with his team.' },
      { person: 'Jesse Bryan', summary: 'Introduced to Jesse Bryan by Mikey Anderson', fullText: 'Mikey Anderson introduced me to Jesse Bryan. Jesse is the Story Samurai at Think.' },
      { person: 'Mikey Anderson', summary: 'Had conversation with Mikey Anderson', fullText: 'Just had an amazing conversation with Mikey Anderson from Think! He\'s doing incredible work as a Master Gardener, really pushing the boundaries of what\'s possible. #Inspired #Innovation' },
      { person: 'Sarah Chen', summary: 'Had conversation with Sarah Chen about TechCorp\'s AI product launch and hiring', fullText: 'I had a great conversation with Sarah Chen from TechCorp today. We discussed their new AI product launch and she mentioned they are hiring for machine learning engineers.' },
      { person: 'Alex Johnson', summary: 'Had conversation with Alex Johnson about StartupXYZ\'s mobile app and investment needs', fullText: 'I had a great conversation with Alex Johnson from StartupXYZ yesterday. We talked about their new mobile app and he mentioned they are looking for investors.' },
      { person: 'Felix', summary: 'Met Felix, the CEO of Think Foundation' }
    ]

    await db.interaction.createMany({
      data: interactions.map(interaction => {
        const personId = personMap.get(interaction.person)
        
        if (!personId) {
          throw new Error(`Missing person for interaction: ${interaction.summary}`)
        }
        
        const snippet = interaction.fullText ? (interaction.fullText.length > 200 ? interaction.fullText.substring(0, 200) + '...' : interaction.fullText) : null
        
        return {
          summary: interaction.summary,
          context: null,
          date: new Date(),
          location: null,
          notes: null,
          personId,
          organizationId: null,
          userId: null,
          fullText: interaction.fullText || null,
          snippet
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Test data reseeded successfully',
      stats: {
        organizations: organizations.length,
        people: people.length,
        interactions: interactions.length
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error reseeding test data:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to reseed test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}