'use client'

import { use, useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Key, Sparkles, Zap, Check, Loader2, ExternalLink, Store, Link2, ShoppingBag, Settings2, BookOpen } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { AgentAvatar } from '@/components/dashboard/agent-card'
import { useAgents } from '@/hooks/use-agents'
import { ModelPicker } from '@/components/models/ModelPicker'
import { useModels, featuredModels, formatPrice } from '@/hooks/use-models'
import { agentRole } from '@/lib/labels'

interface ApiKeyField {
  label: string
  key: string
  placeholder: string
  description?: string
  type?: 'text' | 'password'
}

const apiKeys: ApiKeyField[] = [
  {
    label: 'OpenRouter API-sleutel',
    key: 'openrouter_api_key',
    placeholder: 'sk-or-v1-…',
    description: 'Voedt alle AI-agents. Gratis sleutel via openrouter.ai/keys',
  },
  {
    label: 'Standaardmodel',
    key: 'openrouter_model',
    placeholder: '',
    description: 'Gebruikt door elke agent zonder eigen model. Per agent kies je een model op de Agents-pagina.',
    type: 'text',
  },
]

interface EtsyShop {
  id: number
  name: string
  title: string
  url: string
  activeListings: number
  favorites: number
  sales: number
  icon: string | null
}

const connectedPill = { background: 'var(--fyn-success-light)', color: '#047857', fontSize: 11 }
const disconnectedPill = { background: 'var(--track)', color: 'var(--text-m)', fontSize: 11 }

function CardTitle({ icon: Icon, color, children }: { icon: typeof Key; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[9px] mb-4">
      <Icon className="w-[18px] h-[18px]" style={{ color }} />
      <h3 className="fynn-section-title">{children}</h3>
    </div>
  )
}

export default function SettingsPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  return (
    <Suspense fallback={<Topbar title="Instellingen" subtitle="Laden…" />}>
      <SettingsContent shopId={shopId} />
    </Suspense>
  )
}

