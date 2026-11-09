import { v4 as uuid } from 'uuid'
import { BaseAgent } from './base-agent'
import { askAi, isAiEnabled } from '@/lib/ai'
import { get, run } from '@/lib/db'
import {
  generateImage, checkDesign, saveDesign, getImageModel, getDailyDesignLimit, imageModelProblem, MAX_DESIGNS_IN_REVIEW,
} from '@/lib/images'
import { pickTheme, findTheme, activeThemes } from '@/lib/theme-store'
import { isSeasonal, formatMonthDay, type DesignTheme } from '@/lib/themes'
import { marketSummary, NO_MARKET_DATA } from '@/lib/market-context'
import { PRODUCT_TYPES } from '@/lib/product-specs'
import { enabledProductTypes } from '@/lib/shop-settings'
import type { AgentConfig, Task, SimulationStep, TaskType } from './types'

interface DesignBrief {
  title: string
  concept: string
  prompt: string
  tags: string[]
  price: number
}

// Used when every theme is switched off or out of season
const FALLBACK_THEME = 'Trending'

// Words in an owner's assignment that name a product type
const PRODUCT_WORDS: [RegExp, string][] = [
  [/t-?shirt|shirt|tee/i, 'T-Shirt'],
  [/tote|tas|tassen|bag/i, 'Tote Bag'],
  [/mok|mug|beker/i, 'Mug'],
  [/poster|print/i, 'Poster'],
  [/sticker/i, 'Sticker'],
]

