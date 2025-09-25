import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

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

export async function POST(request: NextRequest) {
  try {
    const { emails }: { emails: EmailData[] } = await request.json()
    
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json(
        { error: 'Emails array is required' },
        { status: 400 }
      )
    }

    // Initialize ZAI SDK
    const zai = await ZAI.create()

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

      // Call the LLM for email processing
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting social and professional information from emails.'
          },
          {
            role: 'user',
            content: emailPrompt
          }
        ],
        temperature: 0.1,
      })

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

    // TODO: Store the extracted information in the database
    // This would involve creating/updating Person, Organization, and Interaction records

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