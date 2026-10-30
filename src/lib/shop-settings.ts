import { get, run, all } from './db'

// Shop-wide instructions that are added to the system prompt of every agent in the shop
export const SHOP_PROMPT_KEY = 'shop_prompt'

interface ShopSetting { shop_id: string; key: string; value: string }

export function getShopSetting(shopId: string, key: string): string | null {
  const row = get<ShopSetting>('SELECT * FROM shop_settings WHERE shop_id = ? AND key = ?', shopId, key)
  return row?.value ?? null
}

export function setShopSetting(shopId: string, key: string, value: string) {
  run(
    `INSERT INTO shop_settings (shop_id, key, value, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(shop_id, key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
    shopId, key, value, value
  )
}

export function getAllShopSettings(shopId: string): Record<string, string> {
  const rows = all<ShopSetting>('SELECT * FROM shop_settings WHERE shop_id = ?', shopId)
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return result
}
