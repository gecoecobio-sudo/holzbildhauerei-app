"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Search, Sparkles, Play, Trash2, Filter, Clock, CheckCircle, XCircle, Loader, ChevronDown, ChevronUp } from "lucide-react"
import { SearchQuery, Source } from "@/lib/types"
import { ArticleCard } from "@/components/ArticleCard"

export default function QueriesManagementPage() {
  const [queries, setQueries] = useState<SearchQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [aiGeneratedOnly, setAiGeneratedOnly] = useState(false)
  const [newQuery, setNewQuery] = useState("")
  const [addingQuery, setAddingQuery] = useState(false)
  const [generatingQueries, setGeneratingQueries] = useState(false)
  const [generateTopic, setGenerateTopic] = useState("")
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set())


  // Sources display state
  const [expandedQueryId, setExpandedQueryId] = useState<number | null>(null)
  const [querySources, setQuerySources] = useState<Record<number, Source[]>>({})
  const [loadingSources, setLoadingSources] = useState<Set<number>>(new Set())

  // Manual source adding state - support multiple concurrent sources
  const [manualUrl, setManualUrl] = useState("")
  const [manualSourcePreview, setManualSourcePreview] = useState<any>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [savingSourceIds, setSavingSourceIds] = useState<Set<string>>(new Set())
  const [savedSources, setSavedSources] = useState<string[]>([])

  const router = useRouter()

  useEffect(() => {
    loadQueries()
  }, [statusFilter, aiGeneratedOnly])

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadQueries()
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  async function loadQueries() {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (aiGeneratedOnly) params.set('ai_generated', 'true')
      if (searchInput) params.set('search', searchInput)

      const res = await fetch(`/api/admin/queries?${params}`)
      if (res.status === 401) {
        router.push('/admin')
        return
      }

      const data = await res.json()
      setQueries(data.queries)
    } catch (error) {
      console.error('Failed to load queries:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addQuery() {
    if (!newQuery.trim()) return

    setAddingQuery(true)
    try {
      const res = await fetch('/api/admin/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newQuery.trim() })
      })

      if (res.ok) {
        setNewQuery("")
        loadQueries()
      }
    } catch (error) {
      console.error('Failed to add query:', error)
    } finally {
      setAddingQuery(false)
    }
  }

  async function generateQueries() {
    if (!generateTopic.trim()) return

    setGeneratingQueries(true)
    try {
      const res = await fetch('/api/admin/queries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: generateTopic.trim(), count: 5 })
      })

      if (res.ok) {
        setGenerateTopic("")
        loadQueries()
      }
    } catch (error) {
      console.error('Failed to generate queries:', error)
    } finally {
      setGeneratingQueries(false)
    }
  }

  async function processQuery(id: number) {
    setProcessingIds(prev => new Set(prev).add(id))

    try {
      // Start processing (don't wait for response as it takes long)
      fetch('/api/admin/queries/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId: id })
      }).catch(error => {
        console.error('Processing request failed:', error)
      })

      // Poll for status updates every 3 seconds
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/admin/queries?search=&status=`)
          if (statusRes.ok) {
            const data = await statusRes.json()
            const query = data.queries.find((q: any) => q.id === id)

            if (query && query.status !== 'processing') {
              // Processing complete or failed
              clearInterval(pollInterval)
              setProcessingIds(prev => {
                const next = new Set(prev)
                next.delete(id)
                return next
              })
              loadQueries()
            }
          }
        } catch (error) {
          console.error('Failed to poll status:', error)
        }
      }, 3000)

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval)
        setProcessingIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        loadQueries()
      }, 600000)
    } catch (error) {
      console.error('Failed to process query:', error)
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function cancelQuery(id: number) {
    if (!confirm('Möchtest du die Verarbeitung wirklich abbrechen?')) return

    try {
      const res = await fetch('/api/admin/queries/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryId: id })
      })

      if (res.ok) {
        setProcessingIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        loadQueries()
      }
    } catch (error) {
      console.error('Failed to cancel query:', error)
    }
  }


  async function deleteQuery(id: number) {
    if (!confirm('Möchtest du diese Query wirklich löschen?')) return

    try {
      const res = await fetch(`/api/admin/queries/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setQueries(queries.filter(q => q.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete query:', error)
    }
  }

  async function loadQuerySources(queryId: number, queryText: string, forceReload: boolean = false) {
    if (querySources[queryId] && !forceReload) {
      // Sources already loaded, just toggle
      setExpandedQueryId(expandedQueryId === queryId ? null : queryId)
      return
    }

    setLoadingSources(prev => new Set(prev).add(queryId))

    try {
      // Fetch sources with this source_query
      const res = await fetch(`/api/sources`)
      if (!res.ok) throw new Error('Failed to load sources')

      const data = await res.json()

      // Filter sources that match this query
      const matchingSources = data.sources
        .filter((s: any) => s.source_query === queryText)
        .map((s: any) => ({
          ...s,
          tags: typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags,
          date_added: new Date(s.date_added),
          last_updated: new Date(s.last_updated)
        }))

      setQuerySources(prev => ({
        ...prev,
        [queryId]: matchingSources
      }))

      setExpandedQueryId(queryId)
    } catch (error) {
      console.error('Failed to load query sources:', error)
    } finally {
      setLoadingSources(prev => {
        const next = new Set(prev)
        next.delete(queryId)
        return next
      })
    }
  }

  async function generateManualSourcePreview() {
    if (!manualUrl.trim()) return

    setLoadingPreview(true)
    try {
      const res = await fetch('/api/admin/sources/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: manualUrl.trim() })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to generate preview')
      }

      const preview = await res.json()
      setManualSourcePreview({
        ...preview,
        relevance_score: 7,
        star_rating: false
      })
    } catch (error: any) {
      alert(error.message || 'Fehler beim Generieren der Vorschau')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function saveManualSource() {
    if (!manualSourcePreview) return

    const sourceUrl = manualUrl.trim()
    const sourceId = `source-${Date.now()}`

    // Add to saving list
    setSavingSourceIds(prev => new Set(prev).add(sourceId))

    // Clear form immediately so user can add next source
    const previewData = { ...manualSourcePreview }
    setManualUrl("")
    setManualSourcePreview(null)

    // Save in background
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sourceUrl,
          title: previewData.title,
          summary_de: previewData.summary_de,
          category: previewData.category,
          language: previewData.language,
          tags: previewData.tags,
          relevance_score: previewData.relevance_score,
          star_rating: previewData.star_rating,
          source_query: null
        })
      })

      if (res.ok) {
        setSavedSources(prev => [...prev, sourceUrl])
      } else {
        const error = await res.json()
        alert(`Fehler beim Speichern von ${sourceUrl}: ${error.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      alert(`Fehler beim Speichern von ${sourceUrl}: ${error.message || 'Unknown error'}`)
    } finally {
      setSavingSourceIds(prev => {
        const next = new Set(prev)
        next.delete(sourceId)
        return next
      })
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />
      case 'processed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700'
      case 'processing':
        return 'bg-blue-100 text-blue-700'
      case 'processed':
        return 'bg-green-100 text-green-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const pendingQueries = queries.filter(q => q.status === 'pending')
  const pendingCount = pendingQueries.length
  const processedCount = queries.filter(q => q.status === 'processed').length

  return (
    <div className="min-h-screen bg-[rgb(var(--hover))]">
      {/* Header */}
      <header className="border-b border-[rgb(var(--border))] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="notion-button-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </button>
              <h1 className="text-xl font-semibold">Query Management</h1>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-secondary">
                {pendingCount} ausstehend • {processedCount} verarbeitet
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Add Query Section */}
        <div className="notion-card mb-6">
          <h2 className="font-semibold mb-4">Neue Query hinzufügen</h2>

          <div className="space-y-4">
            {/* Manual Query */}
            <div>
              <label className="block text-sm font-medium mb-2">Manuelle Query</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addQuery()
                    }
                  }}
                  className="notion-input flex-1"
                  placeholder="z.B. Holzbildhauerei Werkzeuge für Anfänger"
                />
                <button
                  onClick={addQuery}
                  disabled={addingQuery || !newQuery.trim()}
                  className="notion-button-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {addingQuery ? 'Hinzufügen...' : 'Hinzufügen'}
                </button>
              </div>
            </div>

            {/* AI Generation */}
            <div className="border-t border-[rgb(var(--border))] pt-4">
              <label className="block text-sm font-medium mb-2">KI-generierte Queries</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={generateTopic}
                  onChange={(e) => setGenerateTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      generateQueries()
                    }
                  }}
                  className="notion-input flex-1"
                  placeholder="z.B. Schnitzmesser und deren Anwendung"
                />
                <button
                  onClick={generateQueries}
                  disabled={generatingQueries || !generateTopic.trim()}
                  className="notion-button-primary flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {generatingQueries ? 'Generiert...' : '5 Queries generieren'}
                </button>
              </div>
              <p className="text-xs text-secondary mt-1">
                Gemini generiert automatisch 5 relevante Suchqueries basierend auf deinem Thema
              </p>
            </div>
          </div>
        </div>

        {/* Manual Source Adding */}
        <div className="notion-card mb-6">
          <h2 className="font-semibold mb-4">Manuelle Quelle hinzufügen</h2>

          <div className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium mb-2">URL der Quelle</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualUrl.trim()) {
                      generateManualSourcePreview()
                    }
                  }}
                  className="notion-input flex-1"
                  placeholder="https://..."
                  disabled={loadingPreview}
                />
                <button
                  onClick={generateManualSourcePreview}
                  disabled={loadingPreview || !manualUrl.trim()}
                  className="notion-button-primary flex items-center gap-2"
                >
                  {loadingPreview ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Lädt...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Vorschau generieren
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-secondary mt-1">
                Gemini analysiert die URL und generiert automatisch Titel, Zusammenfassung, Kategorie und Tags
              </p>
            </div>

            {/* Preview */}
            {manualSourcePreview && (
              <div className="border-t border-[rgb(var(--border))] pt-4">
                <h3 className="text-sm font-semibold mb-3">Vorschau & Anpassung</h3>

                <div className="space-y-3">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-medium mb-1">Titel</label>
                    <input
                      type="text"
                      value={manualSourcePreview.title}
                      onChange={(e) => setManualSourcePreview({...manualSourcePreview, title: e.target.value})}
                      className="notion-input text-sm w-full"
                    />
                  </div>

                  {/* Summary */}
                  <div>
                    <label className="block text-xs font-medium mb-1">Zusammenfassung</label>
                    <textarea
                      value={manualSourcePreview.summary_de}
                      onChange={(e) => setManualSourcePreview({...manualSourcePreview, summary_de: e.target.value})}
                      className="notion-input text-sm w-full"
                      rows={3}
                    />
                  </div>

                  {/* Category & Language */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Kategorie</label>
                      <select
                        value={manualSourcePreview.category}
                        onChange={(e) => setManualSourcePreview({...manualSourcePreview, category: e.target.value})}
                        className="notion-input text-sm w-full"
                      >
                        <option value="Tutorial">Tutorial</option>
                        <option value="Werkzeug">Werkzeug</option>
                        <option value="Material">Material</option>
                        <option value="Technik">Technik</option>
                        <option value="Inspiration">Inspiration</option>
                        <option value="Community">Community</option>
                        <option value="Geschichte">Geschichte</option>
                        <option value="Sonstiges">Sonstiges</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Sprache</label>
                      <select
                        value={manualSourcePreview.language}
                        onChange={(e) => setManualSourcePreview({...manualSourcePreview, language: e.target.value})}
                        className="notion-input text-sm w-full"
                      >
                        <option value="Deutsch">Deutsch</option>
                        <option value="English">English</option>
                        <option value="Français">Français</option>
                      </select>
                    </div>
                  </div>

                  {/* Quality Score & Star */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Qualität (0-10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={manualSourcePreview.relevance_score}
                        onChange={(e) => setManualSourcePreview({...manualSourcePreview, relevance_score: parseInt(e.target.value) || 0})}
                        className="notion-input text-sm w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Empfehlung</label>
                      <label className="flex items-center gap-2 cursor-pointer mt-2">
                        <input
                          type="checkbox"
                          checked={manualSourcePreview.star_rating}
                          onChange={(e) => setManualSourcePreview({...manualSourcePreview, star_rating: e.target.checked})}
                          className="w-4 h-4 rounded border-[rgb(var(--border))]"
                        />
                        <span className="text-sm">Als ⭐ Empfehlung markieren</span>
                      </label>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-medium mb-1">Tags (kommagetrennt)</label>
                    <input
                      type="text"
                      value={manualSourcePreview.tags.join(', ')}
                      onChange={(e) => setManualSourcePreview({
                        ...manualSourcePreview,
                        tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                      })}
                      className="notion-input text-sm w-full"
                      placeholder="Holzschnitzen, Tutorial, Anfänger, ..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={saveManualSource}
                      className="notion-button-primary flex items-center gap-2 flex-1"
                    >
                      <Plus className="w-4 h-4" />
                      Quelle speichern & nächste hinzufügen
                    </button>
                    <button
                      onClick={() => {
                        setManualSourcePreview(null)
                        setManualUrl("")
                      }}
                      className="notion-button-secondary"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>

                {/* Status of saving sources */}
                {savingSourceIds.size > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>{savingSourceIds.size} Quelle(n) werden gespeichert...</span>
                    </div>
                  </div>
                )}

                {/* Successfully saved sources */}
                {savedSources.length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="text-sm text-green-700 font-medium mb-1">
                      ✓ {savedSources.length} Quelle(n) erfolgreich gespeichert
                    </div>
                    <button
                      onClick={() => setSavedSources([])}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Liste leeren
                    </button>
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Filters */}
        <div className="notion-card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-secondary" />
            <h2 className="font-semibold">Filter & Suche</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <input
                type="search"
                placeholder="Suche nach Query..."
                className="notion-input text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="notion-input text-sm"
            >
              <option value="">Alle Status</option>
              <option value="pending">Ausstehend</option>
              <option value="processing">In Bearbeitung</option>
              <option value="processed">Verarbeitet</option>
              <option value="failed">Fehlgeschlagen</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aiGeneratedOnly}
                onChange={(e) => setAiGeneratedOnly(e.target.checked)}
                className="w-4 h-4 rounded border-[rgb(var(--border))] text-[rgb(var(--accent-teal))]"
              />
              <span className="text-sm font-medium">Nur KI-generiert</span>
            </label>
          </div>
        </div>

        {/* Queries List */}
        <div className="notion-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{queries.length} Queries</h2>
          </div>

          {loading ? (
            <div className="text-center py-12 text-secondary">Lädt...</div>
          ) : queries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-secondary">Noch keine Queries vorhanden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queries.map(query => {
                const isProcessing = processingIds.has(query.id)

                return (
                  <div key={query.id} className="border rounded-lg p-4 transition-all border-[rgb(var(--border))] hover:bg-[rgb(var(--hover))]">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(query.status)}
                          <h3 className="font-semibold text-base">{query.query}</h3>
                          {query.is_ai_generated && (
                            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-secondary mb-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded ${getStatusBadgeClass(query.status)}`}>
                            {query.status}
                          </span>
                          <span>Hinzugefügt: {new Date(query.date_added).toLocaleDateString('de-DE')}</span>
                          {query.date_processed && (
                            <span>Verarbeitet: {new Date(query.date_processed).toLocaleDateString('de-DE')}</span>
                          )}
                          {query.results_count > 0 && (
                            <span className="text-green-600 font-medium">{query.results_count} Ergebnisse</span>
                          )}
                        </div>

                        {query.error_message && (
                          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            {query.error_message}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Process Button */}
                        {query.status === 'pending' && (
                          <button
                            onClick={() => processQuery(query.id)}
                            disabled={isProcessing}
                            className="notion-button-primary flex items-center gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin" />
                                Verarbeitet...
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Verarbeiten
                              </>
                            )}
                          </button>
                        )}

                        {/* Processing Status */}
                        {query.status === 'processing' && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                              <Loader className="w-4 h-4 animate-spin text-blue-600" />
                              <span className="text-sm text-blue-700 font-medium">
                                Verarbeitung läuft...
                              </span>
                            </div>
                            <button
                              onClick={() => cancelQuery(query.id)}
                              className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                            >
                              Abbrechen
                            </button>
                          </div>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => deleteQuery(query.id)}
                          disabled={isProcessing || query.status === 'processing'}
                          className="p-2 rounded hover:bg-red-50 text-red-600 transition-colors disabled:opacity-30"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Show sources for processed queries */}
                    {query.status === 'processed' && (
                      <div className="mt-4 pt-4 border-t border-[rgb(var(--border))]">
                        {query.results_count > 0 ? (
                          <>
                            <button
                              onClick={() => loadQuerySources(query.id, query.query)}
                              disabled={loadingSources.has(query.id)}
                              className="flex items-center gap-2 text-sm text-[rgb(var(--accent-teal))] hover:underline mb-3"
                            >
                              {expandedQueryId === query.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                              {loadingSources.has(query.id) ? (
                                <>
                                  <Loader className="w-4 h-4 animate-spin" />
                                  Lädt Artikel...
                                </>
                              ) : (
                                <>
                                  {expandedQueryId === query.id ? 'Artikel ausblenden' : `${query.results_count} Artikel anzeigen`}
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <div className="text-sm text-secondary">
                            Keine neuen Artikel gefunden (alle URLs existieren bereits oder erfüllen nicht die Qualitätskriterien)
                          </div>
                        )}

                        {expandedQueryId === query.id && querySources[query.id] && (
                          <div className="space-y-4">
                            {querySources[query.id].length > 0 ? (
                              querySources[query.id].map(source => (
                                <ArticleCard
                                  key={source.id}
                                  source={source}
                                  isAdmin={true}
                                  onUpdate={() => loadQuerySources(query.id, query.query, true)}
                                  allSources={querySources[query.id]}
                                />
                              ))
                            ) : (
                              <div className="text-center py-6 text-sm text-secondary">
                                Keine Artikel gefunden
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
