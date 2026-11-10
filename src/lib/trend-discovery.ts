import { v4 as uuid } from 'uuid'
import { all, get, run } from './db'
import { askAi, isAiEnabled } from './ai'
import { searchMarket, type MarketSearch } from '@/integrations/etsy/market'
import { getShopSetting, setShopSetting } from './shop-settings'
import { activeThemes, getThemes, saveThemes } from './theme-store'
import { MAX_THEMES } from './themes'

// Nova looks for niches on Etsy by herself: she searches from the shop's themes (and ideas of her own),
// looks at which tags the fast-rising new listings use, and measures each of those niches:
// demand = favorites per day of new listings, competition = how many listings there are.
// Etsy shows no other shops' sales, so favorites per day is the best signal of what buyers want now.

export const AUTO_ADD_KEY = 'trend_auto_add'
// Score from which a niche is strong enough to become a theme by itself (when the owner switched that on)
export const AUTO_ADD_SCORE = 65
const EXPLORED_KEY = 'trend_explored'
// Listings younger than this count as new: they show what is rising now, not what sold for years
const NEW_DAYS = 120
const SEEDS_PER_RUN = 3
const CANDIDATES_PER_SEED = 3
const MAX_CANDIDATES = 7
const DAY = 86_400

// Tags that say nothing about a niche
const GENERIC = new Set([
  'gift', 'gifts', 'gift for her', 'gift for him', 'gift idea', 'gift ideas', 'birthday gift', 'christmas gift', 'present',
  'custom', 'personalized', 'personalised', 'handmade', 'unique', 'trendy', 'aesthetic', 'cute', 'funny', 'cool',
  'shirt', 't shirt', 'tshirt', 't-shirt', 'tee', 'unisex', 'mug', 'coffee mug', 'poster', 'print', 'wall art', 'sticker',
  'tote bag', 'hoodie', 'sweatshirt', 'graphic tee', 'digital download', 'printable', 'svg', 'png',
])

export interface TrendFinding {
  id: string
  keyword: string
  score: number
  demand: number
  competition: number
  median_price: number | null
  currency: string | null
  tags: string[]
  examples: { title: string; url: string; image: string | null; favoritesPerDay: number }[]
  found_via: string | null
  theme_name: string | null
  reason: string | null
  season_start: string | null
  season_end: string | null
  status: 'new' | 'added' | 'ignored'
  created_at: string
  updated_at: string
}

type Row = Omit<TrendFinding, 'tags' | 'examples'> & { tags: string | null; examples: string | null }

const parse = (row: Row): TrendFinding => ({
  ...row,
  tags: JSON.parse(row.tags || '[]'),
  examples: JSON.parse(row.examples || '[]'),
})

export function getFindings(shopId: string): TrendFinding[] {
  return all<Row>(
    `SELECT * FROM trend_findings WHERE shop_id = ?
     ORDER BY CASE status WHEN 'new' THEN 0 WHEN 'added' THEN 1 ELSE 2 END, score DESC LIMIT 60`, shopId
  ).map(parse)
}

export const autoAddEnabled = (shopId: string) => getShopSetting(shopId, AUTO_ADD_KEY) === '1'

// ─── Measuring a niche ────────────────────────────────────

interface Measure {
  competition: number
  demand: number
  medianPrice: number | null
  currency: string | null
  // Tags of the fast-rising new listings, strongest first
  risingTags: string[]
  examples: TrendFinding['examples']
}

