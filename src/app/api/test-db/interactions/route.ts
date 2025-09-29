import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const interactions = await db.interaction.findMany({
      include: {
        person: {
          select: {
            name: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    const processedInteractions = interactions.map(interaction => ({
      id: interaction.id,
      summary: interaction.summary,
      date: interaction.date,
      location: interaction.location,
      snippet: interaction.snippet,
      person: interaction.person ? { name: interaction.person.name } : undefined
    }))

    return NextResponse.json({
      success: true,
      interactions: processedInteractions,
      count: processedInteractions.length
    })
  } catch (error) {
    console.error('Error fetching interactions:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch interactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}