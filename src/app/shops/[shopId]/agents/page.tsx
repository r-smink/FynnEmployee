'use client'

import { use, useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { useAgents } from '@/hooks/use-agents'
import { Bot, Plus, Trash2, Edit3, X, Loader2 } from 'lucide-react'

export default function AgentsPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const { agents, loading, refresh } = useAgents(shopId)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', role: '', description: '', color: '#8888aa', customPrompt: '' })
  const [saving, setSaving] = useState(false)

  const createAgent = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/shops/${shopId}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          role: form.role || 'Custom Agent',
          description: form.description,
          color: form.color,
          customPrompt: form.customPrompt,
        }),
      })
      setForm({ name: '', role: '', description: '', color: '#8888aa', customPrompt: '' })
      setShowCreate(false)
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
      setEditingId(null)
      setForm({ name: '', role: '', description: '', color: '#8888aa', customPrompt: '' })
      refresh()
    } catch {}
    setSaving(false)
  }

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Delete this agent?')) return
    try {
      await fetch(`/api/shops/${shopId}/agents/${agentId}`, { method: 'DELETE' })
      refresh()
    } catch {}
  }

  const startEdit = (agent: any) => {
    setEditingId(agent.id)
    setForm({
      name: agent.name,
      role: agent.role,
      description: agent.description || '',
      color: agent.color,
      customPrompt: agent.custom_prompt || '',
    })
    setShowCreate(false)
  }

  return (
    <>
      <Topbar title="Agents" subtitle={`${agents.length} agents in workforce`} />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Agent Workforce</h3>
          <button
            onClick={() => { setShowCreate(!showCreate); setEditingId(null); setForm({ name: '', role: '', description: '', color: '#8888aa', customPrompt: '' }) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: 'var(--accent-green)', color: '#0a0a0f' }}>
            <Plus className="w-4 h-4" /> Create Agent
          </button>
        </div>

        {/* Create/Edit Form */}
        {(showCreate || editingId) && (
          <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingId ? 'Edit Agent' : 'New Agent'}
              </h4>
              <button onClick={() => { setShowCreate(false); setEditingId(null) }}>
                <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Agent name..." className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
                <input type="text" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  placeholder="e.g. Marketing Agent" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What does this agent do?" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Custom Prompt (optional)</label>
                <textarea value={form.customPrompt} onChange={e => setForm(f => ({ ...f, customPrompt: e.target.value }))}
                  placeholder="Custom system prompt for this agent..."
                  rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border-0" />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{form.color}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => editingId ? updateAgent(editingId) : createAgent()}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent-blue)', color: 'white' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {editingId ? 'Save Changes' : 'Create Agent'}
              </button>
              <button onClick={() => { setShowCreate(false); setEditingId(null) }}
                className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Agent Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-5 h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agents.map((agent: any) => (
              <div key={agent.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: `${agent.color}22`, color: agent.color }}>
                      {agent.name[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{agent.name}</h4>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{agent.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full"
                      style={{ background: agent.status === 'working' ? 'var(--accent-green)' : agent.status === 'idle' ? 'var(--accent-yellow)' : 'var(--text-secondary)' }} />
                  </div>
                </div>

                <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {agent.description}
                </p>

                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {agent.tasks_completed || 0} tasks done
                  </span>
                  <div className="flex items-center gap-1">
                    {agent.is_custom === 1 && (
                      <>
                        <button onClick={() => startEdit(agent)} className="p-1 rounded hover:opacity-80"
                          style={{ color: 'var(--accent-blue)' }}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteAgent(agent.id)} className="p-1 rounded hover:opacity-80"
                          style={{ color: '#ff4a4a' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
