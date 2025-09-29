import { QueryRewriter, QueryRewriteResult } from './query-rewriter'

export interface QueryAnalysis {
  queryType: 'structured' | 'semantic' | 'hybrid'
  confidence: number
  patterns: string[]
  entities: {
    people?: string[]
    organizations?: string[]
    titles?: string[]
    platforms?: string[]
  }
  intent: 'organization' | 'person_info' | 'location' | 'title' | 'social_media' | 'general' | 'compound'
  strategy: 'basic_only' | 'semantic_only' | 'hybrid'
  originalQuery: string
  rewrittenQuery: string
  rewriteConfidence: number
  wasRewritten: boolean
}

export class QueryAnalyzer {
  private rewriter = new QueryRewriter()
  
  analyzeQuery(query: string): QueryAnalysis {
    // Step 1: Rewrite query if possible
    const rewriteResult = this.rewriter.rewriteQuery(query)
    const queryToAnalyze = rewriteResult.rewritten
    
    // Step 2: Extract entities from the query
    const entities = this.extractEntities(queryToAnalyze, rewriteResult.intent)
    
    // Step 3: Determine query type and strategy
    const analysis = this.determineQueryType(queryToAnalyze, rewriteResult, entities)
    
    return {
      ...analysis,
      originalQuery: query,
      rewrittenQuery: queryToAnalyze,
      rewriteConfidence: rewriteResult.confidence,
      wasRewritten: rewriteResult.wasRewritten
    }
  }
  
  private extractEntities(query: string, intent: string): QueryAnalysis['entities'] {
    const entities: QueryAnalysis['entities'] = {}
    
    // Special handling for compound queries
    if (intent === 'compound') {
      const parts = query.split(/\s+and\s+/i)
      
      // Extract from first part (usually structured) - "Where does Mikey Anderson work"
      if (parts.length > 0) {
        const firstPart = parts[0].trim()
        
        // Extract person from first part using specific pattern
        const whereWorkMatch = firstPart.match(/where does\s+([A-Za-z\s]+?)\s+work/i)
        if (whereWorkMatch && whereWorkMatch[1]) {
          entities.people = [whereWorkMatch[1].trim()]
        }
      }
      
      // Extract from second part (usually semantic) - "what are his thoughts on building"
      if (parts.length > 1) {
        const secondPart = parts[1].trim()
        
        // For "his thoughts", use the person from the first part
        const hisThoughtsMatch = secondPart.match(/what are\s+his\s+(?:thoughts|opinion)/i)
        if (hisThoughtsMatch && entities.people && entities.people.length > 0) {
          // "his" refers to the person from the first part, no need to extract again
        }
      }
    } else {
      // Single query entity extraction
      this.extractEntitiesFromPart(query, entities)
    }
    
    return entities
  }
  
