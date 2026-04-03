/**
 * OpenClaw 记忆系统 - 主入口
 *
 * 提供完整的记忆管理功能：
 * - 自动记忆提取
 * - Dream 定期整理
 * - 记忆查询和管理
 */
import type { MemorySystemConfig, ExtractResult, DreamResult } from './types.js';
/**
 * 更新配置
 */
export declare function configure(newConfig: Partial<MemorySystemConfig>): void;
/**
 * 获取配置
 */
export declare function getConfig(): MemorySystemConfig;
/**
 * 初始化记忆系统
 */
export declare function init(projectId?: string): void;
interface MemoryMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}
/**
 * 从对话中提取记忆
 *
 * @param messages 对话消息列表
 * @param projectId 项目 ID（可选，默认自动检测）
 */
export declare function extract(messages: MemoryMessage[], projectId?: string): Promise<ExtractResult>;
/**
 * 执行 Dream 整理
 *
 * @param projectId 项目 ID（可选，默认自动检测）
 */
export declare function dream(projectId?: string): Promise<DreamResult>;
/**
 * 检查 Dream 状态
 */
export declare function checkDreamStatus(projectId?: string): Promise<{
    hoursSinceLastDream: number;
    shouldTrigger: boolean;
    reason?: string;
}>;
/**
 * 读取记忆索引
 */
export declare function listMemories(projectId?: string): Promise<import("./types.js").IndexEntry[]>;
/**
 * 添加记忆索引条目
 */
export declare function addMemory(title: string, file: string, type: string, oneLine: string, projectId?: string): Promise<void>;
/**
 * 移除记忆索引条目
 */
export declare function removeMemory(file: string, projectId?: string): Promise<void>;
/**
 * 运行 CLI 命令
 */
export declare function runCLI(args: string[]): Promise<void>;
export * from './types.js';
export * from './paths.js';
export * from './extractor.js';
export * from './dream.js';
export { buildExtractPrompt, buildDreamPrompt } from './memoryTypes.js';
export { readIndex, updateIndex, addIndexEntry, removeIndexEntry } from './index.js';
//# sourceMappingURL=main.d.ts.map