interface SerperResult {
  title: string
  link: string
  snippet: string
  position: number
}

interface SerperResponse {
  organic: SerperResult[]
}

export async function searchWithSerper(query: string, numResults: number = 10): Promise<string[]> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: numResults,
        gl: 'de', // Germany
        hl: 'de'  // German
      })
    })

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`)
    }

    const data: SerperResponse = await response.json()

    if (!data.organic || !Array.isArray(data.organic)) {
      return []
    }

    // Extract URLs from results
    const urls = data.organic
      .map(result => result.link)
      .filter(url => url && isValidURL(url))

    return urls
  } catch (error) {
    console.error('Serper search error:', error)
    throw new Error('Failed to search with Serper')
  }
}

function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url)

    // Filter out unwanted domains
    const blockedDomains = [
      // Social media
      'youtube.com', 'facebook.com', 'instagram.com', 'twitter.com', 'pinterest.com', 'tiktok.com',
      // Shopping platforms
      'amazon.', 'ebay.', 'etsy.com', 'alibaba.com', 'aliexpress.com',
      // General marketplaces
      'shop.', 'store.', 'cart.', 'checkout.',
      // Product comparison sites
      'idealo.', 'geizhals.', 'billiger.de', 'preisvergleich.',
      // Common shopping indicators in domain
      'kaufen', 'buy', 'shopping', 'market'
    ]

    const hostname = parsed.hostname.toLowerCase()
    const pathname = parsed.pathname.toLowerCase()

    // Block if domain matches blocklist
    if (blockedDomains.some(domain => hostname.includes(domain))) {
      return false
    }

    // Block if path contains shopping keywords
    const shoppingPathKeywords = ['/shop/', '/cart/', '/checkout/', '/buy/', '/product/', '/products/']
    if (shoppingPathKeywords.some(keyword => pathname.includes(keyword))) {
      return false
    }

    return true
  } catch {
    return false
  }
}
