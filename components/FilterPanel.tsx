"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void
  categories: string[]
  languages: string[]
  allTags: string[]
}

export interface FilterState {
  search: string
  categories: string[]
  languages: string[]
  tags: string[]
  minScore: number
  starredOnly: boolean
}

interface TagStats {
  tag: string
  count: number
  sources: any[]
}

export function FilterPanel({ onFilterChange, categories, languages, allTags }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    categories: [],
    languages: [],
    tags: [],
    minScore: 8,
    starredOnly: false
  })

  // Tag-specific states
  const [tagStats, setTagStats] = useState<TagStats[]>([])
  const [loadingTags, setLoadingTags] = useState(false)
  const [tagSearchTerm, setTagSearchTerm] = useState("")
  const [minTagCount, setMinTagCount] = useState(1)
  const [tagsExpanded, setTagsExpanded] = useState(true) // Default: geöffnet

  // Category search state
  const [categorySearchTerm, setCategorySearchTerm] = useState("")

  // Sort and filter categories and languages alphabetically
  const sortedCategories = [...categories].sort()
  const filteredCategories = sortedCategories.filter(cat =>
    cat.toLowerCase().includes(categorySearchTerm.toLowerCase())
  )
  const sortedLanguages = [...languages].sort()

  // Load tag statistics
  useEffect(() => {
    if (tagsExpanded && tagStats.length === 0) {
      loadTagStats()
    }
  }, [tagsExpanded])

  async function loadTagStats() {
    setLoadingTags(true)
    try {
      const res = await fetch('/api/tags')
      if (!res.ok) throw new Error('Failed to load tags')
      const data = await res.json()
      setTagStats(data.tags)
    } catch (error) {
      console.error('Error loading tags:', error)
    } finally {
      setLoadingTags(false)
    }
  }

  // Filter tags based on search and min count
  const filteredTagStats = tagStats.filter(t =>
    t.tag.toLowerCase().includes(tagSearchTerm.toLowerCase()) &&
    t.count >= minTagCount
  )

  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const toggleArrayFilter = (key: 'categories' | 'languages' | 'tags', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Suche */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Suche</h3>
        <input
          type="search"
          placeholder="Artikel suchen..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="notion-input text-sm w-full"
        />
      </div>

      {/* Kategorie - Multi-Select */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Kategorien {filters.categories.length > 0 && `(${filters.categories.length})`}
        </h3>

        <div className="space-y-3">
          {/* Category Search */}
          <input
            type="search"
            placeholder="Kategorie suchen..."
            value={categorySearchTerm}
            onChange={(e) => setCategorySearchTerm(e.target.value)}
            className="notion-input text-sm w-full"
          />

          {/* Categories List */}
          <div className="space-y-1 max-h-40 overflow-y-auto border border-[rgb(var(--border))] rounded-md p-2">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-[rgb(var(--hover))] px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(cat)}
                    onChange={() => toggleArrayFilter('categories', cat)}
                    className="w-4 h-4 rounded border-[rgb(var(--border))] text-[rgb(var(--accent-teal))] focus:ring-[rgb(var(--accent-teal))]"
                  />
                  <span className="text-sm">{cat}</span>
                </label>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-secondary">
                Keine Kategorien gefunden
              </div>
            )}
          </div>

          {/* Selected categories indicator */}
          {filters.categories.length > 0 && (
            <div className="p-2 bg-[rgb(var(--hover))] rounded-md">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-secondary">{filters.categories.length} ausgewählt:</span>
                <button
                  onClick={() => updateFilter('categories', [])}
                  className="text-[rgb(var(--accent-teal))] hover:underline"
                >
                  Alle entfernen
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {filters.categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleArrayFilter('categories', cat)}
                    className="text-xs px-2 py-0.5 bg-[rgb(var(--accent-teal))]/10 text-[rgb(var(--accent-teal))] rounded hover:bg-[rgb(var(--accent-teal))]/20"
                  >
                    {cat} ✕
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sprache - Multi-Select */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Sprachen {filters.languages.length > 0 && `(${filters.languages.length})`}
        </h3>
        <div className="space-y-1 max-h-32 overflow-y-auto border border-[rgb(var(--border))] rounded-md p-2">
          {sortedLanguages.map(lang => (
            <label key={lang} className="flex items-center gap-2 cursor-pointer hover:bg-[rgb(var(--hover))] px-2 py-1 rounded">
              <input
                type="checkbox"
                checked={filters.languages.includes(lang)}
                onChange={() => toggleArrayFilter('languages', lang)}
                className="w-4 h-4 rounded border-[rgb(var(--border))] text-[rgb(var(--accent-teal))] focus:ring-[rgb(var(--accent-teal))]"
              />
              <span className="text-sm">{lang}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Qualität */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Qualität</h3>
        <select
          value={filters.minScore}
          onChange={(e) => updateFilter('minScore', parseInt(e.target.value))}
          className="notion-input text-sm w-full"
        >
          <option value="0">Alle (0+)</option>
          <option value="9">Sehr gut (9+)</option>
          <option value="8">Gut (8+)</option>
          <option value="7">OK (7+)</option>
          <option value="5">Mittel (5+)</option>
        </select>
      </div>

      {/* Tags - Erweiterte Ansicht */}
      <div>
        <button
          onClick={() => setTagsExpanded(!tagsExpanded)}
          className="flex items-center justify-between w-full text-sm font-semibold mb-2 hover:text-[rgb(var(--accent-teal))] transition-colors"
        >
          <span>Tags</span>
          {tagsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {!tagsExpanded ? (
          // Collapsed: Show count
          <div className="text-sm text-secondary">
            {filters.tags.length > 0 ? `${filters.tags.length} ausgewählt` : 'Keine ausgewählt'}
          </div>
        ) : (
          // Extended view when expanded
          <div className="space-y-3 pt-2">
            {/* Tag Search */}
            <input
              type="search"
              placeholder="Tag suchen..."
              value={tagSearchTerm}
              onChange={(e) => setTagSearchTerm(e.target.value)}
              className="notion-input text-sm w-full"
            />

            {/* Min Count Filter */}
            <select
              value={minTagCount}
              onChange={(e) => setMinTagCount(parseInt(e.target.value))}
              className="notion-input text-sm w-full"
            >
              <option value="1">Alle (1+)</option>
              <option value="2">2+ Quellen</option>
              <option value="5">5+ Quellen</option>
              <option value="10">10+ Quellen</option>
              <option value="20">20+ Quellen</option>
            </select>

            {/* Tags List */}
            {loadingTags ? (
              <div className="text-center py-4 text-sm text-secondary">
                Lade Tags...
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto border border-[rgb(var(--border))] rounded-md p-2">
                {filteredTagStats.length > 0 ? (
                  filteredTagStats.map((tagStat) => (
                    <label
                      key={tagStat.tag}
                      className="flex items-center justify-between gap-2 cursor-pointer hover:bg-[rgb(var(--hover))] px-2 py-1.5 rounded"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={filters.tags.includes(tagStat.tag)}
                          onChange={() => toggleArrayFilter('tags', tagStat.tag)}
                          className="w-4 h-4 rounded border-[rgb(var(--border))] text-[rgb(var(--accent-teal))] focus:ring-[rgb(var(--accent-teal))] flex-shrink-0"
                        />
                        <span className="text-sm font-medium truncate">{tagStat.tag}</span>
                      </div>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[rgb(var(--hover))] text-secondary flex-shrink-0">
                        {tagStat.count}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-secondary">
                    Keine Tags gefunden
                  </div>
                )}
              </div>
            )}

            {/* Selected tags indicator */}
            {filters.tags.length > 0 && (
              <div className="p-2 bg-[rgb(var(--hover))] rounded-md">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-secondary">{filters.tags.length} ausgewählt:</span>
                  <button
                    onClick={() => updateFilter('tags', [])}
                    className="text-[rgb(var(--accent-teal))] hover:underline"
                  >
                    Alle entfernen
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {filters.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleArrayFilter('tags', tag)}
                      className="text-xs px-2 py-0.5 bg-[rgb(var(--accent-teal))]/10 text-[rgb(var(--accent-teal))] rounded hover:bg-[rgb(var(--accent-teal))]/20"
                    >
                      {tag} ✕
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nur Empfohlene */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.starredOnly}
            onChange={(e) => updateFilter('starredOnly', e.target.checked)}
            className="w-4 h-4 rounded border-[rgb(var(--border))] text-[rgb(var(--accent-teal))] focus:ring-[rgb(var(--accent-teal))]"
          />
          <span className="text-sm font-medium">Nur ⭐ Empfehlungen</span>
        </label>
      </div>

      {/* Reset */}
      <button
        onClick={() => setFilters({
          search: "",
          categories: [],
          languages: [],
          tags: [],
          minScore: 8,
          starredOnly: false
        })}
        className="notion-button-secondary w-full text-sm"
      >
        Filter zurücksetzen
      </button>
    </div>
  )
}
