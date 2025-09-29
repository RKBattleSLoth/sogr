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
  Target
} from "lucide-react"

interface SemanticSearchResult {
  interactionId: string
  content: string
  similarity?: number
  combinedScore?: number
  semanticScore?: number
  keywordScore?: number
  metadata?: {
    type?: string
    personName?: string
    personEmail?: string
    personHandle?: string
    platform?: string
    subject?: string
    date?: string
  }
}

interface SemanticSearchProps {
  interactions?: any[]
  onResultSelect?: (interactionId: string) => void
}

export function SemanticSearch({ onResultSelect }: SemanticSearchProps) {
  const [query, setQuery] = useState("")
  const [searchType, setSearchType] = useState<"semantic" | "hybrid">("semantic")
  const [results, setResults] = useState<SemanticSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedResult, setSelectedResult] = useState<SemanticSearchResult | null>(null)
  const [showSimilarDialog, setShowSimilarDialog] = useState(false)
  const [similarInteractions, setSimilarInteractions] = useState<SemanticSearchResult[]>([])
  const { toast } = useToast()

  // Search settings
  const [limit, setLimit] = useState([10])
  const [threshold, setThreshold] = useState([0.7])
  const [semanticWeight, setSemanticWeight] = useState([0.7])
  const [keywordWeight, setKeywordWeight] = useState([0.3])

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          searchType,
          limit: limit[0],
          threshold: threshold[0] / 100,
          semanticWeight: semanticWeight[0] / 100,
          keywordWeight: keywordWeight[0] / 100,
        }),
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
      
      if (data.results?.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search terms or lowering the threshold.",
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

  const handleFindSimilar = async (interactionId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/semantic-search?interactionId=${interactionId}&limit=5`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to find similar interactions')
      }

      const data = await response.json()
      setSimilarInteractions(data.similarInteractions || [])
      setShowSimilarDialog(true)
    } catch (error) {
      console.error("Error finding similar interactions:", error)
      toast({
        title: "Failed to find similar interactions",
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

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600"
    if (score >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadge = (result: SemanticSearchResult) => {
    if (searchType === "semantic" && result.similarity !== undefined) {
      return (
        <Badge variant="outline" className={`text-xs ${getScoreColor(result.similarity)}`}>
          {Math.round(result.similarity * 100)}% match
        </Badge>
      )
    }
    
    if (searchType === "hybrid" && result.combinedScore !== undefined) {
      return (
        <div className="flex space-x-1">
          <Badge variant="outline" className={`text-xs ${getScoreColor(result.combinedScore)}`}>
            {Math.round(result.combinedScore * 100)}%
          </Badge>
          <Badge variant="secondary" className="text-xs">
            S:{Math.round((result.semanticScore || 0) * 100)}%
          </Badge>
          <Badge variant="secondary" className="text-xs">
            K:{Math.round((result.keywordScore || 0) * 100)}%
          </Badge>
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <Card className="bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <span>Semantic Search</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Search interactions by meaning and context, not just keywords
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <div className="flex-1">
              <Input
                placeholder="Search interactions by meaning..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-background/50"
              />
            </div>
            <Select value={searchType} onValueChange={(value: "semantic" | "hybrid") => setSearchType(value)}>
              <SelectTrigger className="w-32 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semantic">
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4" />
                    <span>Semantic</span>
                  </div>
                </SelectItem>
                <SelectItem value="hybrid">
                  <div className="flex items-center space-x-2">
                    <Type className="h-4 w-4" />
                    <span>Hybrid</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
                    key={result.interactionId} 
                    className="bg-card/30 hover:bg-card/50 transition-all duration-200 cursor-pointer border-border/30"
                    onClick={() => onResultSelect?.(result.interactionId)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Header with metadata */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {result.metadata?.personName?.charAt(0) || "I"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium text-sm text-foreground">
                                  {result.metadata?.personName || "Unknown Person"}
                                </h4>
                                {result.metadata?.personEmail && (
                                  <p className="text-xs text-muted-foreground">
                                    {result.metadata.personEmail}
                                  </p>
                                )}
                              </div>
                            </div>
                            {getScoreBadge(result)}
                          </div>

                          {/* Content */}
                          <div className="space-y-2">
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {result.content}
                            </p>
                            
                            {/* Metadata badges */}
                            <div className="flex flex-wrap gap-2">
                              {result.metadata?.type && (
                                <Badge variant="outline" className="text-xs">
                                  {result.metadata.type === 'email' ? (
                                    <><Type className="h-3 w-3 mr-1" /> Email</>
                                  ) : result.metadata.type === 'social_media' ? (
                                    <><Users className="h-3 w-3 mr-1" /> Social</>
                                  ) : (
                                    <><Target className="h-3 w-3 mr-1" /> Other</>
                                  )}
                                </Badge>
                              )}
                              
                              {result.metadata?.platform && (
                                <Badge variant="secondary" className="text-xs">
                                  {result.metadata.platform}
                                </Badge>
                              )}
                              
                              {result.metadata?.date && (
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(result.metadata.date).toLocaleDateString()}
                                </Badge>
                              )}
                              
                              {result.metadata?.subject && (
                                <Badge variant="secondary" className="text-xs">
                                  "{result.metadata.subject}"
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-1 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFindSimilar(result.interactionId)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
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
              Configure semantic search parameters
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
              <Label>Similarity Threshold: {threshold[0]}%</Label>
              <Slider
                value={threshold}
                onValueChange={setThreshold}
                max={100}
                min={10}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Minimum similarity score for results (higher = more relevant)
              </p>
            </div>

            {searchType === "hybrid" && (
              <>
                <div className="space-y-2">
                  <Label>Semantic Weight: {semanticWeight[0]}%</Label>
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
                  <Label>Keyword Weight: {keywordWeight[0]}%</Label>
                  <Slider
                    value={keywordWeight}
                    onValueChange={setKeywordWeight}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
              </>
            )}
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

      {/* Similar Interactions Dialog */}
      <Dialog open={showSimilarDialog} onOpenChange={setShowSimilarDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Similar Interactions</DialogTitle>
            <DialogDescription>
              Interactions with similar meaning and context
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {similarInteractions.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {similarInteractions.map((similar, index) => (
                    <Card key={similar.interactionId} className="bg-card/30 border-border/30">
                      <CardContent className="pt-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm text-foreground">
                                {similar.metadata?.personName || "Unknown Person"}
                              </h4>
                              {similar.similarity !== undefined && (
                                <Badge variant="outline" className={`text-xs ${getScoreColor(similar.similarity)}`}>
                                  {Math.round(similar.similarity * 100)}% similar
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {similar.content}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[200px] flex items-center justify-center border border-border/50 rounded-lg bg-muted/20">
                <div className="text-center space-y-2">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No similar interactions found
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSimilarDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}