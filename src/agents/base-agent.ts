import { v4 as uuid } from 'uuid'
import { run, get } from '@/lib/db'
import { emitAgentEvent } from '@/lib/events'
import { isAiEnabled, aiChat } from '@/lib/ai'
import type { AgentConfig, AgentStatus, Task, SimulationStep, TaskType } from './types'

export abstract class BaseAgent {
  id: string
  shopId: string
  name: string
  templateType: string
  customPrompt: string | undefined
  model: string | undefined  // OpenRouter model id; falls back to the global setting
  color: string | undefined
  status: AgentStatus = 'idle'
  currentTask: Task | null = null

  constructor(config: AgentConfig) {
    this.id = config.id
    this.shopId = config.shopId
    this.name = config.name
    this.templateType = config.templateType
    this.customPrompt = config.customPrompt
    this.model = config.model
    this.color = config.color
  }

  abstract generateTask(): { type: TaskType; title: string; description: string }
  abstract getSimulationSteps(task: Task): SimulationStep[]
  abstract getSystemPrompt(): string
  abstract getTaskPrompt(task: Task): string

  getEffectiveSystemPrompt(): string {
    return this.customPrompt || this.getSystemPrompt()
  }

  setStatus(status: AgentStatus) {
    this.status = status
    run('UPDATE agents SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND shop_id = ?', status, this.id, this.shopId)
    emitAgentEvent({
      shopId: this.shopId,
      agentId: this.id,
      type: 'status_change',
      data: { status },
      timestamp: new Date().toISOString(),
    })
  }

  log(message: string, type: 'info' | 'success' | 'warning' | 'error' | 'thinking' = 'info', taskId?: string) {
    run(
      'INSERT INTO activity_log (shop_id, agent_id, task_id, message, type) VALUES (?, ?, ?, ?, ?)',
      this.shopId, this.id, taskId || null, message, type
    )
    emitAgentEvent({
      shopId: this.shopId,
      agentId: this.id,
      type: 'activity',
      data: { message, activityType: type, taskId },
      timestamp: new Date().toISOString(),
    })
  }

  protected updateProgress(taskId: string, progress: number, message: string) {
    run('UPDATE tasks SET progress = ? WHERE id = ?', progress, taskId)
    emitAgentEvent({
      shopId: this.shopId,
      agentId: this.id,
      type: 'task_progress',
      data: { taskId, progress, message },
      timestamp: new Date().toISOString(),
    })
  }

  async processTask(task: Task): Promise<void> {
    this.currentTask = task
    this.setStatus('working')

    run('UPDATE tasks SET status = \'in_progress\', started_at = datetime(\'now\') WHERE id = ?', task.id)
    run('UPDATE agents SET current_task_id = ? WHERE id = ? AND shop_id = ?', task.id, this.id, this.shopId)

    emitAgentEvent({
      shopId: this.shopId,
      agentId: this.id,
      type: 'task_started',
      data: { taskId: task.id, title: task.title, type: task.type },
      timestamp: new Date().toISOString(),
    })

    try {
      if (isAiEnabled()) {
        await this.processWithAi(task)
      } else {
        const steps = this.getSimulationSteps(task)
        await this.simulateWork(task.id, steps)
      }

      run(
        'UPDATE tasks SET status = \'completed\', progress = 100, completed_at = datetime(\'now\') WHERE id = ?',
        task.id
      )
      run(
        'UPDATE agents SET tasks_completed = tasks_completed + 1, current_task_id = NULL, updated_at = datetime(\'now\') WHERE id = ? AND shop_id = ?',
        this.id, this.shopId
      )

      this.log(`Completed: ${task.title}`, 'success', task.id)
      emitAgentEvent({
        shopId: this.shopId,
        agentId: this.id,
        type: 'task_completed',
        data: { taskId: task.id, title: task.title, type: task.type },
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      run('UPDATE tasks SET status = \'failed\' WHERE id = ?', task.id)
      run('UPDATE agents SET current_task_id = NULL WHERE id = ? AND shop_id = ?', this.id, this.shopId)
      this.log(`Failed: ${task.title} - ${err}`, 'error', task.id)
      emitAgentEvent({
        shopId: this.shopId,
        agentId: this.id,
        type: 'task_failed',
        data: { taskId: task.id, error: String(err) },
        timestamp: new Date().toISOString(),
      })
    }

    this.currentTask = null
    this.setStatus('idle')
  }

  async processWithAi(task: Task): Promise<void> {
    this.log(`Thinking about: ${task.title}...`, 'thinking', task.id)
    this.updateProgress(task.id, 15, 'Analyzing task...')

    await new Promise(r => setTimeout(r, 500))
    this.log('Consulting AI for best approach...', 'thinking', task.id)
    this.updateProgress(task.id, 30, 'Consulting AI...')

    const result = await aiChat(this.getEffectiveSystemPrompt(), this.getTaskPrompt(task), { model: this.model })

    if (result) {
      this.updateProgress(task.id, 60, 'Processing AI response...')
      this.log('AI response received, processing...', 'info', task.id)
      await new Promise(r => setTimeout(r, 800))

      // Store AI output in task
      run('UPDATE tasks SET output_data = ? WHERE id = ?', JSON.stringify({ aiResponse: result }), task.id)

      // Log a preview of the result
      const preview = result.length > 120 ? result.substring(0, 120) + '...' : result
      this.log(`AI result: ${preview}`, 'info', task.id)
      this.updateProgress(task.id, 85, 'Finalizing...')
      await new Promise(r => setTimeout(r, 500))
    } else {
      // AI failed, fall back to simulation
      this.log('AI unavailable, running simulation...', 'warning', task.id)
      const steps = this.getSimulationSteps(task)
      await this.simulateWork(task.id, steps)
    }
  }

  async simulateWork(taskId: string, steps: SimulationStep[]): Promise<void> {
    for (const step of steps) {
      this.log(step.message, step.type, taskId)
      this.updateProgress(taskId, step.progress, step.message)
      await new Promise(resolve => setTimeout(resolve, step.durationMs))
    }
  }

  createTask(): Task {
    const { type, title, description } = this.generateTask()
    const id = uuid()
    run(
      'INSERT INTO tasks (id, shop_id, agent_id, type, title, description, status) VALUES (?, ?, ?, ?, ?, ?, \'queued\')',
      id, this.shopId, this.id, type, title, description
    )
    return get<Task>('SELECT * FROM tasks WHERE id = ?', id)!
  }
}
