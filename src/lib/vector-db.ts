import { Ollama } from 'ollama'
import { Pool } from 'pg'

// Vector database client using PostgreSQL directly
const vectorPool = new Pool({
  connectionString: process.env.VECTOR_DATABASE_URL || 'postgresql://edwardbeshers@localhost:5432/vector_db',
  ssl: false
})

if (process.env.NODE_ENV !== 'production') {
  console.log('Vector DB pool initialized:', !!vectorPool)
}

// Export a function to get the vector DB client
export async function getVectorDb() {
  return vectorPool
}

if (process.env.NODE_ENV !== 'production') {
  console.log('Vector Database URL:', process.env.VECTOR_DATABASE_URL)
  console.log('Vector DB client will be initialized on first use')
}

// Ollama client for embeddings
const ollama = new Ollama({ host: 'http://localhost:11434' })

// Embedding generation service
export class EmbeddingService {
  /**
   * Generate embedding for text content using Ollama nomic-embed-text
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await ollama.embeddings({
        model: 'nomic-embed-text',
        prompt: text,
      })

      return response.embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw new Error('Failed to generate embedding')
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  static async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = []
      for (const text of texts) {
        const response = await ollama.embeddings({
          model: 'nomic-embed-text',
          prompt: text,
        })
        embeddings.push(response.embedding)
      }
      return embeddings
    } catch (error) {
      console.error('Error generating batch embeddings:', error)
      throw new Error('Failed to generate batch embeddings')
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must be of same length')
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}

// Semantic search service
export class SemanticSearchService {
  /**
   * Store interaction with embedding
   */
  static async storeInteraction(
    interactionId: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Generate embedding for the content
      const embedding = await EmbeddingService.generateEmbedding(content)

      // Get vector database client
      const pool = await getVectorDb()

      // Store in vector database using PostgreSQL
      const client = await pool.connect()
      try {
        const query = `
          INSERT INTO interaction_embeddings (interaction_id, content, embedding, metadata)
          VALUES ($1, $2, $3, $4)
        `
        // Format embedding as PostgreSQL vector string: '[0.1,0.2,0.3,...]'
        const embeddingString = '[' + embedding.join(',') + ']'
        await client.query(query, [interactionId, content, embeddingString, JSON.stringify(metadata || {})])
        console.log(`Stored embedding for interaction ${interactionId}`)
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error storing interaction embedding:', error)
      throw error
    }
  }

