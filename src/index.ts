/**
 * 记忆索引管理
 * 
 * 管理 MEMORY.md 索引文件（≤200 行，≤25KB）
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { IndexEntry, MemoryType } from './types.js'
import { getIndexFilePath } from './paths.js'

// ============================================================================
// 常量
// ============================================================================

const MAX_INDEX_LINES = 200
const MAX_INDEX_BYTES = 25_000  // ~25KB
const MAX_ONE_LINE_CHARS = 150

// ============================================================================
// 索引读取
// ============================================================================

/**
 * 读取索引文件
 */
export async function readIndex(projectId?: string): Promise<IndexEntry[]> {
  const indexPath = getIndexFilePath(projectId)
  
  if (!existsSync(indexPath)) {
    return []
  }
  
  const content = await readFile(indexPath, 'utf8')
  return parseIndexContent(content)
}

/**
 * 解析索引内容
 */
export function parseIndexContent(content: string): IndexEntry[] {
  const entries: IndexEntry[] = []
  const lines = content.split('\n')
  
  for (const line of lines) {
    const entry = parseIndexLine(line)
    if (entry) {
      entries.push(entry)
    }
  }
  
  return entries
}

/**
 * 解析单行索引
 * 格式：- [Title](file.md) — one-line hook
 */
function parseIndexLine(line: string): IndexEntry | null {
  const match = line.match(/^- \[(.+?)\]\((.+?)\) — (.+)$/)
  if (!match) return null
  
  const [, title, file, oneLine] = match
  
  // 从文件名推断类型
  const type = inferMemoryTypeFromFile(file)
  
  return {
    title,
    file,
    type,
    oneLine: oneLine.trim()
  }
}

/**
 * 从文件名推断记忆类型
 */
function inferMemoryTypeFromFile(file: string): MemoryType {
  const lower = file.toLowerCase()
  if (lower.includes('user')) return 'user'
  if (lower.includes('feedback')) return 'feedback'
  if (lower.includes('project')) return 'project'
  if (lower.includes('reference')) return 'reference'
  return 'user'  // 默认
}

// ============================================================================
// 索引写入
// ============================================================================

/**
 * 更新索引
 */
export async function updateIndex(
  entries: IndexEntry[],
  projectId?: string
): Promise<void> {
  const content = formatIndexContent(entries)
  const indexPath = getIndexFilePath(projectId)
  
  await writeFile(indexPath, content, 'utf8')
}

/**
 * 格式化索引内容
 */
export function formatIndexContent(entries: IndexEntry[]): string {
  const lines = entries.map(entry => formatIndexEntry(entry))
  return lines.join('\n')
}

/**
 * 格式化单行索引
 */
function formatIndexEntry(entry: IndexEntry): string {
  // 确保 oneLine ≤ MAX_ONE_LINE_CHARS
  const oneLine = truncate(entry.oneLine, MAX_ONE_LINE_CHARS)
  return `- [${entry.title}](${entry.file}) — ${oneLine}`
}

/**
 * 添加条目到索引
 */
export async function addIndexEntry(
  entry: IndexEntry,
  projectId?: string
): Promise<void> {
  const entries = await readIndex(projectId)
  
  // 检查是否已存在（避免重复）
  const exists = entries.some(e => e.file === entry.file)
  if (exists) {
    // 更新现有条目
    const index = entries.findIndex(e => e.file === entry.file)
    entries[index] = entry
  } else {
    // 添加新条目
    entries.push(entry)
  }
  
  await updateIndex(entries, projectId)
}

/**
 * 从索引移除条目
 */
export async function removeIndexEntry(
  file: string,
  projectId?: string
): Promise<void> {
  const entries = await readIndex(projectId)
  const filtered = entries.filter(e => e.file !== file)
  await updateIndex(filtered, projectId)
}

// ============================================================================
// 索引验证和修剪
// ============================================================================

/**
 * 验证索引是否符合限制
 */
export function validateIndex(content: string): {
  valid: boolean
  lineCount: number
  byteCount: number
  wasLineTruncated: boolean
  wasByteTruncated: boolean
} {
  const lines = content.split('\n')
  const lineCount = lines.length
  const byteCount = content.length
  
  const wasLineTruncated = lineCount > MAX_INDEX_LINES
  const wasByteTruncated = byteCount > MAX_INDEX_BYTES
  
  return {
    valid: !wasLineTruncated && !wasByteTruncated,
    lineCount,
    byteCount,
    wasLineTruncated,
    wasByteTruncated
  }
}

/**
 * 修剪索引（如果超出限制）
 */
export function truncateIndex(content: string): string {
  const lines = content.split('\n')
  
  // 先按行数修剪
  let truncated = lines.slice(0, MAX_INDEX_LINES)
  
  // 再按字节数修剪
  let result = truncated.join('\n')
  if (result.length > MAX_INDEX_BYTES) {
    // 在最后一个完整行处截断
    const cutAt = result.lastIndexOf('\n', MAX_INDEX_BYTES)
    result = result.slice(0, cutAt > 0 ? cutAt : MAX_INDEX_BYTES)
  }
  
  return result
}

/**
 * 格式化索引验证警告
 */
export function formatIndexWarning(
  lineCount: number,
  byteCount: number,
  wasLineTruncated: boolean,
  wasByteTruncated: boolean
): string {
  if (!wasLineTruncated && !wasByteTruncated) {
    return ''
  }
  
  const reason = 
    wasByteTruncated && !wasLineTruncated
      ? `${formatFileSize(byteCount)} (限制：${formatFileSize(MAX_INDEX_BYTES)}) — 索引行太长`
      : wasLineTruncated && !wasByteTruncated
        ? `${lineCount} 行 (限制：${MAX_INDEX_LINES})`
        : `${lineCount} 行和 ${formatFileSize(byteCount)}`
  
  return `\n\n> ⚠️ MEMORY.md 是 ${reason}。只加载了部分内容。保持索引行 ≤${MAX_ONE_LINE_CHARS} 字符，详细内容移到主题文件。`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

// ============================================================================
// 工具函数
// ============================================================================

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}
