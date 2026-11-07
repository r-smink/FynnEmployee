// Design themes Luna works from. Shared by the server and the Trends page, so no database access here.
// Seasonal themes repeat every year: start and end are "MM-DD", and a period may run over New Year.

export interface DesignTheme {
  id: string
  name: string
  // Words to search Etsy with for market data (English, as most buyers search)
  search: string
  start: string | null
  end: string | null
  notes: string
  enabled: boolean
}

export const MAX_THEMES = 60

const evergreen = (id: string, name: string, search: string): DesignTheme =>
  ({ id, name, search, start: null, end: null, notes: '', enabled: true })
const seasonal = (id: string, name: string, search: string, start: string, end: string): DesignTheme =>
  ({ id, name, search, start, end, notes: '', enabled: true })

// Seasonal periods start weeks before the day itself: Etsy buyers order early and new listings need time to rank
export const DEFAULT_THEMES: DesignTheme[] = [
  seasonal('valentijn', 'Valentijnsdag', 'valentines', '01-02', '02-12'),
  seasonal('pasen', 'Pasen', 'easter', '02-15', '04-10'),
  seasonal('moederdag', 'Moederdag', 'mothers day', '03-25', '05-08'),
  seasonal('vaderdag', 'Vaderdag', 'fathers day', '05-01', '06-14'),
  seasonal('zomer', 'Zomer', 'summer vibes', '04-15', '07-31'),
  seasonal('school', 'Terug naar school', 'back to school teacher', '07-01', '09-05'),
  seasonal('herfst', 'Herfst', 'autumn fall', '08-20', '11-15'),
  seasonal('halloween', 'Halloween', 'halloween', '08-15', '10-28'),
  seasonal('sinterklaas', 'Sinterklaas', 'sinterklaas', '10-15', '12-03'),
  seasonal('kerst', 'Kerst', 'christmas', '09-15', '12-18'),
  seasonal('oud-nieuw', 'Oud en nieuw', 'new years eve', '11-15', '12-30'),
  evergreen('lijntekening', 'Minimalistische lijntekening', 'minimalist line art'),
  evergreen('botanisch', 'Botanische bloemen', 'botanical floral'),
  evergreen('retro-zon', 'Retro zonsondergang', 'retro sunset'),
  evergreen('hemel', 'Maan en sterren', 'celestial moon'),
  evergreen('bergen', 'Bergavontuur', 'mountain adventure'),
  evergreen('oceaan', 'Oceaangolven', 'ocean waves'),
  evergreen('mandala', 'Boho mandala', 'boho mandala'),
  evergreen('dieren', 'Schattige dieren', 'cute animal'),
  evergreen('geometrisch', 'Abstract geometrisch', 'abstract geometric'),
]

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/

export const monthDay = (date: Date) =>
  `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function isSeasonal(theme: DesignTheme): boolean {
  return !!theme.start && !!theme.end
}

export function isActive(theme: DesignTheme, date = new Date()): boolean {
  if (!theme.enabled) return false
  if (!isSeasonal(theme)) return true
  const md = monthDay(date)
  return theme.start! <= theme.end! ? md >= theme.start! && md <= theme.end! : md >= theme.start! || md <= theme.end!
}

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
export function formatMonthDay(md: string): string {
  const [m, d] = md.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

// Cleans themes coming from the browser; throws a readable message on bad input
export function validateThemes(input: unknown): DesignTheme[] {
  if (!Array.isArray(input)) throw new Error('themes moet een lijst zijn')
  if (input.length > MAX_THEMES) throw new Error(`Maximaal ${MAX_THEMES} thema's`)
  const seen = new Set<string>()
  return input.map((raw, i): DesignTheme => {
    const t = (raw ?? {}) as Record<string, unknown>
    const name = String(t.name ?? '').trim().slice(0, 60)
    if (!name) throw new Error(`Thema ${i + 1} heeft geen naam`)
    const start = t.start ? String(t.start) : null
    const end = t.end ? String(t.end) : null
    if (!!start !== !!end) throw new Error(`"${name}": vul zowel een start- als een einddatum in, of geen van beide`)
    if ((start && !MONTH_DAY.test(start)) || (end && !MONTH_DAY.test(end))) throw new Error(`"${name}": ongeldige datum`)
    let id = String(t.id ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
    if (!id || seen.has(id)) id = `t${Date.now().toString(36)}${i}`
    seen.add(id)
    return {
      id, name, start, end,
      search: String(t.search ?? '').trim().toLowerCase().slice(0, 80) || name.toLowerCase(),
      notes: String(t.notes ?? '').trim().slice(0, 300),
      enabled: t.enabled !== false,
    }
  })
}
