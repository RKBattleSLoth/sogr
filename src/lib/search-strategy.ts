import { db } from './db'
import { SemanticSearchService } from './vector-db'
import { ResultFusionEngine, SearchResult, FusionConfig } from './result-fusion'
import { QueryAnalysis } from './query-analyzer'

export interface SearchContext {
  query: string
  analysis: QueryAnalysis
  userId?: string
  limit?: number
  offset?: number
}

export interface SearchExecutionResult {
  results: SearchResult[]
  strategy: string
  executionTime: number
  basicCount: number
  semanticCount: number
  fusionConfig: FusionConfig
}

export class SearchStrategyExecutor {
  private fusionEngine: ResultFusionEngine

  constructor(fusionConfig?: Partial<FusionConfig>) {
    this.fusionEngine = new ResultFusionEngine(fusionConfig)
  }

  async executeSearch(context: SearchContext): Promise<SearchExecutionResult> {
    const startTime = Date.now()
    const { query, analysis, userId, limit = 20, offset = 0 } = context

    let results: SearchResult[] = []
    let basicCount = 0
    let semanticCount = 0
    let strategy = analysis.strategy

    try {
      switch (analysis.strategy) {
        case 'basic_only':
          results = await this.executeBasicSearch(query, analysis, limit, offset)
          basicCount = results.length
          break

        case 'semantic_only':
          results = await this.executeSemanticSearch(query, analysis, limit, offset)
          semanticCount = results.length
          break

        case 'hybrid':
          let hybridResult
          if (analysis.intent === 'compound') {
            // For compound queries, split and execute both searches
            hybridResult = await this.executeCompoundSearch(query, analysis, limit, offset)
          } else {
            // Regular hybrid search
            hybridResult = await this.executeHybridSearch(query, analysis, limit, offset)
          }
          results = hybridResult.results
          basicCount = hybridResult.basicCount
          semanticCount = hybridResult.semanticCount
          break

        default:
          // Fallback to semantic search
          results = await this.executeSemanticSearch(query, analysis, limit, offset)
          semanticCount = results.length
          strategy = 'semantic_only'
      }

      const executionTime = Date.now() - startTime

      return {
        results,
        strategy,
        executionTime,
        basicCount,
        semanticCount,
        fusionConfig: this.fusionEngine.getConfig()
      }
    } catch (error) {
      console.error('Search execution error:', error)
      
      // Fallback to semantic search on error
      try {
        const fallbackResults = await this.executeSemanticSearch(query, analysis, limit, offset)
        const executionTime = Date.now() - startTime

        return {
          results: fallbackResults,
          strategy: 'semantic_only_fallback',
          executionTime,
          basicCount: 0,
          semanticCount: fallbackResults.length,
          fusionConfig: this.fusionEngine.getConfig()
        }
      } catch (fallbackError) {
        console.error('Fallback search failed:', fallbackError)
        
        return {
          results: [],
          strategy: 'failed',
          executionTime: Date.now() - startTime,
          basicCount: 0,
          semanticCount: 0,
          fusionConfig: this.fusionEngine.getConfig()
        }
      }
    }
  }

  private async executeBasicSearch(
    query: string,
    analysis: QueryAnalysis,
    limit: number,
    offset: number
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []

    try {
      // Execute structured database queries based on analysis
      if (analysis.intent === 'organization' && analysis.entities.organizations?.length) {
        const orgResults = await this.searchByOrganization(analysis.entities.organizations[0], limit, offset)
        results.push(...orgResults)
      } else if (analysis.intent === 'person_info' && analysis.entities.people?.length) {
        const personResults = await this.searchByPerson(analysis.entities.people[0], limit, offset)
        results.push(...personResults)
      } else if (analysis.intent === 'title' && analysis.entities.titles?.length) {
        const titleResults = await this.searchByTitle(analysis.entities.titles[0], limit, offset)
        results.push(...titleResults)
      } else if (analysis.intent === 'social_media' && analysis.entities.people?.length) {
        const socialResults = await this.searchBySocialMedia(analysis.entities.people[0], limit, offset)
        results.push(...socialResults)
      } else if (analysis.intent === 'location' && analysis.entities.people?.length) {
        const locationResults = await this.searchByLocation(analysis.entities.people[0], limit, offset)
        results.push(...locationResults)
      } else {
        // Fallback basic search - search across all fields
        const fallbackResults = await this.searchAllFields(query, limit, offset)
        results.push(...fallbackResults)
      }

      return results.map(result => ({
        ...result,
        source: 'basic' as const
      }))
    } catch (error) {
      console.error('Basic search error:', error)
      return []
    }
  }

