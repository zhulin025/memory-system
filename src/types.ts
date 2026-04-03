/**
 * OpenClaw 记忆系统类型定义
 */

// ============================================================================
// 记忆类型
// ============================================================================

export const MEMORY_TYPES = [
  'user',
  'feedback', 
  'project',
  'reference',
] as const

export type MemoryType = (typeof MEMORY_TYPES)[number]

/**
 * 解析记忆类型
 */
export function parseMemoryType(raw: unknown): MemoryType | undefined {
  if (typeof raw !== 'string') return undefined
  return MEMORY_TYPES.find(t => t === raw)
}

// ============================================================================
// 记忆数据结构
// ============================================================================

export interface MemoryFrontmatter {
  type: MemoryType
  title: string
  created: string  // ISO 8601
  updated: string  // ISO 8601
  tags?: string[]
  scope?: 'private' | 'team'  // 保留未来扩展
}

export interface Memory {
  frontmatter: MemoryFrontmatter
  content: string
  filePath: string
}

// ============================================================================
// 记忆索引条目
// ============================================================================

export interface IndexEntry {
  title: string
  file: string
  type: MemoryType
  oneLine: string  // ≤150 字符的钩子
}

// ============================================================================
// 配置
// ============================================================================

export interface MemorySystemConfig {
  // 基础路径
  baseDir?: string
  
  // 自动提取配置
  autoExtractEnabled?: boolean
  extractTurnInterval?: number  // 每 N 个 turn 提取一次
  
  // Dream 配置
  dreamEnabled?: boolean
  dreamMinHours?: number  // 默认 24
  dreamMinSessions?: number  // 默认 5
  
  // 限制
  maxIndexLines?: number  // 默认 200
  maxIndexBytes?: number  // 默认 25KB
  maxOneLineChars?: number  // 默认 150
}

// ============================================================================
// Dream 任务状态
// ============================================================================

export type DreamPhase = 'starting' | 'updating'

export interface DreamTurn {
  text: string
  toolUseCount: number
}

export interface DreamTaskState {
  id: string
  status: 'running' | 'completed' | 'failed' | 'killed'
  phase: DreamPhase
  sessionsReviewing: number
  filesTouched: string[]
  turns: DreamTurn[]
  startTime: number
  endTime?: number
}

// ============================================================================
// 工具结果
// ============================================================================

export interface ExtractResult {
  memoriesSaved: number
  memoriesUpdated: number
  memoriesDeleted: number
  indexUpdated: boolean
  filesWritten: string[]
}

export interface DreamResult {
  memoriesConsolidated: number
  memoriesPruned: number
  indexUpdated: boolean
  filesTouched: string[]
}
