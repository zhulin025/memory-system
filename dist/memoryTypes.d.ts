/**
 * 记忆类型定义和 Prompt 模板
 *
 * 定义 4 种记忆类型及其保存/使用指导
 */
import type { MemoryType } from './types.js';
export declare const MEMORY_TYPE_DEFINITIONS: Record<MemoryType, {
    name: string;
    description: string;
    whenToSave: string;
    howToUse: string;
    bodyStructure: string;
    examples: Array<{
        user: string;
        assistant: string;
    }>;
}>;
export declare const WHAT_NOT_TO_SAVE: string[];
export declare const EXCLUSION_NOTE = "\n\u8FD9\u4E9B\u6392\u9664\u9879**\u5373\u4F7F\u660E\u786E\u8981\u6C42\u4E5F\u4E0D\u4FDD\u5B58**\u3002\u5982\u679C\u7528\u6237\u8981\u6C42\u4FDD\u5B58 PR \u5217\u8868\u6216\u6D3B\u52A8\u603B\u7ED3\uFF0C\n\u8BE2\u95EE\u4EC0\u4E48\u5185\u5BB9\u662F *surprising* \u6216 *non-obvious* \u7684\u2014\u2014\u90A3\u624D\u662F\u503C\u5F97\u4FDD\u5B58\u7684\u90E8\u5206\u3002\n";
export declare const MEMORY_FRONTMATTER_EXAMPLE = "\n---\ntype: feedback\ntitle: \"\u6D4B\u8BD5\u5FC5\u987B\u4F7F\u7528\u771F\u5B9E\u6570\u636E\u5E93\"\ncreated: 2026-03-31T10:00:00Z\nupdated: 2026-03-31T10:00:00Z\ntags: [testing, database, policy]\n---\n";
/**
 * 生成记忆提取 Prompt
 */
export declare function buildExtractPrompt(newMessageCount: number, existingMemories: string, skipIndex?: boolean): string;
export declare function buildDreamPrompt(memoryRoot: string, transcriptDir: string, maxIndexLines: number, maxIndexBytes: number): string;
//# sourceMappingURL=memoryTypes.d.ts.map