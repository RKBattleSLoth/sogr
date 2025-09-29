"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Database, 
  Users, 
  Building2, 
  MessageSquare, 
  RefreshCw, 
  Trash2, 
  Download, 
  Upload,
  Search,
  Copy,
  CheckCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Organization {
  id: string
  name: string
  description?: string
  website?: string
  industry?: string
}

interface Person {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email?: string
  bio?: string
  currentRoles?: Array<{
    title: string
    organization: string
  }>
  socialMediaHandles?: Array<{
    platform: string
    handle: string
  }>
}

interface Interaction {
  id: string
  summary: string
  date?: string
  location?: string
  snippet?: string
  person?: {
    name: string
  }
}

interface SampleQuery {
  category: string
  query: string
  description: string
  expectedResults: string
}

export function TestDataInspector() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const sampleQueries: SampleQuery[] = [
    {
      category: "Organization Queries",
      query: "Who works at Think Foundation?",
      description: "Find people at a specific organization",
      expectedResults: "Felix (CEO)"
    },
    {
      category: "Organization Queries",
      query: "Who do I know at Think?",
      description: "Natural language variation of organization query",
      expectedResults: "Mikey Anderson, Jesse Bryan, Felix"
    },
    {
      category: "Person Queries",
      query: "Tell me about Felix",
      description: "Get detailed information about a specific person",
      expectedResults: "Felix's profile with roles and background"
    },
    {
      category: "Person Queries",
      query: "Tell me about Mikey Anderson",
      description: "Get detailed information about Mikey Anderson",
      expectedResults: "Mikey's profile as Master Gardener at Think"
    },
    {
      category: "Technology Queries",
      query: "AI machine learning technology",
      description: "Semantic search for technology-related content",
      expectedResults: "Relevant interactions and people (if vectors available)"
    },
    {
      category: "Company Queries",
      query: "Who works at TechCorp?",
      description: "Find people at TechCorp",
      expectedResults: "Sarah Chen (CTO)"
    }
  ]

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [orgsRes, peopleRes, interactionsRes] = await Promise.all([
        fetch('/api/test-db/organizations'),
        fetch('/api/test-db/people'),
        fetch('/api/test-db/interactions')
      ])

      const [orgsData, peopleData, interactionsData] = await Promise.all([
        orgsRes.json(),
        peopleRes.json(),
        interactionsRes.json()
      ])

      setOrganizations(orgsData.organizations || [])
      setPeople(peopleData.people || [])
      setInteractions(interactionsData.interactions || [])
    } catch (error) {
      console.error('Error fetching test data:', error)
      toast({
        title: "Error",
        description: "Failed to load test data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearTestData = async () => {
    if (!confirm('Are you sure you want to clear all test data? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/test-db/clear', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to clear test data')
      }

      setOrganizations([])
      setPeople([])
      setInteractions([])

      toast({
        title: "Success",
        description: "All test data has been cleared"
      })
    } catch (error) {
      console.error('Error clearing test data:', error)
      toast({
        title: "Error",
        description: "Failed to clear test data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const reseedTestData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/test-db/reseed', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to reseed test data')
      }

      await fetchData()

      toast({
        title: "Success",
        description: "Test data has been reseeded"
      })
    } catch (error) {
      console.error('Error reseeding test data:', error)
      toast({
        title: "Error",
        description: "Failed to reseed test data",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Query copied to clipboard"
    })
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Test Data Inspector</span>
          </CardTitle>
          <CardDescription>
            View and manage test data for development and testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Building2 className="h-4 w-4" />
                <span>{organizations.length} Organizations</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{people.length} People</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-4 w-4" />
                <span>{interactions.length} Interactions</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearTestData}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={reseedTestData}
                disabled={isLoading}
              >
                <Database className="h-4 w-4 mr-2" />
                Reseed Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="queries">Sample Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Organizations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{organizations.length}</div>
                <p className="text-sm text-muted-foreground">
                  {organizations.length > 0 ? 'Test companies loaded' : 'No organizations'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">People</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{people.length}</div>
                <p className="text-sm text-muted-foreground">
                  {people.length > 0 ? 'Test profiles loaded' : 'No people'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Interactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{interactions.length}</div>
                <p className="text-sm text-muted-foreground">
                  {interactions.length > 0 ? 'Test interactions loaded' : 'No interactions'}
                </p>
              </CardContent>
            </Card>
          </div>

          {organizations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sample Organizations</CardTitle>
                <CardDescription>First 5 organizations in test data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {organizations.slice(0, 5).map((org) => (
                    <Badge key={org.id} variant="outline" className="justify-center p-2">
                      {org.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {people.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sample People</CardTitle>
                <CardDescription>First 5 people in test data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {people.slice(0, 5).map((person) => (
                    <Badge key={person.id} variant="outline" className="justify-center p-2">
                      {person.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Organizations</CardTitle>
              <CardDescription>Complete list of organizations in test data</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {organizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{org.name}</h4>
                        {org.description && (
                          <p className="text-sm text-muted-foreground">{org.description}</p>
                        )}
                        {org.industry && (
                          <Badge variant="secondary" className="mt-1">{org.industry}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="people" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All People</CardTitle>
              <CardDescription>Complete list of people in test data</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {people.map((person) => (
                    <div key={person.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-medium">{person.name}</h4>
                        {person.bio && (
                          <p className="text-sm text-muted-foreground">{person.bio}</p>
                        )}
                        {person.currentRoles && person.currentRoles.length > 0 && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {person.currentRoles[0].title} at {person.currentRoles[0].organization}
                            </Badge>
                          </div>
                        )}
                        {person.email && (
                          <p className="text-xs text-muted-foreground mt-1">{person.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sample Queries for Testing</CardTitle>
              <CardDescription>
                Pre-built queries that work with the current test data. Click to copy and test in the unified search.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleQueries.map((sample, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant="secondary" className="mb-2">{sample.category}</Badge>
                        <h4 className="font-medium">{sample.query}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{sample.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(sample.query)}
                        className="ml-4"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Expected: {sample.expectedResults}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}