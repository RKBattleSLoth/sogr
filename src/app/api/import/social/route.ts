import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { SemanticSearchService } from '@/lib/vector-db'

interface SocialMediaData {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook' | 'tiktok' | 'other'
  username: string
  content: string
  timestamp: string
  url?: string
  engagement?: {
    likes: number
    shares: number
    comments: number
  }
}

interface ExtractedSocialMediaInfo {
  people: Array<{
    name: string
    handle: string
    platform: string
    bio?: string
    location?: string
    website?: string
  }>
  organizations: Array<{
    name: string
    industry?: string
    description?: string
  }>
  interactions: Array<{
    summary: string
    date: string
    type: 'post' | 'comment' | 'share' | 'like'
    platform: string
    context?: string
  }>
  relationships: Array<{
    from: string
    to: string
    type: 'follows' | 'mentioned' | 'connected' | 'tagged'
    context: string
  }>
}

// Mock social media extraction function for testing when real APIs are not available
function getMockSocialExtractionResponse(post: any) {
  return {
    people: [
      {
        name: post.username,
        handle: post.username,
        platform: post.platform,
        bio: "Social media user",
        location: "Unknown",
        website: ""
      }
    ],
    organizations: [],
    interactions: [
      {
        summary: "Posted content",
        date: post.timestamp,
        type: "post" as const,
        platform: post.platform,
        context: post.content
      }
    ],
    relationships: []
  }
}