  private async executeSemanticSearch(
    query: string,
    analysis: QueryAnalysis,
    limit: number,
    offset: number
  ): Promise<SearchResult[]> {
    try {
      // Use SemanticSearchService for semantic search
      const semanticResults = await SemanticSearchService.search(query, limit, 0.01)

      return semanticResults.map(result => ({
        id: result.interactionId,
        type: 'interaction',
        data: {
          content: result.content,
          metadata: result.metadata
        },
        score: result.similarity,
        source: 'semantic' as const,
        rank: result.similarity
      }))
    } catch (error) {
      console.error('Semantic search error:', error)
      return []
    }
  }

  private async executeHybridSearch(
    query: string,
    analysis: QueryAnalysis,
    limit: number,
    offset: number
  ): Promise<{
    results: SearchResult[]
    basicCount: number
    semanticCount: number
  }> {
    // Execute both searches in parallel
    const [basicResults, semanticResults] = await Promise.all([
      this.executeBasicSearch(query, analysis, limit * 2, offset), // Get more for better fusion
      this.executeSemanticSearch(query, analysis, limit * 2, offset)
    ])

    const basicCount = basicResults.length
    const semanticCount = semanticResults.length

    // Fuse results
    const fusedResults = await this.fusionEngine.fuseHybrid(basicResults, semanticResults)

    return {
      results: fusedResults.slice(0, limit),
      basicCount,
      semanticCount
    }
  }

  // Basic search implementations
  private async searchByOrganization(orgName: string, limit: number, offset: number): Promise<SearchResult[]> {
    const allPeople = await db.person.findMany({
      include: {
        currentRoles: {
          include: {
            organization: true
          }
        },
        socialMediaHandles: true,
        interactions: {
          orderBy: {
            date: 'desc'
          },
          take: 1
        }
      }
    })

    const results = allPeople.filter(person =>
      person.currentRoles.some(role =>
        role.organization.name.toLowerCase().includes(orgName.toLowerCase())
      )
    )

    return results.slice(offset, offset + limit).map(person => ({
      id: `person_${person.id}`,
      type: 'person' as const,
      data: person,
      score: 1.0, // Exact match gets perfect score
      source: 'basic' as const,
      rank: 1.0
    }))
  }

  private async searchByPerson(personName: string, limit: number, offset: number): Promise<SearchResult[]> {
    const allPeople = await db.person.findMany({
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
        interactions: {
          orderBy: {
            date: 'desc'
          }
        }
      }
    })

    const results = allPeople.filter(person =>
      person.name.toLowerCase().includes(personName.toLowerCase())
    )

