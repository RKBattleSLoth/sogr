"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Mail, 
  MessageCircle, 
  Share2, 
  Upload, 
  FileText, 
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react"

interface ImportStatus {
  type: 'email' | 'messages' | 'social'
  status: 'idle' | 'processing' | 'success' | 'error'
  message?: string
  progress?: number
  itemsProcessed?: number
  totalItems?: number
}

interface ImportData {
  emails?: Array<{
    subject: string
    from: string
    body: string
    date: string
  }>
  messages?: Array<{
    platform: string
    sender: string
    content: string
    timestamp: string
    isGroupChat?: boolean
    groupName?: string
  }>
  social?: Array<{
    platform: string
    username: string
    content: string
    timestamp: string
    url?: string
  }>
}

export function ImportDashboard() {
  const [importStatus, setImportStatus] = useState<ImportStatus[]>([
    { type: 'email', status: 'idle' },
    { type: 'messages', status: 'idle' },
    { type: 'social', status: 'idle' }
  ])
  
  const [rawData, setRawData] = useState({
    email: '',
    messages: '',
    social: ''
  })

  const updateImportStatus = useCallback((type: 'email' | 'messages' | 'social', updates: Partial<ImportStatus>) => {
    setImportStatus(prev => 
      prev.map(status => 
        status.type === type ? { ...status, ...updates } : status
      )
    )
  }, [])

  const parseJSONData = (text: string): any[] => {
    try {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return []
    }
  }

  const handleEmailImport = async () => {
    if (!rawData.email.trim()) return

    updateImportStatus('email', { status: 'processing', message: 'Processing emails...' })
    
    try {
      const emailData = parseJSONData(rawData.email)
      
      if (emailData.length === 0) {
        throw new Error('No valid email data found')
      }

      const response = await fetch('/api/import/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailData })
      })

      if (!response.ok) {
        throw new Error('Failed to process emails')
      }

      const result = await response.json()
      updateImportStatus('email', { 
        status: 'success', 
        message: `Successfully processed ${emailData.length} emails`,
        itemsProcessed: emailData.length,
        totalItems: emailData.length
      })
    } catch (error) {
      updateImportStatus('email', { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to process emails'
      })
    }
  }

  const handleMessagesImport = async () => {
    if (!rawData.messages.trim()) return

    updateImportStatus('messages', { status: 'processing', message: 'Processing messages...' })
    
    try {
      const messageData = parseJSONData(rawData.messages)
      
      if (messageData.length === 0) {
        throw new Error('No valid message data found')
      }

      const response = await fetch('/api/import/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messageData })
      })

      if (!response.ok) {
        throw new Error('Failed to process messages')
      }

      const result = await response.json()
      updateImportStatus('messages', { 
        status: 'success', 
        message: `Successfully processed ${messageData.length} messages`,
        itemsProcessed: messageData.length,
        totalItems: messageData.length
      })
    } catch (error) {
      updateImportStatus('messages', { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to process messages'
      })
    }
  }

  const handleSocialImport = async () => {
    if (!rawData.social.trim()) return

    updateImportStatus('social', { status: 'processing', message: 'Processing social media data...' })
    
    try {
      const socialData = parseJSONData(rawData.social)
      
      if (socialData.length === 0) {
        throw new Error('No valid social media data found')
      }

      const response = await fetch('/api/import/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: socialData })
      })

      if (!response.ok) {
        throw new Error('Failed to process social media data')
      }

      const result = await response.json()
      updateImportStatus('social', { 
        status: 'success', 
        message: `Successfully processed ${socialData.length} posts`,
        itemsProcessed: socialData.length,
        totalItems: socialData.length
      })
    } catch (error) {
      updateImportStatus('social', { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to process social media data'
      })
    }
  }

  const getStatusIcon = (status: ImportStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Upload className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: ImportStatus['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'processing':
        return 'bg-blue-500'
      default:
        return 'bg-muted'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Upload className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Import Data</h2>
        <Badge variant="outline">AI-Powered</Badge>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span>Messages</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center space-x-2">
            <Share2 className="h-4 w-4" />
            <span>Social Media</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Import Email Data</span>
              </CardTitle>
              <CardDescription>
                Paste email data in JSON format to extract social information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Expected format:</p>
                <pre className="bg-muted p-2 rounded mt-1 text-xs">
{`[
  {
    "subject": "Meeting Follow-up",
    "from": "john@example.com",
    "body": "Great meeting today! Looking forward to our collaboration...",
    "date": "2024-01-15T10:30:00Z"
  }
]`}
                </pre>
              </div>
              
              <Textarea
                placeholder="Paste your email JSON data here..."
                value={rawData.email}
                onChange={(e) => setRawData(prev => ({ ...prev, email: e.target.value }))}
                className="min-h-32 font-mono text-sm"
              />
              
              <Button 
                onClick={handleEmailImport}
                disabled={!rawData.email.trim() || importStatus.find(s => s.type === 'email')?.status === 'processing'}
                className="w-full"
              >
                Import Emails
              </Button>

              {importStatus.find(s => s.type === 'email')?.message && (
                <Alert>
                  <AlertDescription className="flex items-center space-x-2">
                    {getStatusIcon(importStatus.find(s => s.type === 'email')?.status || 'idle')}
                    <span>{importStatus.find(s => s.type === 'email')?.message}</span>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Import Message Data</span>
              </CardTitle>
              <CardDescription>
                Paste message data from WhatsApp, Telegram, Signal, or other messaging platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Expected format:</p>
                <pre className="bg-muted p-2 rounded mt-1 text-xs">
{`[
  {
    "platform": "whatsapp",
    "sender": "John Doe",
    "content": "Hey! Are we still meeting tomorrow?",
    "timestamp": "2024-01-15T14:30:00Z",
    "isGroupChat": false
  }
]`}
                </pre>
              </div>
              
              <Textarea
                placeholder="Paste your message JSON data here..."
                value={rawData.messages}
                onChange={(e) => setRawData(prev => ({ ...prev, messages: e.target.value }))}
                className="min-h-32 font-mono text-sm"
              />
              
              <Button 
                onClick={handleMessagesImport}
                disabled={!rawData.messages.trim() || importStatus.find(s => s.type === 'messages')?.status === 'processing'}
                className="w-full"
              >
                Import Messages
              </Button>

              {importStatus.find(s => s.type === 'messages')?.message && (
                <Alert>
                  <AlertDescription className="flex items-center space-x-2">
                    {getStatusIcon(importStatus.find(s => s.type === 'messages')?.status || 'idle')}
                    <span>{importStatus.find(s => s.type === 'messages')?.message}</span>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Share2 className="h-5 w-5" />
                <span>Import Social Media Data</span>
              </CardTitle>
              <CardDescription>
                Import data from Twitter, LinkedIn, Instagram, or other social media platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>Expected format:</p>
                <pre className="bg-muted p-2 rounded mt-1 text-xs">
{`[
  {
    "platform": "twitter",
    "username": "johndoe",
    "content": "Excited to join @company as their new CTO! #newjob",
    "timestamp": "2024-01-15T16:30:00Z",
    "url": "https://twitter.com/johndoe/status/123456789"
  }
]`}
                </pre>
              </div>
              
              <Textarea
                placeholder="Paste your social media JSON data here..."
                value={rawData.social}
                onChange={(e) => setRawData(prev => ({ ...prev, social: e.target.value }))}
                className="min-h-32 font-mono text-sm"
              />
              
              <Button 
                onClick={handleSocialImport}
                disabled={!rawData.social.trim() || importStatus.find(s => s.type === 'social')?.status === 'processing'}
                className="w-full"
              >
                Import Social Media
              </Button>

              {importStatus.find(s => s.type === 'social')?.message && (
                <Alert>
                  <AlertDescription className="flex items-center space-x-2">
                    {getStatusIcon(importStatus.find(s => s.type === 'social')?.status || 'idle')}
                    <span>{importStatus.find(s => s.type === 'social')?.message}</span>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Import Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {importStatus.map((status) => (
              <div key={status.type} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`}></div>
                  <div className="flex items-center space-x-2">
                    {status.type === 'email' && <Mail className="h-4 w-4" />}
                    {status.type === 'messages' && <MessageCircle className="h-4 w-4" />}
                    {status.type === 'social' && <Share2 className="h-4 w-4" />}
                    <span className="capitalize font-medium">{status.type}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {status.itemsProcessed && status.totalItems && (
                    <span className="text-sm text-muted-foreground">
                      {status.itemsProcessed}/{status.totalItems}
                    </span>
                  )}
                  {getStatusIcon(status.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}