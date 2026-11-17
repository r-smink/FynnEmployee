// Claude models offered when agents use a direct Anthropic API key (safe to import in client components)
export const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-5-5'
export const ANTHROPIC_MODELS = [
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', note: 'Snel en goedkoop ($0,10 / $0,50 per 1M tokens)' },
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', note: 'Sterk allround ($2 / $10 per 1M tokens)' },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', note: 'Slimst, duurder ($4 / $20 per 1M tokens)' },
]
