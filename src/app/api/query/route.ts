import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { db } from '@/lib/db'
import { QueryAnalyzer } from '@/lib/query-analyzer'

// Mock AI response for testing when real APIs are not available
function getMockQueryResponse(messages: any[]) {
  const lastMessage = messages[messages.length - 1]?.content || ''
  
  // Extract the user's original query
  const queryMatch = lastMessage.match(/User's query: "([^"]+)"/)
  const userQuery = queryMatch ? queryMatch[1] : ''
  
  // Extract database results if present
  const dbResultsMatch = lastMessage.match(/Here are the actual results from their social graph database:\s+({[\s\S]+?})\s+/)
  const hasDbResults = dbResultsMatch && dbResultsMatch[1]
  
  if (hasDbResults) {
    try {
      const dbResults = JSON.parse(dbResultsMatch[1])
      
      if (dbResults.type === 'who_works_at') {
        return {
          choices: [{
            message: {
              content: `Based on your social graph, I found ${dbResults.people.length} person(s) who work at ${dbResults.organization}: ${dbResults.people.map(p => p.name).join(', ')}.`
            }
          }]
        }
      } else if (dbResults.type === 'person_info') {
        if (dbResults.people.length > 0) {
          const person = dbResults.people[0]
          const currentRole = person.currentRoles[0]
          return {
            choices: [{
              message: {
                content: `${person.name} is ${currentRole.title} at ${currentRole.organization.name}.`
              }
            }]
          }
        } else {
          return {
            choices: [{
              message: {
                content: `I couldn't find any information about that person in your social graph.`
              }
            }]
          }
        }
      }
    } catch (e) {
      // Fall through to default response
    }
  }
  
  // Default mock response
  return {
    choices: [{
      message: {
        content: `I understand you're asking about "${userQuery}". To provide you with accurate information from your social graph, I would need to search your database for relevant connections and organizations.`
      }
    }]
  }
}

// Fallback function to use Ollama when OpenRouter fails
async function callWithFallback(messages: any[], temperature: number = 0.1) {
  // Try OpenRouter first
  try {
    const openrouter = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL
    })
    
    const completion = await openrouter.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'qwen/qwen3-235b-a22b-2507',
      messages,
      temperature,
    })
    
    return completion
  } catch (error) {
    console.log('OpenRouter failed, falling back to Ollama:', error.message)
    
    // Fallback to Ollama
    if (process.env.Z_AI_API_KEY === 'ollama-local') {
      try {
        const ollamaResponse = await fetch(`${process.env.Z_AI_BASE_URL}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.Z_AI_MODEL || 'llama3.1',
            prompt: messages[messages.length - 1]?.content || '',
            stream: false,
            options: {
              temperature: temperature
            }
          })
        })
        
        if (!ollamaResponse.ok) {
          throw new Error(`Ollama API error: ${ollamaResponse.status}`)
        }
        
        const ollamaData = await ollamaResponse.json()
        
        // Convert Ollama response to match OpenAI format
        return {
          choices: [{
            message: {
              content: ollamaData.response
            }
          }]
        }
      } catch (ollamaError) {
        console.log('Ollama failed, using mock response:', ollamaError.message)
        return getMockQueryResponse(messages)
      }
    } else {
      console.log('No valid Ollama configuration, using mock response')
      return getMockQueryResponse(messages)
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // NEW: Analyze and rewrite query using Query Analyzer
    const analyzer = new QueryAnalyzer()
    const analysis = analyzer.analyzeQuery(query)
    
    // Use rewritten query for pattern matching
    const queryToProcess = analysis.rewrittenQuery
    const originalQuery = query

    // First, try to query the database based on the user's question
    let databaseResults = null
    let queryType = analysis.intent || 'general'

    // Query parsing and database execution
    try {
      // Use the rewritten query for pattern matching
      const lowerQuery = queryToProcess.toLowerCase()
      if (analysis.intent === 'organization' && analysis.entities.organizations?.length) {
        // Query: "Who works at [organization]?" - use extracted entity
        const orgName = analysis.entities.organizations[0].toLowerCase()
        queryType = 'who_works_at'
        
        try {
          // For SQLite, we need to handle case-insensitive matching manually
          // Get all people and filter in memory
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
              role.organization.name.toLowerCase().includes(orgName)
            )
          )
          
          databaseResults = {
            type: 'who_works_at',
            organization: orgName,
            people: results
          }
        } catch (error) {
          console.error('Error fetching people by organization:', error)
          databaseResults = {
            type: 'who_works_at',
            organization: orgName,
            people: [],
            error: 'Failed to fetch people by organization'
          }
        }
      } else if (analysis.intent === 'person_info' && analysis.entities.people?.length) {
        // Query: "Tell me about [person name]" - use extracted entity
        const personName = analysis.entities.people[0]
        queryType = 'person_info'
        
        try {
          // For SQLite, handle case-insensitive matching manually
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
          
          databaseResults = {
            type: 'person_info',
            personName: personName,
            people: results
          }
        } catch (error) {
          console.error('Error fetching person info:', error)
          databaseResults = {
            type: 'person_info',
            personName: personName,
            people: [],
            error: 'Failed to fetch person information'
          }
        }
      } else if (analysis.intent === 'title' && analysis.entities.titles?.length) {
        // Query: "Show me all CEOs/CTOs/Chiefs" - use extracted entity
        const title = analysis.entities.titles[0].toLowerCase()
        queryType = 'by_title'
        
        try {
          // For SQLite, handle case-insensitive matching manually
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
              role.title.toLowerCase().includes(title)
            )
          )
          
          databaseResults = {
            type: 'by_title',
            title: title,
            people: results
          }
        } catch (error) {
          console.error('Error fetching people by title:', error)
          databaseResults = {
            type: 'by_title',
            title: title,
            people: [],
            error: 'Failed to fetch people by title'
          }
        }
      } else if (analysis.intent === 'social_media' && analysis.entities.people?.length && analysis.entities.platforms?.length) {
        // Query: "What's [person]'s Twitter handle?" - use extracted entities
        const personName = analysis.entities.people[0]
        const platform = analysis.entities.platforms[0].toLowerCase()
        queryType = 'social_media'
        
        try {
          // For SQLite, handle case-insensitive matching manually
          const allPeople = await db.person.findMany({
            include: {
              socialMediaHandles: true
            }
          })
          
          const results = allPeople.filter(person => 
            person.name.toLowerCase().includes(personName.toLowerCase())
          )
          
          databaseResults = {
            type: 'social_media',
            personName: personName,
            platform: platform,
            people: results
          }
        } catch (error) {
          console.error('Error fetching social media info:', error)
          databaseResults = {
            type: 'social_media',
            personName: personName,
            platform: platform,
            people: [],
            error: 'Failed to fetch social media information'
          }
        }
      } else if (analysis.intent === 'location' && analysis.entities.people?.length) {
        // Query: "Where does [person] work?" - use extracted entity
        const personName = analysis.entities.people[0]
        queryType = 'where_works'
        
        try {
          // For SQLite, handle case-insensitive matching manually
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
          
          databaseResults = {
            type: 'where_works',
            personName: personName,
            people: results
          }
        } catch (error) {
          console.error('Error in location query:', error)
          databaseResults = {
            type: 'where_works',
            personName: personName,
            people: []
          }
        }
      } else if (analysis.intent === 'location' && analysis.entities.people?.length) {
        // Query: "What company does [person] work for?" - use extracted entity
        const personName = analysis.entities.people[0]
        queryType = 'where_works'
        
        try {
          // For SQLite, handle case-insensitive matching manually
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
          
          databaseResults = {
            type: 'where_works',
            personName: personName,
            people: results
          }
        } catch (error) {
          console.error('Error in location query:', error)
          databaseResults = {
            type: 'where_works',
            personName: personName,
            people: []
          }
        }
      } else if (analysis.intent === 'location' && analysis.entities.people?.length) {
        // Query: "Who does [person] work for?" - use extracted entity
        const personName = analysis.entities.people[0]
        queryType = 'where_works'
        
        try {
          // For SQLite, handle case-insensitive matching manually
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
          
          databaseResults = {
            type: 'where_works',
            personName: personName,
            people: results
          }
        } catch (error) {
          console.error('Error in location query:', error)
          databaseResults = {
            type: 'where_works',
            personName: personName,
            people: []
          }
        }
      }
    } catch (dbError) {
      console.error('Database query error:', dbError)
      console.error('Error details:', JSON.stringify(dbError, null, 2))
      // Continue with LLM response if database query fails
    }

    // Create the prompt for response generation
    const responsePrompt = `
You are a helpful assistant for a social graph application. Your task is to provide a helpful response to the user's query based on their social network data.

User's query: "${query}"

${databaseResults ? `Here are the actual results from their social graph database:
${JSON.stringify(databaseResults, null, 2)}

Please provide a natural, conversational response that directly answers their question using this real data. If no results were found, let them know that you couldn't find anyone matching their criteria.` : `No specific database results were found for this query. Please provide a helpful response explaining what information you would look for in their social graph to answer this question.`}

Your response should be:
1. Direct and conversational
2. Based on the actual data provided (if available)
3. Helpful and informative
4. If no data found, suggest how they might add relevant information to their social graph

Do not make up or hallucinate specific people or information that isn't in the database results.
`

    

    // Call the LLM for response generation with fallback
    const completion = await callWithFallback([
      {
        role: 'system',
        content: 'You are a helpful assistant for a social graph application that provides accurate, conversational responses based on the user\'s actual social network data.'
      },
      {
        role: 'user',
        content: responsePrompt
      }
    ], 0.5) // Lower temperature for more factual responses

    // Extract the response content
    const responseContent = completion.choices[0]?.message?.content
    
    if (!responseContent) {
      throw new Error('No response from LLM')
    }

    return NextResponse.json({
      success: true,
      query: query,
      response: responseContent,
      databaseResults: databaseResults,
      queryType: queryType,
      message: 'Query processed successfully'
    })

  } catch (error) {
    console.error('Error in query processing:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}