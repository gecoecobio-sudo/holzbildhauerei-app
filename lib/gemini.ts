import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function generateSourceMetadata(url: string, content?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `Analyze this URL and generate metadata for a woodcarving knowledge base article.

URL: ${url}
${content && typeof content === 'string' && content.length > 0 ? `Content preview: ${content.substring(0, 1000)}` : ''}

IMPORTANT: This is a knowledge base for woodcarving professionals and enthusiasts. Evaluate the quality critically.

Generate a JSON response with:
1. title: Concise German title
2. summary_de: German summary (2-3 sentences)
3. category: ONE of: Tutorial, Werkzeug, Material, Technik, Inspiration, Community, Geschichte, Sonstiges
4. tags: Array of 5-10 relevant German tags related to woodcarving
5. language: Detect language (Deutsch, English, or Français)
6. quality_score: Rate 0-10 based on:
   - 9-10: Expert knowledge, in-depth tutorials, professional techniques, academic articles
   - 7-8: Good blog posts, detailed guides, experienced craftspeople sharing knowledge
   - 5-6: Basic tutorials, general information, community forums
   - 3-4: Shallow content, primarily commercial/shopping pages
   - 0-2: Pure product listings, low-quality content, off-topic

REJECT (score 0-3) if:
- Primarily a shopping/e-commerce page selling products
- Product comparison/review site focused on selling
- Little to no educational content
- Affiliate marketing focused

Return ONLY valid JSON, no markdown formatting.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    const metadata = JSON.parse(cleanText)

    return {
      title: metadata.title || '',
      summary_de: metadata.summary_de || '',
      category: metadata.category || 'Sonstiges',
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      language: metadata.language || 'Deutsch',
      quality_score: metadata.quality_score || 5
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to generate metadata with Gemini')
  }
}

export async function generateSearchQueries(topic: string, count: number = 5) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp-01-21' })

    const prompt = `Generate ${count} specific search queries for finding high-quality woodcarving EDUCATIONAL resources about: "${topic}"

IMPORTANT: Focus on finding expert knowledge, tutorials, and educational content. AVOID shopping/e-commerce sites.

Requirements:
- Queries should target educational content: tutorials, guides, techniques, how-to articles
- Use keywords like: "tutorial", "anleitung", "technik", "guide", "how to", "lernen"
- Queries should be in German, English, or French
- Focus on woodcarving, wood sculpting, traditional craftsmanship
- Mix of beginner and advanced topics
- Include specific techniques, tools, or materials when relevant
- AVOID commercial keywords like: "kaufen", "buy", "shop", "preis", "price", "bestellen"

Examples of GOOD queries:
- "Holzschnitzen Tutorial für Anfänger Schnitztechniken"
- "wood carving relief technique step by step guide"
- "sculpture sur bois outils traditionnels technique"

Return as JSON array of strings: ["query1", "query2", ...]
Return ONLY valid JSON, no markdown formatting.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const queries = JSON.parse(cleanText)

    return Array.isArray(queries) ? queries : []
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to generate queries with Gemini')
  }
}

export async function correctTitle(originalTitle: string, url: string, summary?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp-01-21' })

    const prompt = `Analyze and correct/improve this article title:

Original Title: "${originalTitle}"
URL: ${url}
${summary ? `Summary: ${summary}` : ''}

Task:
1. Fix any spelling errors
2. If title is nonsense or unclear, generate a better German title based on URL and summary
3. Make title concise and descriptive (max 80 characters)
4. Keep original meaning if it's already good

Return ONLY the corrected title as plain text, no JSON, no quotes, no markdown.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const correctedTitle = response.text().trim()

    // Remove any quotes if present
    return correctedTitle.replace(/^["']|["']$/g, '')
  } catch (error) {
    console.error('Gemini API error:', error)
    return originalTitle // Return original on error
  }
}
