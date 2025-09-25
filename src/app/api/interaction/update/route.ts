import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(request: NextRequest) {
  try {
    const { id, summary, date, location, fullText, snippet } = await request.json()
    
    if (!id) {
      return NextResponse.json(
        { error: 'Interaction ID is required' },
        { status: 400 }
      )
    }

    // Check if interaction exists
    const existingInteraction = await db.interaction.findUnique({
      where: { id }
    })

    if (!existingInteraction) {
      return NextResponse.json(
        { error: 'Interaction not found' },
        { status: 404 }
      )
    }

    // Update the interaction
    const updatedInteraction = await db.interaction.update({
      where: { id },
      data: {
        ...(summary && { summary }),
        ...(date && { date: new Date(date) }),
        ...(location && { location }),
        ...(fullText && { fullText }),
        ...(snippet && { snippet })
      },
      include: {
        person: {
          include: {
            currentRoles: {
              include: {
                organization: true
              }
            },
            socialMediaHandles: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedInteraction,
      message: 'Interaction updated successfully'
    })

  } catch (error) {
    console.error('Error updating interaction:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update interaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}