  private extractEntitiesFromPart(part: string, entities: QueryAnalysis['entities']): void {
    // Extract people (works for most patterns)
    const personPatterns = [
      /where does\s+([A-Za-z\s]+?)\s+work/i,
      /what are\s+([A-Za-z\s]+?)['']?s\s+(?:thoughts|opinion)/i,
      /(?:about|who is)\s+([A-Za-z\s]+?)(?:\s+work|\s+think|\s+and|\s+or|\?|$)/i,
      /([A-Za-z\s]+?)['']?s\s+(?:thoughts|opinion|work|company)/i,
      /(?:find|search for)\s+([A-Za-z\s]+?)(?:\s+and|\s+or|\?|$)/i
    ]
    
    // Special handling for "his" - replace with actual person name if available
    for (let i = 0; i < personPatterns.length; i++) {
      const match = part.match(personPatterns[i])
      if (match && match[1]) {
        let personName = match[1].trim()
        // Replace "his" with the actual person name if we have it from context
        if (personName.toLowerCase() === 'his' && entities.people && entities.people.length > 0) {
          personName = entities.people[0]
        } else if (personName.toLowerCase() === 'his') {
          // Skip "his" if we don't have context
          continue
        }
        if (!entities.people) entities.people = []
        if (!entities.people.includes(personName)) {
          entities.people.push(personName)
        }
        break
      }
    }
    
    for (const pattern of personPatterns) {
      const match = part.match(pattern)
      if (match && match[1]) {
        const personName = match[1].trim()
        if (!entities.people) entities.people = []
        if (!entities.people.includes(personName)) {
          entities.people.push(personName)
        }
        break
      }
    }
    
    // Extract organizations
    const orgPatterns = [
      /(?:works?\s+)?(?:at|for)\s+([^?.,]+?)(?:\s+and|\s+or|\?|$)/i,
      /(?:company|organization)\s+([^?.,]+?)(?:\s+and|\s+or|\?|$)/i
    ]
    
    for (const pattern of orgPatterns) {
      const match = part.match(pattern)
      if (match && match[1]) {
        const orgName = match[1].trim()
        if (!entities.organizations) entities.organizations = []
        if (!entities.organizations.includes(orgName)) {
          entities.organizations.push(orgName)
        }
        break
      }
    }
    
    // Extract titles
    const titlePatterns = [
      /(?:ceo|cto|chief|vp|director|manager|engineer|developer)\s+([^?.,]+?)(?:\s+and|\s+or|\?|$)/i,
      /(?:title|role)\s+([^?.,]+?)(?:\s+and|\s+or|\?|$)/i
    ]
    
    for (const pattern of titlePatterns) {
      const match = part.match(pattern)
      if (match && match[1]) {
        const title = match[1].trim()
        if (!entities.titles) entities.titles = []
        if (!entities.titles.includes(title)) {
          entities.titles.push(title)
        }
        break
      }
    }
    
    // Extract platforms
    const platformPatterns = [
      /(?:twitter|linkedin|social\s+media|facebook|instagram)\s+([^?.,]+?)(?:\s+and|\s+or|\?|$)/i,
      /(?:platform|handle)\s+([^?.,]+?)(?:\s+and|\s+or|\?|$)/i
    ]
    
    for (const pattern of platformPatterns) {
      const match = part.match(pattern)
      if (match && match[1]) {
        const platform = match[1].trim()
        if (!entities.platforms) entities.platforms = []
        if (!entities.platforms.includes(platform)) {
          entities.platforms.push(platform)
        }
        break
      }
    }
  }
  
  private determineQueryType(
    query: string, 
    rewriteResult: QueryRewriteResult, 
    entities: QueryAnalysis['entities']
  ): Omit<QueryAnalysis, 'originalQuery' | 'rewrittenQuery' | 'rewriteConfidence' | 'wasRewritten'> {
    const lowerQuery = query.toLowerCase()
    
    // Check for compound queries first (highest priority)
    if (rewriteResult.intent === 'compound') {
      return {
        queryType: 'hybrid',
        confidence: rewriteResult.confidence || 0.85,
        patterns: ['compound'],
        intent: 'compound',
        strategy: 'hybrid',
        entities
      }
    }
    
    // Check against existing patterns with enhanced logic
    if (this.matchesWhoWorksAtPattern(lowerQuery)) {
      return {
        queryType: 'structured',
        confidence: rewriteResult.confidence || 0.9,
        patterns: ['who_works_at'],
        intent: 'organization',
        strategy: 'basic_only',
        entities
      }
    }
    
    if (this.matchesPersonInfoPattern(lowerQuery)) {
      return {
        queryType: 'structured',
        confidence: rewriteResult.confidence || 0.9,
        patterns: ['person_info'],
        intent: 'person_info',
        strategy: 'basic_only',
        entities
      }
    }
    
    if (this.matchesWhereWorksPattern(lowerQuery)) {
      return {
        queryType: 'structured',
        confidence: rewriteResult.confidence || 0.9,
        patterns: ['where_works'],
        intent: 'location',
        strategy: 'basic_only',
        entities
      }
    }
    
    if (this.matchesByTitlePattern(lowerQuery)) {
      return {
        queryType: 'structured',
        confidence: rewriteResult.confidence || 0.85,
        patterns: ['by_title'],
        intent: 'title',
        strategy: 'basic_only',
        entities
      }
    }
    
    if (this.matchesSocialMediaPattern(lowerQuery)) {
      return {
        queryType: 'structured',
        confidence: rewriteResult.confidence || 0.85,
        patterns: ['social_media'],
        intent: 'social_media',
        strategy: 'basic_only',
        entities
      }
    }
    
    // Check for hybrid patterns - queries that might benefit from both approaches
    if (this.matchesHybridPattern(lowerQuery, entities)) {
      return {
        queryType: 'hybrid',
        confidence: 0.75,
        patterns: ['hybrid'],
        intent: 'general',
        strategy: 'hybrid',
        entities
      }
    }
    
    // Fallback to semantic search
    return {
      queryType: 'semantic',
      confidence: 0.7,
      patterns: [],
      intent: 'general',
      strategy: 'semantic_only',
      entities
    }
  }
  