  /**
   * Perform semantic search
   */
  static async search(
    query: string,
    limit: number = 10,
    threshold: number = 0.01
  ): Promise<Array<{
    interactionId: string
    content: string
    similarity: number
    metadata?: any
  }>> {
    try {
      // Generate query embedding
      const queryEmbedding = await EmbeddingService.generateEmbedding(query)

      // Get vector database client
      const pool = await getVectorDb()

      // Perform vector similarity search using pgvector
      const client = await pool.connect()
      try {
        const queryEmbeddingString = '[' + queryEmbedding.join(',') + ']'
        const results = await client.query(`
          SELECT 
            ie.interaction_id,
            ie.content,
            ie.metadata,
            1 - (ie.embedding <=> $1::vector) as similarity
          FROM interaction_embeddings ie
          WHERE 1 - (ie.embedding <=> $1::vector) >= $2
          ORDER BY similarity DESC
          LIMIT $3
        `, [queryEmbeddingString, threshold, limit])

        return results.rows.map(result => ({
          interactionId: result.interaction_id,
          content: result.content,
          similarity: parseFloat(result.similarity),
          metadata: result.metadata,
        }))
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error performing semantic search:', error)
      throw error
    }
  }

  /**
   * Hybrid search combining semantic and keyword matching
   */
  static async hybridSearch(
    query: string,
    limit: number = 10,
    semanticWeight: number = 0.7,
    keywordWeight: number = 0.3
  ): Promise<Array<{
    interactionId: string
    content: string
    combinedScore: number
    semanticScore: number
    keywordScore: number
    metadata?: any
  }>> {
    try {
      // Get semantic search results
      const semanticResults = await this.search(query, limit * 2, 0.5)

      // Get vector database client
      const pool = await getVectorDb()

      // Get keyword search results (simple text search)
      const client = await pool.connect()
      try {
        const keywordResults = await client.query(`
          SELECT 
            ie.interaction_id,
            ie.content,
            ie.metadata,
            ts_rank_cd(to_tsvector('english', ie.content), websearch_to_tsquery('english', $1)) as keyword_score
          FROM interaction_embeddings ie
          WHERE to_tsvector('english', ie.content) @@ websearch_to_tsquery('english', $1)
          ORDER BY keyword_score DESC
          LIMIT $2
        `, [query, limit * 2])

        // Combine and score results
        const combinedResults = new Map<string, any>()

        // Add semantic results
        semanticResults.forEach(result => {
          combinedResults.set(result.interactionId, {
            interactionId: result.interactionId,
            content: result.content,
            semanticScore: result.similarity,
            keywordScore: 0,
            combinedScore: result.similarity * semanticWeight,
            metadata: result.metadata,
          })
        })

        // Add keyword results and combine scores
        keywordResults.rows.forEach(result => {
          const existing = combinedResults.get(result.interaction_id)
          if (existing) {
            existing.keywordScore = parseFloat(result.keyword_score)
            existing.combinedScore += parseFloat(result.keyword_score) * keywordWeight
          } else {
            combinedResults.set(result.interaction_id, {
              interactionId: result.interaction_id,
              content: result.content,
              semanticScore: 0,
              keywordScore: parseFloat(result.keyword_score),
              combinedScore: parseFloat(result.keyword_score) * keywordWeight,
              metadata: result.metadata,
            })
          }
        })

        // Sort by combined score and return top results
        return Array.from(combinedResults.values())
          .sort((a, b) => b.combinedScore - a.combinedScore)
          .slice(0, limit)
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error performing hybrid search:', error)
      throw error
    }
  }

  /**
   * Update interaction embedding
   */
  static async updateInteraction(
    interactionId: string,
    content: string,
    metadata?: any
  ): Promise<void> {
    try {
      const embedding = await EmbeddingService.generateEmbedding(content)
      const pool = await getVectorDb()

      const client = await pool.connect()
      try {
        const embeddingString = '[' + embedding.join(',') + ']'
        await client.query(`
          UPDATE interaction_embeddings 
          SET content = $1, embedding = $2, metadata = $3
          WHERE interaction_id = $4
        `, [content, embeddingString, JSON.stringify(metadata || {}), interactionId])

        console.log(`Updated embedding for interaction ${interactionId}`)
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error updating interaction embedding:', error)
      throw error
    }
  }

  /**
   * Delete interaction embedding
   */
  static async deleteInteraction(interactionId: string): Promise<void> {
    try {
      const pool = await getVectorDb()
      const client = await pool.connect()
      try {
        await client.query(`
          DELETE FROM interaction_embeddings 
          WHERE interaction_id = $1
        `, [interactionId])

        console.log(`Deleted embedding for interaction ${interactionId}`)
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error deleting interaction embedding:', error)
      throw error
    }
  }

  /**
   * Find similar interactions
   */
  static async findSimilarInteractions(
    interactionId: string,
    limit: number = 5
  ): Promise<Array<{
    interactionId: string
    content: string
    similarity: number
    metadata?: any
  }>> {
    try {
      const pool = await getVectorDb()
      const client = await pool.connect()
      try {
        // Get the target interaction's embedding
        const targetResult = await client.query(`
          SELECT embedding FROM interaction_embeddings 
          WHERE interaction_id = $1
        `, [interactionId])

        if (targetResult.rows.length === 0) {
          throw new Error('Interaction not found')
        }

        const targetEmbedding = targetResult.rows[0].embedding

        // Find similar interactions
        const results = await client.query(`
          SELECT 
            ie.interaction_id,
            ie.content,
            ie.metadata,
            1 - (ie.embedding <=> $1::vector) as similarity
          FROM interaction_embeddings ie
          WHERE ie.interaction_id != $2
            AND 1 - (ie.embedding <=> $1::vector) >= 0.6
          ORDER BY similarity DESC
          LIMIT $3
        `, [targetEmbedding, interactionId, limit])

        return results.rows.map(result => ({
          interactionId: result.interaction_id,
          content: result.content,
          similarity: parseFloat(result.similarity),
          metadata: result.metadata,
        }))
      } finally {
        client.release()
      }
    } catch (error) {
      console.error('Error finding similar interactions:', error)
      throw error
    }
  }
}