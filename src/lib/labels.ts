// Dutch UI labels and small formatting helpers shared by client components

const ROLE_NL: Record<string, string> = {
  design: 'Design-agent',
  listing: 'Listing-agent',
  fulfillment: 'Fulfillment-agent',
  support: 'Support-agent',
  analytics: 'Analytics-agent',
  manager: 'Manager-agent',
}

export function agentRole(agent: { role: string; template_type: string; is_custom: number }): string {
  return agent.is_custom === 1 ? agent.role : ROLE_NL[agent.template_type] || agent.role
}

export const AGENT_STATUS: Record<string, string> = {
  idle: 'Inactief',
  working: 'Werkt',
  paused: 'Gepauzeerd',
  error: 'Fout',
}

export const ACTIVITY_COLORS: Record<string, string> = {
  info: '#4a9eff',
  success: '#10b981',
  warning: '#f59e0b',
  thinking: '#9e4aff',
  error: '#ef4444',
}

export function euro(v: number): string {
  return '€' + v.toFixed(2).replace('.', ',')
}

export function euroWhole(v: number): string {
  return '€' + Math.round(v).toLocaleString('nl-NL')
}

// hex color + 2-digit alpha suffix, e.g. alpha('#8F39AC', '22')
export function alpha(hex: string, a: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex + a : hex
}