  private matchesWhoWorksAtPattern(lowerQuery: string): boolean {
    return lowerQuery.includes('who') && 
           (lowerQuery.includes('work') || lowerQuery.includes('works')) && 
           !lowerQuery.includes('does') &&
           (lowerQuery.includes('at') || lowerQuery.includes('for'))
  }
  
  private matchesPersonInfoPattern(lowerQuery: string): boolean {
    return (lowerQuery.includes('tell me about') || 
            lowerQuery.includes('who is') || 
            lowerQuery.includes('information about')) &&
           !lowerQuery.includes('work')
  }
  
  private matchesWhereWorksPattern(lowerQuery: string): boolean {
    return (lowerQuery.includes('where') && lowerQuery.includes('work') && lowerQuery.includes('does')) ||
           (lowerQuery.includes('what') && lowerQuery.includes('company') && lowerQuery.includes('work') && lowerQuery.includes('does')) ||
           (lowerQuery.includes('who') && lowerQuery.includes('work') && lowerQuery.includes('does'))
  }
  
  private matchesByTitlePattern(lowerQuery: string): boolean {
    return (lowerQuery.includes('ceo') || 
            lowerQuery.includes('cto') || 
            lowerQuery.includes('chief')) &&
           (lowerQuery.includes('show me') || lowerQuery.includes('find') || lowerQuery.includes('all'))
  }
  
  private matchesSocialMediaPattern(lowerQuery: string): boolean {
    return (lowerQuery.includes('twitter') || 
            lowerQuery.includes('linkedin') || 
            lowerQuery.includes('social media')) &&
           (lowerQuery.includes('what') || lowerQuery.includes('what\'s'))
  }
  
  private matchesHybridPattern(lowerQuery: string, entities: QueryAnalysis['entities']): boolean {
    // Enhanced hybrid pattern detection
    
    // 1. Check for compound queries with "and" or multiple questions
    const hasCompoundStructure = 
      lowerQuery.includes(' and ') || 
      lowerQuery.includes(' or ') ||
      lowerQuery.includes('?') && lowerQuery.indexOf('?') !== lowerQuery.lastIndexOf('?') ||
      (lowerQuery.includes('where') && lowerQuery.includes('what')) ||
      (lowerQuery.includes('who') && lowerQuery.includes('what')) ||
      (lowerQuery.includes('how') && lowerQuery.includes('why'))
    
    // 2. Check for mixed structured + semantic patterns
    const hasStructuredKeywords = 
      lowerQuery.includes('work') || 
      lowerQuery.includes('company') || 
      lowerQuery.includes('organization') ||
      lowerQuery.includes('title') ||
      lowerQuery.includes('role')
    
    const hasSemanticKeywords = 
      lowerQuery.includes('thoughts') || 
      lowerQuery.includes('opinion') || 
      lowerQuery.includes('think') ||
      lowerQuery.includes('believe') ||
      lowerQuery.includes('about') ||
      lowerQuery.includes('ideas') ||
      lowerQuery.includes('view') ||
      lowerQuery.includes('perspective')
    
    // 3. Check for entities
    const hasEntities = Object.values(entities).some(arr => arr && arr.length > 0)
    
    // 4. Check for action words that suggest search
    const hasActionWords = lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('look for')
    
    // Return true for hybrid if:
    // - Compound structure with entities, OR
    // - Mix of structured + semantic keywords with entities, OR
    // - Entities with action words (existing logic)
    return (hasCompoundStructure && hasEntities) ||
           (hasStructuredKeywords && hasSemanticKeywords && hasEntities) ||
           (hasEntities && hasActionWords)
  }
  
  // Test the analyzer with a query (for debugging)
  testQuery(query: string): {
    original: string
    rewriteResult: QueryRewriteResult
    analysis: QueryAnalysis
    ruleMatches: any[]
  } {
    const rewriteResult = this.rewriter.rewriteQuery(query)
    const analysis = this.analyzeQuery(query)
    const ruleMatches = this.rewriter.testQuery(query)
    
    return {
      original: query,
      rewriteResult,
      analysis,
      ruleMatches
    }
  }
}