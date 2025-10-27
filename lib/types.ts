export interface Source {
  id: number
  url: string
  title: string
  category: string
  summary_de: string
  tags: string[]
  language: string
  date_added: Date
  source_query: string | null
  relevance_score: number
  corrected_score: number | null
  star_rating: boolean
  last_updated: Date
}

export interface SearchQuery {
  id: number
  query: string
  status: string
  date_added: Date
  date_processed: Date | null
  error_message: string | null
  results_count: number
  is_ai_generated: boolean
}

export interface TagCooccurrence {
  id: number
  tag1: string
  tag2: string
  count: number
  last_updated: Date
}

export interface SourceFilter {
  search?: string
  category?: string
  language?: string
  tag?: string
  minScore?: number
  starredOnly?: boolean
}
