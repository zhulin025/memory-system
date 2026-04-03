/**
 * 记忆提取器
 *
 * 分析对话内容，自动提取可保存的记忆
 */
import type { ExtractResult } from './types.js';
/**
 * 从对话内容中提取记忆
 *
 * @param messages 对话消息列表
 * @param projectId 项目 ID
 */
export declare function extractMemories(messages: MemoryMessage[], projectId?: string): Promise<ExtractResult>;
export interface MemoryMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}
//# sourceMappingURL=extractor.d.ts.map