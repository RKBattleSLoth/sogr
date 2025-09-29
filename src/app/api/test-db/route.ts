import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    console.log('Database URL:', process.env.DATABASE_URL)
    
    // Test basic connection
    const peopleCount = await db.person.count()
    const orgCount = await db.organization.count()
    const rolesCount = await db.currentRole.count()
    
    console.log('Database counts:', { peopleCount, orgCount, rolesCount })
    
    // Test a simple query
    const firstPerson = await db.person.findFirst()
    console.log('First person:', firstPerson)
    
    const firstOrg = await db.organization.findFirst()
    console.log('First organization:', firstOrg)
    
    // Test the specific query that's failing
    const thinkFoundationPeople = await db.person.findMany({
      where: {
        currentRoles: {
          some: {
            organization: {
              name: {
                equals: 'Think Foundation'
              }
            }
          }
        }
      },
      include: {
        currentRoles: {
          include: {
            organization: true
          }
        }
      }
    })
    
    console.log('Think Foundation people:', thinkFoundationPeople)
    
    return NextResponse.json({
      success: true,
      databaseUrl: process.env.DATABASE_URL,
      counts: {
        people: peopleCount,
        organizations: orgCount,
        currentRoles: rolesCount
      },
      firstPerson,
      firstOrg,
      thinkFoundationPeople
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      databaseUrl: process.env.DATABASE_URL
    }, { status: 500 })
  }
}