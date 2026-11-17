import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { get, run } from './db'
import { DEFAULT_ANTHROPIC_MODEL } from './anthropic-models'

const globalForAi = globalThis as unknown as {
  __fynnAi: OpenAI | null; __fynnAiKey: string | null
  __fynnAnthropic: Anthropic | null; __fynnAnthropicKey: string | null
}

interface Setting {
  key: string
  value: string
}

export function getSetting(key: string): string | null {
  const row = get<Setting>('SELECT * FROM settings WHERE key = ?', key)
  return row?.value ?? null
}

export function setSetting(key: string, value: string) {
  run(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
    key, value, value
  )
  // Reset cached AI clients when a key changes
  if (key === 'openrouter_api_key') {
    globalForAi.__fynnAi = null
    globalForAi.__fynnAiKey = null
  }
  if (key === 'anthropic_api_key') {
    globalForAi.__fynnAnthropic = null
    globalForAi.__fynnAnthropicKey = null
  }
}

// Which service runs the text agents. Images (Luna) always go through OpenRouter.
export type AiProvider = 'openrouter' | 'anthropic'
export const AI_PROVIDERS: AiProvider[] = ['openrouter', 'anthropic']

export function getAiProvider(): AiProvider {
  return getSetting('ai_provider') === 'anthropic' ? 'anthropic' : 'openrouter'
}

export function getAiClient(): OpenAI | null {
  const apiKey = getSetting('openrouter_api_key')
  if (!apiKey) return null

  if (globalForAi.__fynnAi && globalForAi.__fynnAiKey === apiKey) {
    return globalForAi.__fynnAi
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'FynnEmployee AI Store',
    },
  })

  globalForAi.__fynnAi = client
  globalForAi.__fynnAiKey = apiKey
  return client
}

function getAnthropicClient(): Anthropic | null {
  const apiKey = getSetting('anthropic_api_key')
  if (!apiKey) return null
  if (globalForAi.__fynnAnthropic && globalForAi.__fynnAnthropicKey === apiKey) {
    return globalForAi.__fynnAnthropic
  }
  const client = new Anthropic({ apiKey })
  globalForAi.__fynnAnthropic = client
  globalForAi.__fynnAnthropicKey = apiKey
  return client
}

export const DEFAULT_MODEL = 'anthropic/claude-haiku-5.5'

export function getModel(): string {
  return getSetting('openrouter_model') || DEFAULT_MODEL
}

export function getAnthropicModel(): string {
  return getSetting('anthropic_model') || DEFAULT_ANTHROPIC_MODEL
}

// Agents store OpenRouter ids (e.g. 'anthropic/claude-sonnet-5.5'). With a direct Anthropic key, translate
// Claude ids to Anthropic's form ('claude-sonnet-5-5'); models from other vendors fall back to the default.
function toAnthropicModel(model: string | undefined): string {
  if (!model) return getAnthropicModel()
  if (model.startsWith('claude-')) return model
  if (model.startsWith('anthropic/')) return model.slice('anthropic/'.length).replace(/\./g, '-')
  return getAnthropicModel()
}

export type AiMode = 'live' | 'demo'

// Live is the default once an API key exists; 'demo' forces simulated work even with a key
export function getAiMode(): AiMode {
  return getSetting('ai_mode') === 'demo' ? 'demo' : 'live'
}

export function hasAiKey(): boolean {
  return !!getSetting(getAiProvider() === 'anthropic' ? 'anthropic_api_key' : 'openrouter_api_key')
}

export function isAiEnabled(): boolean {
  return hasAiKey() && getAiMode() === 'live'
}

export function aiProviderLabel(): string {
  return getAiProvider() === 'anthropic' ? 'Anthropic' : 'OpenRouter'
}

async function askAnthropic(systemPrompt: string, userPrompt: string, answerTokens: number, requestedModel?: string): Promise<string> {
  const client = getAnthropicClient()
  if (!client) throw new Error('Geen Anthropic API-key ingesteld')
  const model = toAnthropicModel(requestedModel)

  // Thinking is always on for current Claude models; keep effort low and leave room for it, as with OpenRouter
  let stop: string | null | undefined
  for (const budget of [answerTokens * 4, answerTokens * 12]) {
    let response: Anthropic.Message
    try {
      response = await client.messages.create({
        model,
        max_tokens: budget,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        output_config: { effort: 'low' },
      })
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new Error('Anthropic API-key is ongeldig')
      if (err instanceof Anthropic.RateLimitError) throw new Error(`Anthropic-limiet bereikt voor ${model}, probeer het zo opnieuw`)
      throw new Error(`AI-model ${model} gaf een fout: ${err instanceof Error ? err.message : String(err)}`)
    }
    stop = response.stop_reason
    if (stop === 'refusal') throw new Error(`AI-model ${model} weigerde deze opdracht`)
    const text = response.content.flatMap(b => b.type === 'text' ? [b.text] : []).join('')
    if (text.trim()) return text
    if (stop !== 'max_tokens') break
  }
  throw new Error(stop === 'max_tokens'
    ? `AI-model ${model} gaf een leeg antwoord: het liep tegen de tokenlimiet aan.`
    : `AI-model ${model} gaf een leeg antwoord (reden: ${stop || 'onbekend'})`)
}

// Like aiChat, but a failure throws with the reason, so a live task fails visibly instead of pretending to work
export async function askAi(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; model?: string }
): Promise<string> {
  const answerTokens = options?.maxTokens ?? 500
  if (getAiProvider() === 'anthropic') return askAnthropic(systemPrompt, userPrompt, answerTokens, options?.model)

  const client = getAiClient()
  if (!client) throw new Error('Geen OpenRouter API-key ingesteld')
  const model = options?.model || getModel()

  // Reasoning models spend tokens on thinking before they answer; with only the answer budget they can run out
  // and return nothing. So allow extra room (only used tokens are billed) and ask for little reasoning.
  // If the answer still comes back empty because the limit was hit, try once more with a larger budget.
  let finish: string | null | undefined
  for (const budget of [answerTokens * 4, answerTokens * 12]) {
    let content: string | null | undefined
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: budget,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        // OpenRouter extension; models without reasoning ignore it
        reasoning: { effort: 'low', exclude: true },
      } as Parameters<typeof client.chat.completions.create>[0] & { reasoning: object }) as OpenAI.Chat.Completions.ChatCompletion
      content = response.choices[0]?.message?.content
      finish = response.choices[0]?.finish_reason
    } catch (err) {
      throw new Error(`AI-model ${model} gaf een fout: ${err instanceof Error ? err.message : String(err)}`)
    }
    if (content?.trim()) return content
    if (finish !== 'length') break
  }
  throw new Error(finish === 'length'
    ? `AI-model ${model} gaf een leeg antwoord: het liep tegen de tokenlimiet aan (waarschijnlijk een denkend model). Kies een ander model voor deze agent.`
    : `AI-model ${model} gaf een leeg antwoord (reden: ${finish || 'onbekend'})`)
}

export async function aiChat(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; model?: string }
): Promise<string | null> {
  if (!hasAiKey()) return null
  try {
    return await askAi(systemPrompt, userPrompt, options)
  } catch (err) {
    console.error(`${aiProviderLabel()} AI error:`, err)
    return null
  }
}
