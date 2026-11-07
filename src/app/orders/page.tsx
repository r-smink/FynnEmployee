import { redirect } from 'next/navigation'

// Old single-shop page that only showed example data; the real page lives under the shop
export default function LegacyPage() {
  redirect('/shops/default/orders')
}
