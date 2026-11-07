import { v4 as uuid } from 'uuid'
import { BaseAgent } from './base-agent'
import { askAi } from '@/lib/ai'
import { get, run } from '@/lib/db'
import {
  generateImage, checkDesign, saveDesign, getImageModel, getDailyDesignLimit, MAX_DESIGNS_IN_REVIEW,
} from '@/lib/images'
import type { AgentConfig, Task, SimulationStep, TaskType } from './types'

interface DesignBrief {
  title: string
  concept: string
  prompt: string
  tags: string[]
  price: number
}

const DESIGN_THEMES = [
  'Tropical Sunset', 'Mountain Adventure', 'Ocean Waves', 'Floral Botanicals',
  'Retro Space', 'Minimalist Geometric', 'Watercolor Landscape', 'Boho Mandala',
  'Vintage Typography', 'Abstract Art Deco', 'Cosmic Galaxy', 'Desert Cactus',
  'Nordic Forest', 'Japanese Wave', 'Neon City', 'Wildflower Garden',
  'Celestial Moon', 'Tropical Palm', 'Zen Garden', 'Aurora Borealis',
]

const PRODUCT_TYPES = ['T-Shirt', 'Tote Bag', 'Mug', 'Phone Case', 'Poster', 'Sticker Set', 'Pillow Cover', 'Hoodie']

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

  // In AI Live, "design" tasks produce a real image: the text model writes the brief, the image model draws it
  async processWithAi(task: Task): Promise<void> {
    if (task.type !== 'design_generate') return super.processWithAi(task)

    const blocked = this.designBlockReason()
    if (blocked) {
      this.log(`${blocked} Alleen een ontwerpbriefing.`, 'info', task.id)
      return super.processWithAi(task)
    }

    const product = task.title.match(/"[^"]+" (.+)$/)?.[1] || 'T-Shirt'

    this.log(`Bedenkt een ontwerp voor: ${task.title}...`, 'thinking', task.id)
    this.updateProgress(task.id, 15, 'Ontwerpbriefing schrijven...')
    const brief = await this.writeBrief(task, product)
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

  // Why no image may be made right now, or null when Luna can draw
  private designBlockReason(): string | null {
    const limit = getDailyDesignLimit()
    if (limit === 0) return 'Beeldontwerpen staat uit in Instellingen.'
    // Every generated image counts, including rejected ones (they lose their file but keep the row)
    const today = get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM products
       WHERE shop_id = ? AND created_by = 'luna' AND (design_url IS NOT NULL OR status = 'rejected')
         AND created_at >= datetime('now', '-1 day')`,
      this.shopId
    )!.n
    if (today >= limit) return `Daglimiet van ${limit} ontwerpen bereikt.`
    const waiting = get<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE shop_id = ? AND status = 'review'", this.shopId)!.n
    if (waiting >= MAX_DESIGNS_IN_REVIEW) return `Er wachten al ${waiting} ontwerpen op beoordeling.`
    return null
  }

  private async writeBrief(task: Task, product: string): Promise<DesignBrief> {
    const result = await askAi(
      this.getEffectiveSystemPrompt(),
      `Design a print-on-demand ${product} for: ${task.title}. ${task.description}.
Reply with JSON only:
{"title": "Etsy product title, max 80 chars",
 "concept": "1-2 sentence description for the listing",
 "prompt": "detailed image prompt in English: subject, style, composition, 3-5 named colors. No text in the artwork.",
 "tags": ["up to 13 Etsy tags"],
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
    const theme = DESIGN_THEMES[Math.floor(Math.random() * DESIGN_THEMES.length)]
    const product = PRODUCT_TYPES[Math.floor(Math.random() * PRODUCT_TYPES.length)]
    const types: TaskType[] = ['design_generate', 'design_curate', 'design_trending']
    const type = types[Math.floor(Math.random() * types.length)]

    const titles: Record<string, string> = {
      design_generate: `Design "${theme}" ${product}`,
      design_curate: `Curate designs for ${product} collection`,
      design_trending: `Research trending ${theme} styles`,
    }

    return {
      type,
      title: titles[type],
      description: `Creating a ${theme.toLowerCase()}-themed design for ${product.toLowerCase()} product line`,
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
