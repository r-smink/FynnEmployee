'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Key, ToggleLeft, ToggleRight, Shield, Bot, Sparkles, Check, Loader2, ExternalLink } from 'lucide-react'

interface ApiKeyField {
  label: string
  key: string
  placeholder: string
  description?: string
}

const apiKeys: ApiKeyField[] = [
  {
    label: 'OpenRouter API Key',
    key: 'openrouter_api_key',
    placeholder: 'sk-or-v1-...',
    description: 'Powers all AI agents. Get one free at openrouter.ai/keys',
  },
  {
    label: 'OpenRouter Model',
    key: 'openrouter_model',
    placeholder: 'google/gemini-2.0-flash-001',
    description: 'Default: google/gemini-2.0-flash-001 (fast & cheap). Try: anthropic/claude-sonnet-4, openai/gpt-4o-mini',
  },
  { label: 'Etsy API Key', key: 'etsy_api_key', placeholder: 'Enter your Etsy API key...' },
  { label: 'Etsy API Secret', key: 'etsy_api_secret', placeholder: 'Enter your Etsy API secret...' },
  { label: 'Printful API Key', key: 'printful_api_key', placeholder: 'Enter your Printful API key...' },
]

const agents = [
  { id: 'luna', name: 'Luna', role: 'Design Agent', color: '#9e4aff' },
  { id: 'marcus', name: 'Marcus', role: 'Listing Agent', color: '#4a9eff' },
  { id: 'aria', name: 'Aria', role: 'Fulfillment Agent', color: '#4aff9e' },
  { id: 'rex', name: 'Rex', role: 'Support Agent', color: '#ff9e4a' },
  { id: 'nova', name: 'Nova', role: 'Analytics Agent', color: '#ff4a9e' },
]

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [agentStates, setAgentStates] = useState<Record<string, boolean>>(
    Object.fromEntries(agents.map(a => [a.id, true]))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setAiEnabled(data.ai_enabled === 'true')
    }).catch(() => {})
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const payload: Record<string, string> = {}
      for (const [key, value] of Object.entries(values)) {
        if (value.trim()) payload[key] = value.trim()
      }
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setSaved(true)
      if (payload.openrouter_api_key) setAiEnabled(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setSaving(false)
  }

  return (
    <>
      <Topbar title="Settings" subtitle="Configure integrations and agent behavior" />
      <div className="p-6 space-y-6 max-w-3xl">
        {/* AI Status Banner */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: aiEnabled ? 'rgba(74, 255, 158, 0.15)' : 'rgba(136, 136, 170, 0.15)' }}>
                <Sparkles className="w-5 h-5" style={{ color: aiEnabled ? 'var(--accent-green)' : 'var(--text-secondary)' }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {aiEnabled ? 'AI Mode Active' : 'Demo Mode (Simulation)'}
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {aiEnabled
                    ? 'Agents are using OpenRouter AI for real content generation'
                    : 'Add an OpenRouter API key below to enable AI-powered agents'}
                </p>
              </div>
            </div>
            <div className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: aiEnabled ? 'var(--accent-green)' : 'var(--text-secondary)' }} />
          </div>
        </div>

        {/* API Keys */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <Key className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>API Keys</h3>
          </div>
          <div className="space-y-4">
            {apiKeys.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {field.label}
                </label>
                {field.description && (
                  <p className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                    {field.description}
                  </p>
                )}
                <input
                  type={field.key.includes('model') ? 'text' : 'password'}
                  placeholder={field.placeholder}
                  value={values[field.key] || ''}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors focus:ring-1"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--accent-blue)', color: 'white' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
              </button>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                <ExternalLink className="w-3 h-3" />
                Get OpenRouter Key
              </a>
            </div>
          </div>
        </div>

        {/* Agent Toggles */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Agent Controls</h3>
          </div>
          <div className="space-y-3">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ background: 'var(--bg-primary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: `${agent.color}22`, color: agent.color }}>
                    {agent.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{agent.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{agent.role}</p>
                  </div>
                </div>
                <button onClick={() => setAgentStates(s => ({ ...s, [agent.id]: !s[agent.id] }))} className="transition-colors">
                  {agentStates[agent.id] ? (
                    <ToggleRight className="w-7 h-7" style={{ color: agent.color }} />
                  ) : (
                    <ToggleLeft className="w-7 h-7" style={{ color: 'var(--text-secondary)' }} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Model Info */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Popular OpenRouter Models</h3>
          <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {[
              { model: 'google/gemini-2.0-flash-001', note: 'Fast & cheap - great default', cost: '~$0.10/1M tokens' },
              { model: 'openai/gpt-4o-mini', note: 'Good quality, affordable', cost: '~$0.15/1M tokens' },
              { model: 'anthropic/claude-sonnet-4', note: 'Best for creative writing', cost: '~$3/1M tokens' },
              { model: 'meta-llama/llama-3.3-70b-instruct', note: 'Free tier available', cost: 'Free / $0.40' },
              { model: 'deepseek/deepseek-chat-v3-0324', note: 'Very capable & cheap', cost: '~$0.27/1M tokens' },
            ].map(m => (
              <div key={m.model} className="flex items-center justify-between py-1.5 px-3 rounded"
                style={{ background: 'var(--bg-primary)' }}>
                <div>
                  <code className="text-xs" style={{ color: 'var(--accent-blue)' }}>{m.model}</code>
                  <span className="ml-2">{m.note}</span>
                </div>
                <span style={{ color: 'var(--accent-green)' }}>{m.cost}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
