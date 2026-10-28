import { BaseAgent } from './base-agent'
import type { Task, SimulationStep, TaskType } from './types'

const LISTING_ACTIONS = [
  'Beach Vibes Collection', 'Autumn Harvest Set', 'Minimalist Line', 'Boho Dreams',
  'Urban Street Art', 'Nature Escape', 'Retro Revival', 'Zen Harmony',
  'Cosmic Explorer', 'Vintage Rose', 'Mountain High', 'Ocean Breeze',
]

export class MarcusAgent extends BaseAgent {
  constructor() {
    super('marcus', 'Marcus')
  }

  getSystemPrompt(): string {
    return `You are Marcus, an Etsy listing optimization AI agent for a print-on-demand store.
You are an expert at Etsy SEO, writing compelling product descriptions, and choosing effective tags.
Your responses should include:
- Optimized product title (max 140 chars, front-loaded with keywords)
- Product description (engaging, includes relevant keywords naturally)
- 13 Etsy tags (comma-separated, mix of long-tail and short keywords)
- Suggested category and pricing strategy
Keep responses under 250 words. Focus on search visibility and conversion.`
  }

  getTaskPrompt(task: Task): string {
    if (task.type === 'listing_create') {
      return `Create a full Etsy listing for: ${task.title}. ${task.description}. Include optimized title, compelling description, 13 SEO tags, and pricing suggestion.`
    }
    if (task.type === 'listing_optimize') {
      return `Optimize the Etsy SEO for: ${task.title}. Suggest improved title, updated tags based on current trends, and description tweaks to boost visibility.`
    }
    return `Suggest photo/mockup improvements for: ${task.title}. What types of lifestyle photos, angles, and presentation would increase click-through rate?`
  }

  generateTask(): { type: TaskType; title: string; description: string } {
    const listing = LISTING_ACTIONS[Math.floor(Math.random() * LISTING_ACTIONS.length)]
    const types: TaskType[] = ['listing_create', 'listing_optimize', 'listing_refresh']
    const type = types[Math.floor(Math.random() * types.length)]

    const titles: Record<string, string> = {
      listing_create: `Create listing for "${listing}"`,
      listing_optimize: `Optimize SEO for "${listing}"`,
      listing_refresh: `Refresh photos for "${listing}"`,
    }

    return {
      type,
      title: titles[type],
      description: `Managing Etsy listing for ${listing}`,
    }
  }

  getSimulationSteps(task: Task): SimulationStep[] {
    if (task.type === 'listing_create') {
      return [
        { message: 'Crafting compelling title and description...', type: 'thinking', progress: 15, durationMs: 2500 },
        { message: 'Researching optimal tags and keywords...', type: 'info', progress: 35, durationMs: 3000 },
        { message: 'Setting competitive pricing strategy...', type: 'info', progress: 55, durationMs: 2000 },
        { message: 'Uploading product mockups...', type: 'info', progress: 75, durationMs: 2500 },
        { message: 'Publishing listing to Etsy...', type: 'info', progress: 90, durationMs: 2000 },
        { message: 'Listing published successfully!', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    if (task.type === 'listing_optimize') {
      return [
        { message: 'Analyzing current listing performance...', type: 'thinking', progress: 20, durationMs: 2000 },
        { message: 'Researching high-volume search terms...', type: 'info', progress: 45, durationMs: 2500 },
        { message: 'Updating tags and categories...', type: 'info', progress: 70, durationMs: 2000 },
        { message: 'SEO optimization complete', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    return [
      { message: 'Reviewing current listing photos...', type: 'thinking', progress: 25, durationMs: 2000 },
      { message: 'Generating fresh product mockups...', type: 'info', progress: 55, durationMs: 3000 },
      { message: 'Updating listing images...', type: 'info', progress: 85, durationMs: 2000 },
      { message: 'Photos refreshed successfully', type: 'success', progress: 100, durationMs: 1000 },
    ]
  }
}
