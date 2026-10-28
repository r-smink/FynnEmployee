import { BaseAgent } from './base-agent'
import type { Task, SimulationStep, TaskType } from './types'

const DESIGN_THEMES = [
  'Tropical Sunset', 'Mountain Adventure', 'Ocean Waves', 'Floral Botanicals',
  'Retro Space', 'Minimalist Geometric', 'Watercolor Landscape', 'Boho Mandala',
  'Vintage Typography', 'Abstract Art Deco', 'Cosmic Galaxy', 'Desert Cactus',
  'Nordic Forest', 'Japanese Wave', 'Neon City', 'Wildflower Garden',
  'Celestial Moon', 'Tropical Palm', 'Zen Garden', 'Aurora Borealis',
]

const PRODUCT_TYPES = ['T-Shirt', 'Tote Bag', 'Mug', 'Phone Case', 'Poster', 'Sticker Set', 'Pillow Cover', 'Hoodie']

export class LunaAgent extends BaseAgent {
  constructor() {
    super('luna', 'Luna')
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
