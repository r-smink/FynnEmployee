import { Sidebar } from '@/components/layout/sidebar'

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <main className="ml-60">{children}</main>
    </div>
  )
}
