import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import OpenAI from 'openai'
import { db } from '@/lib/db'

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

// Fallback function to use OpenRouter when Z.AI fails
async function callWithFallback(messages: any[], temperature: number = 0.1) {
  // Skip Z.AI for now due to slow performance, go directly to OpenRouter
  
  try {
    
    // Use OpenRouter directly
    if (!process.env.OPENROUTER_API_KEY) {
      console.log('No OpenRouter API key, falling back to OpenAI')
      throw new Error('No OpenRouter API key')
    }
    
    const openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1'
    })
    
    const completion = await openrouter.chat.completions.create({
      model: 'qwen/qwen3-235b-a22b-2507',
      messages,
      temperature,
    })
    
    // Convert OpenRouter response to match Z.AI format
    return {
      choices: [{
        message: {
          content: completion.choices[0]?.message?.content
        }
      }]
    }
    } catch (openrouterError) {
      console.log('OpenRouter failed, falling back to OpenAI:', openrouterError.message)
      
      // Fallback to OpenAI
      try {
        if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-demo-key-for-testing') {
          console.log('No valid OpenAI API key, using mock response for testing')
          return getMockQueryResponse(messages)
        }
        
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages,
          temperature,
        })
        
        // Convert OpenAI response to match Z.AI format
        console.log('OpenAI succeeded, time elapsed:', Date.now() - fallbackStart, 'ms')
        return {
          choices: [{
            message: {
              content: completion.choices[0]?.message?.content
            }
          }]
        }
} catch (openaiError) {
      console.log('OpenAI failed, using mock response:', openaiError.message)
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

    // First, try to query the database based on the user's question
    let databaseResults = null
    let queryType = 'general'

    // Query parsing and database execution
    try {
      // Simple query parsing to determine what the user is asking
      const lowerQuery = query.toLowerCase()
      
      if (lowerQuery.includes('who') && (lowerQuery.includes('work') || lowerQuery.includes('works'))) {
        // Query: "Who works at [organization]?"
        const orgMatch = query.match(/at\s+([^?.,]+)/i) || query.match(/works?\s+at\s+([^?.,]+)/i)
        if (orgMatch) {
          const orgName = orgMatch[1].trim()
          queryType = 'who_works_at'
          
          
          const results = await db.person.findMany({
            where: {
              currentRoles: {
                some: {
                  organization: {
                    name: {
                      contains: orgName
                    }
                  }
                }
              }
            },
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
          
          databaseResults = {
            type: 'who_works_at',
            organization: orgName,
            people: results
          }
        }
      } else if (lowerQuery.includes('tell me about') || lowerQuery.includes('who is') || lowerQuery.includes('information about')) {
        // Query: "Tell me about [person name]"
        const nameMatch = query.match(/about\s+([^?.,]+)/i) || query.match(/who is\s+([^?.,]+)/i)
        if (nameMatch) {
          const personName = nameMatch[1].trim()
          queryType = 'person_info'
          
          const results = await db.person.findMany({
            where: {
              name: {
                contains: personName
              }
            },
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
          
          databaseResults = {
            type: 'person_info',
            personName: personName,
            people: results
          }
        }
      } else if (lowerQuery.includes('ceo') || lowerQuery.includes('cto') || lowerQuery.includes('chief')) {
        // Query: "Show me all CEOs/CTOs/Chiefs"
        const titleMatch = query.match(/(ceo|cto|chief\s+\w+)/i)
        if (titleMatch) {
          const title = titleMatch[1].toLowerCase()
          queryType = 'by_title'
          
          const results = await db.person.findMany({
            where: {
              currentRoles: {
                some: {
                  title: {
                    contains: title
                  }
                }
              }
            },
            include: {
              currentRoles: {
                include: {
                  organization: true
                }
              },
              socialMediaHandles: true
            }
          })
          
          databaseResults = {
            type: 'by_title',
            title: title,
            people: results
          }
        }
      } else if (lowerQuery.includes('twitter') || lowerQuery.includes('linkedin') || lowerQuery.includes('social media')) {
        // Query: "What's [person]'s Twitter handle?" or "What is [person]'s Twitter handle?"
        const nameMatch = query.match(/(?:what\s+(?:is|'s)\s+)?([^'?]+?)'\''s\s+(twitter|linkedin|social media)/i) || 
                         query.match(/(?:what\s+(?:is|'s)\s+)?([^'?]+?)(?:'\''s)?\s+(twitter|linkedin|social media)/i)
        if (nameMatch) {
          const personName = nameMatch[1].trim()
          const platform = nameMatch[2].toLowerCase()
          queryType = 'social_media'
          
          const results = await db.person.findMany({
            where: {
              name: {
                contains: personName
              }
            },
            include: {
              socialMediaHandles: true
            }
          })
          
          databaseResults = {
            type: 'social_media',
            personName: personName,
            platform: platform,
            people: results
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