import { Sidebar } from './sidebar'

export function AppShell({ shopId = 'default', children }: { shopId?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--page)', color: 'var(--text-b)' }}>
      <Sidebar shopId={shopId} />
      <div className="flex-1 min-w-0 flex flex-col" style={{ background: 'var(--page-glow)' }}>
        {children}
      </div>
    </div>
  )
}

// Standard page body below the topbar
export function PageBody({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 p-[26px]">
      <div className="mx-auto max-w-[1320px] animate-fade-in">
        {children}
      </div>
    </main>
  )
}
