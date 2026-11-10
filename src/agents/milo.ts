import { BaseAgent } from './base-agent'
import { run } from '@/lib/db'
import { isAiEnabled } from '@/lib/ai'
import { runSeoRound, seoDue } from '@/lib/seo'
import { promoDue, promoteNext } from '@/lib/promote'
import type { AgentConfig, Task, SimulationStep, TaskType } from './types'

const DEMO_LISTINGS = ['Retro Sunset Tee', 'Botanical Line Art Poster', 'Cat Mom Mug', 'Celestial Moon Tote', 'Mountain Adventure Hoodie']

// Milo makes every Etsy listing SEO-proof and promotes live listings on Pinterest (when switched on)
export class MiloAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config)
  }

  getSystemPrompt(): string {
    return `You are Milo, the SEO and marketing AI agent of an Etsy print-on-demand store.
You make listings rank in Etsy search (titles, 13 tags, descriptions) and bring buyers in from Pinterest and other channels.
Be concrete: name the exact search phrases, tags and texts to use. Never invent sales figures.
Keep responses under 250 words.`
  }

  getTaskPrompt(task: Task): string {
    if (task.type === 'promo_pin') {
      return `Write a Pinterest pin (title and description with hashtags) that brings buyers to the Etsy listing "${task.title}".`
    }
    return `Do an Etsy SEO check of the listing "${task.title}": score the title, tags and description and give an improved version.`
  }

  // Live: a listing that is due for a check, or a pin when promoting is on and there is room today
  hasRealWork(): boolean {
    return !this.workedWithin(3) && (seoDue(this.shopId) || promoDue(this.shopId))
  }

  generateTask(): { type: TaskType; title: string; description: string } {
    if (isAiEnabled()) {
      const promo = promoDue(this.shopId)
      const seo = seoDue(this.shopId)
      const type: TaskType = promo && (!seo || Math.random() < 0.5) ? 'promo_pin' : 'seo_audit'
      return type === 'promo_pin'
        ? { type, title: 'Live listing promoten op Pinterest', description: 'Een pin die kopers naar de listing brengt' }
        : { type, title: 'SEO-check van de volgende listing', description: 'Titel, tags en beschrijving beter vindbaar maken' }
    }
    const listing = DEMO_LISTINGS[Math.floor(Math.random() * DEMO_LISTINGS.length)]
    const type: TaskType = Math.random() < 0.6 ? 'seo_audit' : 'promo_pin'
    return type === 'seo_audit'
      ? { type, title: `SEO-check "${listing}"`, description: 'Titel, tags en beschrijving beter vindbaar maken' }
      : { type, title: `"${listing}" promoten op Pinterest`, description: 'Een pin die kopers naar de listing brengt' }
  }

  async processWithAi(task: Task): Promise<void> {
    const onStep = (message: string, progress: number) => {
      this.log(message, 'info', task.id)
      this.updateProgress(task.id, progress, message)
    }
    const input = JSON.parse(task.input_data || '{}') as { listingId?: string }

    if (task.type === 'seo_audit') {
      const { review, remaining } = await runSeoRound(this.shopId, { model: this.model, listingId: input.listingId, onStep })
      let summary: string
      if (!review) summary = 'Alle listings zijn de afgelopen weken al gecontroleerd.'
      else if (review.status === 'applied') summary = `"${review.proposal!.title}" verbeterd en doorgevoerd op Etsy (score ${review.score_before} → ${review.score_after}).`
      else if (review.status === 'proposed') summary = `Voorstel klaar voor "${review.current.title}" (score ${review.score_before} → ${review.score_after}). Keur het goed op Marketing.`
      else if (review.status === 'failed') summary = `Doorvoeren op Etsy mislukte: ${review.error}`
      else summary = `"${review.current.title}" gecontroleerd: score ${review.score_before}.` +
        (review.issues.length ? ` Aandachtspunten: ${review.issues.slice(0, 3).join(' ')}` : ' Niets te verbeteren.')
      if (review) summary += ` Nog ${remaining} listings te gaan.`
      run('UPDATE tasks SET output_data = ? WHERE id = ?', JSON.stringify({ aiResponse: summary }), task.id)
      this.log(summary, review?.status === 'failed' ? 'warning' : 'success', task.id)
      return
    }

    if (task.type === 'promo_pin') {
      const promotion = await promoteNext(this.shopId, { model: this.model, onStep })
      const summary = promotion
        ? `Pin geplaatst op Pinterest: "${promotion.title}"`
        : 'Alle live listings staan al op Pinterest.'
      run('UPDATE tasks SET output_data = ? WHERE id = ?', JSON.stringify({ aiResponse: summary }), task.id)
      this.log(summary, 'success', task.id)
      return
    }

    return super.processWithAi(task)
  }

  getSimulationSteps(task: Task): SimulationStep[] {
    if (task.type === 'promo_pin') {
      return [
        { message: 'Kiest een live listing om te promoten...', type: 'thinking', progress: 20, durationMs: 2000 },
        { message: 'Schrijft een pin met zoekwoorden en hashtags...', type: 'info', progress: 55, durationMs: 2500 },
        { message: 'Plaatst de pin op Pinterest...', type: 'info', progress: 85, durationMs: 2000 },
        { message: 'Pin geplaatst', type: 'success', progress: 100, durationMs: 1000 },
      ]
    }
    return [
      { message: 'Leest titel, tags en beschrijving...', type: 'thinking', progress: 15, durationMs: 2000 },
      { message: 'Vergelijkt met waar kopers op zoeken...', type: 'info', progress: 40, durationMs: 2500 },
      { message: 'Schrijft een betere titel en 13 tags...', type: 'thinking', progress: 70, durationMs: 2500 },
      { message: 'SEO-voorstel klaar', type: 'success', progress: 100, durationMs: 1000 },
    ]
  }
}
