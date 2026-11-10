// Etsy's rules for listing text, shared by publishing and Milo's SEO work

// Etsy allows only letters, numbers, punctuation and spaces, with %, : and & at most once
export function etsyTitle(title: string): string {
  let clean = title.replace(/[^\p{L}\p{N}\p{P}\p{Sm}\p{Zs}]/gu, '')
  for (const once of ['%', ':', '&']) {
    const first = clean.indexOf(once)
    if (first >= 0) clean = clean.slice(0, first + 1) + clean.slice(first + 1).split(once).join('')
  }
  return clean.replace(/\s+/g, ' ').trim().slice(0, 140).trim()
}

// Etsy tags: at most 13, each at most 20 characters; longer ones are dropped, not cut mid-phrase
export function cleanTags(tags: unknown[]): string[] {
  const seen = new Set<string>()
  return tags
    .map(t => String(t).replace(/[^\p{L}\p{Nd}\p{Zs}\-'™©®]/gu, '').replace(/\s+/g, ' ').trim())
    .filter(t => t && t.length <= 20 && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
    .slice(0, 13)
}
