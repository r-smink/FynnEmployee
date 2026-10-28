module.exports = [
(()=>{"use strict";return[
"[project]/src/agents/aria.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AriaAgent",
    ()=>AriaAgent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/base-agent.ts [app-route] (ecmascript)");
;
class AriaAgent extends __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAgent"] {
    constructor(){
        super('aria', 'Aria');
    }
    orderNum() {
        return `#${1000 + Math.floor(Math.random() * 9000)}`;
    }
    generateTask() {
        const types = [
            'order_fulfill',
            'order_track',
            'order_confirm'
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        const orderNum = this.orderNum();
        const titles = {
            order_fulfill: `Fulfill order ${orderNum}`,
            order_track: `Track shipment for order ${orderNum}`,
            order_confirm: `Send confirmation for order ${orderNum}`
        };
        return {
            type,
            title: titles[type],
            description: `Processing order ${orderNum} through fulfillment pipeline`
        };
    }
    getSimulationSteps(task) {
        if (task.type === 'order_fulfill') {
            return [
                {
                    message: 'Retrieving order details from Etsy...',
                    type: 'info',
                    progress: 10,
                    durationMs: 1500
                },
                {
                    message: 'Validating shipping address...',
                    type: 'thinking',
                    progress: 25,
                    durationMs: 1500
                },
                {
                    message: 'Preparing design files for print...',
                    type: 'info',
                    progress: 45,
                    durationMs: 2000
                },
                {
                    message: 'Submitting to Printful for production...',
                    type: 'info',
                    progress: 70,
                    durationMs: 2500
                },
                {
                    message: 'Order submitted to fulfillment partner!',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        if (task.type === 'order_track') {
            return [
                {
                    message: 'Checking fulfillment partner status...',
                    type: 'info',
                    progress: 20,
                    durationMs: 1500
                },
                {
                    message: 'Retrieving tracking information...',
                    type: 'info',
                    progress: 50,
                    durationMs: 2000
                },
                {
                    message: 'Updating order tracking in system...',
                    type: 'info',
                    progress: 80,
                    durationMs: 1500
                },
                {
                    message: 'Tracking info updated',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        return [
            {
                message: 'Generating order confirmation email...',
                type: 'thinking',
                progress: 30,
                durationMs: 2000
            },
            {
                message: 'Including tracking details and ETA...',
                type: 'info',
                progress: 60,
                durationMs: 1500
            },
            {
                message: 'Confirmation sent to customer',
                type: 'success',
                progress: 100,
                durationMs: 1000
            }
        ];
    }
}
}),
"[project]/src/agents/base-agent.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BaseAgent",
    ()=>BaseAgent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__ = __turbopack_context__.i("[project]/node_modules/uuid/dist-node/v4.js [app-route] (ecmascript) <export default as v4>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$events$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/events.ts [app-route] (ecmascript)");
;
;
;
class BaseAgent {
    id;
    name;
    status = 'idle';
    currentTask = null;
    constructor(id, name){
        this.id = id;
        this.name = name;
    }
    setStatus(status) {
        this.status = status;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('UPDATE agents SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', status, this.id);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$events$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitAgentEvent"])({
            agentId: this.id,
            type: 'status_change',
            data: {
                status
            },
            timestamp: new Date().toISOString()
        });
    }
    log(message, type = 'info', taskId) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('INSERT INTO activity_log (agent_id, task_id, message, type) VALUES (?, ?, ?, ?)', this.id, taskId || null, message, type);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$events$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitAgentEvent"])({
            agentId: this.id,
            type: 'activity',
            data: {
                message,
                activityType: type,
                taskId
            },
            timestamp: new Date().toISOString()
        });
    }
    async processTask(task) {
        this.currentTask = task;
        this.setStatus('working');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('UPDATE tasks SET status = \'in_progress\', started_at = datetime(\'now\') WHERE id = ?', task.id);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('UPDATE agents SET current_task_id = ? WHERE id = ?', task.id, this.id);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$events$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitAgentEvent"])({
            agentId: this.id,
            type: 'task_started',
            data: {
                taskId: task.id,
                title: task.title,
                type: task.type
            },
            timestamp: new Date().toISOString()
        });
        try {
            const steps = this.getSimulationSteps(task);
            await this.simulateWork(task.id, steps);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('UPDATE tasks SET status = \'completed\', progress = 100, completed_at = datetime(\'now\') WHERE id = ?', task.id);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('UPDATE agents SET tasks_completed = tasks_completed + 1, current_task_id = NULL, updated_at = datetime(\'now\') WHERE id = ?', this.id);
            this.log(`Completed: ${task.title}`, 'success', task.id);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$events$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitAgentEvent"])({
                agentId: this.id,
                type: 'task_completed',
                data: {
                    taskId: task.id,
                    title: task.title,
                    type: task.type
                },
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('UPDATE tasks SET status = \'failed\' WHERE id = ?', task.id);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('UPDATE agents SET current_task_id = NULL WHERE id = ?', this.id);
            this.log(`Failed: ${task.title} - ${err}`, 'error', task.id);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$events$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitAgentEvent"])({
                agentId: this.id,
                type: 'task_failed',
                data: {
                    taskId: task.id,
                    error: String(err)
                },
                timestamp: new Date().toISOString()
            });
        }
        this.currentTask = null;
        this.setStatus('idle');
    }
    async simulateWork(taskId, steps) {
        for (const step of steps){
            this.log(step.message, step.type, taskId);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('UPDATE tasks SET progress = ? WHERE id = ?', step.progress, taskId);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$events$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["emitAgentEvent"])({
                agentId: this.id,
                type: 'task_progress',
                data: {
                    taskId,
                    progress: step.progress,
                    message: step.message
                },
                timestamp: new Date().toISOString()
            });
            await new Promise((resolve)=>setTimeout(resolve, step.durationMs));
        }
    }
    createTask() {
        const { type, title, description } = this.generateTask();
        const id = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$uuid$2f$dist$2d$node$2f$v4$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__default__as__v4$3e$__["v4"])();
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["run"])('INSERT INTO tasks (id, agent_id, type, title, description, status) VALUES (?, ?, ?, ?, ?, \'queued\')', id, this.id, type, title, description);
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["get"])('SELECT * FROM tasks WHERE id = ?', id);
    }
}
}),
"[project]/src/agents/engine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "engine",
    ()=>engine
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$luna$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/luna.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$marcus$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/marcus.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$aria$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/aria.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$rex$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/rex.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$nova$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/nova.ts [app-route] (ecmascript)");
;
;
;
;
;
class AgentEngine {
    agents = new Map();
    running = false;
    timers = [];
    constructor(){
        this.agents.set('luna', new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$luna$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["LunaAgent"]());
        this.agents.set('marcus', new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$marcus$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MarcusAgent"]());
        this.agents.set('aria', new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$aria$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AriaAgent"]());
        this.agents.set('rex', new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$rex$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["RexAgent"]());
        this.agents.set('nova', new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$nova$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NovaAgent"]());
    }
    start() {
        if (this.running) return;
        this.running = true;
        // Start simulation loop - each agent gets its own cycle
        for (const [id, agent] of this.agents){
            this.scheduleAgent(id, agent);
        }
    }
    scheduleAgent(id, agent) {
        const minDelay = 8000 // 8 sec
        ;
        const maxDelay = 25000 // 25 sec
        ;
        const delay = minDelay + Math.random() * (maxDelay - minDelay);
        const timer = setTimeout(async ()=>{
            if (!this.running) return;
            if (agent.status === 'idle') {
                try {
                    const task = agent.createTask();
                    await agent.processTask(task);
                } catch (e) {
                    console.error(`Agent ${id} error:`, e);
                }
            }
            // Schedule next task
            if (this.running) {
                this.scheduleAgent(id, agent);
            }
        }, delay);
        this.timers.push(timer);
    }
    stop() {
        this.running = false;
        this.timers.forEach((t)=>clearTimeout(t));
        this.timers = [];
    }
    getAgent(id) {
        return this.agents.get(id);
    }
    ensureStarted() {
        this.start();
    }
}
const globalForEngine = globalThis;
const engine = globalForEngine.__fynnEngine || (globalForEngine.__fynnEngine = new AgentEngine());
}),
"[project]/src/agents/luna.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LunaAgent",
    ()=>LunaAgent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/base-agent.ts [app-route] (ecmascript)");
;
const DESIGN_THEMES = [
    'Tropical Sunset',
    'Mountain Adventure',
    'Ocean Waves',
    'Floral Botanicals',
    'Retro Space',
    'Minimalist Geometric',
    'Watercolor Landscape',
    'Boho Mandala',
    'Vintage Typography',
    'Abstract Art Deco',
    'Cosmic Galaxy',
    'Desert Cactus',
    'Nordic Forest',
    'Japanese Wave',
    'Neon City',
    'Wildflower Garden',
    'Celestial Moon',
    'Tropical Palm',
    'Zen Garden',
    'Aurora Borealis'
];
const PRODUCT_TYPES = [
    'T-Shirt',
    'Tote Bag',
    'Mug',
    'Phone Case',
    'Poster',
    'Sticker Set',
    'Pillow Cover',
    'Hoodie'
];
class LunaAgent extends __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAgent"] {
    constructor(){
        super('luna', 'Luna');
    }
    generateTask() {
        const theme = DESIGN_THEMES[Math.floor(Math.random() * DESIGN_THEMES.length)];
        const product = PRODUCT_TYPES[Math.floor(Math.random() * PRODUCT_TYPES.length)];
        const types = [
            'design_generate',
            'design_curate',
            'design_trending'
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        const titles = {
            design_generate: `Design "${theme}" ${product}`,
            design_curate: `Curate designs for ${product} collection`,
            design_trending: `Research trending ${theme} styles`
        };
        return {
            type,
            title: titles[type],
            description: `Creating a ${theme.toLowerCase()}-themed design for ${product.toLowerCase()} product line`
        };
    }
    getSimulationSteps(task) {
        if (task.type === 'design_generate') {
            return [
                {
                    message: 'Analyzing current design trends...',
                    type: 'thinking',
                    progress: 10,
                    durationMs: 2000
                },
                {
                    message: 'Generating color palette and mood board...',
                    type: 'info',
                    progress: 25,
                    durationMs: 3000
                },
                {
                    message: 'Creating initial design concepts...',
                    type: 'info',
                    progress: 45,
                    durationMs: 4000
                },
                {
                    message: 'Refining composition and typography...',
                    type: 'thinking',
                    progress: 65,
                    durationMs: 3000
                },
                {
                    message: 'Applying finishing touches and export...',
                    type: 'info',
                    progress: 85,
                    durationMs: 2000
                },
                {
                    message: 'Design ready for review!',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        if (task.type === 'design_curate') {
            return [
                {
                    message: 'Reviewing existing design portfolio...',
                    type: 'thinking',
                    progress: 15,
                    durationMs: 2000
                },
                {
                    message: 'Selecting top-performing styles...',
                    type: 'info',
                    progress: 40,
                    durationMs: 2500
                },
                {
                    message: 'Organizing collection by theme...',
                    type: 'info',
                    progress: 70,
                    durationMs: 2000
                },
                {
                    message: 'Collection curated successfully',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        return [
            {
                message: 'Scanning trending marketplaces...',
                type: 'thinking',
                progress: 20,
                durationMs: 2500
            },
            {
                message: 'Analyzing competitor designs...',
                type: 'info',
                progress: 50,
                durationMs: 3000
            },
            {
                message: 'Identifying emerging patterns...',
                type: 'info',
                progress: 80,
                durationMs: 2000
            },
            {
                message: 'Trend report compiled',
                type: 'success',
                progress: 100,
                durationMs: 1000
            }
        ];
    }
}
}),
"[project]/src/agents/marcus.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MarcusAgent",
    ()=>MarcusAgent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/base-agent.ts [app-route] (ecmascript)");
;
const LISTING_ACTIONS = [
    'Beach Vibes Collection',
    'Autumn Harvest Set',
    'Minimalist Line',
    'Boho Dreams',
    'Urban Street Art',
    'Nature Escape',
    'Retro Revival',
    'Zen Harmony',
    'Cosmic Explorer',
    'Vintage Rose',
    'Mountain High',
    'Ocean Breeze'
];
class MarcusAgent extends __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAgent"] {
    constructor(){
        super('marcus', 'Marcus');
    }
    generateTask() {
        const listing = LISTING_ACTIONS[Math.floor(Math.random() * LISTING_ACTIONS.length)];
        const types = [
            'listing_create',
            'listing_optimize',
            'listing_refresh'
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        const titles = {
            listing_create: `Create listing for "${listing}"`,
            listing_optimize: `Optimize SEO for "${listing}"`,
            listing_refresh: `Refresh photos for "${listing}"`
        };
        return {
            type,
            title: titles[type],
            description: `Managing Etsy listing for ${listing}`
        };
    }
    getSimulationSteps(task) {
        if (task.type === 'listing_create') {
            return [
                {
                    message: 'Crafting compelling title and description...',
                    type: 'thinking',
                    progress: 15,
                    durationMs: 2500
                },
                {
                    message: 'Researching optimal tags and keywords...',
                    type: 'info',
                    progress: 35,
                    durationMs: 3000
                },
                {
                    message: 'Setting competitive pricing strategy...',
                    type: 'info',
                    progress: 55,
                    durationMs: 2000
                },
                {
                    message: 'Uploading product mockups...',
                    type: 'info',
                    progress: 75,
                    durationMs: 2500
                },
                {
                    message: 'Publishing listing to Etsy...',
                    type: 'info',
                    progress: 90,
                    durationMs: 2000
                },
                {
                    message: 'Listing published successfully!',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        if (task.type === 'listing_optimize') {
            return [
                {
                    message: 'Analyzing current listing performance...',
                    type: 'thinking',
                    progress: 20,
                    durationMs: 2000
                },
                {
                    message: 'Researching high-volume search terms...',
                    type: 'info',
                    progress: 45,
                    durationMs: 2500
                },
                {
                    message: 'Updating tags and categories...',
                    type: 'info',
                    progress: 70,
                    durationMs: 2000
                },
                {
                    message: 'SEO optimization complete',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        return [
            {
                message: 'Reviewing current listing photos...',
                type: 'thinking',
                progress: 25,
                durationMs: 2000
            },
            {
                message: 'Generating fresh product mockups...',
                type: 'info',
                progress: 55,
                durationMs: 3000
            },
            {
                message: 'Updating listing images...',
                type: 'info',
                progress: 85,
                durationMs: 2000
            },
            {
                message: 'Photos refreshed successfully',
                type: 'success',
                progress: 100,
                durationMs: 1000
            }
        ];
    }
}
}),
"[project]/src/agents/nova.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NovaAgent",
    ()=>NovaAgent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/base-agent.ts [app-route] (ecmascript)");
;
class NovaAgent extends __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAgent"] {
    constructor(){
        super('nova', 'Nova');
    }
    generateTask() {
        const types = [
            'analytics_report',
            'analytics_trend',
            'analytics_competitor'
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        const titles = {
            analytics_report: 'Generate daily performance report',
            analytics_trend: 'Analyze trending product categories',
            analytics_competitor: 'Competitor pricing analysis'
        };
        const descs = {
            analytics_report: 'Compiling sales, revenue, and traffic metrics',
            analytics_trend: 'Identifying emerging trends and opportunities',
            analytics_competitor: 'Reviewing competitor pricing strategies'
        };
        return {
            type,
            title: titles[type],
            description: descs[type]
        };
    }
    getSimulationSteps(task) {
        if (task.type === 'analytics_report') {
            return [
                {
                    message: 'Collecting sales data from all channels...',
                    type: 'info',
                    progress: 10,
                    durationMs: 2000
                },
                {
                    message: 'Calculating revenue and profit margins...',
                    type: 'thinking',
                    progress: 30,
                    durationMs: 2500
                },
                {
                    message: 'Analyzing conversion rates...',
                    type: 'info',
                    progress: 50,
                    durationMs: 2000
                },
                {
                    message: 'Generating charts and visualizations...',
                    type: 'info',
                    progress: 70,
                    durationMs: 3000
                },
                {
                    message: 'Compiling executive summary...',
                    type: 'thinking',
                    progress: 90,
                    durationMs: 2000
                },
                {
                    message: 'Daily report published!',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        if (task.type === 'analytics_trend') {
            return [
                {
                    message: 'Scanning marketplace trend data...',
                    type: 'thinking',
                    progress: 20,
                    durationMs: 2500
                },
                {
                    message: 'Identifying rising product categories...',
                    type: 'info',
                    progress: 45,
                    durationMs: 3000
                },
                {
                    message: 'Correlating with seasonal patterns...',
                    type: 'thinking',
                    progress: 70,
                    durationMs: 2500
                },
                {
                    message: 'Trend analysis complete',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        return [
            {
                message: 'Scanning competitor Etsy stores...',
                type: 'thinking',
                progress: 15,
                durationMs: 2000
            },
            {
                message: 'Comparing pricing across categories...',
                type: 'info',
                progress: 40,
                durationMs: 2500
            },
            {
                message: 'Identifying pricing opportunities...',
                type: 'thinking',
                progress: 65,
                durationMs: 2500
            },
            {
                message: 'Generating pricing recommendations...',
                type: 'info',
                progress: 85,
                durationMs: 2000
            },
            {
                message: 'Competitor analysis finalized',
                type: 'success',
                progress: 100,
                durationMs: 1000
            }
        ];
    }
}
}),
"[project]/src/agents/rex.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RexAgent",
    ()=>RexAgent
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/base-agent.ts [app-route] (ecmascript)");
;
const CUSTOMER_TOPICS = [
    'sizing question',
    'shipping timeframe',
    'custom design request',
    'return policy',
    'bulk order inquiry',
    'color options',
    'gift wrapping',
    'international shipping',
    'design modification',
    'order status update',
    'product care instructions',
    'discount inquiry'
];
class RexAgent extends __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$base$2d$agent$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BaseAgent"] {
    constructor(){
        super('rex', 'Rex');
    }
    generateTask() {
        const topic = CUSTOMER_TOPICS[Math.floor(Math.random() * CUSTOMER_TOPICS.length)];
        const types = [
            'support_reply',
            'support_review',
            'support_followup'
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        const titles = {
            support_reply: `Reply to customer about ${topic}`,
            support_review: `Review new customer feedback`,
            support_followup: `Follow up on ${topic}`
        };
        return {
            type,
            title: titles[type],
            description: `Handling customer ${topic}`
        };
    }
    getSimulationSteps(task) {
        if (task.type === 'support_reply') {
            return [
                {
                    message: 'Reading customer message...',
                    type: 'thinking',
                    progress: 15,
                    durationMs: 1500
                },
                {
                    message: 'Checking order history and product details...',
                    type: 'info',
                    progress: 35,
                    durationMs: 2000
                },
                {
                    message: 'Drafting personalized response...',
                    type: 'thinking',
                    progress: 60,
                    durationMs: 2500
                },
                {
                    message: 'Reviewing tone and helpfulness...',
                    type: 'info',
                    progress: 80,
                    durationMs: 1500
                },
                {
                    message: 'Response sent to customer!',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        if (task.type === 'support_review') {
            return [
                {
                    message: 'Scanning new customer reviews...',
                    type: 'thinking',
                    progress: 20,
                    durationMs: 2000
                },
                {
                    message: 'Categorizing feedback sentiment...',
                    type: 'info',
                    progress: 50,
                    durationMs: 2000
                },
                {
                    message: 'Flagging items needing response...',
                    type: 'info',
                    progress: 75,
                    durationMs: 1500
                },
                {
                    message: 'Review analysis complete',
                    type: 'success',
                    progress: 100,
                    durationMs: 1000
                }
            ];
        }
        return [
            {
                message: 'Checking previous conversation context...',
                type: 'thinking',
                progress: 25,
                durationMs: 1500
            },
            {
                message: 'Drafting follow-up message...',
                type: 'info',
                progress: 55,
                durationMs: 2000
            },
            {
                message: 'Follow-up sent successfully',
                type: 'success',
                progress: 100,
                durationMs: 1000
            }
        ];
    }
}
}),
"[project]/src/app/api/agents/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/agents/engine.ts [app-route] (ecmascript)");
;
;
;
const dynamic = 'force-dynamic';
async function GET() {
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$agents$2f$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["engine"].ensureStarted();
    const agents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["all"])('SELECT * FROM agents ORDER BY id');
    // Attach current task info
    const enriched = agents.map((agent)=>{
        let currentTask = null;
        if (agent.current_task_id) {
            currentTask = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["all"])('SELECT * FROM tasks WHERE id = ?', agent.current_task_id)[0] || null;
        }
        const recentActivity = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["all"])('SELECT * FROM activity_log WHERE agent_id = ? ORDER BY created_at DESC LIMIT 5', agent.id);
        return {
            ...agent,
            currentTask,
            recentActivity
        };
    });
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(enriched);
}
}),
"[project]/src/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "all",
    ()=>all,
    "db",
    ()=>db,
    "get",
    ()=>get,
    "run",
    ()=>run
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$better$2d$sqlite3$29$__ = __turbopack_context__.i("[externals]/better-sqlite3 [external] (better-sqlite3, cjs, [project]/node_modules/better-sqlite3)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
;
;
;
const globalForDb = globalThis;
function createDb() {
    const dbPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'fynnemployee.db');
    const db = new __TURBOPACK__imported__module__$5b$externals$5d2f$better$2d$sqlite3__$5b$external$5d$__$28$better$2d$sqlite3$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f$better$2d$sqlite3$29$__["default"](dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    // Initialize schema
    const schemaPath = __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["default"].join(process.cwd(), 'database', 'schema.sql');
    if (__TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].existsSync(schemaPath)) {
        const schema = __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["default"].readFileSync(schemaPath, 'utf-8');
        db.exec(schema);
    }
    // Seed agents if not exists
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
    if (agentCount.count === 0) {
        const insert = db.prepare('INSERT INTO agents (id, name, role, description, avatar_url, color) VALUES (?, ?, ?, ?, ?, ?)');
        insert.run('luna', 'Luna', 'Design Agent', 'Creates stunning custom designs and artwork for products', '/agents/luna.svg', '#9e4aff');
        insert.run('marcus', 'Marcus', 'Listing Agent', 'Optimizes and manages Etsy listings for maximum visibility', '/agents/marcus.svg', '#4a9eff');
        insert.run('aria', 'Aria', 'Fulfillment Agent', 'Processes orders and manages dropshipping fulfillment', '/agents/aria.svg', '#4aff9e');
        insert.run('rex', 'Rex', 'Support Agent', 'Handles customer messages, reviews, and support tickets', '/agents/rex.svg', '#ff9e4a');
        insert.run('nova', 'Nova', 'Analytics Agent', 'Tracks sales trends and generates performance reports', '/agents/nova.svg', '#ff4a9e');
    }
    return db;
}
const db = globalForDb.__fynnDb || (globalForDb.__fynnDb = createDb());
function all(sql, ...params) {
    return db.prepare(sql).all(...params);
}
function get(sql, ...params) {
    return db.prepare(sql).get(...params);
}
function run(sql, ...params) {
    return db.prepare(sql).run(...params);
}
}),
"[project]/src/lib/events.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "emitAgentEvent",
    ()=>emitAgentEvent,
    "eventBus",
    ()=>eventBus
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$events__$5b$external$5d$__$28$events$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/events [external] (events, cjs)");
;
const globalForEvents = globalThis;
if (!globalForEvents.__fynnEvents) {
    globalForEvents.__fynnEvents = new __TURBOPACK__imported__module__$5b$externals$5d2f$events__$5b$external$5d$__$28$events$2c$__cjs$29$__["EventEmitter"]();
    globalForEvents.__fynnEvents.setMaxListeners(50);
}
const eventBus = globalForEvents.__fynnEvents;
function emitAgentEvent(event) {
    eventBus.emit('agent-event', event);
}
}),
]})(),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__08loo6f56lccx._.js.map