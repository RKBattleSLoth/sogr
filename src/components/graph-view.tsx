"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Network, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Info,
  Users,
  Building2,
  Twitter,
  Linkedin,
  Globe,
  MessageCircle
} from "lucide-react"

interface GraphNode {
  id: string
  name: string
  type: 'person' | 'organization' | 'interaction' | 'social_media'
  group?: number
  val?: number
  color?: string
  icon?: string
  data?: {
    title?: string
    organization?: string
    date?: string
    platform?: string
    handle?: string
    summary?: string
  }
  // For database lookup
  dbId?: string
  originalType?: string
}

interface GraphLink {
  source: string
  target: string
  type: 'works_at' | 'previous_work' | 'social_media' | 'interaction' | 'connection'
  label?: string
  color?: string
  value?: number
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface GraphViewProps {
  interactions: Array<{
    id: string
    summary: string
    date?: string
    location?: string
    snippet?: string
    person?: {
      id: string
      name: string
      email?: string
      bio?: string
      currentRole?: {
        title: string
        organization: string
      }
      socialMediaHandles?: Array<{
        platform: string
        handle: string
      }>
    }
  }>
}

export function GraphView({ interactions }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  
  // State for detailed node data
  const [detailedNodeData, setDetailedNodeData] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Transform interactions into graph data
  useEffect(() => {
    const transformData = () => {
      const nodes: GraphNode[] = []
      const links: GraphLink[] = []
      const nodeMap = new Map<string, GraphNode>()

      // Sort interactions by date to ensure chronological numbering
      const sortedInteractions = [...interactions].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateA - dateB
      })

      // Create a map to store interaction numbers by ID
      const interactionNumbers = new Map<string, number>()
      sortedInteractions.forEach((interaction, index) => {
        interactionNumbers.set(interaction.id, index + 1)
      })

      // Process each interaction
      interactions.forEach((interaction) => {
        if (interaction.person) {
          const person = interaction.person
          
          // Add person node if not exists
          if (!nodeMap.has(person.id)) {
            const personNode: GraphNode = {
              id: person.id,
              name: person.name,
              type: 'person',
              group: 1,
              val: 20,
              color: '#3b82f6',
              icon: 'user',
              dbId: person.id, // Store database ID
              originalType: 'person', // Store original type for API calls
              data: {
                title: person.currentRole?.title,
                organization: person.currentRole?.organization
              }
            }
            nodeMap.set(person.id, personNode)
            nodes.push(personNode)
          }

          // Add interaction node
          const interactionNode: GraphNode = {
            id: `interaction-${interaction.id}`,
            name: `Interaction ${interactionNumbers.get(interaction.id) || '?'}`,
            type: 'interaction',
            group: 3,
            val: 10,
            color: '#10b981',
            icon: 'message-circle',
            dbId: interaction.id, // Store database ID
            originalType: 'interaction', // Store original type for API calls
            data: {
              date: interaction.date,
              summary: interaction.summary
            }
          }
          nodes.push(interactionNode)

          // Link person to interaction
          links.push({
            source: person.id,
            target: `interaction-${interaction.id}`,
            type: 'interaction',
            color: '#10b981',
            value: 1
          })

          // Add organization and link if exists
          if (person.currentRole?.organization) {
            const orgId = `org-${person.currentRole.organization.replace(/\s+/g, '-').toLowerCase()}`
            
            if (!nodeMap.has(orgId)) {
              const orgNode: GraphNode = {
                id: orgId,
                name: person.currentRole.organization,
                type: 'organization',
                group: 2,
                val: 15,
                color: '#f59e0b',
                icon: 'building',
                originalType: 'organization', // Store original type for API calls
                data: {}
              }
              nodeMap.set(orgId, orgNode)
              nodes.push(orgNode)
            }

            links.push({
              source: person.id,
              target: orgId,
              type: 'works_at',
              label: person.currentRole.title,
              color: '#f59e0b',
              value: 2
            })
          }

          // Add social media handles
          person.socialMediaHandles?.forEach(handle => {
            const socialId = `social-${handle.platform}-${handle.handle}`
            
            if (!nodeMap.has(socialId)) {
              const socialNode: GraphNode = {
                id: socialId,
                name: `${handle.platform}: ${handle.handle}`,
                type: 'social_media',
                group: 4,
                val: 8,
                color: '#8b5cf6',
                icon: getSocialIcon(handle.platform),
                originalType: 'social_media', // Store original type for API calls
                data: {
                  platform: handle.platform,
                  handle: handle.handle
                }
              }
              nodeMap.set(socialId, socialNode)
              nodes.push(socialNode)
            }

            links.push({
              source: person.id,
              target: socialId,
              type: 'social_media',
              label: handle.platform,
              color: '#8b5cf6',
              value: 1
            })
          })
        }
      })

      setGraphData({ nodes, links })
      setIsLoading(false)
    }

    transformData()
  }, [interactions])

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "twitter": return 'twitter'
      case "linkedin": return 'linkedin'
      default: return 'globe'
    }
  }

  const getNodeIcon = (node: GraphNode) => {
    switch (node.icon) {
      case 'user': return <Users className="h-4 w-4" />
      case 'building': return <Building2 className="h-4 w-4" />
      case 'message-circle': return <MessageCircle className="h-4 w-4" />
      case 'twitter': return <Twitter className="h-4 w-4" />
      case 'linkedin': return <Linkedin className="h-4 w-4" />
      case 'globe': return <Globe className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  // Store node positions consistently to avoid recalculation
  const nodePositions = useRef<Map<string, {x: number, y: number}>>(new Map())
  
  // Initialize node positions once
  useEffect(() => {
    if (graphData.nodes.length > 0 && nodePositions.current.size === 0) {
      const canvas = canvasRef.current
      if (!canvas) return
      
      // Calculate initial positions in canvas coordinate system
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = Math.min(canvas.width, canvas.height) / 3
      
      graphData.nodes.forEach((node, index) => {
        const angle = (index / graphData.nodes.length) * 2 * Math.PI
        nodePositions.current.set(node.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        })
      })
    }
  }, [graphData.nodes.length])

  const drawGraph = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Apply transformations
    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    // Draw links
    graphData.links.forEach(link => {
      const sourcePos = nodePositions.current.get(link.source)
      const targetPos = nodePositions.current.get(link.target)
      
      if (sourcePos && targetPos) {
        ctx.beginPath()
        ctx.moveTo(sourcePos.x, sourcePos.y)
        ctx.lineTo(targetPos.x, targetPos.y)
        ctx.strokeStyle = link.color || '#94a3b8'
        ctx.lineWidth = (link.value || 1) * 2
        ctx.stroke()
      }
    })

    // Draw nodes
    graphData.nodes.forEach(node => {
      const pos = nodePositions.current.get(node.id)
      if (!pos) return

      // Node circle
      ctx.beginPath()
      const nodeRadius = (node.val || 10)
      ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI)
      ctx.fillStyle = node.color || '#64748b'
      ctx.fill()
      
      // Node border - thicker for selected/hovered nodes
      let borderWidth = 1
      if (selectedNode?.id === node.id) {
        borderWidth = 4
        ctx.strokeStyle = '#ffffff'
      } else if (hoveredNode?.id === node.id) {
        borderWidth = 3
        ctx.strokeStyle = '#fbbf24'
      } else {
        ctx.strokeStyle = '#1e293b'
      }
      ctx.lineWidth = borderWidth
      ctx.stroke()

      // Node label
      ctx.fillStyle = '#ffffff'
      ctx.font = `${12}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Truncate long names
      const displayName = node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name
      ctx.fillText(displayName, pos.x, pos.y + nodeRadius + 15)
    })

    ctx.restore()
  }

  useEffect(() => {
    if (!isLoading) {
      drawGraph()
    }
  }, [graphData, isLoading, selectedNode, hoveredNode, scale, offset])

  // Transform mouse coordinates to canvas coordinates
  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    
    // Account for canvas resolution vs display size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    // Convert mouse coordinates to canvas coordinates
    const canvasX = (event.clientX - rect.left) * scaleX
    const canvasY = (event.clientY - rect.top) * scaleY
    
    // Apply inverse transformations (reverse order: first unscale, then untranslate)
    const transformedX = (canvasX - offset.x) / scale
    const transformedY = (canvasY - offset.y) / scale
    
    return { x: transformedX, y: transformedY }
  }

  const handleCanvasClick = async (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event)

    // Find clicked node - use exact visual radius for precise clicking
    const clickedNode = graphData.nodes.find(node => {
      const pos = nodePositions.current.get(node.id)
      if (!pos) return false
      
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2))
      const nodeRadius = (node.val || 10) // Use exact visual radius (no scale needed in transformed space)
      return distance <= nodeRadius
    })

    setSelectedNode(clickedNode || null)
    
    // If node has database ID, fetch detailed information for the card
    if (clickedNode?.dbId && clickedNode?.originalType) {
      await fetchNodeDetails(clickedNode)
    } else {
      // Clear detailed data if no node selected
      setDetailedNodeData(null)
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event)

    // Find hovered node - use exact visual radius for precise hover
    const hovered = graphData.nodes.find(node => {
      const pos = nodePositions.current.get(node.id)
      if (!pos) return false
      
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2))
      return distance <= (node.val || 10) // Use exact visual radius (no scale needed in transformed space)
    })

    setHoveredNode(hovered || null)
    
    // Change cursor to pointer when hovering over a node
    const canvas = canvasRef.current
    if (canvas) {
      canvas.style.cursor = hovered ? 'pointer' : 'default'
    }
  }

  const fetchNodeDetails = async (node: GraphNode) => {
    setIsLoadingDetails(true)
    try {
      const response = await fetch('/api/node-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: node.dbId,
          nodeType: node.originalType
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch node details')
      }

      const data = await response.json()
      setDetailedNodeData(data)
      // Don't open dialog - just update the detailed data for the card
    } catch (error) {
      console.error('Error fetching node details:', error)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const zoomIn = () => setScale(prev => Math.min(prev * 1.2, 3))
  const zoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.3))
  const resetView = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setSelectedNode(null)
  }

  if (isLoading) {
    return (
      <Card className="w-full h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Building graph...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Network Graph</span>
              </CardTitle>
              <CardDescription>
                Visual representation of your social connections and relationships
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetView}>
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              className="w-full h-96 border rounded-lg"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
            />
            <div className="absolute top-2 left-2 bg-background/80 backdrop-blur rounded-lg p-2">
              <div className="text-xs space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>People</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span>Organizations</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span>Interactions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                  <span>Social Media</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getNodeIcon(selectedNode)}
              <span>{selectedNode.name}</span>
              <Badge variant="secondary">{selectedNode.type}</Badge>
              {isLoadingDetails && (
                <div className="flex items-center space-x-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {/* Basic node data */}
                <div className="space-y-2 text-sm">
                  {selectedNode.data?.title && (
                    <div>
                      <span className="font-medium">Title:</span> {selectedNode.data.title}
                    </div>
                  )}
                  {selectedNode.data?.organization && (
                    <div>
                      <span className="font-medium">Organization:</span> {selectedNode.data.organization}
                    </div>
                  )}
                  {selectedNode.data?.date && (
                    <div>
                      <span className="font-medium">Date:</span> {selectedNode.data.date}
                    </div>
                  )}
                  {selectedNode.data?.summary && (
                    <div>
                      <span className="font-medium">Summary:</span> {selectedNode.data.summary}
                    </div>
                  )}
                  {selectedNode.data?.platform && selectedNode.data?.handle && (
                    <div>
                      <span className="font-medium">{selectedNode.data.platform}:</span> {selectedNode.data.handle}
                    </div>
                  )}
                </div>

                {/* Detailed database data */}
                {detailedNodeData && !isLoadingDetails && (
                  <>
                    {/* Current Roles */}
                    {detailedNodeData.formatted?.currentRoles && detailedNodeData.formatted.currentRoles.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Current Roles</h4>
                        {detailedNodeData.formatted.currentRoles.map((role: any, index: number) => (
                          <div key={index} className="p-2 bg-muted rounded text-xs">
                            <div className="font-medium">{role.title}</div>
                            <div className="text-muted-foreground">{role.organization}</div>
                            {role.startDate && (
                              <div className="text-muted-foreground">Since: {new Date(role.startDate).toLocaleDateString()}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Previous Work */}
                    {detailedNodeData.formatted?.previousWork && detailedNodeData.formatted.previousWork.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Previous Work</h4>
                        {detailedNodeData.formatted.previousWork.map((work: any, index: number) => (
                          <div key={index} className="p-2 bg-muted rounded text-xs">
                            <div className="font-medium">{work.title}</div>
                            <div className="text-muted-foreground">{work.organization}</div>
                            <div className="text-muted-foreground">
                              {work.startDate ? new Date(work.startDate).toLocaleDateString() : 'Unknown'} - 
                              {work.endDate ? new Date(work.endDate).toLocaleDateString() : 'Present'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Social Media */}
                    {detailedNodeData.formatted?.socialMedia && detailedNodeData.formatted.socialMedia.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Social Media</h4>
                        {detailedNodeData.formatted.socialMedia.map((social: any, index: number) => (
                          <div key={index} className="p-2 bg-muted rounded text-xs">
                            <div className="flex items-center space-x-2">
                              {getNodeIcon({ ...selectedNode, icon: getSocialIcon(social.platform) })}
                              <div>
                                <div className="font-medium">{social.platform}</div>
                                <div className="text-muted-foreground">{social.handle}</div>
                                {social.isVerified && (
                                  <Badge variant="secondary" className="text-xs">Verified</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactions */}
                    {detailedNodeData.formatted?.interactions && detailedNodeData.formatted.interactions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Recent Interactions</h4>
                        {detailedNodeData.formatted.interactions.slice(0, 3).map((interaction: any, index: number) => (
                          <div key={index} className="p-2 bg-muted rounded text-xs">
                            <div className="font-medium">{interaction.summary}</div>
                            {interaction.date && (
                              <div className="text-muted-foreground">{new Date(interaction.date).toLocaleDateString()}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                     {/* Team Members (for organizations) */}
                     {selectedNode.type === 'organization' && (
                       <>
                         {/* Current Team Members */}
                         {detailedNodeData.formatted?.currentEmployees && detailedNodeData.formatted.currentEmployees.length > 0 && (
                           <div className="space-y-2">
                             <h4 className="font-medium text-sm">Current Team Members</h4>
                             {detailedNodeData.formatted.currentEmployees.map((employee: any, index: number) => (
                               <div key={index} className="p-2 bg-muted rounded text-xs">
                                 <div className="font-medium">{employee.person}</div>
                                 <div className="text-muted-foreground">{employee.title}</div>
                                 {employee.startDate && (
                                   <div className="text-muted-foreground">Since: {new Date(employee.startDate).toLocaleDateString()}</div>
                                 )}
                               </div>
                             ))}
                           </div>
                         )}

                         {/* Previous Team Members */}
                         {detailedNodeData.formatted?.previousEmployees && detailedNodeData.formatted.previousEmployees.length > 0 && (
                           <div className="space-y-2">
                             <h4 className="font-medium text-sm">Previous Team Members</h4>
                             {detailedNodeData.formatted.previousEmployees.map((employee: any, index: number) => (
                               <div key={index} className="p-2 bg-muted rounded text-xs">
                                 <div className="font-medium">{employee.person}</div>
                                 <div className="text-muted-foreground">{employee.title}</div>
                                 <div className="text-muted-foreground">
                                   {employee.startDate ? new Date(employee.startDate).toLocaleDateString() : 'Unknown'} - 
                                   {employee.endDate ? new Date(employee.endDate).toLocaleDateString() : 'Present'}
                                 </div>
                               </div>
                             ))}
                           </div>
                         )}
                       </>
                     )}

                     {/* Basic Info */}
                     <div className="space-y-2">
                       <h4 className="font-medium text-sm">Basic Information</h4>
                       <div className="grid grid-cols-2 gap-2 text-xs">
                         {selectedNode.type === 'organization' && (
                           <>
                             {detailedNodeData.formatted?.industry && (
                               <div>
                                 <span className="font-medium">Industry:</span> {detailedNodeData.formatted.industry}
                               </div>
                             )}
                             {detailedNodeData.formatted?.size && (
                               <div>
                                 <span className="font-medium">Size:</span> {detailedNodeData.formatted.size}
                               </div>
                             )}
                             {detailedNodeData.formatted?.website && (
                               <div className="col-span-2">
                                 <span className="font-medium">Website:</span> {detailedNodeData.formatted.website}
                               </div>
                             )}
                             {detailedNodeData.formatted?.headquarters && (
                               <div className="col-span-2">
                                 <span className="font-medium">Headquarters:</span> {detailedNodeData.formatted.headquarters}
                               </div>
                             )}
                             {detailedNodeData.formatted?.founded && (
                               <div>
                                 <span className="font-medium">Founded:</span> {new Date(detailedNodeData.formatted.founded).getFullYear()}
                               </div>
                             )}
                           </>
                         )}
                         {selectedNode.type === 'person' && (
                           <>
                             {detailedNodeData.formatted?.email && (
                               <div>
                                 <span className="font-medium">Email:</span> {detailedNodeData.formatted.email}
                               </div>
                             )}
                             {detailedNodeData.formatted?.phone && (
                               <div>
                                 <span className="font-medium">Phone:</span> {detailedNodeData.formatted.phone}
                               </div>
                             )}
                           </>
                         )}
                         {detailedNodeData.formatted?.bio && (
                           <div className="col-span-2">
                             <span className="font-medium">Bio:</span> {detailedNodeData.formatted.bio}
                           </div>
                         )}
                         {detailedNodeData.formatted?.description && (
                           <div className="col-span-2">
                             <span className="font-medium">Description:</span> {detailedNodeData.formatted.description}
                           </div>
                         )}
                         {detailedNodeData.formatted?.createdAt && (
                           <div>
                             <span className="font-medium">Created:</span> {new Date(detailedNodeData.formatted.createdAt).toLocaleDateString()}
                           </div>
                         )}
                       </div>
                     </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Graph Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {graphData.nodes.filter(n => n.type === 'person').length}
              </div>
              <div className="text-sm text-muted-foreground">People</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">
                {graphData.nodes.filter(n => n.type === 'organization').length}
              </div>
              <div className="text-sm text-muted-foreground">Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-500">
                {graphData.nodes.filter(n => n.type === 'interaction').length}
              </div>
              <div className="text-sm text-muted-foreground">Interactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-violet-500">
                {graphData.nodes.filter(n => n.type === 'interaction' && n.data?.platform).length}
              </div>
              <div className="text-sm text-muted-foreground">Social Media</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}