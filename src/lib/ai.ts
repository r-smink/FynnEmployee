import OpenAI from 'openai'
import { get, run } from './db'

const globalForAi = globalThis as unknown as { __fynnAi: OpenAI | null; __fynnAiKey: string | null }

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
  // Reset cached AI client when key changes
  if (key === 'openrouter_api_key') {
    globalForAi.__fynnAi = null
    globalForAi.__fynnAiKey = null
  }
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

export const DEFAULT_MODEL = 'anthropic/claude-haiku-5.5'

export function getModel(): string {
  return getSetting('openrouter_model') || DEFAULT_MODEL
}

export type AiMode = 'live' | 'demo'

// Live is the default once an API key exists; 'demo' forces simulated work even with a key
export function getAiMode(): AiMode {
  return getSetting('ai_mode') === 'demo' ? 'demo' : 'live'
}

export function hasAiKey(): boolean {
  return !!getSetting('openrouter_api_key')
}

export function isAiEnabled(): boolean {
  return hasAiKey() && getAiMode() === 'live'
}

// Like aiChat, but a failure throws with the reason, so a live task fails visibly instead of pretending to work
export async function askAi(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; model?: string }
): Promise<string> {
  const client = getAiClient()
  if (!client) throw new Error('Geen OpenRouter API-key ingesteld')
  const model = options?.model || getModel()
  const answerTokens = options?.maxTokens ?? 500

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
  const client = getAiClient()
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: options?.model || getModel(),
      max_tokens: options?.maxTokens ?? 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
    return response.choices[0]?.message?.content ?? null
  } catch (err) {
    console.error('OpenRouter AI error:', err)
    return null
  }
}
