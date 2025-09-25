export interface ExternalConnection {
  id: string
  name: string
  type: 'gmail' | 'outlook' | 'whatsapp' | 'telegram' | 'twitter' | 'linkedin'
  isConnected: boolean
  lastSync?: Date
  totalItems?: number
  configuration: {
    [key: string]: any
  }
}

export interface SyncResult {
  connectionId: string
  success: boolean
  processed: number
  newItems: number
  updatedItems: number
  errors: string[]
  duration: number
}

export interface ImportProgress {
  connectionId: string
  status: 'idle' | 'syncing' | 'completed' | 'error'
  progress: number
  total: number
  message: string
  startTime?: Date
  endTime?: Date
}