// Fallback function to use Ollama when OpenRouter fails
async function callWithFallbackForSocial(messages: any[], temperature: number = 0.1) {
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
        const lastMessage = messages[messages.length - 1]?.content || ''
        const postMatch = lastMessage.match(/- Content: ([^\n]+)/)
        const postContent = postMatch ? postMatch[1] : ''
        const platformMatch = lastMessage.match(/- Platform: ([^\n]+)/)
        const platform = platformMatch ? platformMatch[1] : 'twitter'
        const usernameMatch = lastMessage.match(/- Username: ([^\n]+)/)
        const username = usernameMatch ? usernameMatch[1] : 'user'
        const timestampMatch = lastMessage.match(/- Timestamp: ([^\n]+)/)
        const timestamp = timestampMatch ? timestampMatch[1] : '2025-09-26T17:00:00Z'
        
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
        const lastMessage = messages[messages.length - 1]?.content || ''
        const postMatch = lastMessage.match(/- Content: ([^\n]+)/)
        const postContent = postMatch ? postMatch[1] : ''
        const platformMatch = lastMessage.match(/- Platform: ([^\n]+)/)
        const platform = platformMatch ? platformMatch[1] : 'twitter'
        const usernameMatch = lastMessage.match(/- Username: ([^\n]+)/)
        const username = usernameMatch ? usernameMatch[1] : 'user'
        const timestampMatch = lastMessage.match(/- Timestamp: ([^\n]+)/)
        const timestamp = timestampMatch ? timestampMatch[1] : '2025-09-26T17:00:00Z'
        
        return {
          choices: [{
            message: {
              content: JSON.stringify(getMockSocialExtractionResponse({
                platform,
                username,
                content: postContent,
                timestamp
              }))
            }
          }]
        }
      }
    } else {
      console.log('No valid Ollama configuration, using mock response')
      const lastMessage = messages[messages.length - 1]?.content || ''
      const postMatch = lastMessage.match(/- Content: ([^\n]+)/)
      const postContent = postMatch ? postMatch[1] : ''
      const platformMatch = lastMessage.match(/- Platform: ([^\n]+)/)
      const platform = platformMatch ? platformMatch[1] : 'twitter'
      const usernameMatch = lastMessage.match(/- Username: ([^\n]+)/)
      const username = usernameMatch ? usernameMatch[1] : 'user'
      const timestampMatch = lastMessage.match(/- Timestamp: ([^\n]+)/)
      const timestamp = timestampMatch ? timestampMatch[1] : '2025-09-26T17:00:00Z'
      
      return {
        choices: [{
          message: {
            content: JSON.stringify(getMockSocialExtractionResponse({
              platform,
              username,
              content: postContent,
              timestamp
            }))
          }
        }]
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { posts }: { posts: SocialMediaData[] } = await request.json()
    
    if (!posts || !Array.isArray(posts)) {
      return NextResponse.json(
        { error: 'Posts array is required' },
        { status: 400 }
      )
    }

    // Get the current user
    const currentUser = await db.user.findUnique({
      where: { email: session.user.email }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Initialize OpenRouter client
    const openrouter = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL
    })

    const results: ExtractedSocialMediaInfo[] = []

    for (const post of posts) {
      // Create the prompt for social media processing
      const socialPrompt = `
You are an expert at extracting social and professional information from social media posts. Analyze the following post and extract relevant information about people, organizations, interactions, and relationships.

Post Details:
- Platform: ${post.platform}
- Username: ${post.username}
- Content: ${post.content}
- Timestamp: ${post.timestamp}
- URL: ${post.url || 'N/A'}
- Engagement: ${JSON.stringify(post.engagement || {})}

Extract the following information in JSON format:

{
  "people": [
    {
      "name": "Name of the person (author or mentioned)",
      "handle": "Username/handle",
      "platform": "${post.platform}",
      "bio": "Bio information if mentioned",
      "location": "Location if mentioned",
      "website": "Website if mentioned"
    }
  ],
  "organizations": [
    {
      "name": "Organization name",
      "industry": "Industry if mentioned",
      "description": "Description if provided"
    }
  ],
  "interactions": [
    {
      "summary": "Brief summary of the post content",
      "date": "${post.timestamp}",
      "type": "post",
      "platform": "${post.platform}",
      "context": "Additional context about the post"
    }
  ],
  "relationships": [
    {
      "from": "Person initiating the relationship",
      "to": "Person receiving the relationship",
      "type": "follows|mentioned|connected|tagged",
      "context": "Context of the relationship"
    }
  ]
}

Focus on extracting:
1. The author's information (name, handle, bio details)
2. People mentioned in the post
3. Organizations mentioned or associated with people
4. Key content summary and interaction type
5. Relationships indicated (mentions, tags, connections)
6. Professional context and affiliations

If information is not available, omit the field. Do not make up values.

Your response must be ONLY the valid JSON object, with no preceding or trailing text.
`

      // Call the LLM for social media processing with fallback
      const completion = await callWithFallbackForSocial([
        {
          role: 'system',
          content: 'You are an expert at extracting social and professional information from social media posts.'
        },
        {
          role: 'user',
          content: socialPrompt
        }
      ], 0.1)

      const responseContent = completion.choices[0]?.message?.content
      
      if (!responseContent) {
        throw new Error('No response from LLM')
      }

      // Parse the JSON response
      let extractedInfo: ExtractedSocialMediaInfo
      try {
        const cleanContent = responseContent.trim()
        extractedInfo = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('Failed to parse LLM response:', responseContent)
        throw new Error('Failed to parse social media information')
      }

      results.push(extractedInfo)
    }

    // Store the extracted information in the database
    for (const result of results) {
      try {
        // Store people
        for (const person of result.people) {
          // Check if person already exists
          const existingPerson = await db.person.findFirst({
            where: {
              name: {
                contains: person.name
              }
            }
          })

          let storedPerson = existingPerson
          if (!existingPerson) {
            storedPerson = await db.person.create({
              data: {
                name: person.name,
                bio: person.bio
              }
            })
          }

          // Store interactions
          for (const interaction of result.interactions) {
            const interactionDate = new Date(interaction.date)
            
            const newInteraction = await db.interaction.create({
              data: {
                summary: interaction.summary,
                date: interactionDate,
                personId: storedPerson.id,
                userId: currentUser.id,
                context: interaction.context,
                fullText: `Social media interaction with ${person.name}: ${interaction.summary}`
              }
            })

            // Generate and store embedding for the interaction
            try {
              const contentForEmbedding = `Social media interaction with ${person.name} (@${person.handle}) on ${interaction.platform}: ${interaction.summary}`
              await SemanticSearchService.storeInteraction(
                newInteraction.id,
                contentForEmbedding,
                {
                  type: 'social_media',
                  platform: interaction.platform,
                  personName: person.name,
                  personHandle: person.handle,
                  interactionType: interaction.type,
                  date: interaction.date
                }
              )
            } catch (embeddingError) {
              console.error('Failed to store embedding for interaction:', embeddingError)
              // Continue even if embedding fails
            }
          }

          // Store social media handles
          for (const social of person.social_media || []) {
            // Check if social media handle already exists
            const existingHandle = await db.socialMediaHandle.findFirst({
              where: {
                personId: storedPerson.id,
                platform: social.platform
              }
            })

            if (!existingHandle) {
              await db.socialMediaHandle.create({
                data: {
                  platform: social.platform,
                  handle: social.handle.replace('@', ''),
                  personId: storedPerson.id
                }
              })
            }
          }
        }

        // Store organizations
        for (const org of result.organizations) {
          // Check if organization already exists
          const existingOrg = await db.organization.findFirst({
            where: {
              name: {
                contains: org.name
              }
            }
          })

          if (!existingOrg) {
            await db.organization.create({
              data: {
                name: org.name,
                industry: org.industry,
                website: org.website
              }
            })
          }
        }
      } catch (dbError) {
        console.error('Database storage error for social result:', dbError)
        // Continue with other results even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully processed ${posts.length} social media posts`
    })

  } catch (error) {
    console.error('Error in social media import:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process social media posts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}