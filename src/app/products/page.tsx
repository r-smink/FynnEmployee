'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Package, Tag, DollarSign, TrendingUp } from 'lucide-react'

interface Product {
  id: string
  title: string
  description: string
  category: string
  price: number
  base_cost: number
  status: string
  sales_count: number
  tags: string
  created_at: string
}

const DEMO_PRODUCTS: Product[] = [
  { id: '1', title: 'Tropical Sunset T-Shirt', description: 'Vibrant sunset design on premium cotton', category: 'T-Shirts', price: 29.99, base_cost: 12.50, status: 'listed', sales_count: 47, tags: '["sunset","tropical","summer"]', created_at: '2024-10-15' },
  { id: '2', title: 'Mountain Adventure Tote Bag', description: 'Nature-inspired tote for outdoor enthusiasts', category: 'Bags', price: 24.99, base_cost: 8.75, status: 'listed', sales_count: 32, tags: '["mountain","adventure","nature"]', created_at: '2024-10-16' },
  { id: '3', title: 'Ocean Waves Mug', description: 'Calming ocean design on ceramic mug', category: 'Mugs', price: 16.99, base_cost: 5.50, status: 'listed', sales_count: 58, tags: '["ocean","waves","blue"]', created_at: '2024-10-17' },
  { id: '4', title: 'Boho Mandala Phone Case', description: 'Intricate mandala pattern on durable case', category: 'Phone Cases', price: 19.99, base_cost: 6.00, status: 'listed', sales_count: 23, tags: '["boho","mandala","pattern"]', created_at: '2024-10-18' },
  { id: '5', title: 'Retro Space Poster', description: 'Vintage space exploration art print', category: 'Posters', price: 22.99, base_cost: 4.25, status: 'listed', sales_count: 41, tags: '["space","retro","vintage"]', created_at: '2024-10-19' },
  { id: '6', title: 'Nordic Forest Hoodie', description: 'Minimalist forest design on cozy hoodie', category: 'Hoodies', price: 44.99, base_cost: 18.00, status: 'listed', sales_count: 19, tags: '["nordic","forest","minimalist"]', created_at: '2024-10-20' },
  { id: '7', title: 'Cosmic Galaxy Sticker Set', description: '12-piece galaxy themed vinyl stickers', category: 'Stickers', price: 12.99, base_cost: 2.50, status: 'listed', sales_count: 89, tags: '["galaxy","cosmic","stickers"]', created_at: '2024-10-21' },
  { id: '8', title: 'Zen Garden Pillow Cover', description: 'Peaceful zen garden illustration', category: 'Home', price: 34.99, base_cost: 11.00, status: 'draft', sales_count: 0, tags: '["zen","garden","peaceful"]', created_at: '2024-10-22' },
]

const statusColors: Record<string, { bg: string; text: string }> = {
  listed: { bg: 'rgba(74, 255, 158, 0.15)', text: 'var(--accent-green)' },
  draft: { bg: 'rgba(136, 136, 170, 0.15)', text: 'var(--text-secondary)' },
  sold_out: { bg: 'rgba(255, 74, 74, 0.15)', text: '#ff4a4a' },
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS)

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(data => {
      if (data.length > 0) setProducts(data)
    }).catch(() => {})
  }, [])

  return (
    <>
      <Topbar title="Products" subtitle={`${products.length} products in catalog`} />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => {
            const sc = statusColors[product.status] || statusColors.draft
            const profit = product.price - product.base_cost
            let tags: string[] = []
            try { tags = JSON.parse(product.tags || '[]') } catch {}

            return (
              <div key={product.id} className="glass-card overflow-hidden group">
                <div className="h-40 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, var(--bg-card), var(--bg-card-hover))` }}>
                  <Package className="w-12 h-12" style={{ color: 'var(--border)' }} />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {product.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs shrink-0 ml-2"
                      style={{ background: sc.bg, color: sc.text }}>
                      {product.status}
                    </span>
                  </div>
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {product.description}
                  </p>
                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    {tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-xs"
                        style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" style={{ color: 'var(--accent-green)' }} />
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>${product.price}</span>
                      <span className="text-xs ml-1" style={{ color: 'var(--accent-green)' }}>+${profit.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--accent-blue)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{product.sales_count} sold</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
