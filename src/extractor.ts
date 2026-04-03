/**
 * 记忆提取器
 * 
 * 分析对话内容，自动提取可保存的记忆
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { basename } from 'path'
import { parse, stringify } from 'yaml'
import type { Memory, MemoryFrontmatter, ExtractResult, MemoryType } from './types.js'
import { getMemoriesDir, getMemoryFilePath, ensureMemoryDir } from './paths.js'
import { readIndex, addIndexEntry } from './index.js'

// ============================================================================
// 记忆提取
// ============================================================================

/**
 * 从对话内容中提取记忆
 * 
 * @param messages 对话消息列表
 * @param projectId 项目 ID
 */
export async function extractMemories(
  messages: MemoryMessage[],
  projectId?: string
): Promise<ExtractResult> {
  ensureMemoryDir(projectId)
  
  const result: ExtractResult = {
    memoriesSaved: 0,
    memoriesUpdated: 0,
    memoriesDeleted: 0,
    indexUpdated: false,
    filesWritten: []
  }
  
  // 1. 分析消息，提取候选记忆
  const candidates = await analyzeMessages(messages)
  
  // 2. 加载现有记忆（避免重复）
  const existingMemories = await loadExistingMemories(projectId)
  
  // 3. 处理每个候选记忆
  for (const candidate of candidates) {
    const action = await processCandidate(candidate, existingMemories, projectId)
    
    if (action.type === 'save') {
      result.memoriesSaved++
      result.filesWritten.push(action.filePath)
    } else if (action.type === 'update') {
      result.memoriesUpdated++
      result.filesWritten.push(action.filePath)
    } else if (action.type === 'delete') {
      result.memoriesDeleted++
    }
    
    if (action.indexUpdated) {
      result.indexUpdated = true
    }
  }
  
  return result
}

// ============================================================================
// 消息分析
// ============================================================================

export interface MemoryMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

interface MemoryCandidate {
  type: MemoryType
  title: string
  content: string
  tags?: string[]
  reason: string  // 为什么值得保存
}

/**
 * 分析消息，提取候选记忆
 */
async function analyzeMessages(messages: MemoryMessage[]): Promise<MemoryCandidate[]> {
  const candidates: MemoryCandidate[] = []
  
  // 简单实现：查找明确的记忆保存信号
  // 完整实现应该调用 LLM 分析
  
  for (const message of messages) {
    // 查找用户明确要求记忆的内容
    if (message.role === 'user') {
      const memorySignals = [
        /记住[,：]\s*(.+)/i,
        /记一下[,：]\s*(.+)/i,
        /保存.*记忆/i,
        /别忘了(.+)/i,
      ]
      
      for (const signal of memorySignals) {
        const match = message.content.match(signal)
        if (match) {
          const candidate = extractCandidateFromMessage(message, match[1])
          if (candidate) {
            candidates.push(candidate)
          }
        }
      }
    }
    
    // 查找助手保存记忆的声明
    if (message.role === 'assistant') {
      const saveSignals = [
        /\[保存 (\w+) 记忆[:：]?\s*(.+)\]/i,
        /\[记录 (\w+) 记忆[:：]?\s*(.+)\]/i,
      ]
      
      for (const signal of saveSignals) {
        const match = message.content.match(signal)
        if (match) {
          const type = match[1].toLowerCase() as MemoryType
          const content = match[2]
          
          if (isValidMemoryType(type)) {
            candidates.push({
              type,
              title: generateTitle(content),
              content,
              reason: '助手明确声明保存'
            })
          }
        }
      }
    }
  }
  
  return candidates
}

/**
 * 从消息提取候选记忆
 */
function extractCandidateFromMessage(
  _msg: MemoryMessage,
  content: string
): MemoryCandidate | null {
  // 推断记忆类型
  const type = inferMemoryType(content)
  
  return {
    type,
    title: generateTitle(content),
    content: content.trim(),
    reason: '用户明确要求记忆'
  }
}

/**
 * 从内容推断记忆类型
 */
function inferMemoryType(content: string): MemoryType {
  const lower = content.toLowerCase()
  
  // user 类型信号
  if (/\b(我是 | 我喜欢 | 我习惯 | 我的角色 | 我是做)/i.test(lower)) {
    return 'user'
  }
  
  // feedback 类型信号
  if (/\b(不要 | 别 | 停止 | 继续 | 保持 | 应该 | 不应该)/i.test(lower)) {
    return 'feedback'
  }
  
  // project 类型信号
  if (/\b(项目 | 任务 | 截止 | 周四 | 周五 | 下周 | 团队 | 发布)/i.test(lower)) {
    return 'project'
  }
  
  // reference 类型信号
  if (/\b(http|https|www\.|linear|grafana|slack|github)/i.test(lower)) {
    return 'reference'
  }
  
  return 'user'  // 默认
}

/**
 * 生成记忆标题
 */
function generateTitle(content: string): string {
  // 取第一句作为标题
  const firstSentence = content.split(/[.。！？!?]/)[0]
  return firstSentence.slice(0, 50).trim()
}

