/**
 * 记忆索引管理
 *
 * 管理 MEMORY.md 索引文件（≤200 行，≤25KB）
 */
import type { IndexEntry } from './types.js';
/**
 * 读取索引文件
 */
export declare function readIndex(projectId?: string): Promise<IndexEntry[]>;
/**
 * 解析索引内容
 */
export declare function parseIndexContent(content: string): IndexEntry[];
/**
 * 更新索引
 */
export declare function updateIndex(entries: IndexEntry[], projectId?: string): Promise<void>;
/**
 * 格式化索引内容
 */
export declare function formatIndexContent(entries: IndexEntry[]): string;
/**
 * 添加条目到索引
 */
export declare function addIndexEntry(entry: IndexEntry, projectId?: string): Promise<void>;
/**
 * 从索引移除条目
 */
export declare function removeIndexEntry(file: string, projectId?: string): Promise<void>;
/**
 * 验证索引是否符合限制
 */
export declare function validateIndex(content: string): {
    valid: boolean;
    lineCount: number;
    byteCount: number;
    wasLineTruncated: boolean;
    wasByteTruncated: boolean;
};
/**
 * 修剪索引（如果超出限制）
 */
export declare function truncateIndex(content: string): string;
/**
 * 格式化索引验证警告
 */
export declare function formatIndexWarning(lineCount: number, byteCount: number, wasLineTruncated: boolean, wasByteTruncated: boolean): string;
//# sourceMappingURL=index.d.ts.map