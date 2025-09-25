"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Mail, 
  MessageCircle, 
  Share2, 
  Wifi, 
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Settings,
  Users,
  Database
} from "lucide-react"
import { ExternalConnection, ImportProgress, SyncResult } from "@/lib/services/types"

interface ConnectionDashboardProps {
  onConnectionChange?: (connection: ExternalConnection) => void
}

export function ConnectionDashboard({ onConnectionChange }: ConnectionDashboardProps) {
  const [connections, setConnections] = useState<ExternalConnection[]>([])
  const [syncing, setSyncing] = useState<string[]>([])
  const [progress, setProgress] = useState<Map<string, ImportProgress>>(new Map())
  const [syncResults, setSyncResults] = useState<Map<string, SyncResult>>(new Map())

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/connections')
      const data = await response.json()
      setConnections(data.connections || [])
    } catch (error) {
      console.error('Failed to load connections:', error)
    }
  }

  const handleConnect = async (connectionId: string) => {
    try {
      // For demo purposes, we'll simulate OAuth flow
      // In a real app, this would redirect to the OAuth provider
      const mockAccessToken = `mock_token_${connectionId}_${Date.now()}`
      
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId, accessToken: mockAccessToken })
      })

      if (!response.ok) {
        throw new Error('Failed to connect')
      }

      const data = await response.json()
      if (data.success) {
        await loadConnections()
        onConnectionChange?.(data.connection)
      }
    } catch (error) {
      console.error('Failed to connect:', error)
      alert('Failed to connect to service. Please try again.')
    }
  }

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      await loadConnections()
    } catch (error) {
      console.error('Failed to disconnect:', error)
      alert('Failed to disconnect from service. Please try again.')
    }
  }

  const handleSync = async (connectionId: string) => {
    try {
      setSyncing(prev => [...prev, connectionId])
      
      // Set up progress listener
      const progressCallback = (progress: ImportProgress) => {
        setProgress(prev => new Map(prev).set(connectionId, progress))
      }

      // In a real app, you'd set up a WebSocket or Server-Sent Events for progress
      // For now, we'll simulate progress updates
      simulateProgress(connectionId, progressCallback)

      const response = await fetch(`/api/connections/${connectionId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: `mock_token_${connectionId}` })
      })

      const result = await response.json()
      setSyncResults(prev => new Map(prev).set(connectionId, result))
      
      // Update connection with new data
      await loadConnections()
    } catch (error) {
      console.error('Failed to sync:', error)
      alert('Failed to sync connection. Please try again.')
    } finally {
      setSyncing(prev => prev.filter(id => id !== connectionId))
    }
  }

  const simulateProgress = (connectionId: string, callback: (progress: ImportProgress) => void) => {
    const steps = [
      { status: 'syncing', message: 'Connecting to service...', progress: 0 },
      { status: 'syncing', message: 'Fetching messages...', progress: 20 },
      { status: 'syncing', message: 'Processing data...', progress: 50 },
      { status: 'syncing', message: 'Extracting social information...', progress: 80 },
      { status: 'completed', message: 'Sync completed!', progress: 100 }
    ]

    steps.forEach((step, index) => {
      setTimeout(() => {
        callback({
          connectionId,
          status: step.status as any,
          progress: step.progress,
          total: 100,
          message: step.message,
          startTime: new Date(),
        })
      }, index * 1000)
    })
  }

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'gmail':
      case 'outlook':
        return <Mail className="h-5 w-5" />
      case 'whatsapp':
      case 'telegram':
        return <MessageCircle className="h-5 w-5" />
      case 'twitter':
      case 'linkedin':
        return <Share2 className="h-5 w-5" />
      default:
        return <Database className="h-5 w-5" />
    }
  }

  const getStatusColor = (isConnected: boolean, isSyncing: boolean) => {
    if (isSyncing) return 'bg-blue-500'
    if (isConnected) return 'bg-green-500'
    return 'bg-gray-500'
  }

  const getStatusText = (isConnected: boolean, isSyncing: boolean) => {
    if (isSyncing) return 'Syncing'
    if (isConnected) return 'Connected'
    return 'Disconnected'
  }

  const getProgressData = (connectionId: string) => {
    return progress.get(connectionId)
  }

  const getSyncResult = (connectionId: string) => {
    return syncResults.get(connectionId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Wifi className="h-5 w-5" />
        <h2 className="text-xl font-semibold">External Connections</h2>
        <Badge variant="outline">Real-time Sync</Badge>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Services</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((connection) => {
              const isSyncing = syncing.includes(connection.id)
              const progressData = getProgressData(connection.id)
              const syncResult = getSyncResult(connection.id)

              return (
                <Card key={connection.id} className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getConnectionIcon(connection.type)}
                        <CardTitle className="text-lg">{connection.name}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(connection.isConnected, isSyncing)}`}></div>
                        <span className="text-xs text-muted-foreground">
                          {getStatusText(connection.isConnected, isSyncing)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={connection.isConnected ? "default" : "secondary"}>
                          {connection.isConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                      
                      {connection.lastSync && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Sync</span>
                          <span>{new Date(connection.lastSync).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {connection.totalItems !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total Items</span>
                          <span>{connection.totalItems.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {progressData && progressData.status === 'syncing' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{progressData.message}</span>
                          <span>{progressData.progress}%</span>
                        </div>
                        <Progress value={progressData.progress} className="h-2" />
                      </div>
                    )}

                    {syncResult && (
                      <Alert>
                        <AlertDescription className="text-xs">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Processed:</span>
                              <span>{syncResult.processed}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>New Items:</span>
                              <span>{syncResult.newItems}</span>
                            </div>
                            {syncResult.errors.length > 0 && (
                              <div className="text-red-500">
                                {syncResult.errors.length} errors
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex space-x-2">
                      {connection.isConnected ? (
                        <>
                          <Button
                            onClick={() => handleSync(connection.id)}
                            disabled={isSyncing}
                            size="sm"
                            className="flex-1"
                          >
                            {isSyncing ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                            <span className="ml-2">Sync</span>
                          </Button>
                          <Button
                            onClick={() => handleDisconnect(connection.id)}
                            disabled={isSyncing}
                            variant="outline"
                            size="sm"
                          >
                            <WifiOff className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => handleConnect(connection.id)}
                          size="sm"
                          className="flex-1"
                        >
                          <Wifi className="h-4 w-4" />
                          <span className="ml-2">Connect</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections
              .filter(conn => conn.type === 'gmail' || conn.type === 'outlook')
              .map((connection) => {
                const isSyncing = syncing.includes(connection.id)
                const progressData = getProgressData(connection.id)

                return (
                  <Card key={connection.id} className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        {getConnectionIcon(connection.type)}
                        <CardTitle>{connection.name}</CardTitle>
                        <Badge variant={connection.isConnected ? "default" : "secondary"}>
                          {connection.isConnected ? "Connected" : "Not Connected"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Import emails and extract social information from your {connection.name} account.
                      </p>
                      
                      {progressData && progressData.status === 'syncing' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{progressData.message}</span>
                            <span>{progressData.progress}%</span>
                          </div>
                          <Progress value={progressData.progress} className="h-2" />
                        </div>
                      )}

                      <Button
                        onClick={() => connection.isConnected ? handleSync(connection.id) : handleConnect(connection.id)}
                        disabled={isSyncing}
                        className="w-full"
                      >
                        {connection.isConnected ? "Sync Now" : "Connect Account"}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>

        <TabsContent value="messaging" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections
              .filter(conn => conn.type === 'whatsapp' || conn.type === 'telegram')
              .map((connection) => (
                <Card key={connection.id} className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      {getConnectionIcon(connection.type)}
                      <CardTitle>{connection.name}</CardTitle>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Import messages from {connection.name} to extract social connections and conversations.
                    </p>
                    <Button disabled className="w-full mt-4">
                      Not Available Yet
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections
              .filter(conn => conn.type === 'twitter' || conn.type === 'linkedin')
              .map((connection) => (
                <Card key={connection.id} className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
                  <CardHeader>
                    <div className="flex items-center space-x-2">
                      {getConnectionIcon(connection.type)}
                      <CardTitle>{connection.name}</CardTitle>
                      <Badge variant="outline">Coming Soon</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Import connections and posts from {connection.name} to build your social graph.
                    </p>
                    <Button disabled className="w-full mt-4">
                      Not Available Yet
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Sync Overview */}
      <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Sync Overview</CardTitle>
          <CardDescription>Recent sync activities across all connected services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from(syncResults.values()).map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <span className="font-medium">
                      {connections.find(c => c.id === result.connectionId)?.name || 'Unknown Service'}
                    </span>
                    <div className="text-sm text-muted-foreground">
                      {result.processed} items processed • {result.newItems} new items
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500 inline" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 inline" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(result.duration / 1000)}s
                  </div>
                </div>
              </div>
            ))}
            
            {syncResults.size === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No sync activities yet. Connect a service and start syncing!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}