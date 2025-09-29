import { NextRequest, NextResponse } from 'next/server'
import { SemanticSearchService } from '@/lib/vector-db'

export async function POST(request: NextRequest) {
  try {
    const { query, searchType = 'semantic', limit = 10, threshold = 0.01, semanticWeight = 0.7, keywordWeight = 0.3 } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log('Semantic search request:', { query, searchType, limit, threshold })

    let results

    if (searchType === 'hybrid') {
      results = await SemanticSearchService.hybridSearch(query, limit, semanticWeight, keywordWeight)
    } else {
      results = await SemanticSearchService.search(query, limit, threshold)
    }

    console.log('Semantic search results:', results.length, 'found')

    return NextResponse.json({
      success: true,
      query,
      searchType,
      results,
      count: results.length
    })

  } catch (error) {
    console.error('Error in semantic search:', error)
    return NextResponse.json(
      { 
        error: 'Failed to perform semantic search',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const interactionId = searchParams.get('interactionId')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!interactionId) {
      return NextResponse.json(
        { error: 'Interaction ID is required' },
        { status: 400 }
      )
    }

    console.log('Finding similar interactions for:', interactionId)

    const similarInteractions = await SemanticSearchService.findSimilarInteractions(interactionId, limit)

    console.log('Found', similarInteractions.length, 'similar interactions')

    return NextResponse.json({
      success: true,
      interactionId,
      similarInteractions,
      count: similarInteractions.length
    })

  } catch (error) {
    console.error('Error finding similar interactions:', error)
    return NextResponse.json(
      { 
        error: 'Failed to find similar interactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}