export class LunaAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  getSystemPrompt(): string {
    return `You are Luna, a creative AI design agent for an Etsy print-on-demand store.
You specialize in creating unique, trendy designs that sell well on Etsy.
Your responses should be concise design briefs including:
- Design concept description (2-3 sentences)
- Color palette (3-5 hex colors)
- Typography suggestions
- Target audience
- Suggested product mockup placement
Keep responses under 200 words. Be creative and market-aware.`
  }

  getTaskPrompt(task: Task): string {
    if (task.type === 'design_generate') {
      return `Create a design brief for: ${task.title}. ${task.description}. Include specific visual elements, color palette, and how it would look on the product.`
    }
    if (task.type === 'design_curate') {
      return `Curate a collection for: ${task.title}. Suggest 5 design themes that work well together, with a cohesive style guide.`
    }
    return `Research trending design styles for: ${task.title}. What's hot on Etsy right now? Identify 3 emerging trends with actionable design directions.`
  }

  // The theme a task was made for, from the quoted name in its title
  private themeOf(task: Task): DesignTheme | undefined {
    const name = task.title.match(/"([^"]+)"/)?.[1]
    return name ? findTheme(this.shopId, name) : undefined
  }

  // Theme notes from the owner plus real Etsy figures for the theme
  protected async getTaskContext(task: Task): Promise<string | null> {
    const theme = this.themeOf(task)
    const product = task.type === 'design_generate' ? task.title.match(/"[^"]+" (.+)$/)?.[1] : undefined
    const parts: string[] = []
    if (theme?.notes) parts.push(`Owner's notes for the theme "${theme.name}": ${theme.notes}`)
    if (task.type === 'design_curate') {
      parts.push(`Themes the shop is running now: ${activeThemes(this.shopId).map(t => t.name).join(', ') || 'none'}`)
    }
    const query = theme ? [theme.search, product].filter(Boolean).join(' ') : ''
    parts.push((query && await marketSummary(query)) || NO_MARKET_DATA)
    return parts.join('\n\n')
  }

  // In AI Live, "design" tasks produce a real image: the text model writes the brief, the image model draws it
  // An assignment from the owner is a design too: it skips the daily limit and the review queue, because they asked for it
  async processWithAi(task: Task): Promise<void> {
    const owner = task.type === 'owner_task'
    if (task.type !== 'design_generate' && !owner) return super.processWithAi(task)

    const blocked = this.designBlockReason(owner)
    if (blocked) {
      if (owner) throw new Error(blocked)
      this.log(`${blocked} Alleen een ontwerpbriefing.`, 'info', task.id)
      return super.processWithAi(task)
    }

    // Check before writing the brief, so an unusable model doesn't also cost a text call
    const problem = await imageModelProblem(getImageModel())
    if (problem) throw new Error(problem)

    const product = owner ? this.productForAssignment(task.description || task.title) : task.title.match(/"[^"]+" (.+)$/)?.[1] || 'T-Shirt'

    this.log(`Bedenkt een ontwerp voor: ${task.title}...`, 'thinking', task.id)
    this.updateProgress(task.id, 15, 'Ontwerpbriefing schrijven...')
    const brief = await this.writeBrief(task, product, await this.getTaskContext(task))
    run('UPDATE tasks SET output_data = ? WHERE id = ?', JSON.stringify({ brief }), task.id)

    const model = getImageModel()
    this.log(`${model} tekent "${brief.title}"...`, 'thinking', task.id)
    this.updateProgress(task.id, 35, 'Beeldmodel tekent het ontwerp...')
    const image = await generateImage(
      `${brief.prompt}. Print-ready artwork for a ${product}. Isolated, centered on a plain transparent background, ` +
      'no mockup, no text, no letters, no watermark, no logos or trademarks.'
    )

    this.updateProgress(task.id, 75, 'Kwaliteitscontrole...')
    const check = checkDesign(image)
    if (!check.ok) throw new Error(`Ontwerp afgekeurd door de controle: ${check.reason}`)

    const productId = uuid()
    const file = saveDesign(productId, check.data, image.mediaType)
    const url = `/api/designs/${file}`
    run(
      `INSERT INTO products (id, shop_id, title, description, design_url, thumbnail_url, category, tags, price, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'review', 'luna')`,
      productId, this.shopId, brief.title, brief.concept, url, url, product, JSON.stringify(brief.tags), brief.price
    )
    run('UPDATE tasks SET output_data = ? WHERE id = ?', JSON.stringify({ brief, productId, design: url, model, cost: image.cost }), task.id)

    const cost = image.cost !== null ? ` (kosten $${image.cost.toFixed(2)})` : ''
    this.log(`Ontwerp "${brief.title}" staat klaar om te beoordelen bij Producten${cost}`, 'success', task.id)
    this.updateProgress(task.id, 95, 'Klaar voor beoordeling')
  }

  // The product type the owner named, or the first one that is switched on
  private productForAssignment(text: string): string {
    const enabled = enabledProductTypes(this.shopId)
    const named = PRODUCT_WORDS.find(([pattern]) => pattern.test(text))?.[1]
    if (named && !enabled.includes(named)) throw new Error(`${named} staat uit in Instellingen > Producttypes`)
    return named ?? enabled[0]
  }

  // Live: only when she may draw a new design (daily limit, review queue). No text-only briefs in between.
  hasRealWork(): boolean {
    return this.designBlockReason() === null
  }

  // Why no image may be made right now, or null when Luna can draw
  private designBlockReason(owner = false): string | null {
    const limit = getDailyDesignLimit()
    if (limit === 0) return 'Beeldontwerpen staat uit in Instellingen.'
    if (enabledProductTypes(this.shopId).length === 0) return 'Alle producttypes staan uit in Instellingen.'
    if (owner) return null
    // Every generated image counts, including rejected and deleted ones (they lose their file but keep the row)
    const today = get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM products
       WHERE shop_id = ? AND created_by = 'luna' AND (design_url IS NOT NULL OR status IN ('rejected', 'deleted'))
         AND created_at >= datetime('now', '-1 day')`,
      this.shopId
    )!.n
    if (today >= limit) return `Daglimiet van ${limit} ontwerpen bereikt.`
    const waiting = get<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND status = 'review'", this.shopId)!.n
    if (waiting >= MAX_DESIGNS_IN_REVIEW) return `Er wachten al ${waiting} ontwerpen op beoordeling.`
    return null
  }

  private async writeBrief(task: Task, product: string, context: string | null): Promise<DesignBrief> {
    const result = await askAi(
      this.getEffectiveSystemPrompt(),
      `Design a print-on-demand ${product} for: ${task.title}. ${task.description}.
${context ? `
${context}
Use this: pick tags buyers really search for, price within the usual range, and make the design stand out from the fastest rising listings without copying them.
` : ''}
Reply with JSON only:
{"title": "Etsy product title, max 80 chars",
 "concept": "1-2 sentence description for the listing",
 "prompt": "detailed image prompt in English: subject, style, composition, 3-5 named colors. No text in the artwork.",
 "tags": ["up to 13 Etsy tags, each at most 20 characters"],
 "price": 24.99}`,
      { model: this.model, maxTokens: 700 }
    )
    const json = result.match(/\{[\s\S]*\}/)?.[0]
    let brief: Partial<DesignBrief> = {}
    try { brief = json ? JSON.parse(json) : {} } catch { /* handled below */ }
    if (!brief.prompt || !brief.title) throw new Error('Tekstmodel gaf geen bruikbare ontwerpbriefing')
    return {
      title: String(brief.title).slice(0, 140),
      concept: String(brief.concept || ''),
      prompt: String(brief.prompt),
      tags: Array.isArray(brief.tags) ? brief.tags.map(String).slice(0, 13) : [],
      price: typeof brief.price === 'number' && brief.price > 0 ? brief.price : 24.99,
    }
  }

  generateTask(): { type: TaskType; title: string; description: string } {
    const picked = pickTheme(this.shopId)
    const theme = picked?.name ?? FALLBACK_THEME
    // Only types that are switched on; in demo mode with all off, any type is fine for a simulation
    const enabled = enabledProductTypes(this.shopId)
    const pool = enabled.length ? enabled : PRODUCT_TYPES
    const product = pool[Math.floor(Math.random() * pool.length)]
    const types: TaskType[] = isAiEnabled() ? ['design_generate'] : ['design_generate', 'design_curate', 'design_trending']
    const type = types[Math.floor(Math.random() * types.length)]

    const titles: Record<string, string> = {
      design_generate: `Design "${theme}" ${product}`,
      design_curate: `Curate "${theme}" designs for a ${product} collection`,
      design_trending: `Research trending "${theme}" styles`,
    }

    return {
      type,
      title: titles[type],
      description: picked && isSeasonal(picked)
        ? `Seasonal theme ${theme} (${formatMonthDay(picked.start!)} – ${formatMonthDay(picked.end!)}) for the ${product.toLowerCase()} product line`
        : `Creating a ${theme.toLowerCase()}-themed design for the ${product.toLowerCase()} product line`,
    }
  }

  getSimulationSteps(task: Task): SimulationStep[] {
    if (task.type === 'design_generate') {
      return [
        { message: 'Analyzing current design trends...', type: 'thinking', progress: 10, durationMs: 2000 },
        { message: 'Generating color palette and mood board...', type: 'info', progress: 25, durationMs: 3000 },
        { message: 'Creating initial design concepts...', type: 'info', progress: 45, durationMs: 4000 },
        { message: 'Refining composition and typography...', type: 'thinking', progress: 65, durationMs: 3000 },
        { message: 'Applying finishing touches and export...', type: 'info', progress: 85, durationMs: 2000 },
        { message: 'Design ready for review!', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    if (task.type === 'design_curate') {
      return [
        { message: 'Reviewing existing design portfolio...', type: 'thinking', progress: 15, durationMs: 2000 },
        { message: 'Selecting top-performing styles...', type: 'info', progress: 40, durationMs: 2500 },
        { message: 'Organizing collection by theme...', type: 'info', progress: 70, durationMs: 2000 },
        { message: 'Collection curated successfully', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    return [
      { message: 'Scanning trending marketplaces...', type: 'thinking', progress: 20, durationMs: 2500 },
      { message: 'Analyzing competitor designs...', type: 'info', progress: 50, durationMs: 3000 },
      { message: 'Identifying emerging patterns...', type: 'info', progress: 80, durationMs: 2000 },
      { message: 'Trend report compiled', type: 'success', progress: 100, durationMs: 1000 },
    ]
  }
}
