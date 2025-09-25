import { NextRequest, NextResponse } from 'next/server'
import { externalConnectionService } from '@/lib/services/external-connections'

export async function GET() {
  try {
    const connections = externalConnectionService.getConnections()
    return NextResponse.json({ connections })
  } catch (error) {
    console.error('Error getting connections:', error)
    return NextResponse.json(
      { error: 'Failed to get connections' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { connectionId, accessToken } = await request.json()
    
    if (!connectionId || !accessToken) {
      return NextResponse.json(
        { error: 'Connection ID and access token are required' },
        { status: 400 }
      )
    }

    const success = await externalConnectionService.connectConnection(connectionId, accessToken)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to connect to service' },
        { status: 400 }
      )
    }

    const connection = externalConnectionService.getConnection(connectionId)
    return NextResponse.json({ 
      success: true, 
      connection 
    })
  } catch (error) {
    console.error('Error connecting to service:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to service',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}