function measure(search: MarketSearch): Measure {
  const now = Date.now() / 1000
  const fresh = search.listings
    .map(l => {
      const ageDays = Math.max(1, (now - (l.original_creation_timestamp || l.creation_timestamp)) / DAY)
      return { l, ageDays, perDay: l.num_favorers / ageDays }
    })
    .filter(x => x.ageDays <= NEW_DAYS)
    .sort((a, b) => b.perDay - a.perDay)

  const top = fresh.slice(0, 10)
  const demand = top.length ? top.reduce((s, x) => s + x.perDay, 0) / top.length : 0

  const currencies = new Map<string, number[]>()
  for (const l of search.listings) {
    const list = currencies.get(l.price.currency_code) ?? []
    list.push(l.price.amount / (l.price.divisor || 100))
    currencies.set(l.price.currency_code, list)
  }
  const [currency, prices] = [...currencies.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [null, []]
  prices.sort((a, b) => a - b)

  // A tag weighs as much as the favorites per day of the rising listings that use it
  const weight = new Map<string, number>()
  for (const x of fresh.slice(0, 30)) {
    for (const tag of new Set(x.l.tags.map(t => t.trim().toLowerCase()))) {
      if (tag) weight.set(tag, (weight.get(tag) ?? 0) + x.perDay)
    }
  }

  return {
    competition: search.count,
    demand: Math.round(demand * 100) / 100,
    medianPrice: prices.length ? Math.round(prices[Math.floor(prices.length / 2)] * 100) / 100 : null,
    currency,
    risingTags: [...weight.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag),
    examples: top.slice(0, 3).map(x => ({
      title: x.l.title.slice(0, 120), url: x.l.url, image: x.l.image ?? null,
      favoritesPerDay: Math.round(x.perDay * 100) / 100,
    })),
  }
}

// 0–100: high when new listings gain favorites fast and there aren't many listings yet
export function trendScore(demand: number, competition: number): number {
  const wanted = Math.min(1, Math.log10(1 + demand * 4) / Math.log10(21))  // 5 favorites a day counts as full
  const room = Math.max(0, 1 - Math.log10(Math.max(10, competition)) / 6)  // a million listings leaves no room
  return Math.round(100 * (0.6 * wanted + 0.4 * room))
}

// ─── Discovery ────────────────────────────────────────────

function explored(shopId: string): Record<string, number> {
  try { return JSON.parse(getShopSetting(shopId, EXPLORED_KEY) || '{}') } catch { return {} }
}

// Where to start looking: running themes, the owner's keywords and niches found earlier, least recently explored first
function seeds(shopId: string): string[] {
  let saved: string[] = []
  try { saved = JSON.parse(getShopSetting(shopId, 'trend_keywords') || '[]') } catch { /* none */ }
  const found = all<{ keyword: string }>(
    "SELECT keyword FROM trend_findings WHERE shop_id = ? AND status != 'ignored' ORDER BY score DESC LIMIT 10", shopId
  ).map(f => f.keyword)
  const pool = [...new Set([...activeThemes(shopId).map(t => t.search), ...saved, ...found].map(s => s.trim().toLowerCase()).filter(Boolean))]
  const last = explored(shopId)
  return pool.sort((a, b) => (last[a] ?? 0) - (last[b] ?? 0))
}

// Nova's own idea of where to look, beyond what the shop already knows
async function freshSeed(shopId: string, known: string[], model?: string): Promise<string | null> {
  const month = new Date().toLocaleString('en', { month: 'long' })
  const text = await askAi(
    'You research niches for a print-on-demand Etsy shop (t-shirts, mugs, posters, stickers, tote bags). Answer with one search phrase only.',
    `It is ${month}. The shop already looks at: ${known.slice(0, 20).join(', ') || 'nothing yet'}.\n` +
    'Name ONE other broad niche or theme (2-3 English words, as an Etsy buyer would search) that could be rising now for printed designs. Only the phrase.',
    { maxTokens: 30, model }
  ).catch(() => null)
  const phrase = text?.split('\n')[0].replace(/["'.]/g, '').trim().toLowerCase().slice(0, 60)
  return phrase && phrase.split(/\s+/).length <= 5 ? phrase : null
}

const usable = (tag: string, seed: string) => {
  const words = tag.split(/\s+/)
  return tag.length >= 4 && tag.length <= 40 && words.length <= 4 && !GENERIC.has(tag) && tag !== seed && !/\d{3,}/.test(tag)
}

export interface DiscoveryResult {
  explored: string[]
  measured: number
  findings: TrendFinding[]
  added: string[]
}

export async function discoverTrends(shopId: string, opts: { model?: string; onStep?: (message: string, progress: number) => void } = {}): Promise<DiscoveryResult> {
  const step = opts.onStep ?? (() => {})
  const ai = isAiEnabled()
  const start = seeds(shopId)
  const chosen = start.slice(0, ai ? SEEDS_PER_RUN - 1 : SEEDS_PER_RUN)
  if (ai) {
    const idea = await freshSeed(shopId, start, opts.model)
    if (idea && !chosen.includes(idea)) chosen.push(idea)
  }
  if (chosen.length === 0) throw new Error('Geen startpunt: zet een thema aan of bewaar een zoekwoord op Markttrends')

  const known = new Map(all<{ keyword: string; status: string }>('SELECT keyword, status FROM trend_findings WHERE shop_id = ?', shopId)
    .map(f => [f.keyword, f.status]))
  const themeSearches = new Set(getThemes(shopId).map(t => t.search))
  const candidates = new Map<string, string>()  // keyword -> seed it came from
  const last = explored(shopId)

  for (const [i, seed] of chosen.entries()) {
    step(`Zoekt op Etsy naar "${seed}"...`, 10 + i * 10)
    const m = measure(await searchMarket(seed))
    last[seed] = Date.now()
    let taken = 0
    for (const tag of m.risingTags) {
      if (taken >= CANDIDATES_PER_SEED || candidates.size >= MAX_CANDIDATES) break
      if (!usable(tag, seed) || candidates.has(tag) || known.get(tag) === 'ignored' || themeSearches.has(tag)) continue
      candidates.set(tag, seed)
      taken++
    }
  }
  setShopSetting(shopId, EXPLORED_KEY, JSON.stringify(last))

  const measured: { keyword: string; seed: string; m: Measure; score: number }[] = []
  let n = 0
  for (const [keyword, seed] of candidates) {
    step(`Meet de niche "${keyword}"...`, 40 + Math.round((n++ / Math.max(1, candidates.size)) * 35))
    try {
      const m = measure(await searchMarket(keyword))
      measured.push({ keyword, seed, m, score: trendScore(m.demand, m.competition) })
    } catch { /* one failed search doesn't stop the rest */ }
  }

  const ids: string[] = []
  for (const x of measured) {
    const existing = get<{ id: string }>('SELECT id FROM trend_findings WHERE shop_id = ? AND keyword = ?', shopId, x.keyword)
    const id = existing?.id ?? uuid()
    if (existing) {
      run(`UPDATE trend_findings SET score = ?, demand = ?, competition = ?, median_price = ?, currency = ?, tags = ?, examples = ?,
             updated_at = datetime('now') WHERE id = ?`,
        x.score, x.m.demand, x.m.competition, x.m.medianPrice, x.m.currency,
        JSON.stringify(x.m.risingTags.slice(0, 10)), JSON.stringify(x.m.examples), id)
    } else {
      run(`INSERT INTO trend_findings (id, shop_id, keyword, score, demand, competition, median_price, currency, tags, examples, found_via)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, shopId, x.keyword, x.score, x.m.demand, x.m.competition, x.m.medianPrice, x.m.currency,
        JSON.stringify(x.m.risingTags.slice(0, 10)), JSON.stringify(x.m.examples), x.seed)
    }
    ids.push(id)
  }

  step('Beoordeelt wat geschikt is voor printontwerpen...', 80)
  await explain(shopId, ids, opts.model)

  const added: string[] = []
  if (autoAddEnabled(shopId)) {
    for (const id of ids) {
      const f = get<Row>('SELECT * FROM trend_findings WHERE id = ?', id)
      if (f && f.status === 'new' && f.score >= AUTO_ADD_SCORE) {
        try { added.push(addFindingAsTheme(shopId, id)) } catch { break /* theme list full */ }
      }
    }
  }

  const findings = ids.map(id => parse(get<Row>('SELECT * FROM trend_findings WHERE id = ?', id)!)).sort((a, b) => b.score - a.score)
  return { explored: chosen, measured: measured.length, findings, added }
}

// Names each new niche, says in Dutch why it is interesting, and drops what can't be a printed design.
// Without AI the numbers speak for themselves.
async function explain(shopId: string, ids: string[], model?: string) {
  const rows = ids.map(id => get<Row>('SELECT * FROM trend_findings WHERE id = ?', id)!).filter(r => r && !r.reason)
  if (rows.length === 0) return
  const fallback = (r: Row) =>
    `Nieuwe listings krijgen gemiddeld ${r.demand.toLocaleString('nl-NL')} favorieten per dag, bij ${r.competition.toLocaleString('nl-NL')} listings in totaal.`

  let answer: Record<string, { name?: string; reason?: string; suitable?: boolean; start?: string | null; end?: string | null }> = {}
  if (isAiEnabled()) {
    const list = rows.map(r => `- "${r.keyword}": ${r.demand} favorites/day for new listings, ${r.competition} listings, rising tags: ${JSON.parse(r.tags || '[]').slice(0, 6).join(', ')}`).join('\n')
    const text = await askAi(
      'You judge Etsy niches for a print-on-demand shop that sells printed t-shirts, hoodies, mugs, posters, tote bags and stickers. Answer with JSON only.',
      `Niches with Etsy figures:\n${list}\n\nFor each niche give: name (short Dutch theme name), reason (1-2 Dutch sentences why it is interesting, using the figures), ` +
      'suitable (false when it cannot be a printed design, e.g. jewelry, a material or a service), start and end ("MM-DD", a few weeks before the occasion) only when it is seasonal, otherwise null.\n' +
      'Return {"<niche>": {"name": "...", "reason": "...", "suitable": true, "start": null, "end": null}}',
      { maxTokens: 900, model }
    ).catch(() => '')
    try { answer = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) } catch { /* use the numbers */ }
  }

  const monthDay = (v: unknown) => typeof v === 'string' && /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v) ? v : null
  for (const r of rows) {
    const a = answer[r.keyword] ?? {}
    const start = monthDay(a.start), end = monthDay(a.end)
    run(`UPDATE trend_findings SET theme_name = ?, reason = ?, season_start = ?, season_end = ?, status = ? WHERE id = ?`,
      (a.name || r.keyword.replace(/\b\w/g, c => c.toUpperCase())).slice(0, 60),
      (a.suitable === false ? 'Niet geschikt voor printontwerpen. ' : '') + (a.reason || fallback(r)),
      start && end ? start : null, start && end ? end : null,
      a.suitable === false ? 'ignored' : r.status, r.id)
  }
}

// Turns a finding into a theme Luna designs for; returns the theme name
export function addFindingAsTheme(shopId: string, findingId: string): string {
  const f = get<Row>('SELECT * FROM trend_findings WHERE id = ? AND shop_id = ?', findingId, shopId)
  if (!f) throw new Error('Trend niet gevonden')
  const themes = getThemes(shopId)
  const name = f.theme_name || f.keyword
  if (!themes.some(t => t.search === f.keyword)) {
    if (themes.length >= MAX_THEMES) throw new Error(`Je hebt al ${MAX_THEMES} thema's. Verwijder er eerst een.`)
    saveThemes(shopId, [...themes, {
      id: `nova-${f.keyword.replace(/[^a-z0-9]+/g, '-').slice(0, 30)}`,
      name, search: f.keyword, start: f.season_start, end: f.season_end,
      notes: `Gevonden door Nova (score ${f.score}). ${f.reason ?? ''}`.slice(0, 300),
      enabled: true,
    }])
  }
  run("UPDATE trend_findings SET status = 'added', updated_at = datetime('now') WHERE id = ?", findingId)
  return name
}

export function setFindingStatus(shopId: string, findingId: string, status: 'new' | 'ignored') {
  run("UPDATE trend_findings SET status = ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?", status, findingId, shopId)
}

// A short Dutch report for Nova's task result
export function discoverySummary(r: DiscoveryResult): string {
  if (r.findings.length === 0) return `Gezocht vanuit ${r.explored.map(s => `"${s}"`).join(', ')}, maar geen nieuwe niches gevonden die meetbaar waren.`
  const lines = r.findings.slice(0, 6).map(f =>
    `- ${f.theme_name ?? f.keyword} ("${f.keyword}"): score ${f.score}, ${f.demand.toLocaleString('nl-NL')} favorieten/dag, ${f.competition.toLocaleString('nl-NL')} listings` +
    (f.status === 'ignored' ? ' (niet geschikt)' : ''))
  return [
    `Gezocht vanuit ${r.explored.map(s => `"${s}"`).join(', ')}. ${r.measured} niches gemeten:`,
    ...lines,
    r.added.length ? `Automatisch toegevoegd als thema voor Luna: ${r.added.join(', ')}.` : 'Bekijk ze op Markttrends om ze als thema toe te voegen.',
  ].join('\n')
}
