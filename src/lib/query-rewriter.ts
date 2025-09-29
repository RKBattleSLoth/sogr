export interface QueryRewriteRule {
  pattern: RegExp
  intent: string
  rewrite: (match: RegExpMatchArray, original: string) => string
  confidence: number
}

export interface QueryRewriteResult {
  rewritten: string
  intent: string
  confidence: number
  wasRewritten: boolean
}

export class QueryRewriter {
  private rules: QueryRewriteRule[] = [
    // Organization queries - "Who do I know at [org]?" variations
    {
      pattern: /who\s+(?:do\s+I\s+)?know\s+(?:at|in|from)\s+([^?.,]+)/i,
      intent: 'who_works_at',
      rewrite: (match) => `Who works at ${match[1]}?`,
      confidence: 0.95
    },
    
    // "Show me people at [org]" variations
    {
      pattern: /show\s+me\s+(?:people|connections?)\s+(?:at|from|in)\s+([^?.,]+)/i,
      intent: 'who_works_at',
      rewrite: (match) => `Who works at ${match[1]}?`,
      confidence: 0.85
    },
    
    // "Find me connections at [org]" variations
    {
      pattern: /find\s+me\s+(?:connections?|people)\s+(?:at|from|in)\s+([^?.,]+)/i,
      intent: 'who_works_at',
      rewrite: (match) => `Who works at ${match[1]}?`,
      confidence: 0.85
    },
    
    // Standard "Who works at [org]?" pattern
    {
      pattern: /who\s+works?\s+at\s+([^?.,]+)/i,
      intent: 'who_works_at',
      rewrite: (match) => `Who works at ${match[1]}?`,
      confidence: 0.95
    },
    
    // "People I know at [org]" variations
    {
      pattern: /people\s+(?:I\s+know|in\s+my\s+network)\s+(?:at|from|in)\s+([^?.,]+)/i,
      intent: 'who_works_at',
      rewrite: (match) => `Who works at ${match[1]}?`,
      confidence: 0.80
    },
    
    // "Who in my network works at [org]?" variations
    {
      pattern: /who\s+(?:in\s+my\s+network|in\s+my\s+connections?)\s+(?:works?)\s+(?:at|for)\s+([^?.,]+)/i,
      intent: 'who_works_at',
      rewrite: (match) => `Who works at ${match[1]}?`,
      confidence: 0.90
    },
    
    // Person information queries - "Tell me about [person]" variations
    {
      pattern: /tell\s+me\s+about\s+([^?.,]+)/i,
      intent: 'person_info',
      rewrite: (match) => `Tell me about ${match[1]}`,
      confidence: 0.90
    },
    
    // "Who is [person]" variations
    {
      pattern: /who\s+is\s+([^?.,]+)/i,
      intent: 'person_info',
      rewrite: (match) => `Tell me about ${match[1]}`,
      confidence: 0.85
    },
    
    // "Information about [person]" variations
    {
      pattern: /(?:information|details?)\s+about\s+([^?.,]+)/i,
      intent: 'person_info',
      rewrite: (match) => `Tell me about ${match[1]}`,
      confidence: 0.80
    },
    
    // Location queries - "Where does [person] work?" variations
    {
      pattern: /where\s+(?:can\s+I\s+find|is)\s+([^?.,]+?)\s+(?:working|at)/i,
      intent: 'where_works',
      rewrite: (match) => `Where does ${match[1]} work?`,
      confidence: 0.85
    },
    
    // "What company does [person] work for?" variations
    {
      pattern: /what\s+(?:company|organization)\s+does\s+([^?.,]+?)\s+(?:work|employed)/i,
      intent: 'where_works',
      rewrite: (match) => `Where does ${match[1]} work?`,
      confidence: 0.90
    },
    
    // "Who does [person] work for?" variations
    {
      pattern: /who\s+does\s+([^?.,]+?)\s+work\s+(?:for|at)/i,
      intent: 'where_works',
      rewrite: (match) => `Where does ${match[1]} work?`,
      confidence: 0.95
    },
    
    // Title queries - "Show me all CEOs" variations
    {
      pattern: /show\s+me\s+(?:all\s+)?(ceo|cto|chief\s+\w+)/i,
      intent: 'by_title',
      rewrite: (match) => `Show me all ${match[1]}s`,
      confidence: 0.85
    },
    
    // "Find all [title]" variations
    {
      pattern: /find\s+(?:all\s+)?(ceo|cto|chief\s+\w+)/i,
      intent: 'by_title',
      rewrite: (match) => `Show me all ${match[1]}s`,
      confidence: 0.80
    },
    
    // Social media queries - "What's [person]'s Twitter?" variations
    {
      pattern: /what['']?s\s+([^'?]+?)['']?s\s+(twitter|linkedin|social\s+media)/i,
      intent: 'social_media',
      rewrite: (match) => `What is ${match[1]}'s ${match[2]}?`,
      confidence: 0.90
    },
    
    // "What is [person]'s [platform]?" variations
    {
      pattern: /what\s+is\s+([^'?]+?)['']?s\s+(twitter|linkedin|social\s+media)/i,
      intent: 'social_media',
      rewrite: (match) => `What is ${match[1]}'s ${match[2]}?`,
      confidence: 0.95
    },
    
    // Compound queries with "and" - hybrid intent
    {
      pattern: /(.+?)\s+and\s+(.+)/i,
      intent: 'compound',
      rewrite: (match, original) => original, // Keep original for compound queries
      confidence: 0.80
    },
    
    // Multiple question patterns - hybrid intent
    {
      pattern: /(.+?)\s*\?\s*(.+?)\s*\?/i,
      intent: 'compound',
      rewrite: (match, original) => original, // Keep original for compound queries
      confidence: 0.85
    },
    
    // Mixed structured + semantic patterns
    {
      pattern: /where\s+does\s+([^?.,]+?)\s+work\s+and\s+what\s+(?:are|is)\s+([^?.,]+?)\s+(?:thoughts|opinion|think)/i,
      intent: 'compound',
      rewrite: (match, original) => original, // Keep original for compound queries
      confidence: 0.90
    }
  ]
  
  rewriteQuery(query: string): QueryRewriteResult {
    // Try each rule in order
    for (const rule of this.rules) {
      const match = query.match(rule.pattern)
      if (match) {
        return {
          rewritten: rule.rewrite(match, query),
          intent: rule.intent,
          confidence: rule.confidence,
          wasRewritten: true
        }
      }
    }
    
    // If no rewrite rule matches, return original
    return {
      rewritten: query,
      intent: 'unknown',
      confidence: 0,
      wasRewritten: false
    }
  }
  
  // Add a new rewrite rule dynamically
  addRule(rule: QueryRewriteRule): void {
    this.rules.push(rule)
  }
  
  // Get all current rules
  getRules(): QueryRewriteRule[] {
    return [...this.rules]
  }
  
  // Test a query against all rules (for debugging)
  testQuery(query: string): Array<{ rule: QueryRewriteRule, match: boolean }> {
    return this.rules.map(rule => ({
      rule,
      match: !!query.match(rule.pattern)
    }))
  }
}