/**
 * 验证记忆类型
 */
function isValidMemoryType(type: string): type is MemoryType {
  return ['user', 'feedback', 'project', 'reference'].includes(type)
}

// ============================================================================
// 候选记忆处理
// ============================================================================

interface ProcessAction {
  type: 'save' | 'update' | 'delete'
  filePath: string
  indexUpdated: boolean
}

/**
 * 处理候选记忆
 */
async function processCandidate(
  candidate: MemoryCandidate,
  existingMemories: Memory[],
  projectId?: string
): Promise<ProcessAction> {
  // 检查是否已存在（避免重复）
  const existing = findSimilarMemory(candidate, existingMemories)
  
  if (existing) {
    // 更新现有记忆
    return await updateMemory(existing, candidate, projectId)
  } else {
    // 保存新记忆
    return await saveMemory(candidate, projectId)
  }
}

/**
 * 查找相似记忆
 */
function findSimilarMemory(
  candidate: MemoryCandidate,
  existing: Memory[]
): Memory | undefined {
  return existing.find(mem => {
    // 类型相同且标题相似
    if (mem.frontmatter.type !== candidate.type) return false
    
    const titleSimilar = levenshteinDistance(
      mem.frontmatter.title.toLowerCase(),
      candidate.title.toLowerCase()
    ) < 10
    
    return titleSimilar
  })
}

/**
 * 保存新记忆
 */
async function saveMemory(
  candidate: MemoryCandidate,
  projectId?: string
): Promise<ProcessAction> {
  const fileName = generateFileName(candidate)
  const filePath = getMemoryFilePath(fileName, projectId)
  
  const frontmatter: MemoryFrontmatter = {
    type: candidate.type,
    title: candidate.title,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    tags: candidate.tags
  }
  
  const content = formatMemoryFile(frontmatter, candidate.content)
  await writeFile(filePath, content, 'utf8')
  
  // 更新索引
  await addIndexEntry({
    title: candidate.title,
    file: fileName,
    type: candidate.type,
    oneLine: truncate(candidate.content, 150)
  }, projectId)
  
  return {
    type: 'save',
    filePath,
    indexUpdated: true
  }
}

/**
 * 更新现有记忆
 */
async function updateMemory(
  existing: Memory,
  candidate: MemoryCandidate,
  projectId?: string
): Promise<ProcessAction> {
  const frontmatter: MemoryFrontmatter = {
    ...existing.frontmatter,
    updated: new Date().toISOString(),
    title: candidate.title || existing.frontmatter.title
  }
  
  const content = formatMemoryFile(frontmatter, candidate.content)
  await writeFile(existing.filePath, content, 'utf8')
  
  // 更新索引
  await addIndexEntry({
    title: frontmatter.title,
    file: basename(existing.filePath),
    type: frontmatter.type,
    oneLine: truncate(candidate.content, 150)
  }, projectId)
  
  return {
    type: 'update',
    filePath: existing.filePath,
    indexUpdated: true
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 加载现有记忆
 */
async function loadExistingMemories(projectId?: string): Promise<Memory[]> {
  const memories: Memory[] = []
  const dir = getMemoriesDir(projectId)
  
  if (!existsSync(dir)) {
    return memories
  }
  
  // 读取索引获取文件列表
  const index = await readIndex(projectId)
  
  for (const entry of index) {
    const filePath = getMemoryFilePath(entry.file, projectId)
    
    if (existsSync(filePath)) {
      try {
        const content = await readFile(filePath, 'utf8')
        const memory = parseMemoryFile(content, filePath)
        if (memory) {
          memories.push(memory)
        }
      } catch (e) {
        console.error(`Failed to load memory ${filePath}:`, e)
      }
    }
  }
  
  return memories
}

/**
 * 解析记忆文件
 */
function parseMemoryFile(content: string, filePath: string): Memory | null {
  const lines = content.split('\n')
  
  // 查找 frontmatter 边界
  if (!lines[0]?.trim().startsWith('---')) {
    return null
  }
  
  const endIdx = lines.findIndex((line, i) => i > 0 && line.trim() === '---')
  if (endIdx === -1) {
    return null
  }
  
  // 解析 frontmatter
  const frontmatterYaml = lines.slice(1, endIdx).join('\n')
  const frontmatter = parse(frontmatterYaml) as MemoryFrontmatter
  
  // 提取内容
  const body = lines.slice(endIdx + 1).join('\n').trim()
  
  return {
    frontmatter,
    content: body,
    filePath
  }
}

/**
 * 格式化记忆文件
 */
function formatMemoryFile(
  frontmatter: MemoryFrontmatter,
  content: string
): string {
  return `---
${stringify(frontmatter).trim()}
---

${content}
`
}

/**
 * 生成文件名
 */
function generateFileName(candidate: MemoryCandidate): string {
  const timestamp = Date.now()
  const slug = candidate.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30)
  
  return `${candidate.type}_${slug}_${timestamp}.md`
}

/**
 * 字符串截断
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

/**
 * Levenshtein 距离（简单实现）
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[b.length][a.length]
}
