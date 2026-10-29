import { BaseAgent } from './base-agent'
import { aiChat } from '@/lib/ai'
import { run } from '@/lib/db'
import { isEtsyConnected } from '@/integrations/etsy/client'
import type { AgentConfig, Task, SimulationStep, TaskType } from './types'
import { v4 as uuid } from 'uuid'

const LISTING_ACTIONS = [
  'Beach Vibes Collection', 'Autumn Harvest Set', 'Minimalist Line', 'Boho Dreams',
  'Urban Street Art', 'Nature Escape', 'Retro Revival', 'Zen Harmony',
  'Cosmic Explorer', 'Vintage Rose', 'Mountain High', 'Ocean Breeze',
]

export class MarcusAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
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
      return `Create a full Etsy listing for: ${task.title}. ${task.description}. Include optimized title, compelling description, 13 SEO tags, and pricing suggestion. Format as JSON: { "title": "...", "description": "...", "tags": ["..."], "price": 29.99 }`
    }
    if (task.type === 'listing_optimize') {
      return `Optimize the Etsy SEO for: ${task.title}. Suggest improved title, updated tags based on current trends, and description tweaks.`
    }
    return `Suggest photo/mockup improvements for: ${task.title}. What types of lifestyle photos and presentation would increase click-through rate?`
  }

  async processWithAi(task: Task): Promise<void> {
    const etsy = isEtsyConnected()

    this.log(`Thinking about: ${task.title}...`, 'thinking', task.id)
    this.updateProgress(task.id, 15, 'Analyzing task...')
    await new Promise(r => setTimeout(r, 500))

    this.log('Generating listing content with AI...', 'thinking', task.id)
    this.updateProgress(task.id, 30, 'Consulting AI...')

    const result = await aiChat(this.getEffectiveSystemPrompt(), this.getTaskPrompt(task), { model: this.model })

    if (!result) {
      this.log('AI unavailable, running simulation...', 'warning', task.id)
      await this.simulateWork(task.id, this.getSimulationSteps(task))
      return
    }

    run('UPDATE tasks SET output_data = ? WHERE id = ?', JSON.stringify({ aiResponse: result }), task.id)

    if (etsy && task.type === 'listing_create') {
      this.log('AI content ready, publishing to Etsy...', 'info', task.id)
      this.updateProgress(task.id, 60, 'Publishing to Etsy...')

      try {
        // Try to parse AI response as listing data
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const listingData = JSON.parse(jsonMatch[0])
          this.log(`Publishing: "${listingData.title}"`, 'info', task.id)
          this.updateProgress(task.id, 80, 'Uploading to Etsy...')

          // Store as product in our DB
          const productId = uuid()
          const tags = Array.isArray(listingData.tags) ? JSON.stringify(listingData.tags) : '[]'
          run(
            `INSERT INTO products (id, shop_id, title, description, tags, price, status, created_by) VALUES (?, ?, ?, ?, ?, ?, 'listed', 'marcus')`,
            productId, this.shopId, listingData.title || task.title, listingData.description || '', tags, listingData.price || 29.99
          )
          this.log(`Product saved to catalog`, 'success', task.id)
        }
      } catch (e) {
        this.log(`Could not auto-publish: ${e}`, 'warning', task.id)
      }
    } else {
      const preview = result.length > 120 ? result.substring(0, 120) + '...' : result
      this.log(`AI result: ${preview}`, 'info', task.id)
    }

    this.updateProgress(task.id, 90, 'Finalizing...')
    await new Promise(r => setTimeout(r, 500))
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
