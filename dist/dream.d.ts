/**
 * Dream 记忆整理机制
 *
 * 定期整理、合并、修剪记忆
 */
import type { DreamResult } from './types.js';
/**
 * 检查是否应该触发 Dream
 */
export declare function shouldTriggerDream(projectId?: string, options?: {
    minHours?: number;
    minSessions?: number;
}): Promise<{
    should: boolean;
    reason?: string;
    hoursSince?: number;
    sessionsSince?: number;
}>;
/**
 * 尝试获取 Dream 锁
 */
export declare function tryAcquireDreamLock(projectId?: string): Promise<boolean>;
/**
 * 释放 Dream 锁（回滚 mtime）
 */
export declare function releaseDreamLock(projectId?: string, priorMtime?: number): Promise<void>;
/**
 * 执行 Dream 整理
 */
export declare function runDream(projectId?: string): Promise<DreamResult>;
/**
 * 构建 Dream Prompt
 */
export declare function buildDreamPrompt(memoryRoot: string, maxIndexLines?: number, maxIndexBytes?: number): string;
//# sourceMappingURL=dream.d.ts.map