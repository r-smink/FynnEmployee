import type { AgentConfig, Agent } from './types'
import { BaseAgent } from './base-agent'
import { LunaAgent } from './luna'
import { MarcusAgent } from './marcus'
import { AriaAgent } from './aria'
import { RexAgent } from './rex'
import { NovaAgent } from './nova'
import { FynnAgent } from './fynn'
import { CustomAgent } from './custom-agent'

const TEMPLATE_MAP: Record<string, new (config: AgentConfig) => BaseAgent> = {
  design: LunaAgent,
  listing: MarcusAgent,
  fulfillment: AriaAgent,
  support: RexAgent,
  analytics: NovaAgent,
  manager: FynnAgent,
}

export function createAgentFromRecord(record: Agent): BaseAgent {
  const config: AgentConfig = {
    id: record.id,
    shopId: record.shop_id,
    name: record.name,
    templateType: record.template_type as any,
    customPrompt: record.custom_prompt || undefined,
    color: record.color,
  }

  const AgentClass = TEMPLATE_MAP[record.template_type] || CustomAgent
  return new AgentClass(config)
}
