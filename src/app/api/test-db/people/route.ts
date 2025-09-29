import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const people = await db.person.findMany({
      include: {
        currentRoles: {
          include: {
            organization: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Transform the data to match the expected format
    const processedPeople = people.map(person => ({
      id: person.id,
      name: person.name,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      bio: person.bio,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
      currentRoles: person.currentRoles.map(role => ({
        title: role.title,
        organization: role.organization.name
      }))
    }))

    return NextResponse.json({
      success: true,
      people: processedPeople,
      count: processedPeople.length
    })
  } catch (error) {
    console.error('Error fetching people:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch people',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}