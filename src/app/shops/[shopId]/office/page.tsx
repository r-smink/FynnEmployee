'use client'

import { useState, use } from 'react'
import { Building2, Pencil, Check, Plus, Minus, LayoutGrid } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { PageBody } from '@/components/layout/app-shell'
import { IsometricFloorPlan } from '@/components/isometric/IsometricFloorPlan'
import { SlideOverPanel } from '@/components/panels/SlideOverPanel'
import { AgentPanel } from '@/components/panels/AgentPanel'
import { RoomPanel } from '@/components/panels/RoomPanel'
import { RoomEditor, draftFor, type RoomDraft } from '@/components/panels/RoomEditor'
import { useAgents, type AgentData } from '@/hooks/use-agents'
import { useEventStream } from '@/hooks/use-event-stream'
import { useOffice } from '@/hooks/use-office'
import { GRID_LIMITS, ROOM_FUNCTIONS, findFreeSpot, type Room } from '@/lib/office'
import { AGENT_STATUS } from '@/lib/labels'

const LEGEND = [['Werkt', '#10b981'], ['Inactief', '#8f87a3'], ['Onderweg', '#8F39AC']]

function GridStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const btn = 'w-7 h-7 flex items-center justify-center rounded-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-semibold" style={{ color: 'var(--text-m)' }}>{label}</span>
      <button className={btn} style={{ background: 'var(--well)', border: '1px solid var(--well-border)' }}
        disabled={value <= GRID_LIMITS.min} onClick={() => onChange(value - 1)} aria-label={`${label} minder`}>
        <Minus className="w-3 h-3" style={{ color: 'var(--text-b)' }} />
      </button>
      <span className="w-5 text-center text-[13px] font-bold" style={{ color: 'var(--text-h)' }}>{value}</span>
      <button className={btn} style={{ background: 'var(--well)', border: '1px solid var(--well-border)' }}
        disabled={value >= GRID_LIMITS.max} onClick={() => onChange(value + 1)} aria-label={`${label} meer`}>
        <Plus className="w-3 h-3" style={{ color: 'var(--text-b)' }} />
      </button>
    </div>
  )
}

