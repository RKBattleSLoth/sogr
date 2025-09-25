import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

// Interface for the extracted information structure
interface ExtractedInfo {
  interaction_summary?: string
  date_mentioned?: string
  person?: {
    name: string
    current_role?: {
      title: string
      organization: string
    }
    previous_work?: Array<{
      organization: string
    }>
    social_media?: Array<{
      platform: string
      handle: string
    }>
  }
  organization?: {
    name: string
    industry?: string
    website?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text input is required' },
        { status: 400 }
      )
    }

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    // Create the prompt for information extraction
    const extractionPrompt = `
You are an expert information extraction assistant. Your task is to analyze the following text and extract specific pieces of information about people and their affiliations.

Identify and extract:
1. Person names
2. Organization names
3. Job titles
4. Social media handles (specifying platforms like Twitter, LinkedIn, etc.)
5. Dates mentioned
6. Relationships (e.g., "is the [job title] of [organization]", "used to work at [organization]", "has a [platform] handle [handle]")

Output the information in the following JSON format:
{
  "interaction_summary": "Brief summary of the interaction",
  "date_mentioned": "Date mentioned in the text (if any)",
  "person": {
    "name": "Person's name",
    "current_role": {
      "title": "Current job title",
      "organization": "Current organization"
    },
    "previous_work": [
      {
        "organization": "Previous organization"
      }
    ],
    "social_media": [
      {
        "platform": "Platform name",
        "handle": "Handle without @"
      }
    ]
  }
}

If information is unclear or not present, omit that field from the JSON. Do not make up values.

Examples:
Input: "I ran into Sarah, the new CTO at InnovateX, yesterday. Her LinkedIn is @sj_innovate."
Output: {
  "interaction_summary": "Met Sarah",
  "date_mentioned": "yesterday",
  "person": {
    "name": "Sarah",
    "current_role": {
      "title": "CTO",
      "organization": "InnovateX"
    },
    "social_media": [
      {
        "platform": "LinkedIn",
        "handle": "sj_innovate"
      }
    ]
  }
}

Now process this input: "${text}"

Your response must be ONLY the valid JSON object, with no preceding or trailing text.
`

    // Call the LLM for information extraction
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert information extraction assistant specializing in identifying people, organizations, and their relationships from natural language text.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ],
      temperature: 0.1, // Low temperature for more consistent output
    })

    // Extract the response content
    const responseContent = completion.choices[0]?.message?.content
    
    if (!responseContent) {
      throw new Error('No response from LLM')
    }

    // Parse the JSON response
    let extractedInfo: ExtractedInfo
    try {
      // Clean the response content to ensure it's valid JSON
      let cleanContent = responseContent.trim()
      
      // Remove markdown code block formatting if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/, '').replace(/\n?```$/, '')
      }
      
      // Remove any leading/trailing non-JSON content
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanContent = jsonMatch[0]
      }
      
      extractedInfo = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse LLM response:', responseContent)
      console.error('Parse error:', parseError)
      throw new Error('Failed to parse extracted information')
    }

    // Store the extracted information in the database
    let storedPerson = null
    let storedInteraction = null

    try {
      if (extractedInfo.person) {
        // Check if person already exists
        const existingPerson = await db.person.findFirst({
          where: {
            name: {
              contains: extractedInfo.person.name
            }
          }
        })

        if (existingPerson) {
          storedPerson = existingPerson
        } else {
          // Create new person
          storedPerson = await db.person.create({
            data: {
              name: extractedInfo.person.name,
              bio: extractedInfo.person.current_role ? 
                `${extractedInfo.person.current_role.title} at ${extractedInfo.person.current_role.organization}` : 
                undefined
            }
          })
        }

        // Handle current role
        if (extractedInfo.person.current_role) {
          // Find or create organization
          let organization = await db.organization.findFirst({
            where: {
              name: {
                contains: extractedInfo.person.current_role.organization
              }
            }
          })

          if (!organization) {
            organization = await db.organization.create({
              data: {
                name: extractedInfo.person.current_role.organization
              }
            })
          }

          // Check if current role already exists
          const existingCurrentRole = await db.currentRole.findFirst({
            where: {
              personId: storedPerson.id,
              organizationId: organization.id
            }
          })

          if (!existingCurrentRole) {
            await db.currentRole.create({
              data: {
                title: extractedInfo.person.current_role.title,
                personId: storedPerson.id,
                organizationId: organization.id,
                startDate: new Date() // Default to current date
              }
            })
          }
        }

        // Handle previous work
        if (extractedInfo.person.previous_work && extractedInfo.person.previous_work.length > 0) {
          for (const prevWork of extractedInfo.person.previous_work) {
            // Find or create organization
            let org = await db.organization.findFirst({
              where: {
                name: {
                  contains: prevWork.organization
                }
              }
            })

            if (!org) {
              org = await db.organization.create({
                data: {
                  name: prevWork.organization
                }
              })
            }

            // Check if previous role already exists
            const existingPrevRole = await db.previousRole.findFirst({
              where: {
                personId: storedPerson.id,
                organizationId: org.id
              }
            })

            if (!existingPrevRole) {
              await db.previousRole.create({
                data: {
                  title: "Previous role", // Generic title since not specified
                  personId: storedPerson.id,
                  organizationId: org.id,
                  endDate: new Date() // Assume ended now
                }
              })
            }
          }
        }

        // Handle social media handles
        if (extractedInfo.person.social_media && extractedInfo.person.social_media.length > 0) {
          for (const social of extractedInfo.person.social_media) {
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
                  handle: social.handle.replace('@', ''), // Remove @ if present
                  personId: storedPerson.id
                }
              })
            }
          }
        }
      }

      // Create interaction record
      if (extractedInfo.interaction_summary && storedPerson) {
        let interactionDate = new Date() // Default to current date
        
        if (extractedInfo.date_mentioned) {
          // Try to parse the date, but fall back to current date if invalid
          const parsedDate = new Date(extractedInfo.date_mentioned)
          if (!isNaN(parsedDate.getTime())) {
            interactionDate = parsedDate
          }
        }

        // Generate snippet from original text (up to 200 characters)
        const snippet = text.length > 200 ? text.substring(0, 200) + '...' : text

        storedInteraction = await db.interaction.create({
          data: {
            summary: extractedInfo.interaction_summary,
            date: interactionDate,
            personId: storedPerson.id,
            fullText: text, // Store the full original input text
            snippet: snippet // Store the snippet for display
          }
        })
      }

    } catch (dbError) {
      console.error('Database storage error:', dbError)
      // Continue with response even if database storage fails
    }

    return NextResponse.json({
      success: true,
      data: extractedInfo,
      storedPerson: storedPerson,
      storedInteraction: storedInteraction,
      message: 'Information extracted and stored successfully'
    })

  } catch (error) {
    console.error('Error in information ingestion:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}