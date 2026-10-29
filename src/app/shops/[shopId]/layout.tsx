import { Sidebar } from '@/components/layout/sidebar'

export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar shopId={shopId} />
      <main className="ml-60">{children}</main>
    </div>
  )
}
