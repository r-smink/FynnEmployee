'use client'

import { use, useState } from 'react'
import { Plus, Trash2, Pencil, X, Loader2, Users } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { AgentAvatar, AgentStatusPill } from '@/components/dashboard/agent-card'
import { useAgents, type AgentData } from '@/hooks/use-agents'
import { agentRole } from '@/lib/labels'

const EMPTY_FORM = { name: '', role: '', description: '', color: '#8F39AC', customPrompt: '' }

export default function AgentsPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const { agents, loading, refresh } = useAgents(shopId)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const closeForm = () => { setShowCreate(false); setEditingId(null); setForm(EMPTY_FORM) }

  const createAgent = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/shops/${shopId}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          role: form.role || 'Custom-agent',
          description: form.description,
          color: form.color,
          customPrompt: form.customPrompt,
        }),
      })
      closeForm()
      refresh()
    } catch {}
    setSaving(false)
  }

  const updateAgent = async (agentId: string) => {
    setSaving(true)
    try {
      await fetch(`/api/shops/${shopId}/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          role: form.role,
          description: form.description,
          color: form.color,
          custom_prompt: form.customPrompt,
        }),
      })
      closeForm()
      refresh()
    } catch {}
    setSaving(false)
  }

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Deze agent verwijderen?')) return
    try {
      await fetch(`/api/shops/${shopId}/agents/${agentId}`, { method: 'DELETE' })
      refresh()
    } catch {}
  }

  const startEdit = (agent: AgentData & { custom_prompt?: string | null }) => {
    setEditingId(agent.id)
    setShowCreate(false)
    setForm({
      name: agent.name,
      role: agent.role,
      description: agent.description || '',
      color: agent.color,
      customPrompt: agent.custom_prompt || '',
    })
  }

  return (
    <>
      <Topbar title="Agents" subtitle={`${agents.length} agents in je team`} />
      <PageBody>
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-[9px]">
            <Users className="w-[19px] h-[19px]" style={{ color: 'var(--fyn-purple)' }} />
            <h3 className="m-0 text-[17px] font-bold" style={{ color: 'var(--text-h)' }}>Team</h3>
          </div>
          <button className="fynn-btn" onClick={() => { closeForm(); setShowCreate(!showCreate) }}>
            <Plus className="w-4 h-4" /> Agent aanmaken
          </button>
        </div>

        {(showCreate || editingId) && (
          <div className="fynn-card p-[22px] mb-[18px]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="fynn-section-title">{editingId ? 'Agent bewerken' : 'Nieuwe agent'}</h4>
              <button onClick={closeForm} className="cursor-pointer" aria-label="Sluiten">
                <X className="w-4 h-4" style={{ color: 'var(--text-m)' }} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="fynn-label">Naam</label>
                <input className="fynn-inp" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Naam van de agent…" />
              </div>
              <div>
                <label className="fynn-label">Rol</label>
                <input className="fynn-inp" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="bijv. Marketing-agent" />
              </div>
              <div className="md:col-span-2">
                <label className="fynn-label">Omschrijving</label>
                <input className="fynn-inp" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Wat doet deze agent?" />
              </div>
              <div className="md:col-span-2">
                <label className="fynn-label">Eigen prompt (optioneel)</label>
                <textarea className="fynn-inp" rows={3} value={form.customPrompt} onChange={e => setForm(f => ({ ...f, customPrompt: e.target.value }))}
                  placeholder="Eigen systeemprompt voor deze agent…" />
              </div>
              <div>
                <label className="fynn-label">Kleur</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-11 h-11 rounded-lg cursor-pointer" style={{ border: '2px solid var(--input-border)', background: 'var(--input-bg)' }} />
                  <code className="text-[12.5px]" style={{ color: 'var(--text-m)' }}>{form.color}</code>
                </div>
              </div>
            </div>
            <div className="mt-[18px] flex items-center gap-2.5">
              <button className="fynn-btn" disabled={saving || !form.name.trim()}
                onClick={() => editingId ? updateAgent(editingId) : createAgent()}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Wijzigingen opslaan' : 'Agent aanmaken'}
              </button>
              <button className="fynn-btn-ghost" onClick={closeForm}>Annuleren</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
            {[...Array(6)].map((_, i) => <div key={i} className="fynn-card h-44 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
            {agents.map((agent) => (
              <div key={agent.id} className="fynn-card p-[18px]">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <AgentAvatar agent={agent} size={42} />
                    <div className="min-w-0">
                      <h4 className="text-[14.5px] font-bold truncate" style={{ color: 'var(--text-h)' }}>{agent.name}</h4>
                      <p className="text-xs truncate" style={{ color: 'var(--text-m)' }}>{agentRole(agent)}</p>
                    </div>
                  </div>
                  <AgentStatusPill agent={agent} />
                </div>
                <p className="text-[12.5px] mb-3.5 line-clamp-2 min-h-9" style={{ color: 'var(--text-m)' }}>{agent.description}</p>
                <div className="flex items-center justify-between pt-[13px]" style={{ borderTop: '1px solid var(--divide)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-m)' }}>
                    <b style={{ color: agent.color }}>{agent.tasks_completed || 0}</b> taken voltooid
                  </span>
                  {agent.is_custom === 1 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(agent)} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: 'var(--well)' }} title="Bewerken">
                        <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--fyn-blue)' }} />
                      </button>
                      <button onClick={() => deleteAgent(agent.id)} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: 'var(--well)' }} title="Verwijderen">
                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </>
  )
}
