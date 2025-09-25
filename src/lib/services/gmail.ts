import axios from "axios"

interface EmailMessage {
  id: string
  threadId: string
  snippet: string
  subject: string
  from: string
  to: string[]
  date: string
  labelIds: string[]
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: {
      data: string
      size: number
    }
  }
}

interface GmailAPIResponse {
  messages: EmailMessage[]
  nextPageToken?: string
  resultSizeEstimate: number
}

export class GmailService {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
    }
  }

  async listMessages(maxResults = 50, pageToken?: string): Promise<GmailAPIResponse> {
    try {
      const params = new URLSearchParams({
        maxResults: maxResults.toString(),
      })

      if (pageToken) {
        params.append("pageToken", pageToken)
      }

      const response = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
        { headers: this.headers }
      )

      const messageIds = response.data.messages || []
      const messages = await Promise.all(
        messageIds.map(async (msg: any) => this.getMessage(msg.id))
      )

      return {
        messages,
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate,
      }
    } catch (error) {
      console.error("Error listing Gmail messages:", error)
      throw new Error("Failed to list Gmail messages")
    }
  }

  async getMessage(messageId: string): Promise<EmailMessage> {
    try {
      const response = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
        { headers: this.headers }
      )

      const message = response.data

      // Extract headers
      const headers = message.payload.headers || []
      const subject = headers.find((h: any) => h.name === "Subject")?.value || ""
      const from = headers.find((h: any) => h.name === "From")?.value || ""
      const to = headers.find((h: any) => h.name === "To")?.value || ""
      const date = headers.find((h: any) => h.name === "Date")?.value || ""

      // Extract body
      let body = ""
      if (message.payload.body?.data) {
        body = Buffer.from(message.payload.body.data, "base64").toString("utf-8")
      } else if (message.payload.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            body = Buffer.from(part.body.data, "base64").toString("utf-8")
            break
          }
        }
      }

      return {
        id: message.id,
        threadId: message.threadId,
        snippet: message.snippet,
        subject,
        from,
        to: to.split(",").map(email => email.trim()),
        date,
        labelIds: message.labelIds || [],
        payload: {
          headers,
          body: message.payload.body ? { data: body, size: body.length } : undefined,
        },
      }
    } catch (error) {
      console.error("Error getting Gmail message:", error)
      throw new Error("Failed to get Gmail message")
    }
  }

  async searchMessages(query: string, maxResults = 50): Promise<EmailMessage[]> {
    try {
      const response = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        { headers: this.headers }
      )

      const messageIds = response.data.messages || []
      const messages = await Promise.all(
        messageIds.map(async (msg: any) => this.getMessage(msg.id))
      )

      return messages
    } catch (error) {
      console.error("Error searching Gmail messages:", error)
      throw new Error("Failed to search Gmail messages")
    }
  }

  async getAllMessages(startDate?: Date): Promise<EmailMessage[]> {
    const allMessages: EmailMessage[] = []
    let pageToken: string | undefined
    const maxResults = 100

    do {
      const response = await this.listMessages(maxResults, pageToken)
      allMessages.push(...response.messages)
      pageToken = response.nextPageToken
    } while (pageToken)

    // Filter by date if provided
    if (startDate) {
      return allMessages.filter(msg => new Date(msg.date) >= startDate)
    }

    return allMessages
  }
}