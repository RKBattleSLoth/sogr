"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'
import { 
  Search, 
  Brain, 
  Type, 
  Settings, 
  Calendar,
  MapPin,
  MoreHorizontal,
  ExternalLink,
  Users,
  Target,
  Database,
  Zap,
  Info
} from "lucide-react"

interface UnifiedSearchResult {
  id: string
  type: 'person' | 'organization' | 'role'
  data: any
  score: number
  source: 'basic' | 'semantic' | 'hybrid'
  rank: number
}

interface UnifiedSearchProps {
  onResultSelect?: (resultId: string) => void
}

export function UnifiedSearch({ onResultSelect }: UnifiedSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UnifiedSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [selectedResult, setSelectedResult] = useState<UnifiedSearchResult | null>(null)
  const { toast } = useToast()

  // Search settings
  const [limit, setLimit] = useState([20])
  const [basicWeight, setBasicWeight] = useState([60])
  const [semanticWeight, setSemanticWeight] = useState([40])
  const [duplicateThreshold, setDuplicateThreshold] = useState([80])

  // Analysis state
  const [analysis, setAnalysis] = useState<any>(null)
  const [llmResponse, setLlmResponse] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/unified-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: limit[0],
          basicWeight: basicWeight[0] / 100,
          semanticWeight: semanticWeight[0] / 100,
          duplicateThreshold: duplicateThreshold[0] / 100,
        }),
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
      setAnalysis(data.analysis || null)
      setLlmResponse(data.llmResponse || null)
      
      if (data.results?.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search terms or settings.",
        })
      }
    } catch (error) {
      console.error("Search error:", error)
      toast({
        title: "Search failed",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'basic':
        return <Database className="h-4 w-4" />
      case 'semantic':
        return <Brain className="h-4 w-4" />
      case 'hybrid':
        return <Zap className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'basic':
        return "bg-blue-100 text-blue-800 border-blue-200"
      case 'semantic':
        return "bg-purple-100 text-purple-800 border-purple-200"
      case 'hybrid':
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>Unified Search</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Search across your social graph using both structured queries and semantic understanding
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="border-border/50"
              >
                <Info className="h-4 w-4 mr-2" />
                Analysis
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="border-border/50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Search your social graph..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-background/50"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={!query.trim() || isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? "Searching..." : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Panel */}
      {showAnalysis && analysis && (
        <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-primary" />
              <span>Query Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Original Query</Label>
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                  {analysis.query?.original}
                </p>
              </div>
              {analysis.query?.wasRewritten && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Rewritten Query</Label>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                    {analysis.query?.rewritten}
                  </p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Query Type</Label>
                <Badge variant="outline">{analysis.queryType}</Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Intent</Label>
                <Badge variant="secondary">{analysis.intent}</Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Strategy</Label>
                <Badge variant={analysis.strategy === 'hybrid' ? 'default' : 'outline'}>
                  {analysis.strategy}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Confidence</Label>
                <Badge variant="outline" className={getScoreColor(analysis.confidence)}>
                  {Math.round(analysis.confidence * 100)}%
                </Badge>
              </div>
            </div>

            {analysis.entities && Object.keys(analysis.entities).length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Extracted Entities</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analysis.entities).map(([type, entities]: [string, any[]]) => 
                    entities?.map((entity, index) => (
                      <Badge key={`${type}-${index}`} variant="outline">
                        {type}: {entity}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* LLM Response */}
      {llmResponse && (
        <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>AI Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MarkdownRenderer content={llmResponse} />
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Search Results</span>
              <Badge variant="secondary">{results.length} found</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <Card 
                    key={result.id} 
                    className="bg-card/30 hover:bg-card/50 transition-all duration-200 cursor-pointer border-border/30"
                    onClick={() => onResultSelect?.(result.id)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Header with metadata */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {result.data.name?.charAt(0) || result.data.metadata?.personName?.charAt(0) || "I"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium text-sm text-foreground">
                                  {result.data.name || result.data.metadata?.personName || "Interaction"}
                                </h4>
                                {result.data.currentRoles?.[0]?.title && (
                                  <p className="text-xs text-muted-foreground">
                                    {result.data.currentRoles[0].title} at {result.data.currentRoles[0].organization?.name}
                                  </p>
                                )}
                                {result.data.metadata?.personEmail && (
                                  <p className="text-xs text-muted-foreground">
                                    {result.data.metadata.personEmail}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={`text-xs ${getSourceColor(result.source)}`}>
                                {getSourceIcon(result.source)}
                                <span className="ml-1">{result.source}</span>
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${getScoreColor(result.score)}`}>
                                {Math.round(result.score * 100)}%
                              </Badge>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="space-y-2">
                            {/* Basic search results (person data) */}
                            {result.data.currentRoles?.length > 0 && (
                              <div className="text-sm text-foreground/80">
                                <p><strong>Current Role:</strong> {result.data.currentRoles[0].title} at {result.data.currentRoles[0].organization?.name}</p>
                              </div>
                            )}
                            
                            {/* Semantic search results (interaction data) */}
                            {result.data.content && (
                              <div className="text-sm text-foreground/80 leading-relaxed">
                                <p>{result.data.content}</p>
                              </div>
                            )}
                            
                            {/* Social media handles (basic results) */}
                            {result.data.socialMediaHandles?.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {result.data.socialMediaHandles.map((handle: any, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {handle.platform}: {handle.handle}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            {/* Metadata badges (semantic results) */}
                            {result.data.metadata && (
                              <div className="flex flex-wrap gap-2">
                                {result.data.metadata.type && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.data.metadata.type === 'email' ? (
                                      <><Type className="h-3 w-3 mr-1" /> Email</>
                                    ) : result.data.metadata.type === 'social_media' ? (
                                      <><Users className="h-3 w-3 mr-1" /> Social</>
                                    ) : (
                                      <><Target className="h-3 w-3 mr-1" /> Other</>
                                    )}
                                  </Badge>
                                )}
                                
                                {result.data.metadata.platform && (
                                  <Badge variant="secondary" className="text-xs">
                                    {result.data.metadata.platform}
                                  </Badge>
                                )}
                                
                                {result.data.metadata.date && (
                                  <Badge variant="outline" className="text-xs">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {new Date(result.data.metadata.date).toLocaleDateString()}
                                  </Badge>
                                )}
                                
                                {result.data.metadata.subject && (
                                  <Badge variant="secondary" className="text-xs">
                                    "{result.data.metadata.subject}"
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedResult(result)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Search Settings</DialogTitle>
            <DialogDescription>
              Configure unified search parameters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Results Limit: {limit[0]}</Label>
              <Slider
                value={limit}
                onValueChange={setLimit}
                max={50}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Basic Search Weight: {basicWeight[0]}%</Label>
              <Slider
                value={basicWeight}
                onValueChange={setBasicWeight}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Semantic Search Weight: {semanticWeight[0]}%</Label>
              <Slider
                value={semanticWeight}
                onValueChange={setSemanticWeight}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Duplicate Threshold: {duplicateThreshold[0]}%</Label>
              <Slider
                value={duplicateThreshold}
                onValueChange={setDuplicateThreshold}
                max={100}
                min={50}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Similarity threshold for duplicate detection (higher = more strict)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettings(false)}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}