/**
 * LLM 分析器 - 智能识别记忆
 *
 * 使用大模型分析对话内容，提取值得保存的记忆
 */
import type { MemoryType } from './types.js';
export interface MemoryCandidate {
    type: MemoryType;
    title: string;
    content: string;
    tags?: string[];
    confidence: number;
    reason: string;
}
export interface LLMAnalyzerConfig {
    provider: 'anthropic' | 'openai' | 'qwen';
    model: string;
    apiKey: string;
    baseUrl?: string;
    threshold: number;
    maxMemories: number;
}
export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}
/**
 * LLM 分析器类
 */
export declare class MemoryLLMAnalyzer {
    private config;
    constructor(config: LLMAnalyzerConfig);
    /**
     * 分析消息列表，提取记忆候选
     */
    analyze(messages: Message[]): Promise<MemoryCandidate[]>;
    /**
     * 构建分析 Prompt
     */
    private buildPrompt;
    /**
     * 调用 LLM
     */
    private callLLM;
    /**
     * 调用 Anthropic API
     */
    private callAnthropic;
    /**
     * 调用 OpenAI API
     */
    private callOpenAI;
    /**
     * 调用 Qwen API (DashScope)
     */
    private callQwen;
    /**
     * 解析 LLM 响应
     */
    private parseResponse;
    /**
     * 验证记忆类型
     */
    private validateType;
    /**
     * 评估记忆重要性（独立调用）
     */
    evaluateImportance(content: string, context?: string): Promise<{
        shouldSave: boolean;
        confidence: number;
        reason: string;
    }>;
    /**
     * 检查重复
     */
    checkDuplicate(newMemory: MemoryCandidate, existingMemories: Array<{
        title: string;
        content: string;
    }>): Promise<{
        isDuplicate: boolean;
        similarTo?: {
            title: string;
            similarity: number;
        };
    }>;
}
/**
 * 创建 LLM 分析器实例
 */
export declare function createLLMAnalyzer(config: LLMAnalyzerConfig): MemoryLLMAnalyzer;
//# sourceMappingURL=llmAnalyzer.d.ts.map