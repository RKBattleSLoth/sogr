"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ThemeToggle } from "@/components/theme-toggle"
import { ConnectionDashboard } from "@/components/connection-dashboard"
import { GraphView } from "@/components/graph-view"
import { SemanticSearch } from "@/components/semantic-search"
import { UnifiedSearch } from "@/components/unified-search"
import { TestDataInspector } from "@/components/test-data-inspector"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Users, 
  Search, 
  Plus, 
  MessageSquare, 
  Building2, 
  Twitter, 
  Linkedin,
  Globe,
  Calendar,
  MapPin,
  Mail,
  MessageCircle,
  Share2,
  Upload,
  Download,
  FileText,
  Smartphone,
  Edit,
  Trash2,
  MoreHorizontal,
  Brain,
  Database
} from "lucide-react"

interface Person {
  id: string
  name: string
  email?: string
  bio?: string
  avatarUrl?: string
  currentRole?: {
    title: string
    organization: string
  }
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
  snippet?: string  // Add snippet field
  person?: Person
}

export default function SocialGraph() {
  const [inputText, setInputText] = useState("")
  const [queryText, setQueryText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [queryResults, setQueryResults] = useState<string | null>(null)
  const [showQueryResults, setShowQueryResults] = useState(false)
  const { toast } = useToast()
  
  // Edit/Delete state
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [interactionToDelete, setInteractionToDelete] = useState<Interaction | null>(null)
  
  // Edit form state
  const [editSummary, setEditSummary] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editLocation, setEditLocation] = useState("")
  const [editFullText, setEditFullText] = useState("")
  const [interactions, setInteractions] = useState<Interaction[]>([])

  const handleAddInformation = async () => {
    if (!inputText.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/smart-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      })

      if (!response.ok) {
        throw new Error('Failed to process information')
      }

      const data = await response.json()
      
      // Create a new interaction from the processed data
      const newInteraction: Interaction = {
        id: data.storedInteraction?.id || Date.now().toString(),
        summary: data.data.interaction_summary || inputText,
        date: data.data.date_mentioned || new Date().toISOString().split('T')[0],
        snippet: inputText.length > 200 ? inputText.substring(0, 200) + '...' : inputText,
        person: data.data.person ? {
          id: data.storedPerson?.id || Date.now().toString(),
          name: data.data.person.name,
          email: data.data.person.email,
          bio: data.data.person.bio,
          currentRole: data.data.person.current_role,
          socialMediaHandles: data.data.person.social_media
        } : undefined
      }
      
      // If it's an update, find and replace the existing interaction
      if (data.intent === 'edit' && data.storedInteraction) {
        setInteractions(prev => prev.map(interaction => 
          interaction.id === data.storedInteraction.id 
            ? { 
                ...newInteraction, 
                id: data.storedInteraction.id,
                summary: data.data.interaction_summary || interaction.summary,
                date: data.data.date_mentioned || interaction.date,
                snippet: inputText.length > 200 ? inputText.substring(0, 200) + '...' : inputText
              }
            : interaction
        ))
      } else {
        // If it's a new addition, add to the top of the list
        setInteractions(prev => [newInteraction, ...prev])
      }
      
      setInputText("")
      
      // Show a toast notification about what happened
      const action = data.action === 'updated' ? 'updated' : 'added'
      const title = data.intent === 'edit' ? 'Information Updated' : 'Information Added'
      const description = `Information ${action} successfully${data.updatedFields.length > 0 ? ` (updated: ${data.updatedFields.join(', ')})` : ''}`
      
      toast({
        title,
        description,
      })
      
    } catch (error) {
      console.error("Error processing input:", error)
      alert('Failed to process information. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault() // Prevent default Enter behavior (new line)
      handleAddInformation()
    }
    // Shift+Enter will naturally create a new line, so we don't need to handle it
  }

  const handleQuery = async () => {
    if (!queryText.trim()) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryText }),
      })

      if (!response.ok) {
        throw new Error('Failed to process query')
      }

      const data = await response.json()
      
      // Store the query results and show them in the UI
      setQueryResults(data.response)
      setShowQueryResults(true)
      
      // Switch to the query results tab
      setTimeout(() => {
        const queriesTab = document.querySelector('[value="queries"]') as HTMLElement
        if (queriesTab) {
          queriesTab.click()
        }
      }, 100)
      
    } catch (error) {
      console.error("Error processing query:", error)
      setQueryResults('Failed to process query. Please try again.')
      setShowQueryResults(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault() // Prevent default Enter behavior
      handleQuery()
    }
  }

  // Edit/Delete handlers
  const handleEditClick = (interaction: Interaction) => {
    setEditingInteraction(interaction)
    setEditSummary(interaction.summary || "")
    setEditDate(interaction.date ? new Date(interaction.date).toISOString().split('T')[0] : "")
    setEditLocation(interaction.location || "")
    setEditFullText(interaction.snippet || "")
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (interaction: Interaction) => {
    setInteractionToDelete(interaction)
    setDeleteDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingInteraction) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/interaction/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingInteraction.id,
          summary: editSummary,
          date: editDate,
          location: editLocation,
          fullText: editFullText,
          snippet: editFullText.length > 200 ? editFullText.substring(0, 200) + '...' : editFullText
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update interaction')
      }

      const data = await response.json()
      
      // Update the interaction in the local state
      setInteractions(prev => prev.map(interaction => 
        interaction.id === editingInteraction.id 
          ? { 
              ...interaction, 
              summary: data.data.summary,
              date: data.data.date,
              location: data.data.location,
              snippet: data.data.snippet
            }
          : interaction
      ))

      setIsEditDialogOpen(false)
      setEditingInteraction(null)
    } catch (error) {
      console.error("Error updating interaction:", error)
      alert('Failed to update interaction. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!interactionToDelete) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/interaction/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: interactionToDelete.id
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to delete interaction')
      }

      // Remove the interaction from the local state
      setInteractions(prev => prev.filter(interaction => 
        interaction.id !== interactionToDelete.id
      ))

      setDeleteDialogOpen(false)
      setInteractionToDelete(null)
    } catch (error) {
      console.error("Error deleting interaction:", error)
      alert('Failed to delete interaction. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getSocialMediaIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "twitter":
        return <Twitter className="h-4 w-4" />
      case "linkedin":
        return <Linkedin className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-sm"></div>
                <Users className="h-6 w-6 text-primary relative z-10" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Social Graph</h1>
                <p className="text-xs text-muted-foreground">AI-Powered Network Intelligence</p>
              </div>
              <Badge variant="secondary" className="ml-2">Beta</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                {interactions.length} interactions
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input & Query */}
          <div className="lg:col-span-1 space-y-6">
            {/* Add Information Card */}
            <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5 text-primary" />
                  <span>Add or Update Information</span>
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Describe a person or interaction in natural language. The system will automatically detect if you're adding new information or updating existing records.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., 'Today I met John, the new CTO at TechCorp' OR 'Update Felix's information, he's no longer at Think Foundation, he moved to Proof'"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className="min-h-24 bg-background/50"
                />
                <Button 
                  onClick={handleAddInformation} 
                  disabled={!inputText.trim() || isLoading}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isLoading ? "Processing..." : "Process Information"}
                </Button>
              </CardContent>
            </Card>

            {/* Unified Search Card */}
            <UnifiedSearch />
          </div>

          {/* Right Column - Interactions & Graph */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="interactions" className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="interactions">Recent Interactions</TabsTrigger>
                <TabsTrigger value="graph">Graph View</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="unified">Unified Search</TabsTrigger>
                <TabsTrigger value="semantic">Semantic Search</TabsTrigger>
                <TabsTrigger value="queries">Query Results</TabsTrigger>
                <TabsTrigger value="test-data">Test Data</TabsTrigger>
              </TabsList>
              
              <TabsContent value="interactions" className="space-y-4">
                <ScrollArea className="h-[600px] pr-4">
                  {interactions.map((interaction) => (
                    <Card key={interaction.id} className="mb-4 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50 hover:bg-card/70 transition-all duration-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                            <AvatarImage src={interaction.person?.avatarUrl} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {interaction.person?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-foreground">
                                {interaction.person?.name || "Unknown Person"}
                              </h3>
                              {interaction.date && (
                                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(interaction.date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Edit/Delete Dropdown Menu */}
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditClick(interaction)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteClick(interaction)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            {interaction.person?.currentRole && (
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                <span>
                                  {interaction.person.currentRole.title} at {interaction.person.currentRole.organization}
                                </span>
                              </div>
                            )}
                            
                            <p className="text-sm text-foreground/80 leading-relaxed">{interaction.summary}</p>
                            
                            {interaction.snippet && (
                              <div className="mt-2 p-2 bg-muted/30 rounded border border-border/30">
                                <p className="text-xs text-muted-foreground italic leading-relaxed">
                                  "{interaction.snippet}"
                                </p>
                              </div>
                            )}
                            
                            {interaction.location && (
                              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{interaction.location}</span>
                              </div>
                            )}
                            
                            {interaction.person?.socialMediaHandles && (
                              <div className="flex space-x-2 pt-2">
                                {interaction.person.socialMediaHandles.map((handle, index) => (
                                  <Badge key={index} variant="outline" className="text-xs bg-background/50 border-border/50">
                                    {getSocialMediaIcon(handle.platform)}
                                    <span className="ml-1">{handle.handle}</span>
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="graph" className="space-y-4">
                <GraphView interactions={interactions} />
              </TabsContent>
              
              <TabsContent value="connections" className="space-y-4">
                <ConnectionDashboard />
              </TabsContent>
              
              <TabsContent value="unified" className="space-y-4">
                <UnifiedSearch />
              </TabsContent>
              
              <TabsContent value="semantic" className="space-y-4">
                <SemanticSearch interactions={interactions} />
              </TabsContent>
              
              <TabsContent value="queries" className="space-y-4">
                <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Search className="h-5 w-5 text-primary" />
                      <span>Query Results</span>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Results from your social network queries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {showQueryResults && queryResults ? (
                      <div className="space-y-4">
                        <div className="p-6 bg-muted/30 rounded-lg border border-border/50">
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-medium text-foreground">Latest Query</h3>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowQueryResults(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Clear
                            </Button>
                          </div>
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-1">You asked:</p>
                            <p className="font-medium text-foreground">"{queryText}"</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Response:</p>
                            <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap bg-background/50 p-4 rounded border border-border/30">
                              {queryResults}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[400px] flex items-center justify-center border border-border/50 rounded-lg bg-muted/20">
                        <div className="text-center space-y-3">
                          <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No queries yet
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Ask a question about your social network to see results here
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="test-data" className="space-y-4">
                <TestDataInspector />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Interaction</DialogTitle>
            <DialogDescription>
              Make changes to the interaction details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="summary" className="text-right text-sm font-medium">
                Summary
              </label>
              <Input
                id="summary"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="date" className="text-right text-sm font-medium">
                Date
              </label>
              <Input
                id="date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="location" className="text-right text-sm font-medium">
                Location
              </label>
              <Input
                id="location"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="fullText" className="text-right text-sm font-medium">
                Full Text
              </label>
              <Textarea
                id="fullText"
                value={editFullText}
                onChange={(e) => setEditFullText(e.target.value)}
                className="col-span-3 min-h-20"
                placeholder="Original input text..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the interaction with 
              "{interactionToDelete?.summary}" from your social graph.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster />
    </div>
  )
}