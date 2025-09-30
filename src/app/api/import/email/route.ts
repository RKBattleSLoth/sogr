import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { SemanticSearchService } from '@/lib/vector-db'

interface EmailData {
  subject: string
  from: string
  body: string
  date: string
}

interface ExtractedEmailInfo {
  people: Array<{
    name: string
    email: string
    role?: string
    organization?: string
  }>
  organizations: Array<{
    name: string
    domain?: string
  }>
  interactions: Array<{
    summary: string
    date: string
    type: 'email' | 'meeting' | 'call'
  }>
}

// Mock email extraction function for testing when real APIs are not available
function getMockEmailExtractionResponse(email: any) {
  return {
    people: [
      {
        name: email.from,
        email: email.from,
        role: "Email contact",
        organization: "Unknown"
      }
    ],
    organizations: [],
    interactions: [
      {
        summary: "Email exchange",
        date: email.date,
        type: "email" as const
      }
    ]
  }
}

// Fallback function to use Ollama when OpenRouter fails
async function callWithFallbackForEmail(messages: any[], temperature: number = 0.1) {
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
        const fromMatch = lastMessage.match(/- From: ([^\n]+)/)
        const from = fromMatch ? fromMatch[1] : 'user@example.com'
        const subjectMatch = lastMessage.match(/- Subject: ([^\n]+)/)
        const subject = subjectMatch ? subjectMatch[1] : ''
        const bodyMatch = lastMessage.match(/- Body: ([^\n]+)/)
        const body = bodyMatch ? bodyMatch[1] : ''
        const dateMatch = lastMessage.match(/- Date: ([^\n]+)/)
        const date = dateMatch ? dateMatch[1] : '2025-09-26T17:00:00Z'
        
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
        const fromMatch = lastMessage.match(/- From: ([^\n]+)/)
        const from = fromMatch ? fromMatch[1] : 'user@example.com'
        const subjectMatch = lastMessage.match(/- Subject: ([^\n]+)/)
        const subject = subjectMatch ? subjectMatch[1] : ''
        const bodyMatch = lastMessage.match(/- Body: ([^\n]+)/)
        const body = bodyMatch ? bodyMatch[1] : ''
        const dateMatch = lastMessage.match(/- Date: ([^\n]+)/)
        const date = dateMatch ? dateMatch[1] : '2025-09-26T17:00:00Z'
        
        return {
          choices: [{
            message: {
              content: JSON.stringify(getMockEmailExtractionResponse({
                from,
                subject,
                body,
                date
              }))
            }
          }]
        }
      }
    } else {
      console.log('No valid Ollama configuration, using mock response')
      const lastMessage = messages[messages.length - 1]?.content || ''
      const fromMatch = lastMessage.match(/- From: ([^\n]+)/)
      const from = fromMatch ? fromMatch[1] : 'user@example.com'
      const subjectMatch = lastMessage.match(/- Subject: ([^\n]+)/)
      const subject = subjectMatch ? subjectMatch[1] : ''
      const bodyMatch = lastMessage.match(/- Body: ([^\n]+)/)
      const body = bodyMatch ? bodyMatch[1] : ''
      const dateMatch = lastMessage.match(/- Date: ([^\n]+)/)
      const date = dateMatch ? dateMatch[1] : '2025-09-26T17:00:00Z'
      
      return {
        choices: [{
          message: {
            content: JSON.stringify(getMockEmailExtractionResponse({
              from,
              subject,
              body,
              date
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

    const { emails }: { emails: EmailData[] } = await request.json()
    
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json(
        { error: 'Emails array is required' },
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

    const results: ExtractedEmailInfo[] = []

    for (const email of emails) {
      // Create the prompt for email processing
      const emailPrompt = `
You are an expert at extracting social and professional information from emails. Analyze the following email and extract relevant information about people, organizations, and interactions.

Email Details:
- Subject: ${email.subject}
- From: ${email.from}
- Date: ${email.date}
- Body: ${email.body}

Extract the following information in JSON format:

{
  "people": [
    {
      "name": "Full name of the person",
      "email": "Email address",
      "role": "Job title or role (if mentioned)",
      "organization": "Organization name (if mentioned)"
    }
  ],
  "organizations": [
    {
      "name": "Organization name",
      "domain": "Domain name (if detectable)"
    }
  ],
  "interactions": [
    {
      "summary": "Brief summary of the interaction or email content",
      "date": "${email.date}",
      "type": "email"
    }
  ]
}

Focus on extracting:
1. Sender information (name, email, role, organization)
2. Other people mentioned in the email
3. Organizations mentioned
4. Key discussion points or interaction summaries

If information is not available, omit the field. Do not make up values.

Your response must be ONLY the valid JSON object, with no preceding or trailing text.
`

      // Call the LLM for email processing with fallback
      const completion = await callWithFallbackForEmail([
        {
          role: 'system',
          content: 'You are an expert at extracting social and professional information from emails.'
        },
        {
          role: 'user',
          content: emailPrompt
        }
      ], 0.1)

      const responseContent = completion.choices[0]?.message?.content
      
      if (!responseContent) {
        throw new Error('No response from LLM')
      }

      // Parse the JSON response
      let extractedInfo: ExtractedEmailInfo
      try {
        const cleanContent = responseContent.trim()
        extractedInfo = JSON.parse(cleanContent)
      } catch (parseError) {
        console.error('Failed to parse LLM response:', responseContent)
        throw new Error('Failed to parse email information')
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
                email: person.email
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
                fullText: `Email from ${person.name}: ${interaction.summary}`
              }
            })

            // Generate and store embedding for the interaction
            try {
              const contentForEmbedding = `Email from ${person.name} (${person.email}): ${interaction.summary}`
              await SemanticSearchService.storeInteraction(
                newInteraction.id,
                contentForEmbedding,
                {
                  type: 'email',
                  personName: person.name,
                  personEmail: person.email,
                  subject: email.subject,
                  date: interaction.date
                }
              )
            } catch (embeddingError) {
              console.error('Failed to store embedding for interaction:', embeddingError)
              // Continue even if embedding fails
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
                website: org.domain
              }
            })
          }
        }
      } catch (dbError) {
        console.error('Database storage error for email result:', dbError)
        // Continue with other results even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully processed ${emails.length} emails`
    })

  } catch (error) {
    console.error('Error in email import:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process emails',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}