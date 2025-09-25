import { GmailService } from "./gmail"
import { OutlookService } from "./outlook"
import { ExternalConnection, SyncResult, ImportProgress } from "./types"

export class ExternalConnectionService {
  private connections: Map<string, ExternalConnection> = new Map()
  private progressCallbacks: Map<string, (progress: ImportProgress) => void> = new Map()

  constructor() {
    // Initialize with supported connection types
    this.initializeDefaultConnections()
  }

  private initializeDefaultConnections() {
    const defaultConnections: ExternalConnection[] = [
      {
        id: "gmail",
        name: "Gmail",
        type: "gmail",
        isConnected: false,
        configuration: {
          scopes: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly"],
        },
      },
      {
        id: "outlook",
        name: "Outlook",
        type: "outlook",
        isConnected: false,
        configuration: {
          scopes: ["openid", "email", "profile", "Mail.Read"],
        },
      },
      {
        id: "whatsapp",
        name: "WhatsApp",
        type: "whatsapp",
        isConnected: false,
        configuration: {
          requiresPhone: true,
          apiEndpoint: "https://api.whatsapp.com",
        },
      },
      {
        id: "telegram",
        name: "Telegram",
        type: "telegram",
        isConnected: false,
        configuration: {
          requiresBotToken: true,
          apiEndpoint: "https://api.telegram.org",
        },
      },
      {
        id: "twitter",
        name: "Twitter",
        type: "twitter",
        isConnected: false,
        configuration: {
          scopes: ["tweet.read", "users.read", "follows.read"],
          apiEndpoint: "https://api.twitter.com/2",
        },
      },
      {
        id: "linkedin",
        name: "LinkedIn",
        type: "linkedin",
        isConnected: false,
        configuration: {
          scopes: ["r_liteprofile", "r_emailaddress", "r_network"],
          apiEndpoint: "https://api.linkedin.com/v2",
        },
      },
    ]

    defaultConnections.forEach(conn => {
      this.connections.set(conn.id, conn)
    })
  }

  getConnections(): ExternalConnection[] {
    return Array.from(this.connections.values())
  }

  getConnection(id: string): ExternalConnection | undefined {
    return this.connections.get(id)
  }

  async connectConnection(id: string, accessToken: string): Promise<boolean> {
    const connection = this.connections.get(id)
    if (!connection) {
      throw new Error(`Connection ${id} not found`)
    }

    try {
      // Test the connection
      let isConnected = false

      switch (connection.type) {
        case "gmail":
          const gmailService = new GmailService(accessToken)
          await gmailService.listMessages(1) // Test with minimal request
          isConnected = true
          break
        case "outlook":
          const outlookService = new OutlookService(accessToken)
          await outlookService.listMessages(1) // Test with minimal request
          isConnected = true
          break
        default:
          // For other services, we'll consider them connected if we have an access token
          isConnected = true
      }

      if (isConnected) {
        const updatedConnection: ExternalConnection = {
          ...connection,
          isConnected: true,
          lastSync: new Date(),
        }
        this.connections.set(id, updatedConnection)
      }

      return isConnected
    } catch (error) {
      console.error(`Failed to connect to ${connection.name}:`, error)
      return false
    }
  }

  async disconnectConnection(id: string): Promise<boolean> {
    const connection = this.connections.get(id)
    if (!connection) {
      throw new Error(`Connection ${id} not found`)
    }

    const updatedConnection: ExternalConnection = {
      ...connection,
      isConnected: false,
      lastSync: undefined,
    }
    this.connections.set(id, updatedConnection)

    return true
  }

  async syncConnection(id: string, accessToken?: string): Promise<SyncResult> {
    const connection = this.connections.get(id)
    if (!connection) {
      throw new Error(`Connection ${id} not found`)
    }

    if (!connection.isConnected) {
      throw new Error(`Connection ${connection.name} is not connected`)
    }

    const startTime = Date.now()
    let processed = 0
    let newItems = 0
    let updatedItems = 0
    const errors: string[] = []

    try {
      // Update progress
      this.updateProgress(id, {
        connectionId: id,
        status: "syncing",
        progress: 0,
        total: 0,
        message: `Starting sync for ${connection.name}...`,
        startTime: new Date(),
      })

      switch (connection.type) {
        case "gmail":
          if (!accessToken) throw new Error("Access token required for Gmail sync")
          const gmailService = new GmailService(accessToken)
          const gmailMessages = await gmailService.getAllMessages(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
          processed = gmailMessages.length
          
          // Process messages and extract social information
          for (const message of gmailMessages) {
            try {
              // TODO: Process message and extract social information
              // This would call the ingestion API
              newItems++ // Placeholder
            } catch (error) {
              errors.push(`Failed to process Gmail message ${message.id}: ${error}`)
            }
          }
          break

        case "outlook":
          if (!accessToken) throw new Error("Access token required for Outlook sync")
          const outlookService = new OutlookService(accessToken)
          const outlookMessages = await outlookService.getAllMessages(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Last 30 days
          processed = outlookMessages.length
          
          // Process messages and extract social information
          for (const message of outlookMessages) {
            try {
              // TODO: Process message and extract social information
              newItems++ // Placeholder
            } catch (error) {
              errors.push(`Failed to process Outlook message ${message.id}: ${error}`)
            }
          }
          break

        default:
          // Handle other connection types
          processed = 100 // Placeholder
          newItems = 50 // Placeholder
      }

      // Update connection with sync info
      const updatedConnection: ExternalConnection = {
        ...connection,
        lastSync: new Date(),
        totalItems: (connection.totalItems || 0) + newItems,
      }
      this.connections.set(id, updatedConnection)

      // Update progress
      this.updateProgress(id, {
        connectionId: id,
        status: "completed",
        progress: processed,
        total: processed,
        message: `Sync completed for ${connection.name}`,
        startTime: new Date(startTime),
        endTime: new Date(),
      })

      return {
        connectionId: id,
        success: errors.length === 0,
        processed,
        newItems,
        updatedItems,
        errors,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      const errorMessage = `Sync failed for ${connection.name}: ${error}`
      errors.push(errorMessage)

      // Update progress with error
      this.updateProgress(id, {
        connectionId: id,
        status: "error",
        progress: processed,
        total: processed,
        message: errorMessage,
        startTime: new Date(startTime),
        endTime: new Date(),
      })

      return {
        connectionId: id,
        success: false,
        processed,
        newItems,
        updatedItems,
        errors,
        duration: Date.now() - startTime,
      }
    }
  }

  onProgress(id: string, callback: (progress: ImportProgress) => void): void {
    this.progressCallbacks.set(id, callback)
  }

  private updateProgress(id: string, progress: ImportProgress): void {
    const callback = this.progressCallbacks.get(id)
    if (callback) {
      callback(progress)
    }
  }
}

// Global instance
export const externalConnectionService = new ExternalConnectionService()