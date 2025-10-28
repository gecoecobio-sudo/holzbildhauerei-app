"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, TrendingUp, Hash } from "lucide-react"

interface TagStat {
  tag: string
  count: number
  percentage: number
}

interface CooccurrenceData {
  tag1: string
  tag2: string
  count: number
}

export default function TagsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState<TagStat[]>([])
  const [cooccurrences, setCooccurrences] = useState<CooccurrenceData[]>([])
  const [totalTags, setTotalTags] = useState(0)

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    try {
      const res = await fetch('/api/tags')
      if (res.ok) {
        const data = await res.json()

        // Calculate tag statistics
        const tagCounts = new Map<string, number>()
        let total = 0

        // Count all tags
        data.tags.forEach((tag: string) => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
          total++
        })

        // Convert to array and calculate percentages
        const tagStats: TagStat[] = Array.from(tagCounts.entries())
          .map(([tag, count]) => ({
            tag,
            count,
            percentage: (count / total) * 100
          }))
          .sort((a, b) => b.count - a.count)

        setTags(tagStats)
        setTotalTags(total)

        // Load co-occurrences
        const coRes = await fetch('/api/admin/tags')
        if (coRes.ok) {
          const coData = await coRes.json()
          setCooccurrences(coData.cooccurrences || [])
        }
      }
    } catch (error) {
      console.error('Failed to load tags:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--hover))]">
      {/* Header */}
      <header className="border-b border-[rgb(var(--border))] bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="text-secondary hover:text-[rgb(var(--foreground))] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">Tag-Analyse</h1>
              <p className="text-sm text-secondary">
                Analysiere Tags und ihre Beziehungen
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="notion-card text-center py-12">
            <div className="text-secondary">Lade Tag-Daten...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="notion-card">
                <div className="flex items-center gap-3 mb-2">
                  <Hash className="w-5 h-5 text-[rgb(var(--accent-teal))]" />
                  <h3 className="text-sm font-semibold text-secondary">Einzigartige Tags</h3>
                </div>
                <div className="text-3xl font-bold">{tags.length}</div>
              </div>
              <div className="notion-card">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-[rgb(var(--accent-blue))]" />
                  <h3 className="text-sm font-semibold text-secondary">Gesamt Verwendungen</h3>
                </div>
                <div className="text-3xl font-bold">{totalTags}</div>
              </div>
              <div className="notion-card">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-[rgb(var(--accent-yellow))]" />
                  <h3 className="text-sm font-semibold text-secondary">Co-Occurrences</h3>
                </div>
                <div className="text-3xl font-bold">{cooccurrences.length}</div>
              </div>
            </div>

            {/* Top Tags */}
            <div className="notion-card">
              <h2 className="text-lg font-semibold mb-4">Häufigste Tags</h2>
              <div className="space-y-3">
                {tags.slice(0, 20).map((tagStat) => (
                  <div key={tagStat.tag} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{tagStat.tag}</span>
                        <span className="text-sm text-secondary">
                          {tagStat.count} × ({tagStat.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-[rgb(var(--hover))] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[rgb(var(--accent-teal))] transition-all"
                          style={{ width: `${tagStat.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Co-occurrences */}
            {cooccurrences.length > 0 && (
              <div className="notion-card">
                <h2 className="text-lg font-semibold mb-4">Tag Co-Occurrences (Top 20)</h2>
                <p className="text-sm text-secondary mb-4">
                  Tags die häufig zusammen auftreten
                </p>
                <div className="space-y-2">
                  {cooccurrences.slice(0, 20).map((co, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-[rgb(var(--border))] last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{co.tag1}</span>
                        <span className="text-secondary">+</span>
                        <span className="font-medium">{co.tag2}</span>
                      </div>
                      <span className="text-sm bg-[rgb(var(--hover))] px-3 py-1 rounded-md">
                        {co.count}×
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
