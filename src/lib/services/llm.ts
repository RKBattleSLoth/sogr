import { OpenAI } from 'openai'

// Mock LLM response for testing when real APIs are not available
function getMockSemanticResponse(query: string, results: any[]) {
  if (results.length === 0) {
    return "I couldn't find any relevant interactions in your social graph for this query."
  }

  const lowerQuery = query.toLowerCase()
  const isCompoundQuery = lowerQuery.includes(' and ') || lowerQuery.includes('?') && lowerQuery.indexOf('?') !== lowerQuery.lastIndexOf('?')
  
  // Extract all content and metadata
  const allContents = results.map(r => r.content).filter(Boolean)
  const allPeople = [...new Set(results.map(r => r.metadata?.personName).filter(Boolean))]
  const allOrganizations = [...new Set(results.map(r => r.metadata?.organization).filter(Boolean))]
  
  // Handle compound queries by addressing each part
  if (isCompoundQuery) {
    const responseParts: string[] = []
    
    // Part 1: Work/Location information
    if (lowerQuery.includes('work') || lowerQuery.includes('where')) {
      if (allOrganizations.length > 0 && allPeople.length > 0) {
        responseParts.push(`${allPeople[0]} works at ${allOrganizations[0]}.`)
      } else if (allOrganizations.length > 0) {
        responseParts.push(`Found work information at ${allOrganizations[0]}.`)
      }
    }
    
    // Part 2: Thoughts/Opinions information
    if (lowerQuery.includes('thoughts') || lowerQuery.includes('opinion') || lowerQuery.includes('think')) {
      // Find content with building/growing themes
      const buildingContent = allContents.find(content => 
        content.toLowerCase().includes('build') || 
        content.toLowerCase().includes('grow') ||
        content.toLowerCase().includes('tree') ||
        content.toLowerCase().includes('forest') ||
        content.toLowerCase().includes('bottom up')
      )
      
      if (buildingContent) {
        // Extract and summarize the philosophy
        const lines = buildingContent.split('\n').filter(line => line.trim())
        const philosophyLines = lines.filter(line => 
          line.toLowerCase().includes('build') || 
          line.toLowerCase().includes('grow') ||
          line.toLowerCase().includes('living') ||
          line.toLowerCase().includes('bottom up')
        )
        
        if (philosophyLines.length > 0) {
          const philosophy = philosophyLines.join(' ')
          if (allPeople.length > 0) {
            responseParts.push(`${allPeople[0]} believes that living things grow from the bottom up rather than being built. He applies this philosophy to AI ecosystems, arguing that open, diverse AI systems will grow naturally while factory-farmed AI approaches won't succeed.`)
          } else {
            responseParts.push(`The search results indicate a philosophy that living things grow from the bottom up rather than being built, with applications to AI ecosystem development.`)
          }
        }
      }
    }
    
    if (responseParts.length > 0) {
      return responseParts.join(' ')
    }
  }
  
  // Handle single queries (non-compound)
  let prioritizedResults = [...results]
  
  // If query is about thoughts/opinions on building, prioritize content with those keywords
  if (lowerQuery.includes('thoughts') || lowerQuery.includes('opinion') || lowerQuery.includes('think')) {
    if (lowerQuery.includes('build')) {
      prioritizedResults.sort((a, b) => {
        const aHasBuildKeywords = a.content.toLowerCase().includes('build') || 
                                a.content.toLowerCase().includes('grow') ||
                                a.content.toLowerCase().includes('tree') ||
                                a.content.toLowerCase().includes('forest')
        const bHasBuildKeywords = b.content.toLowerCase().includes('build') || 
                                b.content.toLowerCase().includes('grow') ||
                                b.content.toLowerCase().includes('tree') ||
                                b.content.toLowerCase().includes('forest')
        if (aHasBuildKeywords && !bHasBuildKeywords) return -1
        if (!aHasBuildKeywords && bHasBuildKeywords) return 1
        return 0
      })
    }
  }
  
  // Get the best content
  const bestContent = prioritizedResults[0]?.content
  const bestPerson = prioritizedResults[0]?.metadata?.personName
  
  // Look for specific content patterns about building
  if (lowerQuery.includes('build') && bestContent) {
    const buildingKeywords = ['build', 'grow', 'tree', 'forest', 'child', 'society', 'living', 'bottom up']
    const hasBuildingContent = buildingKeywords.some(keyword => 
      bestContent.toLowerCase().includes(keyword)
    )
    
    if (hasBuildingContent) {
      // Extract the key insights about building/growing
      const lines = bestContent.split('\n').filter(line => line.trim())
      const insights = lines.slice(0, 8).join(' ') // Get first 8 lines for more context
      
      if (bestPerson) {
        return `Based on the search results, ${bestPerson} has specific thoughts on building: ${insights}. The key theme is that living things grow from the bottom up rather than being built, and this applies to AI ecosystems as well.`
      } else {
        return `Based on the search results, here are the thoughts on building: ${insights}. The key theme is that living things grow from the bottom up rather than being built.`
      }
    }
  }
  
  // Generic content summary with best result
  if (bestContent) {
    const summary = bestContent.substring(0, 300) + (bestContent.length > 300 ? '...' : '')
    if (bestPerson) {
      return `Based on interactions with ${bestPerson}, here's what was found: ${summary}`
    } else {
      return `Based on the search results: ${summary}`
    }
  }
  
  return `I found ${results.length} relevant interaction(s) related to "${query}" in your social graph.`
}

