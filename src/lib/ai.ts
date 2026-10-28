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

export function getModel(): string {
  return getSetting('openrouter_model') || 'google/gemini-2.0-flash-001'
}

export function isAiEnabled(): boolean {
  return !!getSetting('openrouter_api_key')
}

export async function aiChat(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number }
): Promise<string | null> {
  const client = getAiClient()
  if (!client) return null

  try {
    const response = await client.chat.completions.create({
      model: getModel(),
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
