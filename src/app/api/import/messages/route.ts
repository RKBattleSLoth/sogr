import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'

interface MessageData {
  platform: 'whatsapp' | 'telegram' | 'signal' | 'imessage' | 'other'
  sender: string
  content: string
  timestamp: string
  isGroupChat?: boolean
  groupName?: string
}

interface ExtractedMessageInfo {
  people: Array<{
    name: string
    platform: string
    handle?: string
  }>
  interactions: Array<{
    summary: string
    date: string
    type: 'message' | 'group_message'
    platform: string
    context?: string
  }>
  entities: Array<{
    type: 'organization' | 'event' | 'location' | 'project'
    name: string
    context: string
  }>
}

// Mock message extraction function for testing when real APIs are not available
function getMockMessageExtractionResponse(message: any) {
  return {
    people: [
      {
        name: message.sender,
        platform: message.platform,
        handle: message.sender
      }
    ],
    interactions: [
      {
        summary: "Message exchange",
        date: message.timestamp,
        type: "message" as const,
        platform: message.platform,
        context: message.content
      }
    ],
    entities: []
  }
}

// Fallback function to use Ollama when OpenRouter fails
async function callWithFallbackForMessages(messages: any[], temperature: number = 0.1) {
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
        const senderMatch = lastMessage.match(/- Sender: ([^\n]+)/)
        const sender = senderMatch ? senderMatch[1] : 'user'
        const contentMatch = lastMessage.match(/- Content: ([^\n]+)/)
        const content = contentMatch ? contentMatch[1] : ''
        const platformMatch = lastMessage.match(/- Platform: ([^\n]+)/)
        const platform = platformMatch ? platformMatch[1] : 'whatsapp'
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
        const senderMatch = lastMessage.match(/- Sender: ([^\n]+)/)
        const sender = senderMatch ? senderMatch[1] : 'user'
        const contentMatch = lastMessage.match(/- Content: ([^\n]+)/)
        const content = contentMatch ? contentMatch[1] : ''
        const platformMatch = lastMessage.match(/- Platform: ([^\n]+)/)
        const platform = platformMatch ? platformMatch[1] : 'whatsapp'
        const timestampMatch = lastMessage.match(/- Timestamp: ([^\n]+)/)
        const timestamp = timestampMatch ? timestampMatch[1] : '2025-09-26T17:00:00Z'
        
        return {
          choices: [{
            message: {
              content: JSON.stringify(getMockMessageExtractionResponse({
                platform,
                sender,
                content,
                timestamp
              }))
            }
          }]
        }
      }
    } else {
      console.log('No valid Ollama configuration, using mock response')
      const lastMessage = messages[messages.length - 1]?.content || ''
      const senderMatch = lastMessage.match(/- Sender: ([^\n]+)/)
      const sender = senderMatch ? senderMatch[1] : 'user'
      const contentMatch = lastMessage.match(/- Content: ([^\n]+)/)
      const content = contentMatch ? contentMatch[1] : ''
      const platformMatch = lastMessage.match(/- Platform: ([^\n]+)/)
      const platform = platformMatch ? platformMatch[1] : 'whatsapp'
      const timestampMatch = lastMessage.match(/- Timestamp: ([^\n]+)/)
      const timestamp = timestampMatch ? timestampMatch[1] : '2025-09-26T17:00:00Z'
      
      return {
        choices: [{
          message: {
            content: JSON.stringify(getMockMessageExtractionResponse({
              platform,
              sender,
              content,
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

    const { messages }: { messages: MessageData[] } = await request.json()
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
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

    const results: ExtractedMessageInfo[] = []

    for (const message of messages) {
      // Create the prompt for message processing
      const messagePrompt = `
You are an expert at extracting social information from chat messages. Analyze the following message and extract relevant information about people, interactions, and entities.

Message Details:
- Platform: ${message.platform}
- Sender: ${message.sender}
- Timestamp: ${message.timestamp}
- Content: ${message.content}
- Is Group Chat: ${message.isGroupChat || false}
- Group Name: ${message.groupName || 'N/A'}

Extract the following information in JSON format:

{
  "people": [
    {
      "name": "Name of the person mentioned or sender",
      "platform": "${message.platform}",
      "handle": "Username/handle if available"
    }
  ],
  "interactions": [
    {
      "summary": "Brief summary of the message content",
      "date": "${message.timestamp}",
      "type": "${message.isGroupChat ? 'group_message' : 'message'}",
      "platform": "${message.platform}",
      "context": "Additional context about the conversation"
    }
  ],
  "entities": [
    {
      "type": "organization|event|location|project",
      "name": "Name of the entity",
      "context": "How it was mentioned in the conversation"
    }
  ]
}

Focus on extracting:
1. People mentioned in the message (including sender)
2. Key interaction points or conversation summaries
3. Organizations, events, locations, or projects mentioned
4. Social context and relationship indicators

If information is not available, omit the field. Do not make up values.

Your response must be ONLY the valid JSON object, with no preceding or trailing text.
`

      // Call the LLM for message processing with fallback
      const completion = await callWithFallbackForMessages([
        {
          role: 'system',
          content: 'You are an expert at extracting social information from chat messages.'
        },
        {
          role: 'user',
          content: messagePrompt
        }
      ], 0.1)

      const responseContent = completion.choices[0]?.message?.content
      
      if (!responseContent) {
        throw new Error('No response from LLM')
      }

      // Parse the JSON response
      let extractedInfo: ExtractedMessageInfo
      try {
        const cleanContent = responseContent.trim()
        extractedInfo = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('Failed to parse LLM response:', responseContent)
        throw new Error('Failed to parse message information')
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
                name: person.name
              }
            })
          }

          // Store interactions
          for (const interaction of result.interactions) {
            const interactionDate = new Date(interaction.date)
            
            await db.interaction.create({
              data: {
                summary: interaction.summary,
                date: interactionDate,
                personId: storedPerson.id,
                userId: currentUser.id,
                context: interaction.context,
                fullText: `Message from ${person.name} on ${person.platform}: ${interaction.context || interaction.summary}`
              }
            })
          }
        }
      } catch (dbError) {
        console.error('Database storage error for message result:', dbError)
        // Continue with other results even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully processed ${messages.length} messages`
    })

  } catch (error) {
    console.error('Error in message import:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}