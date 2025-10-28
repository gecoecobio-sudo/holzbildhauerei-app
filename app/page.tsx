"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { ArticleCard } from "@/components/ArticleCard"
import { FilterPanel, FilterState } from "@/components/FilterPanel"
import { Source } from "@/lib/types"

export default function HomePage() {
  const [sources, setSources] = useState<Source[]>([])
  const [filteredSources, setFilteredSources] = useState<Source[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Calculate pagination
  const totalPages = Math.ceil(filteredSources.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedSources = filteredSources.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const resetPagination = () => setCurrentPage(1)

  // Extrahiere Filter-Optionen
  const categories = stats?.categories ? Object.keys(stats.categories) : []
  const languages = stats?.languages ? Object.keys(stats.languages) : []

  const allTags = Array.from(
    new Set(sources.flatMap(s => s.tags))
  ).sort()

  // Lade Daten
  const loadData = useCallback(async () => {
    try {
      const [sourcesRes, statsRes, authRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/stats'),
        fetch('/api/auth/check')
      ])

      const sourcesData = await sourcesRes.json()
      const statsData = await statsRes.json()
      const authData = await authRes.json()

      const parsedSources = sourcesData.sources.map((s: any) => ({
        ...s,
        tags: typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags,
        date_added: new Date(s.date_added),
        last_updated: new Date(s.last_updated)
      }))

      // Sort by rating (corrected_score or relevance_score) descending
      const sortedSources = parsedSources.sort((a: Source, b: Source) => {
        const scoreA = a.corrected_score || a.relevance_score
        const scoreB = b.corrected_score || b.relevance_score
        return scoreB - scoreA
      })

      setSources(sortedSources)
      setFilteredSources(sortedSources)
      setStats(statsData)
      setIsAdmin(authData.authenticated || false)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter-Handler
  const handleFilterChange = useCallback((filters: FilterState) => {
    let filtered = [...sources]

    // Suche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(searchLower) ||
        s.summary_de.toLowerCase().includes(searchLower) ||
        s.url.toLowerCase().includes(searchLower) ||
        s.tags.some(t => t.toLowerCase().includes(searchLower))
      )
    }

    // Kategorien (multi-select)
    if (filters.categories.length > 0) {
      filtered = filtered.filter(s => filters.categories.includes(s.category))
    }

    // Sprachen (multi-select)
    if (filters.languages.length > 0) {
      filtered = filtered.filter(s => filters.languages.includes(s.language))
    }

    // Tags (multi-select) - Artikel muss mindestens einen der ausgewählten Tags haben
    if (filters.tags.length > 0) {
      filtered = filtered.filter(s => s.tags.some(tag => filters.tags.includes(tag)))
    }

    // Qualität
    if (filters.minScore > 0) {
      filtered = filtered.filter(s =>
        (s.corrected_score || s.relevance_score) >= filters.minScore
      )
    }

    // Nur Empfohlene
    if (filters.starredOnly) {
      filtered = filtered.filter(s => s.star_rating)
    }

    // Sort by rating (corrected_score or relevance_score) descending
    filtered.sort((a, b) => {
      const scoreA = a.corrected_score || a.relevance_score
      const scoreB = b.corrected_score || b.relevance_score
      return scoreB - scoreA
    })

    setFilteredSources(filtered)
    resetPagination()
  }, [sources])

  // Suche triggern - ENTFERNT, wird jetzt über FilterPanel gehandhabt
  // useEffect(() => {
  //   const timeout = setTimeout(() => {
  //     handleFilterChange({
  //       search: searchInput,
  //       category: "",
  //       language: "",
  //       tag: "",
  //       minScore: 0,
  //       starredOnly: false
  //     })
  //   }, 300)

  //   return () => clearTimeout(timeout)
  // }, [searchInput, handleFilterChange])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[rgb(var(--border))] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[rgb(var(--accent-teal))] rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <h1 className="text-xl font-semibold">Holzbildhauerei Wissen</h1>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-xs text-tertiary hover:text-[rgb(var(--foreground))] transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Background */}
      <section className="py-8 bg-[rgb(var(--hover))]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-xl border border-[rgb(var(--border))]">
            {/* Background Image with Dark Overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200"
              style={{
                backgroundImage: 'url(/hero-background.jpg)',
                backgroundBlendMode: 'multiply'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 px-8 py-20 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white drop-shadow-lg">
                Entdecke hochwertige Ressourcen für Holzbildhauerei
              </h2>
              <p className="text-base md:text-lg text-white/95 max-w-2xl mx-auto drop-shadow-md font-medium">
                Eine kuratierte Sammlung von Fachartikeln, Tutorials, Werkzeugempfehlungen
                und Expertenwissen rund um Holzbildhauerei und traditionelles Holzhandwerk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filter */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Filter</h2>
              {!loading && (
                <FilterPanel
                  onFilterChange={handleFilterChange}
                  categories={categories}
                  languages={languages}
                  allTags={allTags}
                />
              )}
            </div>
          </aside>

          {/* Articles Grid */}
          <main className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-semibold">
                {filteredSources.length} Artikel
                {filteredSources.length > 0 && (
                  <span className="text-sm text-secondary ml-2">
                    (Seite {currentPage} von {totalPages})
                  </span>
                )}
              </h2>

              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-secondary">Pro Seite:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value))
                    resetPagination()
                  }}
                  className="notion-input text-sm py-1"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-2">⏳</div>
                <p className="text-secondary">Lade Artikel...</p>
              </div>
            ) : filteredSources.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">
                  Keine Artikel gefunden
                </h3>
                <p className="text-secondary">
                  Versuche andere Filtereinstellungen oder Suchbegriffe
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {paginatedSources.map(source => (
                    <ArticleCard
                      key={source.id}
                      source={source}
                      isAdmin={isAdmin}
                      onUpdate={loadData}
                      allSources={sources}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="notion-button-secondary px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Zurück
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          return page === 1 ||
                                 page === totalPages ||
                                 Math.abs(page - currentPage) <= 1
                        })
                        .map((page, idx, arr) => (
                          <div key={page} className="inline-flex items-center">
                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                              <span className="px-2 text-secondary">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                                currentPage === page
                                  ? 'bg-[rgb(var(--accent-teal))] text-white'
                                  : 'hover:bg-[rgb(var(--hover))]'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="notion-button-secondary px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Weiter
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgb(var(--border))] mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-secondary">
          <p>© 2025 Holzbildhauerei Wissen - Kuratiertes Fachwissen für Holzhandwerker</p>
        </div>
      </footer>
    </div>
  )
}
