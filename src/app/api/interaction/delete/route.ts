import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SemanticSearchService } from '@/lib/vector-db'

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    
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

    // Delete the interaction
    await db.interaction.delete({
      where: { id }
    })

    // Delete the embedding from vector database
    try {
      await SemanticSearchService.deleteInteraction(id)
    } catch (embeddingError) {
      console.error('Failed to delete embedding for interaction:', embeddingError)
      // Continue even if embedding deletion fails
    }

    return NextResponse.json({
      success: true,
      message: 'Interaction deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting interaction:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete interaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}