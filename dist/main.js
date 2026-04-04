/**
 * OpenClaw 记忆系统 - 主入口
 *
 * 提供完整的记忆管理功能：
 * - 自动记忆提取
 * - Dream 定期整理
 * - 记忆查询和管理
 */
import { getProjectIdFromCwd, ensureMemoryDir } from './paths.js';
import { extractMemories } from './extractor.js';
import { shouldTriggerDream, runDream } from './dream.js';
import { readIndex, addIndexEntry, removeIndexEntry } from './index.js';
import { createWebUI } from './webui/server.js';
// ============================================================================
// 配置
// ============================================================================
let config = {
    autoExtractEnabled: true,
    extractTurnInterval: 1,
    dreamEnabled: true,
    dreamMinHours: 24,
    dreamMinSessions: 5,
    maxIndexLines: 200,
    maxIndexBytes: 25000,
    maxOneLineChars: 150
};
/**
 * 更新配置
 */
export function configure(newConfig) {
    config = { ...config, ...newConfig };
}
/**
 * 获取配置
 */
export function getConfig() {
    return { ...config };
}
// ============================================================================
// 初始化
// ============================================================================
/**
 * 初始化记忆系统
 */
export function init(projectId) {
    // 自动检测项目 ID
    if (!projectId) {
        projectId = getProjectIdFromCwd();
    }
    // 确保目录存在
    ensureMemoryDir(projectId);
    console.log(`[MemorySystem] 初始化完成，项目：${projectId}`);
}
/**
 * 从对话中提取记忆
 *
 * @param messages 对话消息列表
 * @param projectId 项目 ID（可选，默认自动检测）
 */
export async function extract(messages, projectId) {
    if (!config.autoExtractEnabled) {
        return {
            memoriesSaved: 0,
            memoriesUpdated: 0,
            memoriesDeleted: 0,
            indexUpdated: false,
            filesWritten: []
        };
    }
    return await extractMemories(messages, projectId);
}
// ============================================================================
// Dream 整理
// ============================================================================
/**
 * 执行 Dream 整理
 *
 * @param projectId 项目 ID（可选，默认自动检测）
 */
export async function dream(projectId) {
    if (!config.dreamEnabled) {
        return {
            memoriesConsolidated: 0,
            memoriesPruned: 0,
            indexUpdated: false,
            filesTouched: []
        };
    }
    // 检查是否应该触发
    const check = await shouldTriggerDream(projectId, {
        minHours: config.dreamMinHours,
        minSessions: config.dreamMinSessions
    });
    if (!check.should) {
        console.log(`[MemorySystem] Dream 未触发：${check.reason}`);
        return {
            memoriesConsolidated: 0,
            memoriesPruned: 0,
            indexUpdated: false,
            filesTouched: []
        };
    }
    try {
        console.log(`[MemorySystem] 开始 Dream 整理...`);
        const result = await runDream(projectId);
        console.log(`[MemorySystem] Dream 完成：整理 ${result.memoriesConsolidated} 个记忆，修剪 ${result.memoriesPruned} 个`);
        return result;
    }
    catch (e) {
        console.error('[MemorySystem] Dream 失败:', e);
        throw e;
    }
}
/**
 * 检查 Dream 状态
 */
export async function checkDreamStatus(projectId) {
    const check = await shouldTriggerDream(projectId, {
        minHours: config.dreamMinHours,
        minSessions: config.dreamMinSessions
    });
    return {
        hoursSinceLastDream: check.hoursSince ?? 0,
        shouldTrigger: check.should,
        reason: check.reason
    };
}
// ============================================================================
// 记忆查询
// ============================================================================
/**
 * 读取记忆索引
 */
export async function listMemories(projectId) {
    return await readIndex(projectId);
}
/**
 * 添加记忆索引条目
 */
export async function addMemory(title, file, type, oneLine, projectId) {
    await addIndexEntry({
        title,
        file,
        type: type,
        oneLine
    }, projectId);
}
/**
 * 移除记忆索引条目
 */
export async function removeMemory(file, projectId) {
    await removeIndexEntry(file, projectId);
}
// ============================================================================
// CLI 命令
// ============================================================================
/**
 * 运行 CLI 命令
 */
export async function runCLI(args) {
    const command = args[0];
    switch (command) {
        case 'init':
            init();
            console.log('✓ 记忆系统初始化完成');
            break;
        case 'extract':
            // 从 stdin 读取消息
            const messages = await readStdin();
            const result = await extract(JSON.parse(messages));
            console.log(`✓ 提取完成：保存 ${result.memoriesSaved} 个，更新 ${result.memoriesUpdated} 个`);
            break;
        case 'dream':
            const dreamResult = await dream();
            console.log(`✓ Dream 完成：整理 ${dreamResult.memoriesConsolidated} 个，修剪 ${dreamResult.memoriesPruned} 个`);
            break;
        case 'status':
            const status = await checkDreamStatus();
            console.log(`距离上次 Dream: ${status.hoursSinceLastDream.toFixed(1)} 小时`);
            console.log(`应该触发：${status.shouldTrigger ? '是' : '否'}`);
            if (status.reason) {
                console.log(`原因：${status.reason}`);
            }
            break;
        case 'list':
            const memories = await listMemories();
            console.log(`记忆列表 (${memories.length} 个):`);
            for (const mem of memories) {
                console.log(`  - [${mem.type}] ${mem.title} — ${mem.oneLine}`);
            }
            break;
        case 'webui':
            // 启动 Web UI
            const port = parseInt(process.env.PORT || '3000');
            const webui = createWebUI({
                port,
                host: 'localhost',
                auth: {
                    enabled: !!process.env.WEBUI_TOKEN,
                    token: process.env.WEBUI_TOKEN || ''
                }
            });
            await webui.start();
            console.log(`Web UI 已启动：http://localhost:${port}`);
            console.log('按 Ctrl+C 停止');
            break;
        case 'help':
        default:
            console.log(`
OpenClaw 记忆系统

用法：
  memory-system init          # 初始化
  memory-system extract       # 从对话提取记忆（从 stdin 读取 JSON）
  memory-system dream         # 执行 Dream 整理
  memory-system status        # 检查 Dream 状态
  memory-system list          # 列出所有记忆
  memory-system webui         # 启动 Web UI
  memory-system help          # 显示帮助

配置（环境变量）:
  OPENCLAW_MEMORY_PATH        # 记忆目录路径
  PORT                        # Web UI 端口（默认 3000）
  WEBUI_TOKEN                 # Web UI 认证 token
`);
            break;
    }
}
async function readStdin() {
    return new Promise((resolve) => {
        let data = '';
        process.stdin.on('data', chunk => data += chunk);
        process.stdin.on('end', () => resolve(data));
    });
}
// ============================================================================
// 导出
// ============================================================================
export * from './types.js';
export * from './paths.js';
export * from './extractor.js';
export * from './dream.js';
// memoryTypes 和 index 的部分函数单独导出，避免重复
export { buildExtractPrompt, buildDreamPrompt } from './memoryTypes.js';
export { readIndex, updateIndex, addIndexEntry, removeIndexEntry } from './index.js';
//# sourceMappingURL=main.js.map