    return results.slice(offset, offset + limit).map(person => ({
      id: `person_${person.id}`,
      type: 'person' as const,
      data: person,
      score: 1.0,
      source: 'basic' as const,
      rank: 1.0
    }))
  }

  private async searchByTitle(title: string, limit: number, offset: number): Promise<SearchResult[]> {
    const allPeople = await db.person.findMany({
      include: {
        currentRoles: {
          include: {
            organization: true
          }
        },
        socialMediaHandles: true
      }
    })

    const results = allPeople.filter(person =>
      person.currentRoles.some(role =>
        role.title.toLowerCase().includes(title.toLowerCase())
      )
    )

    return results.slice(offset, offset + limit).map(person => ({
      id: `person_${person.id}`,
      type: 'person' as const,
      data: person,
      score: 1.0,
      source: 'basic' as const,
      rank: 1.0
    }))
  }

  private async searchBySocialMedia(personName: string, limit: number, offset: number): Promise<SearchResult[]> {
    const allPeople = await db.person.findMany({
      include: {
        socialMediaHandles: true
      }
    })

    const results = allPeople.filter(person =>
      person.name.toLowerCase().includes(personName.toLowerCase())
    )

    return results.slice(offset, offset + limit).map(person => ({
      id: `person_${person.id}`,
      type: 'person' as const,
      data: person,
      score: 1.0,
      source: 'basic' as const,
      rank: 1.0
    }))
  }

  private async searchByLocation(personName: string, limit: number, offset: number): Promise<SearchResult[]> {
    // Similar to searchByPerson but with location-specific logic
    return this.searchByPerson(personName, limit, offset)
  }

  private async searchAllFields(query: string, limit: number, offset: number): Promise<SearchResult[]> {
    const searchTerm = query.toLowerCase()
    
    // Search people
    const people = await db.person.findMany({
      include: {
        currentRoles: {
          include: {
            organization: true
          }
        },
        socialMediaHandles: true,
        interactions: {
          orderBy: {
            date: 'desc'
          },
          take: 1
        }
      }
    })

    const results: SearchResult[] = []

    for (const person of people) {
      let score = 0
      
      // Name match
      if (person.name.toLowerCase().includes(searchTerm)) score += 0.5
      
      // Organization match
      if (person.currentRoles.some(role => 
        role.organization.name.toLowerCase().includes(searchTerm)
      )) score += 0.3
      
      // Title match
      if (person.currentRoles.some(role => 
        role.title.toLowerCase().includes(searchTerm)
      )) score += 0.2

      if (score > 0) {
        results.push({
          id: `person_${person.id}`,
          type: 'person' as const,
          data: person,
          score,
          source: 'basic' as const,
          rank: score
        })
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit)
  }

  private async executeCompoundSearch(
    query: string,
    analysis: QueryAnalysis,
    limit: number,
    offset: number
  ): Promise<{
    results: SearchResult[]
    basicCount: number
    semanticCount: number
  }> {
    // Split compound query into parts
    const queryParts = this.splitCompoundQuery(query)
    
    let allResults: SearchResult[] = []
    let basicCount = 0
    let semanticCount = 0

    // Execute basic search for structured parts using the structured query
    if (queryParts.structured) {
      const structuredAnalysis = { ...analysis }
      structuredAnalysis.intent = this.getIntentFromQuery(queryParts.structured)
      const basicResults = await this.executeBasicSearch(queryParts.structured, structuredAnalysis, limit, offset)
      allResults.push(...basicResults)
      basicCount = basicResults.length
    }

    // Execute semantic search for semantic parts using the semantic query
    if (queryParts.semantic) {
      const semanticAnalysis = { ...analysis }
      semanticAnalysis.intent = 'general'
      const semanticResults = await this.executeSemanticSearch(queryParts.semantic, semanticAnalysis, limit, offset)
      allResults.push(...semanticResults)
      semanticCount = semanticResults.length
    }

    // If no split worked, fall back to executing both searches on the full query
    if (basicCount === 0 && semanticCount === 0) {
      const [basicResults, semanticResults] = await Promise.all([
        this.executeBasicSearch(query, analysis, limit, offset),
        this.executeSemanticSearch(query, analysis, limit, offset)
      ])
      allResults.push(...basicResults, ...semanticResults)
      basicCount = basicResults.length
      semanticCount = semanticResults.length
    }

    // Remove duplicates and rank by combined score
    const uniqueResults = this.deduplicateResults(allResults)
    
    return {
      results: uniqueResults.slice(0, limit),
      basicCount,
      semanticCount
    }
  }

  private splitCompoundQuery(query: string): { structured: string; semantic: string } {
    const lowerQuery = query.toLowerCase()
    
    // Split on "and" or similar conjunctions
    const andIndex = lowerQuery.indexOf(' and ')
    if (andIndex !== -1) {
      const firstPart = query.substring(0, andIndex).trim()
      const secondPart = query.substring(andIndex + 5).trim()
      
      // Determine which part is structured vs semantic
      const firstPartLower = firstPart.toLowerCase()
      const secondPartLower = secondPart.toLowerCase()
      
      const structuredKeywords = ['work', 'company', 'organization', 'title', 'role', 'where', 'who']
      const semanticKeywords = ['thoughts', 'opinion', 'think', 'believe', 'about', 'ideas', 'what are', 'why', 'how']
      
      const firstIsStructured = structuredKeywords.some(keyword => firstPartLower.includes(keyword))
      const firstIsSemantic = semanticKeywords.some(keyword => firstPartLower.includes(keyword))
      const secondIsStructured = structuredKeywords.some(keyword => secondPartLower.includes(keyword))
      const secondIsSemantic = semanticKeywords.some(keyword => secondPartLower.includes(keyword))
      
      if (firstIsStructured && secondIsSemantic) {
        return { structured: firstPart, semantic: secondPart }
      } else if (firstIsSemantic && secondIsStructured) {
        return { structured: secondPart, semantic: firstPart }
      } else if (firstIsStructured) {
        // If first part is structured, use it for structured and whole query for semantic
        return { structured: firstPart, semantic: query }
      } else if (secondIsStructured) {
        // If second part is structured, use it for structured and whole query for semantic
        return { structured: secondPart, semantic: query }
      }
    }
    
    // Try to split on other conjunctions
    const orIndex = lowerQuery.indexOf(' or ')
    if (orIndex !== -1) {
      const firstPart = query.substring(0, orIndex).trim()
      const secondPart = query.substring(orIndex + 4).trim()
      return { structured: firstPart, semantic: secondPart }
    }
    
    // Default: treat whole query as both structured and semantic
    return { structured: query, semantic: query }
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set()
    return results.filter(result => {
      const key = `${result.type}-${result.id}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    }).sort((a, b) => b.score - a.score)
  }

  private getIntentFromQuery(query: string): string {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('work') || lowerQuery.includes('company') || lowerQuery.includes('organization')) {
      return 'organization'
    }
    if (lowerQuery.includes('where') && lowerQuery.includes('work')) {
      return 'location'
    }
    if (lowerQuery.includes('who') && (lowerQuery.includes('is') || lowerQuery.includes('tell me about'))) {
      return 'person_info'
    }
    if (lowerQuery.includes('title') || lowerQuery.includes('ceo') || lowerQuery.includes('cto')) {
      return 'title'
    }
    if (lowerQuery.includes('twitter') || lowerQuery.includes('linkedin') || lowerQuery.includes('social media')) {
      return 'social_media'
    }
    
    return 'general'
  }

  private buildSemanticFilter(analysis: QueryAnalysis): any {
    const filter: any = {}

    if (analysis.entities.organizations?.length) {
      filter.organization = { $in: analysis.entities.organizations }
    }

    if (analysis.entities.people?.length) {
      filter.person = { $in: analysis.entities.people }
    }

    if (analysis.entities.titles?.length) {
      filter.title = { $in: analysis.entities.titles }
    }

    return Object.keys(filter).length > 0 ? filter : undefined
  }

  // Update fusion configuration
  updateFusionConfig(config: Partial<FusionConfig>): void {
    this.fusionEngine.updateConfig(config)
  }

  // Get current fusion configuration
  getFusionConfig(): FusionConfig {
    return this.fusionEngine.getConfig()
  }
}