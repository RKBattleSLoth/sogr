import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { nodeId, nodeType } = await request.json()

    if (!nodeId || !nodeType) {
      return NextResponse.json(
        { error: 'Missing nodeId or nodeType' },
        { status: 400 }
      )
    }

    let data = {}

    switch (nodeType) {
      case 'person':
        // Fetch complete person data including all related information
        const personData = await db.person.findUnique({
          where: { id: nodeId },
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
            interactions: true
          }
        })
        
        if (personData) {
          data = {
            type: 'person',
            table: 'people',
            rawData: personData,
            formatted: {
              id: personData.id,
              firstName: personData.firstName,
              lastName: personData.lastName,
              middleNames: personData.middleNames,
              nicknames: personData.nicknames,
              email: personData.email,
              phone: personData.phone,
              bio: personData.bio,
              notes: personData.notes,
              createdAt: personData.createdAt,
              updatedAt: personData.updatedAt,
              currentRoles: personData.currentRoles.map(cr => ({
                id: cr.id,
                title: cr.title,
                startDate: cr.startDate,
                organization: cr.organization?.name
              })),
              previousWork: personData.previousRoles.map(pw => ({
                id: pw.id,
                organization: pw.organization?.name,
                title: pw.title,
                startDate: pw.startDate,
                endDate: pw.endDate
              })),
              socialMedia: personData.socialMediaHandles.map(smh => ({
                id: smh.id,
                platform: smh.platform,
                handle: smh.handle,
                url: smh.url,
                isVerified: smh.isVerified
              })),
              interactions: personData.interactions.map(interaction => ({
                id: interaction.id,
                summary: interaction.summary,
                date: interaction.date,
                location: interaction.location,
                snippet: interaction.snippet
              }))
            }
          }
        }
        break

      case 'organization':
        // Fetch complete organization data
        const orgData = await db.organization.findUnique({
          where: { id: nodeId },
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
            },
            interactions: true
          }
        })
        
        if (orgData) {
          data = {
            type: 'organization',
            table: 'organizations',
            rawData: orgData,
            formatted: {
              id: orgData.id,
              name: orgData.name,
              industry: orgData.industry,
              website: orgData.website,
              description: orgData.description,
              size: orgData.size,
              founded: orgData.founded,
              headquarters: orgData.headquarters,
              createdAt: orgData.createdAt,
              updatedAt: orgData.updatedAt,
              currentEmployees: orgData.currentRoles.map(cr => ({
                id: cr.id,
                person: `${cr.person?.firstName} ${cr.person?.lastName}`,
                title: cr.title,
                startDate: cr.startDate
              })),
              previousEmployees: orgData.previousRoles.map(pw => ({
                id: pw.id,
                person: `${pw.person?.firstName} ${pw.person?.lastName}`,
                title: pw.title,
                startDate: pw.startDate,
                endDate: pw.endDate
              })),
              interactions: orgData.interactions.map(interaction => ({
                id: interaction.id,
                summary: interaction.summary,
                date: interaction.date,
                location: interaction.location
              }))
            }
          }
        }
        break

      case 'interaction':
        // Fetch complete interaction data
        const interactionData = await db.interaction.findUnique({
          where: { id: nodeId },
          include: {
            person: true,
            organization: true
          }
        })
        
        if (interactionData) {
          data = {
            type: 'interaction',
            table: 'interactions',
            rawData: interactionData,
            formatted: {
              id: interactionData.id,
              summary: interactionData.summary,
              date: interactionData.date,
              location: interactionData.location,
              snippet: interactionData.snippet,
              fullText: interactionData.fullText,
              type: interactionData.type,
              createdAt: interactionData.createdAt,
              updatedAt: interactionData.updatedAt,
              person: interactionData.person ? `${interactionData.person.firstName} ${interactionData.person.lastName}` : null,
              organization: interactionData.organization?.name || null
            }
          }
        }
        break

      case 'social_media':
        // Fetch social media handle data
        const socialData = await db.socialMediaHandle.findUnique({
          where: { id: nodeId },
          include: {
            person: true
          }
        })
        
        if (socialData) {
          data = {
            type: 'social_media',
            table: 'social_media_handles',
            rawData: socialData,
            formatted: {
              id: socialData.id,
              platform: socialData.platform,
              handle: socialData.handle,
              url: socialData.url,
              isVerified: socialData.isVerified,
              followerCount: socialData.followerCount,
              lastVerified: socialData.lastVerified,
              createdAt: socialData.createdAt,
              updatedAt: socialData.updatedAt,
              person: socialData.person ? `${socialData.person.firstName} ${socialData.person.lastName}` : null
            }
          }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Unsupported node type' },
          { status: 400 }
        )
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Node not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching node data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}