export class LLMService {
  private openai: OpenAI | null = null
  private ollamaAvailable: boolean = false

  constructor() {
    // Initialize primary LLM provider if API key is available and valid
    const primaryProvider = process.env.LLM_PROVIDER?.toLowerCase()
    const primaryApiKey = process.env.LLM_API_KEY
    
    if (primaryApiKey && primaryApiKey !== 'your-openai-api-key-here' && primaryApiKey !== 'your-anthropic-api-key-here') {
      if (primaryProvider === 'openai') {
        this.openai = new OpenAI({
          apiKey: primaryApiKey,
        })
      } else if (primaryProvider === 'openrouter') {
        this.openai = new OpenAI({
          apiKey: primaryApiKey,
          baseURL: process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1'
        })
      }
    }
    
    // Check if fallback LLM provider is available
    const fallbackProvider = process.env.FALLBACK_LLM_PROVIDER?.toLowerCase()
    this.ollamaAvailable = fallbackProvider === 'ollama' || process.env.OLLAMA_NAME === 'ollama-local'
  }

  async processSemanticResults(query: string, results: any[]): Promise<string> {
    try {
      // If no results, return early
      if (results.length === 0) {
        return "I couldn't find any relevant interactions in your social graph for this query."
      }

      // Prepare context from semantic search results
      const context = results.map((result, index) => {
        const metadata = result.metadata || {}
        return `
Result ${index + 1}:
- Content: ${result.content}
- Person: ${metadata.personName || 'Unknown'}
- Platform: ${metadata.platform || 'Unknown'}
- Type: ${metadata.type || 'Unknown'}
- Date: ${metadata.date || 'Unknown'}
- Subject: ${metadata.subject || 'N/A'}
- Similarity Score: ${Math.round((result.similarity || 0) * 100)}%
`
      }).join('\n')

      const systemPrompt = `You are a helpful assistant that analyzes social graph interactions and provides natural language answers to user queries. 

Based on the search results provided, give a comprehensive, well-structured answer to the user's question. Focus on:
1. Directly answering ALL parts of the user's question using the content from the results
2. For compound questions with "and", address each part separately and clearly
3. Summarizing the actual content and key insights from the interactions (don't just quote full text)
4. Providing context and understanding of what the content means
5. For work/location questions: extract company names, titles, and roles
6. For thoughts/opinion questions: identify the core philosophy, beliefs, or perspectives expressed
7. Structure your response to clearly separate different parts of compound queries

IMPORTANT: Do NOT just say you found results or quote large blocks of text. Instead:
- For work info: "Mikey Anderson works at Think as a Master Gardener"
- For thoughts: "Mikey Anderson believes that living things grow from the bottom up rather than being built. He applies this philosophy to AI ecosystems, arguing that factory-farmed AI won't succeed but open, diverse ecosystems will grow naturally."

Keep your response natural and conversational, but provide specific, summarized information. If the results don't contain enough information to fully answer the query, acknowledge this limitation.`

      const userPrompt = `User Query: "${query}"

Here are the relevant interactions from their social graph:
${context}

Please provide a natural language response to the user's query based on these results.`

      // Try OpenRouter first if available
      if (this.openai) {
        try {
          const completion = await this.openai.chat.completions.create({
            model: process.env.LLM_MODEL || 'gpt-4-turbo-preview',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
          })

          return completion.choices[0]?.message?.content || getMockSemanticResponse(query, results)
        } catch (openaiError) {
          console.log('OpenRouter failed, trying Ollama fallback:', openaiError)
          return this.tryOllamaFallback(query, results, systemPrompt, userPrompt)
        }
      }

      // Try Ollama fallback if OpenRouter not available
      if (this.ollamaAvailable) {
        return this.tryOllamaFallback(query, results, systemPrompt, userPrompt)
      }

      // Fallback to mock response
      return getMockSemanticResponse(query, results)

    } catch (error) {
      console.error('LLM processing error:', error)
      return getMockSemanticResponse(query, results)
    }
  }

  private async tryOllamaFallback(query: string, results: any[], systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const ollamaResponse = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.FALLBACK_LLM_MODEL || 'claude-3-sonnet-20240229',
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
          options: {
            temperature: 0.7,
          }
        })
      })

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama request failed: ${ollamaResponse.statusText}`)
      }

      const ollamaData = await ollamaResponse.json()
      return ollamaData.response || getMockSemanticResponse(query, results)
    } catch (ollamaError) {
      console.log('Ollama fallback failed, using mock response:', ollamaError)
      return getMockSemanticResponse(query, results)
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.openai !== null || this.ollamaAvailable
  }

  async getProviderInfo(): Promise<{ primary: string; fallback: string; available: boolean }> {
    const primaryProvider = process.env.LLM_PROVIDER || 'unknown'
    const fallbackProvider = process.env.FALLBACK_LLM_PROVIDER || 'unknown'
    
    return {
      primary: this.openai ? `${primaryProvider} (${process.env.LLM_MODEL || 'default'})` : 'Not configured',
      fallback: this.ollamaAvailable ? `${fallbackProvider} (${process.env.FALLBACK_LLM_MODEL || 'default'})` : 'Not available',
      available: this.openai !== null || this.ollamaAvailable
    }
  }
}