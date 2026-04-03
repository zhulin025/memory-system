/**
 * 记忆类型定义和 Prompt 模板
 * 
 * 定义 4 种记忆类型及其保存/使用指导
 */

import type { MemoryType } from './types.js'

// ============================================================================
// 记忆类型定义
// ============================================================================

export const MEMORY_TYPE_DEFINITIONS: Record<MemoryType, {
  name: string
  description: string
  whenToSave: string
  howToUse: string
  bodyStructure: string
  examples: Array<{ user: string; assistant: string }>
}> = {
  user: {
    name: 'user',
    description: "包含用户的角色、目标、责任、知识。帮助调整行为适应用户偏好和视角。",
    whenToSave: "当学到任何关于用户角色、偏好、责任、知识的信息时",
    howToUse: "当工作需要基于用户的背景/视角时，用适合用户的方式解释",
    bodyStructure: "直接描述用户特征，包含具体细节",
    examples: [
      {
        user: "我是数据科学家，在调查日志系统",
        assistant: "[保存 user 记忆：用户是数据科学家，关注可观测性/日志]"
      },
      {
        user: "我写 Go 十年了，但这是第一次碰这个项目的 React 前端",
        assistant: "[保存 user 记忆：Go 专家，React 新手 — 前端解释用后端类比]"
      }
    ]
  },
  
  feedback: {
    name: 'feedback',
    description: "用户给出的工作方式指导 — 避免什么和保持什么。记录失败 AND 成功。",
    whenToSave: "用户纠正你的方法（'不要这样'）或确认非显而易见的方法有效（'对，就是这样'）时",
    howToUse: "让这些记忆指导行为，避免用户重复相同指导",
    bodyStructure: "1. 规则本身 2. **Why:** 原因 3. **How to apply:** 适用场景",
    examples: [
      {
        user: "测试不要 mock 数据库 — 上季度 mock 测试过了但生产迁移失败了",
        assistant: "[保存 feedback 记忆：集成测试必须用真实数据库。Why: mock/生产行为不一致导致事故]"
      },
      {
        user: "别在每次回复最后总结你做了什么，我能看 diff",
        assistant: "[保存 feedback 记忆：用户要简洁回复，不要 trailing summary]"
      }
    ]
  },
  
  project: {
    name: 'project',
    description: "关于正在进行的工作、目标、bug、事件的信息。无法从代码/git 推导的内容。",
    whenToSave: "学到谁在做什么、为什么、何时完成时。相对日期转绝对日期",
    howToUse: "理解用户请求的细节和 nuance，预判协调问题",
    bodyStructure: "1. 事实或决策 2. **Why:** 动机 3. **How to apply:** 如何影响建议",
    examples: [
      {
        user: "周四后冻结非关键合并 — 移动团队在发版",
        assistant: "[保存 project 记忆：2026-03-05 起合并冻结。移动团队 release cut]"
      },
      {
        user: "我们重写 auth middleware 是因为 legal  flagged 它不符合新的合规要求",
        assistant: "[保存 project 记忆：auth 重写是 legal/compliance 驱动，不是 tech debt]"
      }
    ]
  },
  
  reference: {
    name: 'reference',
    description: "存储外部系统的信息指针。记住去哪里找最新信息。",
    whenToSave: "学到外部系统资源及其用途时",
    howToUse: "当用户提到外部系统或信息时",
    bodyStructure: "直接记录系统名称、URL、用途",
    examples: [
      {
        user: "去 Linear 项目 'INGEST' 查 pipeline bug，那里记录所有相关问题",
        assistant: "[保存 reference 记忆：pipeline bugs → Linear 项目 'INGEST']"
      },
      {
        user: "Grafana 看板 grafana.internal/d/api-latency 是 oncall 看的",
        assistant: "[保存 reference 记忆：oncall 延迟看板 — grafana.internal/d/api-latency]"
      }
    ]
  }
}

// ============================================================================
// 排除规则
// ============================================================================

export const WHAT_NOT_TO_SAVE = [
  "代码模式、约定、架构、文件路径、项目结构（可通过阅读当前项目状态推导）",
  "git 历史、最近的变更、谁改了什么（git log / git blame 是权威来源）",
  "调试解决方案或修复方案（修复在代码里，commit message 有上下文）",
  "已 documented 在 CLAUDE.md 或其他文档中的内容",
  "临时任务细节：进行中的工作、临时状态、当前对话上下文",
]

export const EXCLUSION_NOTE = `
这些排除项**即使明确要求也不保存**。如果用户要求保存 PR 列表或活动总结，
询问什么内容是 *surprising* 或 *non-obvious* 的——那才是值得保存的部分。
`

// ============================================================================
// Frontmatter 示例
// ============================================================================

export const MEMORY_FRONTMATTER_EXAMPLE = `
---
type: feedback
title: "测试必须使用真实数据库"
created: 2026-03-31T10:00:00Z
updated: 2026-03-31T10:00:00Z
tags: [testing, database, policy]
---
`

// ============================================================================
// Prompt 模板
// ============================================================================