export default function OfficePage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = use(params)
  const { agents } = useAgents(shopId)
  const { connected } = useEventStream(shopId)
  const office = useOffice(shopId)
  const { grid, rooms } = office

  const [editMode, setEditMode] = useState(false)
  const [toolbarError, setToolbarError] = useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ room: Room | null; initial: RoomDraft } | null>(null)

  const agentById = new Map(agents.map(a => [a.id, a]))
  const selectedAgent = selectedAgentId ? agentById.get(selectedAgentId) : undefined
  const selectedRoom = rooms.find(r => r.id === selectedRoomId)
  const activeRooms = rooms.filter(r => r.agent_id && agentById.get(r.agent_id)?.status === 'working').length

  const closePanels = () => { setSelectedAgentId(null); setSelectedRoomId(null); setEditing(null) }

  const openAgent = (a: AgentData) => { setSelectedRoomId(null); setSelectedAgentId(a.id) }

  const handleRoomClick = (room: Room) => {
    if (editMode) {
      setEditing({
        room,
        initial: { name: room.name, function: room.function, color: room.color, col: room.col, row: room.row, width: room.width, depth: room.depth, agent_id: room.agent_id },
      })
    } else {
      setSelectedAgentId(null)
      setSelectedRoomId(room.id)
    }
  }

  const startNewRoom = (col?: number, row?: number) => {
    setToolbarError(null)
    const spot = col !== undefined && row !== undefined ? { col, row } : findFreeSpot(rooms, grid)
    if (!spot) {
      setToolbarError('Geen vrije tegel meer — maak het kantoor eerst groter')
      return
    }
    setEditing({ room: null, initial: draftFor('meeting', spot.col, spot.row) })
  }

  const resize = async (cols: number, rows: number) => {
    setToolbarError(await office.resizeGrid({ cols, rows }))
  }

  const toggleEdit = () => {
    closePanels()
    setToolbarError(null)
    setEditMode(e => !e)
  }

  return (
    <>
      <Topbar title="Kantoor" connected={connected}
        subtitle={`Je AI-personeel live aan het werk — ${activeRooms} van ${rooms.length} kamers actief`} />
      <PageBody>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3.5">
          <div className="flex items-center gap-[9px]">
            <Building2 className="w-[19px] h-[19px]" style={{ color: 'var(--fyn-purple)' }} />
            <h3 className="m-0 text-[17px] font-semibold" style={{ color: 'var(--text-h)' }}>{editMode ? 'Kantoor bewerken' : 'Live kantoor'}</h3>
            <span className="text-[12.5px]" style={{ color: 'var(--text-m)' }}>· {grid.cols} × {grid.rows} tegels</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {!editMode && LEGEND.map(([label, col]) => (
              <span key={label} className="inline-flex items-center gap-[7px] text-xs" style={{ color: 'var(--text-m)' }}>
                <span className="w-[9px] h-[9px] rounded-full" style={{ background: col }} />{label}
              </span>
            ))}
            <button className={editMode ? 'fynn-btn' : 'fynn-btn-ghost'} onClick={toggleEdit} style={{ height: 36 }}>
              {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              {editMode ? 'Klaar' : 'Kantoor bewerken'}
            </button>
          </div>
        </div>

        {editMode && (
          <div className="fynn-card flex items-center gap-5 flex-wrap px-4 py-3 mb-3.5">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" style={{ color: 'var(--fyn-blue)' }} />
              <span className="text-[13px] font-bold" style={{ color: 'var(--text-h)' }}>Kantoorgrootte</span>
            </div>
            <GridStepper label="Breedte" value={grid.cols} onChange={v => resize(v, grid.rows)} />
            <GridStepper label="Diepte" value={grid.rows} onChange={v => resize(grid.cols, v)} />
            <span className="text-xs" style={{ color: 'var(--text-s)' }}>Klik op een kamer om hem te bewerken, of op een lege tegel om er een toe te voegen.</span>
            <div className="flex-1" />
            <button className="fynn-btn" style={{ height: 36 }} onClick={() => startNewRoom()}>
              <Plus className="w-4 h-4" /> Kamer toevoegen
            </button>
            {toolbarError && (
              <p className="w-full text-[12.5px] px-3 py-2 rounded-lg" style={{ background: 'var(--fyn-danger-light)', color: '#b91c1c' }}>{toolbarError}</p>
            )}
          </div>
        )}

        <div className="fynn-card overflow-hidden relative"
          style={{ backgroundImage: 'radial-gradient(700px 360px at 50% 20%,rgba(143,57,172,.14),transparent 70%)' }}>
          {office.loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--fyn-purple)', borderTopColor: 'transparent' }} />
              <p className="text-xs" style={{ color: 'var(--text-m)' }}>Kantoor laden…</p>
            </div>
          ) : (
            <IsometricFloorPlan
              grid={grid}
              rooms={rooms}
              agents={agents}
              editMode={editMode}
              selectedRoomId={editMode ? editing?.room?.id : selectedRoomId}
              onRoomClick={handleRoomClick}
              onAgentClick={openAgent}
              onEmptyTileClick={startNewRoom}
            />
          )}
        </div>

        <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
          {rooms.map(room => {
            const agent = room.agent_id ? agentById.get(room.agent_id) : undefined
            const working = agent?.status === 'working'
            return (
              <button key={room.id} onClick={() => handleRoomClick(room)}
                className="fynn-card flex items-center gap-[11px] px-[15px] py-[13px] text-left cursor-pointer"
                style={{ borderRadius: 12 }}>
                <span className="w-[9px] h-[9px] rounded-full flex-none"
                  style={{ background: agent?.color || room.color, boxShadow: working ? `0 0 8px ${agent!.color}` : 'none', opacity: agent ? 1 : 0.4 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate" style={{ color: 'var(--text-h)' }}>{room.name}</div>
                  <div className="text-[11.5px] truncate" style={{ color: 'var(--text-m)' }}>
                    {agent ? agent.name : ROOM_FUNCTIONS[room.function].label} · {room.width}×{room.depth}
                  </div>
                </div>
                <span className="text-[11px] font-bold" style={{ color: working ? agent!.color : 'var(--text-s)' }}>
                  {agent ? AGENT_STATUS[agent.status] || agent.status : 'Leeg'}
                </span>
              </button>
            )
          })}
        </div>
      </PageBody>

      {/* View mode panels */}
      <SlideOverPanel open={!!selectedAgent} onClose={closePanels}
        title={selectedAgent?.name || ''} subtitle="Agent-details" color={selectedAgent?.color}>
        {selectedAgent && <AgentPanel agent={selectedAgent} roomName={rooms.find(r => r.agent_id === selectedAgent.id)?.name} />}
      </SlideOverPanel>
      <SlideOverPanel open={!!selectedRoom && !selectedAgent} onClose={closePanels}
        title={selectedRoom?.name || ''} subtitle="Kamer-details" color={selectedRoom?.color}>
        {selectedRoom && (
          <RoomPanel room={selectedRoom} agent={selectedRoom.agent_id ? agentById.get(selectedRoom.agent_id) : undefined} onAgentClick={openAgent} />
        )}
      </SlideOverPanel>

      {/* Edit mode panel (non-modal so the floor plan stays clickable) */}
      <SlideOverPanel open={!!editing} onClose={() => setEditing(null)} modal={false}
        title={editing?.room ? editing.room.name : 'Nieuwe kamer'} subtitle={editing?.room ? 'Kamer bewerken' : 'Kamer toevoegen'}>
        {editing && (
          <RoomEditor
            room={editing.room}
            initial={editing.initial}
            grid={grid}
            rooms={rooms}
            agents={agents}
            onSave={draft => editing.room ? office.updateRoom(editing.room.id, draft) : office.createRoom(draft)}
            onDelete={editing.room ? () => office.deleteRoom(editing.room!.id) : undefined}
            onDone={() => setEditing(null)}
          />
        )}
      </SlideOverPanel>
    </>
  )
}
