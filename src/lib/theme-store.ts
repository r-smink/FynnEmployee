import { getShopSetting, setShopSetting } from './shop-settings'
import { DEFAULT_THEMES, isActive, isSeasonal, validateThemes, type DesignTheme } from './themes'

const THEMES_KEY = 'design_themes'

// The shop's themes, or the default list until the owner saves their own
export function getThemes(shopId: string): DesignTheme[] {
  const raw = getShopSetting(shopId, THEMES_KEY)
  if (!raw) return DEFAULT_THEMES
  try {
    return validateThemes(JSON.parse(raw))
  } catch {
    return DEFAULT_THEMES
  }
}

export function saveThemes(shopId: string, input: unknown): DesignTheme[] {
  const themes = validateThemes(input)
  setShopSetting(shopId, THEMES_KEY, JSON.stringify(themes))
  return themes
}

export function activeThemes(shopId: string, date = new Date()): DesignTheme[] {
  return getThemes(shopId).filter(t => isActive(t, date))
}

const SEASONAL_SHARE = 0.7
const random = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

// Seasonal themes that are running get most of Luna's work; evergreen themes fill the rest
export function pickTheme(shopId: string): DesignTheme | null {
  const active = activeThemes(shopId)
  const seasonal = active.filter(isSeasonal)
  const evergreen = active.filter(t => !isSeasonal(t))
  if (seasonal.length && (!evergreen.length || Math.random() < SEASONAL_SHARE)) return random(seasonal)
  return evergreen.length ? random(evergreen) : null
}

export function findTheme(shopId: string, name: string): DesignTheme | undefined {
  return getThemes(shopId).find(t => t.name === name)
}
