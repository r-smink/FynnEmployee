import { AppShell } from '@/components/layout/app-shell'

export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  return <AppShell shopId={shopId}>{children}</AppShell>
}
