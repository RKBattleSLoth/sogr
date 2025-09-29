export interface SearchResult {
  id: string
  type: 'person' | 'organization' | 'role'
  data: any
  score: number
  source: 'basic' | 'semantic' | 'hybrid'
  rank: number
}

export interface FusionConfig {
  basicWeight: number
  semanticWeight: number
  duplicateThreshold: number
  maxResults: number
}

export class ResultFusionEngine {
  private config: FusionConfig

  constructor(config: Partial<FusionConfig> = {}) {
    this.config = {
      basicWeight: 0.6,
      semanticWeight: 0.4,
      duplicateThreshold: 0.8,
      maxResults: 50,
      ...config
    }
  }

  async fuseResults(
    basicResults: SearchResult[],
    semanticResults: SearchResult[]
  ): Promise<SearchResult[]> {
    // Normalize scores
    const normalizedBasic = this.normalizeScores(basicResults)
    const normalizedSemantic = this.normalizeScores(semanticResults)

    // Combine results
    const combinedResults = [...normalizedBasic, ...normalizedSemantic]

    // Remove duplicates
    const deduplicatedResults = this.removeDuplicates(combinedResults)

    // Re-rank based on fusion strategy
    const rerankedResults = this.rerankResults(deduplicatedResults)

    // Apply final ranking and limit
    return rerankedResults
      .sort((a, b) => b.rank - a.rank)
      .slice(0, this.config.maxResults)
  }

  private normalizeScores(results: SearchResult[]): SearchResult[] {
    if (results.length === 0) return results

    const scores = results.map(r => r.score)
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    const range = maxScore - minScore || 1

    return results.map(result => ({
      ...result,
      score: (result.score - minScore) / range
    }))
  }

  private removeDuplicates(results: SearchResult[]): SearchResult[] {
    const uniqueResults: SearchResult[] = []
    const seenIds = new Set<string>()

    for (const result of results) {
      if (seenIds.has(result.id)) continue

      // Check for near-duplicates based on content similarity
      const isDuplicate = uniqueResults.some(existing => 
        this.isDuplicate(result, existing)
      )

      if (!isDuplicate) {
        seenIds.add(result.id)
        uniqueResults.push(result)
      }
    }

    return uniqueResults
  }

  private isDuplicate(result1: SearchResult, result2: SearchResult): boolean {
    // Same ID is definitely duplicate
    if (result1.id === result2.id) return true

    // Check content similarity for people
    if (result1.type === 'person' && result2.type === 'person') {
      const name1 = result1.data.name?.toLowerCase() || ''
      const name2 = result2.data.name?.toLowerCase() || ''
      
      // Exact name match
      if (name1 === name2) return true
      
      // High similarity in names
      const similarity = this.calculateStringSimilarity(name1, name2)
      if (similarity > this.config.duplicateThreshold) return true
    }

    // Check content similarity for organizations
    if (result1.type === 'organization' && result2.type === 'organization') {
      const org1 = result1.data.name?.toLowerCase() || ''
      const org2 = result2.data.name?.toLowerCase() || ''
      
      if (org1 === org2) return true
      
      const similarity = this.calculateStringSimilarity(org1, org2)
      if (similarity > this.config.duplicateThreshold) return true
    }

    return false
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0
    if (str1.length === 0 || str2.length === 0) return 0.0

    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1

    if (longer.length === 0) return 1.0

    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  private rerankResults(results: SearchResult[]): SearchResult[] {
    return results.map(result => {
      let rank = result.score

      // Apply source weighting
      if (result.source === 'basic') {
        rank *= this.config.basicWeight
      } else if (result.source === 'semantic') {
        rank *= this.config.semanticWeight
      } else if (result.source === 'hybrid') {
        // Hybrid results get a boost
        rank *= (this.config.basicWeight + this.config.semanticWeight) / 2 * 1.1
      }

      // Boost recent interactions for people
      if (result.type === 'person' && result.data.interactions?.length > 0) {
        const latestInteraction = new Date(result.data.interactions[0].date)
        const daysSinceInteraction = (Date.now() - latestInteraction.getTime()) / (1000 * 60 * 60 * 24)
        const recencyBoost = Math.max(0, 1 - daysSinceInteraction / 365) // Decay over a year
        rank *= (1 + recencyBoost * 0.2) // 20% max boost for very recent interactions
      }

      // Boost current roles over previous roles
      if (result.data.currentRoles?.length > 0) {
        rank *= 1.1
      }

      return {
        ...result,
        rank
      }
    })
  }

  // Strategy-specific fusion methods
  async fuseBasicOnly(results: SearchResult[]): Promise<SearchResult[]> {
    return this.normalizeScores(results)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxResults)
  }

  async fuseSemanticOnly(results: SearchResult[]): Promise<SearchResult[]> {
    return this.normalizeScores(results)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.maxResults)
  }

  async fuseHybrid(
    basicResults: SearchResult[],
    semanticResults: SearchResult[]
  ): Promise<SearchResult[]> {
    return this.fuseResults(basicResults, semanticResults)
  }

  // Update configuration
  updateConfig(newConfig: Partial<FusionConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // Get current configuration
  getConfig(): FusionConfig {
    return { ...this.config }
  }
}