function SettingsContent({ shopId }: { shopId: string }) {
  const searchParams = useSearchParams()
  const { agents } = useAgents(shopId)
  const { models, defaultModel, live } = useModels()
  const [values, setValues] = useState<Record<string, string>>({})
  const [disabledAgents, setDisabledAgents] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)

  // Etsy state
  const [etsyConnected, setEtsyConnected] = useState(false)
  const [etsyShop, setEtsyShop] = useState<EtsyShop | null>(null)
  const [etsyConnecting, setEtsyConnecting] = useState(false)
  const [etsyError, setEtsyError] = useState<string | null>(null)

  // Printful state
  const [printfulConnected, setPrintfulConnected] = useState(false)
  const [printfulStore, setPrintfulStore] = useState<{ id: number; name: string; type: string; currency: string } | null>(null)
  const [printfulChecking, setPrintfulChecking] = useState(false)

  useEffect(() => {
    const connected = searchParams.get('etsy_connected')
    const error = searchParams.get('etsy_error')
    if (connected === 'true') {
      setEtsyConnected(true)
      fetchEtsyShop()
    }
    if (error) {
      setEtsyError(decodeURIComponent(error))
    }
  }, [searchParams])

  useEffect(() => {
    fetch(`/api/shops/${shopId}/settings`).then(r => r.json()).then(data => {
      setAiEnabled(data.ai_enabled === 'true')
      if (data.openrouter_model) setValues(v => ({ ...v, openrouter_model: v.openrouter_model ?? data.openrouter_model }))
    }).catch(() => {})
    fetchEtsyShop()
    fetchPrintfulStore()
  }, [shopId])

  const fetchPrintfulStore = async () => {
    try {
      const res = await fetch('/api/printful/store')
      const data = await res.json()
      if (data.connected && data.store) {
        setPrintfulConnected(true)
        setPrintfulStore(data.store)
      }
    } catch {}
  }

  const testPrintfulConnection = async () => {
    if (!values.printful_api_key) return
    setPrintfulChecking(true)
    await fetch(`/api/shops/${shopId}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ printful_api_key: values.printful_api_key }),
    })
    await fetchPrintfulStore()
    setPrintfulChecking(false)
  }

  const fetchEtsyShop = async () => {
    try {
      const res = await fetch('/api/etsy/shop')
      const data = await res.json()
      if (data.connected && data.shop) {
        setEtsyConnected(true)
        setEtsyShop(data.shop)
      }
    } catch {}
  }

  const saveSettings = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const payload: Record<string, string> = {}
      for (const [key, value] of Object.entries(values)) {
        if (value.trim()) payload[key] = value.trim()
      }
      await fetch(`/api/shops/${shopId}/settings`, {
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

  const connectEtsy = async () => {
    if (values.etsy_api_key) {
      await fetch(`/api/shops/${shopId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etsy_api_key: values.etsy_api_key }),
      })
    }

    setEtsyConnecting(true)
    setEtsyError(null)
    try {
      const res = await fetch('/api/etsy/auth')
      const data = await res.json()
      if (data.error) {
        setEtsyError(data.error)
        setEtsyConnecting(false)
        return
      }
      window.location.href = data.url
    } catch {
      setEtsyError('OAuth-flow starten mislukt')
      setEtsyConnecting(false)
    }
  }

  return (
    <>
      <Topbar title="Instellingen" subtitle="Integraties en agent-gedrag configureren" />
      <PageBody>
        <div className="max-w-[860px]">
          {/* AI status banner */}
          <div className="flex items-center justify-between gap-4 rounded-[15px] px-[22px] py-5 mb-[18px]"
            style={{ background: 'linear-gradient(135deg,rgba(143,57,172,.16),rgba(55,159,211,.13))', border: '1px solid var(--card-border)' }}>
            <div className="flex items-center gap-3.5">
              <div className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center"
                style={{ background: aiEnabled ? 'rgba(16,185,129,.2)' : 'rgba(143,57,172,.2)' }}>
                {aiEnabled
                  ? <Sparkles className="w-[22px] h-[22px]" style={{ color: 'var(--fyn-success)' }} />
                  : <Zap className="w-[22px] h-[22px]" style={{ color: 'var(--fyn-purple)' }} />}
              </div>
              <div>
                <div className="text-[15px] font-bold" style={{ color: 'var(--text-h)' }}>
                  {aiEnabled ? 'AI-modus actief' : 'Demo-modus (simulatie)'}
                </div>
                <div className="text-[12.5px] mt-0.5" style={{ color: 'var(--text-m)' }}>
                  {aiEnabled
                    ? 'Agents gebruiken OpenRouter voor echte content'
                    : 'Voeg een OpenRouter-sleutel toe om AI-gestuurde agents in te schakelen.'}
                </div>
              </div>
            </div>
            <div className="w-3 h-3 rounded-full animate-fynn-pulse" style={{ background: aiEnabled ? 'var(--fyn-success)' : 'var(--fyn-purple)' }} />
          </div>

          {/* Integrations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-[18px]">
            {/* Etsy */}
            <div className="fynn-card p-5">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(255,158,74,.16)' }}>
                    <Store className="w-[18px] h-[18px]" style={{ color: '#ff9e4a' }} />
                  </div>
                  <h3 className="m-0 text-[14.5px] font-bold" style={{ color: 'var(--text-h)' }}>Etsy-winkel</h3>
                </div>
                <span className="fynn-pill" style={etsyConnected && etsyShop ? connectedPill : disconnectedPill}>
                  {etsyConnected && etsyShop ? 'Verbonden' : 'Niet verbonden'}
                </span>
              </div>

              {etsyConnected && etsyShop ? (
                <>
                  <div className="fynn-well flex items-center gap-3 px-3.5 py-3">
                    <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-none overflow-hidden" style={{ background: 'rgba(255,158,74,.16)' }}>
                      {etsyShop.icon
                        ? <img src={etsyShop.icon} alt="" className="w-full h-full object-cover" />
                        : <Store className="w-[17px] h-[17px]" style={{ color: '#ff9e4a' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold truncate" style={{ color: 'var(--text-h)' }}>{etsyShop.name}</div>
                      <div className="text-[11.5px] truncate" style={{ color: 'var(--text-m)' }}>
                        {etsyShop.activeListings} listings · {etsyShop.sales} verkopen · {etsyShop.favorites} favorieten
                      </div>
                    </div>
                    <a href={etsyShop.url} target="_blank" rel="noopener noreferrer" title="Bekijk winkel">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="text-[11.5px] mt-2.5" style={{ color: '#10b981' }}>Marcus publiceert listings direct. Aria synchroniseert echte orders.</div>
                </>
              ) : (
                <>
                  <p className="mb-3 text-[12.5px] leading-normal" style={{ color: 'var(--text-m)' }}>
                    Verbind je Etsy-verkopersaccount voor echt listingbeheer en ordersynchronisatie. Je hebt een <b>Seller App</b> nodig.
                  </p>
                  <input type="password" className="fynn-inp mb-3" placeholder="Je Etsy-app keystring…"
                    value={values.etsy_api_key || ''} onChange={e => setValues(v => ({ ...v, etsy_api_key: e.target.value }))} />
                  {etsyError && (
                    <p className="text-xs px-3 py-2 rounded-lg mb-3" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{etsyError}</p>
                  )}
                  <button onClick={connectEtsy} disabled={etsyConnecting}
                    className="fynn-btn" style={{ height: 40, background: '#ff9e4a', boxShadow: 'none', fontWeight: 700, fontSize: 12.5 }}>
                    {etsyConnecting ? <Loader2 className="w-[15px] h-[15px] animate-spin" /> : <Link2 className="w-[15px] h-[15px]" />}
                    {etsyConnecting ? 'Verbinden…' : 'Verbind Etsy'}
                  </button>
                </>
              )}
            </div>

            {/* Printful */}
            <div className="fynn-card p-5">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center" style={{ background: 'rgba(16,185,129,.16)' }}>
                    <ShoppingBag className="w-[18px] h-[18px]" style={{ color: '#10b981' }} />
                  </div>
                  <h3 className="m-0 text-[14.5px] font-bold" style={{ color: 'var(--text-h)' }}>Printful</h3>
                </div>
                <span className="fynn-pill" style={printfulConnected && printfulStore ? connectedPill : disconnectedPill}>
                  {printfulConnected && printfulStore ? 'Verbonden' : 'Niet verbonden'}
                </span>
              </div>

              {printfulConnected && printfulStore ? (
                <div className="fynn-well flex items-center gap-3 px-3.5 py-3">
                  <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-none" style={{ background: 'rgba(16,185,129,.16)' }}>
                    <ShoppingBag className="w-[17px] h-[17px]" style={{ color: '#10b981' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold truncate" style={{ color: 'var(--text-h)' }}>{printfulStore.name}</div>
                    <div className="text-[11.5px]" style={{ color: 'var(--text-m)' }}>{printfulStore.type}-winkel · {printfulStore.currency}</div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-[12.5px] leading-normal" style={{ color: 'var(--text-m)' }}>
                    Verbind Printful voor automatische print-on-demand fulfilment via een Private Token.
                  </p>
                  <input type="password" className="fynn-inp mb-3" placeholder="Je Printful private token…"
                    value={values.printful_api_key || ''} onChange={e => setValues(v => ({ ...v, printful_api_key: e.target.value }))} />
                  <div className="flex items-center gap-3">
                    <button onClick={testPrintfulConnection} disabled={printfulChecking || !values.printful_api_key}
                      className="fynn-btn" style={{ height: 40, background: '#10b981', boxShadow: 'none', fontWeight: 700, fontSize: 12.5 }}>
                      {printfulChecking ? <Loader2 className="w-[15px] h-[15px] animate-spin" /> : <Link2 className="w-[15px] h-[15px]" />}
                      {printfulChecking ? 'Controleren…' : 'Verbind Printful'}
                    </button>
                    <a href="https://www.printful.com/dashboard/developer/api" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Token ophalen
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* API keys */}
          <div className="fynn-card p-[22px] mb-[18px]">
            <CardTitle icon={Key} color="var(--fyn-blue)">API-sleutels</CardTitle>
            {apiKeys.map((field) => (
              <div key={field.key} className="mb-4">
                <label className="fynn-label">{field.label}</label>
                {field.description && <div className="fynn-hint">{field.description}</div>}
                {field.key === 'openrouter_model' ? (
                  <ModelPicker value={values.openrouter_model ?? defaultModel} onChange={m => setValues(v => ({ ...v, openrouter_model: m }))} />
                ) : (
                  <input className="fynn-inp" type={field.type || 'password'} placeholder={field.placeholder}
                    value={values[field.key] || ''} onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))} />
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-2.5 mt-1">
              <button className="fynn-btn" onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
                {saving ? 'Opslaan…' : saved ? 'Opgeslagen!' : 'Instellingen opslaan'}
              </button>
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="fynn-btn-ghost">
                <ExternalLink className="w-3.5 h-3.5" /> OpenRouter-sleutel ophalen
              </a>
            </div>
          </div>

          {/* Agent controls */}
          <div className="fynn-card p-[22px] mb-[18px]">
            <CardTitle icon={Settings2} color="var(--fyn-purple)">Agent-besturing</CardTitle>
            {agents.map((agent) => {
              const on = !disabledAgents[agent.id]
              return (
                <div key={agent.id} className="fynn-well flex items-center justify-between px-3.5 py-[11px] mb-[9px]">
                  <div className="flex items-center gap-[11px] min-w-0">
                    <AgentAvatar agent={agent} size={34} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-h)' }}>{agent.name}</div>
                      <div className="text-[11.5px] truncate" style={{ color: 'var(--text-m)' }}>
                        {agentRole(agent)} · {agent.model ? (models.find(m => m.id === agent.model)?.name || agent.model) : 'standaardmodel'}
                      </div>
                    </div>
                  </div>
                  <button role="switch" aria-checked={on} aria-label={`${agent.name} ${on ? 'uitzetten' : 'aanzetten'}`}
                    onClick={() => setDisabledAgents(s => ({ ...s, [agent.id]: on }))}
                    className="w-11 h-6 rounded-full relative cursor-pointer transition-colors flex-none"
                    style={{ background: on ? agent.color : 'var(--track)' }}>
                    <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: on ? 22 : 2 }} />
                  </button>
                </div>
              )
            })}
          </div>

          {/* Model list */}
          <div className="fynn-card p-[22px] mb-[18px]">
            <CardTitle icon={Sparkles} color="var(--fyn-purple)">Nieuwste OpenRouter-modellen</CardTitle>
            <div className="fynn-hint -mt-2 mb-3">
              {live ? 'Live van openrouter.ai — prijs per 1M tokens (input / output). Klik om als standaardmodel te kiezen.' : 'Modellijst van OpenRouter is nu niet bereikbaar.'}
            </div>
            {featuredModels(models).map(m => (
              <button key={m.id} type="button" onClick={() => setValues(v => ({ ...v, openrouter_model: m.id }))}
                className="fynn-well w-full flex items-center justify-between gap-3 px-3.5 py-[11px] mb-2 text-left cursor-pointer" style={{ borderRadius: 10 }}>
                <div className="min-w-0 truncate">
                  <code className="text-[12.5px]" style={{ color: 'var(--fyn-blue)' }}>{m.id}</code>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-m)' }}>{m.name} · {Math.round(m.context / 1000)}K context</span>
                </div>
                <span className="text-xs font-bold flex-none" style={{ color: '#10b981' }}>{formatPrice(m)}</span>
              </button>
            ))}
          </div>

          {/* Etsy setup guide */}
          <div className="fynn-card p-[22px]">
            <CardTitle icon={BookOpen} color="#ff9e4a">Etsy Seller App instellen</CardTitle>
            <ol className="space-y-2 text-[12.5px] list-decimal list-inside" style={{ color: 'var(--text-m)' }}>
              <li>Ga naar <a href="https://www.etsy.com/developers/your-apps" target="_blank" rel="noopener noreferrer">etsy.com/developers/your-apps</a></li>
              <li>Klik op <b>&quot;Create a New App&quot;</b></li>
              <li>Kies <b>&quot;Seller&quot;</b> als app-type (niet Personal)</li>
              <li>Stel de callback-URL in op: <code className="px-1.5 py-0.5 rounded" style={{ background: 'var(--well)', color: 'var(--fyn-blue)' }}>http://localhost:3000/api/etsy/callback</code></li>
              <li>Kopieer de <b>Keystring</b> (dit is je API-sleutel)</li>
              <li>Plak hem hierboven en klik op &quot;Verbind Etsy&quot;</li>
            </ol>
          </div>
        </div>
      </PageBody>
    </>
  )
}
