import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

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

export async function POST(request: NextRequest) {
  try {
    const { messages }: { messages: MessageData[] } = await request.json()
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Initialize ZAI SDK
    const zai = await ZAI.create()

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

      // Call the LLM for message processing
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting social information from chat messages.'
          },
          {
            role: 'user',
            content: messagePrompt
          }
        ],
        temperature: 0.1,
      })

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

    // TODO: Store the extracted information in the database
    // This would involve creating/updating Person, Interaction, and other relevant records

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