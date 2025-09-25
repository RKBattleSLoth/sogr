import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'

// Helper functions to detect edit commands vs real interactions
function isEditCommand(text: string): boolean {
  const editIndicators = [
    'update', 'change', 'correct', 'modify', 'actually', 'correction',
    'edit', 'fix', 'adjust', 'revise', 'amend'
  ]
  const lowerText = text.toLowerCase()
  return editIndicators.some(indicator => lowerText.includes(indicator))
}

function isRealInteraction(text: string): boolean {
  const interactionIndicators = [
    'met', 'spoke', 'talked', 'saw', 'ran into', 'bumped into',
    'introduced', 'connected', 'chatted', 'discussed', 'conversation'
  ]
  const lowerText = text.toLowerCase()
  return interactionIndicators.some(indicator => lowerText.includes(indicator))
}

function parseName(name: string): { firstName: string; lastName: string; middleNames: string[]; nicknames: string[] } {
  // Clean the name - remove extra spaces and normalize
  const cleanName = name.trim().replace(/\s+/g, ' ');
  
  if (cleanName.length === 0) {
    return { firstName: '', lastName: '', middleNames: [], nicknames: [] }
  }
  
  // Handle simple case first
  if (!cleanName.includes(' ')) {
    return { firstName: cleanName, lastName: '', middleNames: [], nicknames: [] }
  }
  
  // Extract nicknames first (in quotes or parentheses)
  let nicknames: string[] = []
  let nameWithoutNicknames = cleanName
  
  // Match patterns like "John 'Johnny' Doe" or "John (Johnny) Doe"
  const nicknamePatterns = [
    /(['"])(.*?)\1/g,  // Single or double quotes
    /\(([^)]+)\)/g     // Parentheses
  ]
  
  for (const pattern of nicknamePatterns) {
    let match
    while ((match = pattern.exec(cleanName)) !== null) {
      const nickname = match[2] || match[1]
      if (nickname && !nicknames.includes(nickname)) {
        nicknames.push(nickname.trim())
      }
    }
  }
  
  // Remove nicknames from the name for further processing
  nameWithoutNicknames = cleanName
    .replace(/(['"])(.*?)\1/g, '')  // Remove quoted nicknames
    .replace(/\(([^)]+)\)/g, '')     // Remove parenthesized nicknames
    .replace(/\s+/g, ' ').trim()     // Clean up spaces
  
  // Handle prefixes and suffixes
  const prefixes = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof', 'Sir', 'Lady', 'Hon', 'Rev']
  const suffixes = ['Jr', 'Sr', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  
  let nameParts = nameWithoutNicknames.split(' ')
  
  // Remove prefixes
  while (nameParts.length > 1 && prefixes.includes(nameParts[0].replace(/[.]/g, ''))) {
    nameParts = nameParts.slice(1)
  }
  
  // Remove suffixes
  while (nameParts.length > 1 && suffixes.includes(nameParts[nameParts.length - 1].replace(/[.]/g, ''))) {
    nameParts = nameParts.slice(0, -1)
  }
  
  if (nameParts.length === 0) {
    return { firstName: cleanName, lastName: '', middleNames: [], nicknames }
  }
  
  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: '', middleNames: [], nicknames }
  }
  
  // Assume last part is last name, first part is first name, middle is everything else
  const firstName = nameParts[0]
  const lastName = nameParts[nameParts.length - 1]
  const middleNames = nameParts.slice(1, -1)
  
  return {
    firstName,
    lastName,
    middleNames,
    nicknames
  }
}

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

// Interface for the intent analysis result
interface IntentAnalysis {
  intent: 'add' | 'edit' | 'update' | 'create'
  target_person?: string
  confidence: number
  reasoning: string
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

    // First, analyze the intent of the user input
    const intentPrompt = `
Analyze the following text to determine if the user wants to ADD new information or EDIT/UPDATE existing information.

Consider these indicators:
ADD intent: 
- First-time mentions ("I met...", "Today I...", "Just spoke with...", "New contact...")
- Describing new interactions
- No reference to existing records

EDIT/UPDATE intent:
- Words like "update", "change", "correct", "modify"
- References to existing information ("Felix's new job...", "Sarah moved to...")
- Corrections or updates to previously known information
- Phrases like "Actually,...", "Correction:", "I should update that..."

Output your analysis in this JSON format:
{
  "intent": "add" or "edit",
  "target_person": "Name of the person if mentioned, otherwise null",
  "confidence": 0.0 to 1.0,
  "reasoning": "Brief explanation of your decision"
}

Examples:
Input: "I met John today, he's the new CTO at TechCorp"
Output: {"intent": "add", "target_person": "John", "confidence": 0.95, "reasoning": "First-time meeting with new person"}

Input: "Update Felix's information, he's no longer at Think Foundation, he moved to Proof"
Output: {"intent": "edit", "target_person": "Felix", "confidence": 0.9, "reasoning": "Explicit update request for existing person"}

Input: "Actually, Sarah's title is Senior CTO, not just CTO"
Output: {"intent": "edit", "target_person": "Sarah", "confidence": 0.85, "reasoning": "Correction to existing information"}

Now analyze this input: "${text}"

Your response must be ONLY the valid JSON object, with no preceding or trailing text.
`

    // Call the LLM for intent analysis
    const intentCompletion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing user intent in natural language text.'
        },
        {
          role: 'user',
          content: intentPrompt
        }
      ],
      temperature: 0.1,
    })

    const intentContent = intentCompletion.choices[0]?.message?.content
    
    if (!intentContent) {
      throw new Error('No response from intent analysis LLM')
    }

    // Parse the intent analysis
    let intentAnalysis: IntentAnalysis
    try {
      let cleanContent = intentContent.trim()
      
      // Remove markdown code block formatting if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/, '').replace(/\n?```$/, '')
      }
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanContent = jsonMatch[0]
      }
      
      intentAnalysis = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse intent analysis:', intentContent)
      throw new Error('Failed to analyze intent')
    }

    // Now extract the structured information
    const extractionPrompt = `
You are an expert information extraction assistant. Your task is to analyze the following text and extract specific pieces of information about people and their affiliations.

IMPORTANT: If this appears to be an edit/update command (e.g., "update", "change", "correct", "modify"), focus on extracting the specific factual information being updated, not the edit command itself.

Identify and extract:
1. Person names
2. Organization names
3. Job titles
4. Social media handles (specifying platforms like Twitter, LinkedIn, etc.)
5. Dates mentioned
6. Relationships (e.g., "is the [job title] of [organization]", "used to work at [organization]", "has a [platform] handle [handle]")

For the interaction_summary, create a meaningful summary ONLY if this describes a real social interaction. If it's an edit/update command, set interaction_summary to null or a brief description of what was updated.

Output the information in the following JSON format:
{
  "interaction_summary": "Brief summary of the interaction OR null if this is an edit command",
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

Input: "Update Mikey's role at Think, he's now a Story Samurai"
Output: {
  "interaction_summary": null,
  "person": {
    "name": "Mikey",
    "current_role": {
      "title": "Story Samurai",
      "organization": "Think"
    }
  }
}

Now process this input: "${text}"

Your response must be ONLY the valid JSON object, with no preceding or trailing text.
`

    // Call the LLM for information extraction
    const extractionCompletion = await zai.chat.completions.create({
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
      temperature: 0.1,
    })

    const extractionContent = extractionCompletion.choices[0]?.message?.content
    
    if (!extractionContent) {
      throw new Error('No response from extraction LLM')
    }

    // Parse the extraction result
    let extractedInfo: ExtractedInfo
    try {
      let cleanContent = extractionContent.trim()
      
      // Remove markdown code block formatting if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/```json\n?/, '').replace(/\n?```$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/```\n?/, '').replace(/\n?```$/, '')
      }
      
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanContent = jsonMatch[0]
      }
      
      extractedInfo = JSON.parse(cleanContent)
    } catch (parseError) {
      console.error('Failed to parse extraction:', extractionContent)
      throw new Error('Failed to extract information')
    }

    // Process based on intent
    let result = {
      intent: intentAnalysis.intent,
      action: 'created',
      storedPerson: null as any,
      storedInteraction: null as any,
      updatedFields: [] as string[]
    }

    if (intentAnalysis.intent === 'edit' && intentAnalysis.target_person && extractedInfo.person) {
      // EDIT/UPDATE logic
      const targetPersonName = intentAnalysis.target_person.toLowerCase()
      
      // Find the existing person - use more intelligent matching
      const existingPerson = await db.person.findFirst({
        where: {
          OR: [
            {
              name: {
                contains: targetPersonName
              }
            },
            {
              firstName: {
                contains: targetPersonName
              }
            },
            {
              lastName: {
                contains: targetPersonName
              }
            }
          ]
        },
        orderBy: [
          // Prefer names that are more complete (have first and last names)
          {
            firstName: {
              sort: 'desc'
            }
          },
          {
            lastName: {
              sort: 'desc'
            }
          }
        ],
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
          socialMediaHandles: true
        }
      })

      if (existingPerson) {
        // Only update fields that are explicitly mentioned in the edit
        const updateData: any = {}
        
        // IMPORTANT: Always preserve existing name components unless explicitly changed
        updateData.firstName = existingPerson.firstName
        updateData.lastName = existingPerson.lastName
        updateData.middleNames = existingPerson.middleNames
        updateData.nicknames = existingPerson.nicknames
        updateData.name = existingPerson.name
        
        // Only update name components if a new name is explicitly provided and different
        if (extractedInfo.person.name && extractedInfo.person.name !== existingPerson.name) {
          const parsedName = parseName(extractedInfo.person.name)
          // Only update individual components if they exist in the new name
          if (parsedName.firstName) {
            updateData.firstName = parsedName.firstName
          }
          if (parsedName.lastName) {
            updateData.lastName = parsedName.lastName
          }
          if (parsedName.middleNames.length > 0) {
            updateData.middleNames = JSON.stringify(parsedName.middleNames)
          }
          if (parsedName.nicknames.length > 0) {
            updateData.nicknames = JSON.stringify(parsedName.nicknames)
          }
          updateData.name = extractedInfo.person.name
          result.updatedFields.push('name')
        }
        
        // Apply the person updates if there are any
        if (Object.keys(updateData).length > 0) {
          await db.person.update({
            where: { id: existingPerson.id },
            data: updateData
          })
        }
        
        // Update current role if provided
        if (extractedInfo.person.current_role) {
          // Find or create the organization first
          let organization = await db.organization.findFirst({
            where: {
              name: {
                contains: extractedInfo.person.current_role.organization
              }
            }
          })

          if (!organization) {
            // Create organization if it doesn't exist
            organization = await db.organization.create({
              data: {
                name: extractedInfo.person.current_role.organization
              }
            })
          }

          // Check if there's already a current role for a DIFFERENT organization
          const existingCurrentRoles = await db.currentRole.findMany({
            where: {
              personId: existingPerson.id
            },
            include: {
              organization: true
            }
          })

          // If there are existing current roles for different organizations, move them to previous roles
          for (const existingRole of existingCurrentRoles) {
            if (existingRole.organizationId !== organization.id) {
              // Move to previous roles
              await db.previousRole.create({
                data: {
                  title: existingRole.title,
                  personId: existingPerson.id,
                  organizationId: existingRole.organizationId,
                  startDate: existingRole.startDate,
                  endDate: new Date()
                }
              })
              
              // Delete the current role
              await db.currentRole.delete({
                where: { id: existingRole.id }
              })
              
              result.updatedFields.push('previous_role')
            }
          }

          // Now check if current role exists for the new organization
          const existingCurrentRole = await db.currentRole.findFirst({
            where: {
              personId: existingPerson.id,
              organizationId: organization.id
            }
          })

          if (existingCurrentRole) {
            // Update existing role - preserve the organization relationship
            await db.currentRole.update({
              where: { id: existingCurrentRole.id },
              data: {
                title: extractedInfo.person.current_role.title,
                // Ensure organizationId is preserved/set correctly
                organizationId: organization.id
              }
            })
            result.updatedFields.push('current_role')
          } else {
            // Create new current role with proper organization relationship
            await db.currentRole.create({
              data: {
                title: extractedInfo.person.current_role.title,
                personId: existingPerson.id,
                organizationId: organization.id,
                startDate: new Date()
              }
            })
            result.updatedFields.push('current_role')
          }
        }

        // Update social media handles if provided
        if (extractedInfo.person.social_media && extractedInfo.person.social_media.length > 0) {
          for (const social of extractedInfo.person.social_media) {
            const existingHandle = await db.socialMediaHandle.findFirst({
              where: {
                personId: existingPerson.id,
                platform: social.platform
              }
            })

            if (existingHandle) {
              // Update existing handle
              await db.socialMediaHandle.update({
                where: { id: existingHandle.id },
                data: {
                  handle: social.handle.replace('@', '')
                }
              })
              result.updatedFields.push('social_media')
            } else {
              // Create new handle
              await db.socialMediaHandle.create({
                data: {
                  platform: social.platform,
                  handle: social.handle.replace('@', ''),
                  personId: existingPerson.id
                }
              })
              result.updatedFields.push('social_media')
            }
          }
        }

        // Create or update interaction - BUT only for actual interactions, not edit commands
        if (extractedInfo.interaction_summary && !isEditCommand(text)) {
          const snippet = text.length > 200 ? text.substring(0, 200) + '...' : text
          
          // For edit operations, we typically don't want to log them as interactions
          // Only create interaction if this seems like a real interaction, not just an edit command
          if (isRealInteraction(text)) {
            // Validate the interaction summary - it should be meaningful
            const validSummary = extractedInfo.interaction_summary && 
                               extractedInfo.interaction_summary.length > 3 && 
                               !extractedInfo.interaction_summary.includes('at') && // Avoid incomplete phrases
                               extractedInfo.interaction_summary !== 'null'
            
            if (validSummary) {
              const newInteraction = await db.interaction.create({
                data: {
                  summary: extractedInfo.interaction_summary,
                  date: extractedInfo.date_mentioned ? new Date(extractedInfo.date_mentioned) : new Date(),
                  personId: existingPerson.id,
                  fullText: text,
                  snippet: snippet,
                  context: "Natural interaction"
                }
              })
              result.storedInteraction = newInteraction
              result.updatedFields.push('interaction')
            }
          }
        }
        
        // Re-fetch the person with all relationships included after updates
        const updatedPersonWithRelations = await db.person.findUnique({
          where: { id: existingPerson.id },
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
            socialMediaHandles: true
          }
        })

        result.storedPerson = updatedPersonWithRelations || existingPerson

        result.action = 'updated'
      } else {
        // Person not found, treat as add
        result.intent = 'add'
      }
    }

    // If intent is add or person not found for edit, create new records
    if (intentAnalysis.intent === 'add' || !result.storedPerson) {
      // Check if person already exists - use intelligent matching
      const existingPerson = extractedInfo.person ? await db.person.findFirst({
        where: {
          OR: [
            {
              name: {
                contains: extractedInfo.person.name
              }
            },
            {
              firstName: {
                contains: extractedInfo.person.name
              }
            },
            {
              lastName: {
                contains: extractedInfo.person.name
              }
            }
          ]
        },
        orderBy: [
          {
            firstName: {
              sort: 'desc'
            }
          },
          {
            lastName: {
              sort: 'desc'
            }
          }
        ]
      }) : null

      let storedPerson = null

      if (extractedInfo.person) {
        if (existingPerson) {
          storedPerson = existingPerson
        } else {
          // Create new person with enhanced name information
          const parsedName = parseName(extractedInfo.person.name)
          
          // IMPORTANT: Use the original name as provided, don't modify it
          storedPerson = await db.person.create({
            data: {
              name: extractedInfo.person.name,  // Keep original name exactly as provided
              firstName: parsedName.firstName || null,
              lastName: parsedName.lastName || null,
              middleNames: parsedName.middleNames.length > 0 ? JSON.stringify(parsedName.middleNames) : null,
              nicknames: parsedName.nicknames.length > 0 ? JSON.stringify(parsedName.nicknames) : null,
              bio: extractedInfo.person.current_role ? 
                `${extractedInfo.person.current_role.title} at ${extractedInfo.person.current_role.organization}` : 
                undefined
            }
          })
        }

        // Handle current role
        if (extractedInfo.person.current_role && storedPerson) {
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
                startDate: new Date()
              }
            })
          }
        }

        // Handle previous work
        if (extractedInfo.person.previous_work && extractedInfo.person.previous_work.length > 0 && storedPerson) {
          for (const prevWork of extractedInfo.person.previous_work) {
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

            const existingPrevRole = await db.previousRole.findFirst({
              where: {
                personId: storedPerson.id,
                organizationId: org.id
              }
            })

            if (!existingPrevRole) {
              await db.previousRole.create({
                data: {
                  title: "Previous role",
                  personId: storedPerson.id,
                  organizationId: org.id,
                  endDate: new Date()
                }
              })
            }
          }
        }

        // Handle social media handles
        if (extractedInfo.person.social_media && extractedInfo.person.social_media.length > 0 && storedPerson) {
          for (const social of extractedInfo.person.social_media) {
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
      }

      // Create interaction record
      if (extractedInfo.interaction_summary && storedPerson) {
        let interactionDate = new Date()
        
        if (extractedInfo.date_mentioned) {
          const parsedDate = new Date(extractedInfo.date_mentioned)
          if (!isNaN(parsedDate.getTime())) {
            interactionDate = parsedDate
          }
        }

        const snippet = text.length > 200 ? text.substring(0, 200) + '...' : text

        const storedInteraction = await db.interaction.create({
          data: {
            summary: extractedInfo.interaction_summary,
            date: interactionDate,
            personId: storedPerson.id,
            fullText: text,
            snippet: snippet
          }
        })

        result.storedInteraction = storedInteraction
      }

      // Re-fetch the person with all relationships included
      const personWithRelations = await db.person.findUnique({
        where: { id: storedPerson.id },
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
          socialMediaHandles: true
        }
      })

      result.storedPerson = personWithRelations || storedPerson
      result.action = 'created'
    }

    return NextResponse.json({
      success: true,
      intent: intentAnalysis.intent,
      action: result.action,
      data: extractedInfo,
      storedPerson: result.storedPerson,
      storedInteraction: result.storedInteraction,
      updatedFields: result.updatedFields,
      message: `Information ${result.action} successfully`
    })

  } catch (error) {
    console.error('Error in smart information processing:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}