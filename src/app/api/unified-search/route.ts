import { NextRequest, NextResponse } from 'next/server'
import { QueryAnalyzer } from '@/lib/query-analyzer'
import { SearchStrategyExecutor, SearchContext } from '@/lib/search-strategy'
import { LLMService } from '@/lib/services/llm'

export async function POST(request: NextRequest) {
  try {
    const { query, userId, limit = 20, offset = 0 } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Step 1: Analyze the query
    const analyzer = new QueryAnalyzer()
    const analysis = analyzer.analyzeQuery(query)

    // Step 2: Prepare search context
    const searchContext: SearchContext = {
      query,
      analysis,
      userId,
      limit,
      offset
    }

    // Step 3: Execute search strategy
    const searchExecutor = new SearchStrategyExecutor()
    const searchResult = await searchExecutor.executeSearch(searchContext)

    // Step 4: Process semantic results with LLM if applicable
    let llmResponse: string | null = null
    if (searchResult.semanticCount > 0) {
      try {
        const llmService = new LLMService()
        const semanticResults = searchResult.results.filter(result => result.source === 'semantic')
        if (semanticResults.length > 0) {
          // Transform SearchResult objects to the format expected by LLM service
          const transformedResults = semanticResults.map(result => ({
            content: result.data.content,
            metadata: result.data.metadata,
            similarity: result.score
          }))
          llmResponse = await llmService.processSemanticResults(query, transformedResults)
        }
      } catch (error) {
        console.error('LLM processing failed:', error)
        // Continue without LLM response if it fails
      }
    }

    // Step 5: Format response
    const response = {
      success: true,
      query: {
        original: query,
        rewritten: analysis.rewrittenQuery,
        wasRewritten: analysis.wasRewritten,
        rewriteConfidence: analysis.rewriteConfidence
      },
      analysis: {
        queryType: analysis.queryType,
        intent: analysis.intent,
        strategy: analysis.strategy,
        confidence: analysis.confidence,
        entities: analysis.entities,
        patterns: analysis.patterns
      },
      search: {
        strategy: searchResult.strategy,
        executionTime: searchResult.executionTime,
        basicCount: searchResult.basicCount,
        semanticCount: searchResult.semanticCount,
        totalResults: searchResult.results.length
      },
      results: searchResult.results,
      llmResponse,
      fusion: {
        config: searchResult.fusionConfig,
        applied: searchResult.strategy === 'hybrid'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Unified search error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to execute unified search',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// GET endpoint for testing and debugging
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  
  if (!query) {
    return NextResponse.json({
      message: 'Unified Search API is running. Use POST with a query parameter to search.',
      endpoints: {
        POST: '/api/unified-search - Execute unified search',
        GET: '/api/unified-search?q=test - Test query analysis'
      },
      version: '1.0.0'
    })
  }

  try {
    // Test query analysis only
    const analyzer = new QueryAnalyzer()
    const analysis = analyzer.analyzeQuery(query)
    
    return NextResponse.json({
      success: true,
      query: {
        original: query,
        rewritten: analysis.rewrittenQuery,
        wasRewritten: analysis.wasRewritten,
        rewriteConfidence: analysis.rewriteConfidence
      },
      analysis: {
        queryType: analysis.queryType,
        intent: analysis.intent,
        strategy: analysis.strategy,
        confidence: analysis.confidence,
        entities: analysis.entities,
        patterns: analysis.patterns
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}