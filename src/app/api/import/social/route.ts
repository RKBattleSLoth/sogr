import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

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

export async function POST(request: NextRequest) {
  try {
    const { posts }: { posts: SocialMediaData[] } = await request.json()
    
    if (!posts || !Array.isArray(posts)) {
      return NextResponse.json(
        { error: 'Posts array is required' },
        { status: 400 }
      )
    }

    // Initialize ZAI SDK
    const zai = await ZAI.create()

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

      // Call the LLM for social media processing
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an expert at extracting social and professional information from social media posts.'
          },
          {
            role: 'user',
            content: socialPrompt
          }
        ],
        temperature: 0.1,
      })

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

    // TODO: Store the extracted information in the database
    // This would involve creating/updating Person, Organization, Interaction, and Relationship records

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