"use client"

import { Source } from "@/lib/types"
import Link from "next/link"
import { Star, ExternalLink, Trash2, Plus, Minus, ChevronDown, ChevronUp, Hash } from "lucide-react"
import { useState } from "react"

interface ArticleCardProps {
  source: Source
  isAdmin?: boolean
  onUpdate?: () => void
  allSources?: Source[]
}

export function ArticleCard({ source, isAdmin = false, onUpdate, allSources = [] }: ArticleCardProps) {
  const displayScore = source.corrected_score || source.relevance_score
  const isStarred = source.star_rating
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showSimilar, setShowSimilar] = useState(false)
  const [showTags, setShowTags] = useState(false)

  // Calculate similar articles based on tag overlap
  const similarArticles = allSources
    .filter(s => s.id !== source.id)
    .map(s => {
      const commonTags = s.tags.filter(tag => source.tags.includes(tag))
      return {
        source: s,
        commonTags,
        score: commonTags.length
      }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  async function handleDelete() {
    if (!confirm(`Quelle "${source.title}" wirklich löschen?`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/sources/${source.id}`, {
        method: 'DELETE'
      })
      if (res.ok && onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setDeleting(false)
    }
  }

  async function handleScoreChange(delta: number) {
    const newScore = Math.max(0, Math.min(10, displayScore + delta))
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relevance_score: newScore })
      })
      if (res.ok && onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setUpdating(false)
    }
  }

  async function handleToggleStar() {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ star_rating: !isStarred })
      })
      if (res.ok && onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Update failed:', error)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="notion-card group">
      {/* Header mit Titel und Stern */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-[1rem] font-semibold leading-snug flex-1">
          {source.title}
        </h3>
        {isStarred && (
          <Star className="w-5 h-5 fill-[rgb(var(--accent-yellow))] text-[rgb(var(--accent-yellow))] flex-shrink-0" />
        )}
      </div>

      {/* Meta-Informationen */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs text-secondary">
        <span className="px-2 py-1 bg-[rgb(var(--hover))] rounded">
          {source.category}
        </span>
        <span className="px-2 py-1 bg-[rgb(var(--hover))] rounded">
          {source.language}
        </span>
        <span className={`px-2 py-1 rounded font-medium ${
          displayScore >= 9 ? 'bg-green-50 text-green-700' :
          displayScore >= 7 ? 'bg-blue-50 text-blue-700' :
          'bg-gray-50 text-gray-700'
        }`}>
          {displayScore}/10
        </span>
      </div>

      {/* Zusammenfassung */}
      <p className="text-[0.875rem] text-secondary mb-3">
        {source.summary_de}
      </p>

      {/* Tags - Collapsible */}
      {source.tags.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowTags(!showTags)}
            className="text-xs text-secondary hover:text-[rgb(var(--foreground))] transition-colors flex items-center gap-1"
          >
            <Hash className="w-3 h-3" />
            {showTags ? 'Tags ausblenden' : `${source.tags.length} Tags anzeigen`}
          </button>
          {showTags && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {source.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 bg-[rgb(var(--selected))] text-[rgb(var(--accent-teal))] rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-[rgb(var(--accent-teal))] hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          Artikel öffnen
        </Link>

        {similarArticles.length > 0 && (
          <button
            onClick={() => setShowSimilar(!showSimilar)}
            className="inline-flex items-center gap-1 text-sm text-secondary hover:text-[rgb(var(--foreground))] transition-colors"
          >
            {showSimilar ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Ähnliche Artikel ({similarArticles.length})
          </button>
        )}
      </div>

      {/* Similar Articles */}
      {showSimilar && similarArticles.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[rgb(var(--border))]">
          <h4 className="text-sm font-semibold mb-3">Ähnliche Artikel ({similarArticles.length})</h4>
          <div className="space-y-3">
            {similarArticles.map(({ source: simSource, commonTags }) => (
              <div key={simSource.id} className="p-4 bg-[rgb(var(--hover))] rounded-md border border-[rgb(var(--border))] hover:border-[rgb(var(--accent-teal))]/30 transition-colors">
                {/* Title & Score */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h5 className="text-sm font-semibold flex-1">
                    {simSource.title}
                  </h5>
                  <span className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${
                    (simSource.corrected_score || simSource.relevance_score) >= 9 ? 'bg-green-50 text-green-700' :
                    (simSource.corrected_score || simSource.relevance_score) >= 7 ? 'bg-blue-50 text-blue-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {simSource.corrected_score || simSource.relevance_score}/10
                  </span>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-2 mb-2 text-xs">
                  <span className="px-2 py-0.5 bg-white/50 rounded">
                    {simSource.category}
                  </span>
                  <span className="px-2 py-0.5 bg-white/50 rounded">
                    {simSource.language}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-secondary mb-2 line-clamp-2">
                  {simSource.summary_de}
                </p>

                {/* Common Tags */}
                <div className="mb-2">
                  <span className="text-xs text-tertiary mr-2">Gemeinsame Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {commonTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-1.5 py-0.5 bg-[rgb(var(--accent-teal))]/10 text-[rgb(var(--accent-teal))] rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Link */}
                <Link
                  href={simSource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[rgb(var(--accent-teal))] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Artikel öffnen
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Controls */}
      {isAdmin && (
        <div className="mt-4 pt-4 border-t border-[rgb(var(--border))] flex items-center gap-2">
          <span className="text-xs text-tertiary mr-2">Admin:</span>

          {/* Score Controls */}
          <button
            onClick={() => handleScoreChange(-1)}
            disabled={updating || displayScore <= 0}
            className="p-1 hover:bg-[rgb(var(--hover))] rounded disabled:opacity-50"
            title="Bewertung -1"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScoreChange(1)}
            disabled={updating || displayScore >= 10}
            className="p-1 hover:bg-[rgb(var(--hover))] rounded disabled:opacity-50"
            title="Bewertung +1"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Star Toggle */}
          <button
            onClick={handleToggleStar}
            disabled={updating}
            className="p-1 hover:bg-[rgb(var(--hover))] rounded disabled:opacity-50"
            title={isStarred ? "Stern entfernen" : "Als Empfehlung markieren"}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 hover:bg-red-50 text-red-600 rounded disabled:opacity-50 ml-auto"
            title="Quelle löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
