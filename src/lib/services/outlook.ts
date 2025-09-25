import axios from "axios"

interface OutlookMessage {
  id: string
  subject: string
  from: {
    emailAddress: {
      name: string
      address: string
    }
  }
  toRecipients: Array<{
    emailAddress: {
      name: string
      address: string
    }
  }>
  body: {
    contentType: string
    content: string
  }
  receivedDateTime: string
  sentDateTime: string
  hasAttachments: boolean
  importance: string
  conversationId: string
}

interface OutlookAPIResponse {
  value: OutlookMessage[]
  "@odata.nextLink"?: string
}

export class OutlookService {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    }
  }

  async listMessages(maxResults = 50, nextLink?: string): Promise<OutlookAPIResponse> {
    try {
      let url: string
      if (nextLink) {
        url = nextLink
      } else {
        const params = new URLSearchParams({
          $top: maxResults.toString(),
          $select: "id,subject,from,toRecipients,body,receivedDateTime,sentDateTime,hasAttachments,importance,conversationId",
          $orderby: "receivedDateTime desc",
        })
        url = `https://graph.microsoft.com/v1.0/me/messages?${params}`
      }

      const response = await axios.get(url, { headers: this.headers })
      return response.data
    } catch (error) {
      console.error("Error listing Outlook messages:", error)
      throw new Error("Failed to list Outlook messages")
    }
  }

  async getMessage(messageId: string): Promise<OutlookMessage> {
    try {
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
        { headers: this.headers }
      )
      return response.data
    } catch (error) {
      console.error("Error getting Outlook message:", error)
      throw new Error("Failed to get Outlook message")
    }
  }

  async searchMessages(query: string, maxResults = 50): Promise<OutlookMessage[]> {
    try {
      const encodedQuery = encodeURIComponent(query)
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/me/messages?$search=${encodedQuery}&$top=${maxResults}&$select=id,subject,from,toRecipients,body,receivedDateTime,sentDateTime,hasAttachments,importance,conversationId&$orderby=receivedDateTime desc`,
        { headers: this.headers }
      )
      return response.data.value
    } catch (error) {
      console.error("Error searching Outlook messages:", error)
      throw new Error("Failed to search Outlook messages")
    }
  }

  async getAllMessages(startDate?: Date): Promise<OutlookMessage[]> {
    const allMessages: OutlookMessage[] = []
    let nextLink: string | undefined
    const maxResults = 100

    do {
      const response = await this.listMessages(maxResults, nextLink)
      allMessages.push(...response.value)
      nextLink = response["@odata.nextLink"]
    } while (nextLink)

    // Filter by date if provided
    if (startDate) {
      return allMessages.filter(msg => new Date(msg.receivedDateTime) >= startDate)
    }

    return allMessages
  }
}