/**
 * OpenClaw 记忆系统类型定义
 */
export declare const MEMORY_TYPES: readonly ["user", "feedback", "project", "reference"];
export type MemoryType = (typeof MEMORY_TYPES)[number];
/**
 * 解析记忆类型
 */
export declare function parseMemoryType(raw: unknown): MemoryType | undefined;
export interface MemoryFrontmatter {
    type: MemoryType;
    title: string;
    created: string;
    updated: string;
    tags?: string[];
    scope?: 'private' | 'team';
}
export interface Memory {
    frontmatter: MemoryFrontmatter;
    content: string;
    filePath: string;
}
export interface IndexEntry {
    title: string;
    file: string;
    type: MemoryType;
    oneLine: string;
}
export interface MemorySystemConfig {
    baseDir?: string;
    autoExtractEnabled?: boolean;
    extractTurnInterval?: number;
    dreamEnabled?: boolean;
    dreamMinHours?: number;
    dreamMinSessions?: number;
    maxIndexLines?: number;
    maxIndexBytes?: number;
    maxOneLineChars?: number;
}
export type DreamPhase = 'starting' | 'updating';
export interface DreamTurn {
    text: string;
    toolUseCount: number;
}
export interface DreamTaskState {
    id: string;
    status: 'running' | 'completed' | 'failed' | 'killed';
    phase: DreamPhase;
    sessionsReviewing: number;
    filesTouched: string[];
    turns: DreamTurn[];
    startTime: number;
    endTime?: number;
}
export interface ExtractResult {
    memoriesSaved: number;
    memoriesUpdated: number;
    memoriesDeleted: number;
    indexUpdated: boolean;
    filesWritten: string[];
}
export interface DreamResult {
    memoriesConsolidated: number;
    memoriesPruned: number;
    indexUpdated: boolean;
    filesTouched: string[];
}
//# sourceMappingURL=types.d.ts.map