/**
 * 生成记忆提取 Prompt
 */
export function buildExtractPrompt(
  newMessageCount: number,
  existingMemories: string,
  skipIndex = false
): string {
  const manifest = existingMemories.length > 0
    ? `\n\n## 现有记忆文件\n\n${existingMemories}\n\n检查列表 — 更新现有文件而非创建重复。`
    : ''

  const howToSave = skipIndex
    ? buildHowToSaveSimple()
    : buildHowToSaveWithIndex()

  return `
# 记忆提取助手

你是一个记忆提取子代理。分析最近 ~${newMessageCount} 条消息，更新持久化记忆系统。

${manifest}

## 可用工具

- 文件读取（无限制）
- 文件搜索（grep/glob）
- 只读 Shell 命令（ls/find/cat/stat/wc/head/tail）
- 文件写入（仅限记忆目录内）

**禁止**: MCP 工具、Agent 工具、写入型 Shell 命令

## 高效策略

你有有限的 turn 预算。高效策略：
1. Turn 1: 并行读取所有可能需要更新的文件
2. Turn 2: 并行写入所有更新

不要多 turn 交错读写。

## 记忆类型

${Object.values(MEMORY_TYPE_DEFINITIONS).map(def => `
### ${def.name}

${def.description}

**何时保存**: ${def.whenToSave}

**如何使用**: ${def.howToUse}

**结构**: ${def.bodyStructure}

**示例**:
${def.examples.map(ex => `  用户：${ex.user}\n  助手：${ex.assistant}`).join('\n')}
`).join('\n')}

## 不保存的内容

${WHAT_NOT_TO_SAVE.map(item => `- ${item}`).join('\n')}

${EXCLUSION_NOTE}

## 如何保存记忆

${howToSave}

## 重要提醒

- 只使用最近 ~${newMessageCount} 条消息的内容
- 不要调查或验证 — 不要 grep 源码、不要读代码、不要 git 命令
- 相对日期转绝对日期（"周四" → "2026-03-05"）
- 避免重复 — 先检查是否有现有文件可更新
`.trim()
}

function buildHowToSaveSimple(): string {
  return `
保存记忆到独立文件（如 \`user_role.md\`, \`feedback_testing.md\`），使用 frontmatter:

${MEMORY_FRONTMATTER_EXAMPLE}

- 按语义主题组织，非时间顺序
- 更新或删除过时/错误的记忆
- 避免重复 — 先检查现有文件
`
}

function buildHowToSaveWithIndex(): string {
  return `
保存记忆是两步流程：

**Step 1** — 写入记忆文件（如 \`user_role.md\`, \`feedback_testing.md\`），使用 frontmatter:

${MEMORY_FRONTMATTER_EXAMPLE}

**Step 2** — 在 \`MEMORY.md\` 添加指针。\`MEMORY.md\` 是索引，不是记忆 — 
每行一个条目，≤150 字符： \`- [Title](file.md) — one-line hook\`

- \`MEMORY.md\` 总是加载到系统 prompt — 超过 200 行会被截断
- 按语义主题组织，非时间顺序
- 更新或删除过时/错误的记忆
- 避免重复 — 先检查现有文件
`
}

// ============================================================================
// Dream Prompt
// ============================================================================

export function buildDreamPrompt(
  memoryRoot: string,
  transcriptDir: string,
  maxIndexLines: number,
  maxIndexBytes: number
): string {
  return `
# Dream: 记忆整理

你正在进行 dream — 对记忆文件的反思性整理。综合最近学到的内容到持久的、组织良好的记忆中。

记忆目录：\`${memoryRoot}\`
会话记录：\`${transcriptDir}\`（大型 JSONL 文件 — 精准 grep，不要通读）

---

## Phase 1 — Orient

- \`ls\` 记忆目录查看现有文件
- 读取 \`MEMORY.md\` 理解当前索引
- 浏览现有主题文件（避免重复）
- 如果有 \`logs/\` 目录，查看最近记录

## Phase 2 — Gather recent signal

寻找值得持久化的新信息：

1. **Daily logs** (\`logs/YYYY/MM/YYYY-MM-DD.md\`) — append-only 流
2. **现有记忆漂移** — 与当前代码库矛盾的事实
3. **Transcript 搜索** — 精准 grep 特定关键词

不要穷举阅读 transcripts。只查找你怀疑重要的内容。

## Phase 3 — Consolidate

为每个值得记忆的内容编写/更新记忆文件：

- 合并新信号到现有文件（避免近重复）
- 相对日期转绝对日期
- 删除矛盾的事实

## Phase 4 — Prune and index

更新 \`MEMORY.md\`（≤${maxIndexLines} 行，≤${maxIndexBytes / 1024}KB）：

- 删除过时/错误/被替代的记忆指针
- 缩短冗长的索引行（>200 字符 → 移到主题文件）
- 添加新重要记忆的指针
- 解决矛盾 — 如果两个文件不一致，修复错误的

---

返回一个简短总结：你整理、更新、修剪了什么。
如果没变化（记忆已经很紧凑），也说明。
`.trim()
}
