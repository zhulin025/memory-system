# OpenClaw Memory System

🦞 完整复刻 Claude Code 的记忆机制 —— 自动记忆提取 + Dream 定期整理

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Skill-green)](https://docs.openclaw.ai)

---

## 📖 目录

- [项目缘起](#-项目缘起)
- [核心机制](#-核心机制)
- [复刻过程](#-复刻过程)
- [快速开始](#-快速开始)
- [详细使用](#-详细使用)
- [配置选项](#-配置选项)
- [API 参考](#-api-参考)
- [最佳实践](#-最佳实践)
- [故障排查](#-故障排查)
- [贡献指南](#-贡献指南)

---

## 🌟 项目缘起

### 为什么需要记忆系统？

在使用 AI 助手的过程中，我们反复遇到同样的问题：

> ❌ **问题 1**: 每次都要重新告诉 AI「我是后端工程师，主要用 Go」  
> ❌ **问题 2**: 上次说过的偏好，下次对话又忘了  
> ❌ **问题 3**: 项目背景、决策原因，每次都要重新解释  
> ❌ **问题 4**: 重要信息散落在聊天记录里，找不到

传统的解决方案是写文档，但：
- 文档更新不及时
- AI 不会主动阅读
- 维护成本高

### Claude Code 的启示

2026 年 3 月 31 日，Claude Code 的源码通过 npm source map 意外泄露。我们深入分析了这套 512K+ 行的代码，发现其**记忆系统设计极为精妙**：

1. **4 种封闭记忆类型** — 防止记忆膨胀
2. **自动记忆提取** — 对话结束后自动分析保存
3. **Dream 定期整理** — 24 小时 +5 会话后自动整理
4. **索引与内容分离** — MEMORY.md 是指针，不是内容

这套机制让 Claude Code 能够：
- ✅ 记住用户偏好和工作方式
- ✅ 理解项目背景和决策原因
- ✅ 避免重复询问相同信息
- ✅ 保持记忆的时效性和准确性

### 我们的目标

将这套**经过验证的记忆机制**完整复刻到 OpenClaw，让每个 OpenClaw 用户都能拥有：

> 🧠 **持久记忆** — 不再重复相同信息  
> 🤖 **智能提取** — 自动识别值得保存的内容  
> 🌙 **定期整理** — Dream 机制保持记忆质量  
> 📚 **易于使用** — 开箱即用，无需配置

---

## 🧠 核心机制

### 1. 四种记忆类型（封闭分类）

我们严格限制为**4 种记忆类型**，防止记忆膨胀：

| 类型 | 用途 | 保存时机 | 示例 |
|------|------|----------|------|
| **user** | 用户角色、偏好、知识 | 学到用户信息时 | 「我是数据科学家，专注 ML」 |
| **feedback** | 工作方式指导 | 用户纠正/确认时 | 「测试不要 mock 数据库」 |
| **project** | 项目动态、决策 | 学到项目信息时 | 「周四后合并冻结」 |
| **reference** | 外部系统指针 | 学到外部资源时 | 「bug tracked in Linear」 |

#### 明确排除（不保存）

❌ 可从代码推导的架构信息  
❌ git 历史已有的变更  
❌ 调试解决方案  
❌ 临时任务状态  
❌ 已 documented 的内容

**即使明确要求也不保存** — 如果用户要求保存 PR 列表，询问什么内容是 *surprising* 或 *non-obvious* 的。

### 2. 自动记忆提取

```
对话进行中
    ↓
会话结束/达到阈值
    ↓
分析消息内容
    ↓
识别记忆信号
    ↓
检查现有记忆（去重）
    ↓
保存/更新记忆文件
    ↓
更新 MEMORY.md 索引
```

**识别信号**:
- 显式：「记住...」、「记一下...」
- 隐式：用户偏好、项目决策、反馈指导
- 助手声明：「[保存 xxx 记忆：...]」

**去重机制**:
- Levenshtein 距离匹配标题
- 类型相同 + 标题相似 → 更新而非新建

### 3. Dream 定期整理

Dream 是 Claude Code 的**核心创新** —— 定期整理记忆，保持质量。

#### 触发条件（同时满足）

```typescript
1. 时间门控：≥ 24 小时（可配置）
2. 会话门控：≥ 5 个新会话（可配置）
3. 锁机制：无其他 Dream 进程
```

#### 4 阶段流程

```
┌─────────────────────────────────────────┐
│ Phase 1: Orient（浏览现有）              │
│ - ls 记忆目录查看现有文件                │
│ - 读取 MEMORY.md 理解当前索引            │
│ - 浏览现有主题文件（避免重复）           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Phase 2: Gather（收集新信号）            │
│ - Daily logs（append-only 流）           │
│ - 现有记忆漂移（与当前状态矛盾）         │
│ - Transcript 搜索（精准 grep）           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Phase 3: Consolidate（合并更新）         │
│ - 合并新信号到现有文件                   │
│ - 相对日期转绝对日期                     │
│ - 删除矛盾的事实                         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Phase 4: Prune（修剪索引）               │
│ - 删除过时/错误/被替代的记忆指针         │
│ - 缩短冗长的索引行（>200 字符）          │
│ - 添加新重要记忆的指针                   │
│ - 解决矛盾（修复错误的）                 │
└─────────────────────────────────────────┘
```

#### 锁机制

使用文件 mtime 作为轻量级锁：

```typescript
// 获取锁
async function tryAcquireDreamLock(): Promise<boolean> {
  const lockPath = getDreamLockPath()
  const stats = await stat(lockPath)
  const hoursSince = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60)
  
  if (hoursSince < 24) {
    return false  // 锁未过期
  }
  
  await utimes(lockPath, now, now)  // 更新 mtime
  return true
}

// 失败时回滚
await rollbackConsolidationLock(priorMtime)
```

### 4. 索引管理

**MEMORY.md 约束**:
- ≤ 200 行
- ≤ 25KB
- 每行 ≤ 150 字符

**格式**:
```markdown
- [数据科学家背景](user_data_science_123.md) — 用户是数据科学家，专注 ML
- [测试不用 mock](feedback_testing_db_456.md) — 集成测试必须用真实数据库
- [合并冻结](project_freeze_789.md) — 2026-04-10 起冻结非关键合并
- [Pipeline Bug 追踪](reference_linear_012.md) — Linear 项目 INGEST
```

**索引与内容分离**:
- MEMORY.md 是指针，不是内容存储
- 详细内容在主题文件（`user_*.md`, `feedback_*.md` 等）
- 保持索引简洁，便于快速加载

---

## 🔧 复刻过程

### 技术选型

| 组件 | Claude Code | OpenClaw 实现 | 说明 |
|------|-------------|---------------|------|
| Runtime | Bun | Node.js | OpenClaw 基于 Node |
| 语言 | TypeScript | TypeScript | 保持一致 |
| 存储 | 文件系统 | 文件系统 | 简单可靠 |
| Agent | Forked Agent | 直接调用 | 简化实现 |
| 锁机制 | 文件 mtime | 文件 mtime | 完全复刻 |

### 架构对比

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                          │
├─────────────────────────────────────────────────────────┤
│  main.tsx (785KB)                                       │
│    ↓                                                    │
│  QueryEngine.ts                                         │
│    ↓                                                    │
│  extractMemories/                                       │
│    ↓                                                    │
│  runForkedAgent() ← 完美 fork，共享 prompt 缓存          │
│    ↓                                                    │
│  canUseTool (限制工具)                                   │
│    ↓                                                    │
│  写入记忆文件                                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  OpenClaw 实现                          │
├─────────────────────────────────────────────────────────┤
│  main.ts                                                │
│    ↓                                                    │
│  extractMemories()                                      │
│    ↓                                                    │
│  analyzeMessages() ← 规则匹配（可替换为 LLM）            │
│    ↓                                                    │
│  processCandidate()                                     │
│    ↓                                                    │
│  写入记忆文件                                            │
└─────────────────────────────────────────────────────────┘
```

### 核心差异

| 特性 | Claude Code | OpenClaw | 原因 |
|------|-------------|----------|------|
| Forked Agent | ✅ | ❌ | OpenClaw 无需 fork |
| LLM 分析 | ✅ | 规则匹配 | 简化实现，可升级 |
| MCP 集成 | ✅ | ❌ | 未来扩展 |
| 团队记忆 | ✅ | ❌ | 个人使用优先 |

**设计原则**:
1. **核心机制 100% 复刻** — 4 种类型、Dream、索引
2. **简化实现** — 去除复杂依赖（Forked Agent、MCP）
3. **易于扩展** — 预留 LLM 分析、MCP 集成接口

### 代码统计

```
TypeScript 文件：7 个
总代码行数：~1,370 行
文档文件：3 个
示例文件：5 个
总文件大小：~50KB
```

---

## 🚀 快速开始

### 1. 安装

```bash
# Skill 已在 OpenClaw 中
# 位置：~/.openclaw/skills/memory-system/

# 安装依赖
cd ~/.openclaw/skills/memory-system
npm install
```

### 2. 初始化

```bash
# 在当前项目初始化
openclaw run memory-system init
```

这会创建：
```
~/.openclaw/memory/projects/<project>/
├── MEMORY.md           # 索引文件
└── .dream.lock         # Dream 锁文件
```

### 3. 开始使用

**方式 1: 自动提取**

在对话中，助手会自动识别并保存记忆：

```
用户：记住，我是数据科学家，主要做机器学习
助手：[保存 user 记忆：用户是数据科学家，专注机器学习]
```

**方式 2: 手动提取**

```bash
echo '[{"role":"user","content":"记住我是后端工程师"}]' | \
  openclaw run memory-system extract
```

**方式 3: Dream 整理**

```bash
# 执行 Dream
openclaw run memory-system dream

# 检查状态
openclaw run memory-system status
```

---

## 📖 详细使用

### 记忆类型详解

#### 1. user - 用户记忆

**用途**: 用户的角色、偏好、知识

**示例**:
```yaml
---
type: user
title: "数据科学家背景"
created: 2026-04-04T10:00:00Z
updated: 2026-04-04T10:00:00Z
tags: [role, ml]
---

用户是数据科学家，主要做机器学习和数据分析。
解释技术概念时可以用统计/ML 类比。
用户偏好简洁的技术讨论，不喜欢过多的理论铺垫。
```

**何时保存**:
- 用户提到自己的角色/背景
- 用户表达偏好（「我喜欢...」、「我习惯...」）
- 用户分享知识/技能

**如何使用**:
- 调整解释方式适应用户背景
- 用用户熟悉的领域做类比
- 避免用户不喜欢的沟通方式

#### 2. feedback - 反馈记忆

**用途**: 用户给出的工作方式指导

**示例**:
```yaml
---
type: feedback
title: "测试不用 mock"
created: 2026-04-04T10:00:00Z
updated: 2026-04-04T10:00:00Z
tags: [testing, database]
---

## 规则

集成测试必须直接连接真实数据库，不允许 mock。

## Why

上季度 mock 测试通过但生产迁移失败，因为 mock 和实际 DB 行为不一致。
具体是：mock 的 SQL 返回结果没有考虑字符集转换，导致生产环境出现乱码。

## How to apply

1. 所有后端服务的集成测试必须使用 testcontainers 启动真实数据库实例
2. 单元测试可以用 mock，但涉及数据库交互的必须用真实 DB
3. CI 流程中已经配置了 testcontainers，无需额外设置

## 例外情况

- 纯业务逻辑的单元测试可以用 mock
- 性能测试可以用简化的数据模型
```

**何时保存**:
- 用户纠正你的方法（「不要这样」、「停止 X」）
- 用户确认非显而易见的方法有效（「对，就是这样」）
- 包含 *why* 以便判断边界情况

**如何使用**:
- 避免重复相同的错误
- 保持工作方式的一致性
- 理解用户的深层偏好（通过 why）

#### 3. project - 项目记忆

**用途**: 项目动态、目标、决策

**示例**:
```yaml
---
type: project
title: "合并冻结"
created: 2026-04-04T10:00:00Z
updated: 2026-04-04T10:00:00Z
tags: [release, freeze]
---

## 决策

2026-04-10 起冻结非关键合并，直到 2026-04-20。

## Why

移动团队在 cutting v2.0 release branch，需要代码稳定。
这次发布是季度性大版本，包含多个 breaking changes。

## How to apply

1. 标记所有非紧急 PR 为 post-release
2. 只允许 critical bug fix 和 security patch
3. 新功能开发继续在 feature branch 进行，但不合并到 main

## 时间线

- 2026-04-10: 开始冻结
- 2026-04-15: release candidate 1
- 2026-04-18: release candidate 2 (如有必要)
- 2026-04-20: 正式发布，解冻

## 联系人

- Release Manager: @alice
- Mobile Team Lead: @bob
```

**何时保存**:
- 学到谁在做什么、为什么、何时完成
- 项目决策和背景
- **相对日期转绝对日期**（「周四」→「2026-04-10」）

**如何使用**:
- 理解用户请求的背景
- 预判协调问题
- 提供符合项目目标的建议

#### 4. reference - 参考记忆

**用途**: 外部系统指针

**示例**:
```yaml
---
type: reference
title: "Pipeline Bug 追踪"
created: 2026-04-04T10:00:00Z
updated: 2026-04-04T10:00:00Z
tags: [linear, tracking]
---

## Pipeline Bug 追踪

Pipeline 相关的 bug 统一记录在 Linear 项目 "INGEST"。

**URL**: https://linear.app/company/INGEST

## 用途

- 所有数据 pipeline 相关的 bug
- ETL 作业失败
- 数据质量问题

## 其他系统

| 系统 | 用途 | URL |
|------|------|-----|
| Grafana | 监控看板 | grafana.internal/d/pipeline |
| PagerDuty | 告警 | company.pagerduty.com |
| Slack | 讨论 | #pipeline-alerts |

## 值班安排

- 周一 ~ 周五：@oncall-person
- 周末：轮值（见 Linear 项目 "ONCALL"）
```

**何时保存**:
- 学到外部系统资源及其用途
- URL、项目名、频道名

**如何使用**:
- 当用户提到外部系统时
- 快速定位相关信息

### CLI 命令详解

#### init - 初始化

```bash
openclaw run memory-system init
```

**作用**:
- 创建记忆目录
- 初始化 MEMORY.md
- 创建.dream.lock 文件

**输出**:
```
[MemorySystem] 初始化完成，项目：/Users/zhulin/my-project
✓ 记忆系统初始化完成
```

#### extract - 提取记忆

```bash
# 从 stdin 读取
echo '[{"role":"user","content":"记住我是后端工程师"}]' | \
  openclaw run memory-system extract

# 输出
✓ 提取完成：保存 1 个，更新 0 个
```

**输入格式**:
```json
[
  {
    "role": "user",
    "content": "记住我是后端工程师",
    "timestamp": "2026-04-04T10:00:00Z"
  },
  {
    "role": "assistant",
    "content": "[保存 user 记忆：用户是后端工程师]",
    "timestamp": "2026-04-04T10:00:01Z"
  }
]
```

#### dream - Dream 整理

```bash
openclaw run memory-system dream

# 输出
[MemorySystem] 开始 Dream 整理...
[MemorySystem] Dream 完成：整理 12 个记忆，修剪 2 个
✓ Dream 完成：整理 12 个，修剪 2 个
```

**触发条件**:
- 距离上次 Dream ≥ 24 小时
- 新增会话 ≥ 5 个
- 无其他 Dream 进程

#### status - 检查状态

```bash
openclaw run memory-system status

# 输出
距离上次 Dream: 26.3 小时
应该触发：是
```

**输出字段**:
- `hoursSinceLastDream`: 距离上次 Dream 的小时数
- `shouldTrigger`: 是否应该触发
- `reason`: 原因（如果未触发）

#### list - 列出记忆

```bash
openclaw run memory-system list

# 输出
记忆列表 (12 个):
  - [user] 数据科学家背景 — 用户是数据科学家，专注 ML
  - [feedback] 测试不用 mock — 集成测试必须用真实数据库
  - [project] 合并冻结 — 2026-04-10 起冻结非关键合并
  - [reference] Pipeline Bug 追踪 — Linear 项目 INGEST
```

---

## ⚙️ 配置选项

### 环境变量

```bash
# 自定义记忆目录
export OPENCLAW_MEMORY_PATH=/path/to/memory

# 禁用自动提取
export OPENCLAW_MEMORY_AUTO_EXTRACT=false

# 禁用 Dream
export OPENCLAW_MEMORY_DREAM=false
```

### 配置文件

在 `~/.openclaw/config.json` 中：

```json
{
  "memory": {
    "autoExtractEnabled": true,      // 是否启用自动提取
    "extractTurnInterval": 1,        // 每 N 个 turn 提取一次
    "dreamEnabled": true,            // 是否启用 Dream
    "dreamMinHours": 24,             // Dream 时间门控（小时）
    "dreamMinSessions": 5,           // Dream 会话门控（会话数）
    "maxIndexLines": 200,            // MEMORY.md 最大行数
    "maxIndexBytes": 25000,          // MEMORY.md 最大字节数
    "maxOneLineChars": 150           // 索引行最大字符数
  }
}
```

### 编程配置

```typescript
import { configure } from '~/.openclaw/skills/memory-system/src/main.js'

configure({
  autoExtractEnabled: true,
  extractTurnInterval: 1,
  dreamEnabled: true,
  dreamMinHours: 12,      // 12 小时触发 Dream
  dreamMinSessions: 3,    // 3 个会话触发
  maxIndexLines: 200,
  maxIndexBytes: 25000,
  maxOneLineChars: 150
})
```

---

## 🔌 API 参考

### 初始化

```typescript
import { init, configure } from './main.js'

// 初始化（自动检测项目 ID）
init()

// 指定项目 ID
init('/path/to/project')

// 配置
configure({
  dreamMinHours: 12
})
```

### 记忆提取

```typescript
import { extract } from './main.js'

const messages = [
  { role: 'user', content: '记住我是后端工程师' },
  { role: 'assistant', content: '[保存 user 记忆：用户是后端工程师]' }
]

const result = await extract(messages)

// result: {
//   memoriesSaved: 1,
//   memoriesUpdated: 0,
//   memoriesDeleted: 0,
//   indexUpdated: true,
//   filesWritten: ['/path/to/memory/user_backend_engineer_123.md']
// }
```

### Dream 整理

```typescript
import { dream, checkDreamStatus } from './main.js'

// 执行 Dream
const result = await dream()

// result: {
//   memoriesConsolidated: 12,
//   memoriesPruned: 2,
//   indexUpdated: true,
//   filesTouched: ['user_xxx.md', 'feedback_xxx.md', ...]
// }

// 检查状态
const status = await checkDreamStatus()

// status: {
//   hoursSinceLastDream: 26.3,
//   shouldTrigger: true,
//   reason?: '...'
// }
```

### 记忆管理

```typescript
import { listMemories, addMemory, removeMemory } from './main.js'

// 列出记忆
const memories = await listMemories()

// 添加记忆索引
await addMemory(
  '测试不用 mock',      // title
  'feedback_testing.md', // file
  'feedback',           // type
  '集成测试必须用真实数据库' // oneLine
)

// 移除记忆索引
await removeMemory('feedback_testing.md')
```

---

## 📋 最佳实践

### 1. 记忆质量

✅ **应该保存**:
- 用户明确要求的记忆
- 非显而易见的工作方式
- 项目决策和背景
- 外部系统指针

❌ **不应该保存**:
- 可从代码推导的架构
- git 历史已有的变更
- 临时任务状态
- 已 documented 的内容

### 2. 索引维护

- 保持每行 ≤150 字符
- 总行数 ≤200 行
- 定期 Dream 修剪过时记忆
- 相对日期转绝对日期

### 3. 文件命名

```
<type>_<slug>_<timestamp>.md

示例:
- user_data_science_1712203200000.md
- feedback_testing_db_1712203300000.md
- project_freeze_1712203400000.md
- reference_linear_1712203500000.md
```

### 4. Frontmatter 规范

```yaml
---
type: feedback              # 必需
title: "简短标题"            # 必需
created: 2026-04-04T10:00:00Z  # 必需
updated: 2026-04-04T10:00:00Z  # 必需
tags: [testing, database]  # 可选
scope: private             # 可选（保留未来扩展）
---
```

### 5. 内容结构

**feedback 类型**:
```markdown
## 规则

[规则本身]

## Why

[原因 — 过去的事件或偏好]

## How to apply

[适用场景和具体做法]

## 例外情况

[可选]
```

**project 类型**:
```markdown
## 决策

[事实或决策]

## Why

[动机 — 约束、截止日期]

## How to apply

[如何影响建议]

## 时间线

[可选]
```

---

## 🐛 故障排查

### 记忆未保存

**检查清单**:
1. `autoExtractEnabled` 是否为 `true`
2. 消息格式是否正确
3. 查看日志输出

**解决方案**:
```bash
# 检查配置
openclaw run memory-system status

# 手动提取
echo '[{"role":"user","content":"..."}]' | \
  openclaw run memory-system extract
```

### Dream 未触发

**检查清单**:
1. 距离上次 Dream 是否 ≥ 24 小时
2. 新增会话是否 ≥ 5 个
3. 锁文件是否存在

**解决方案**:
```bash
# 检查状态
openclaw run memory-system status

# 查看锁文件
ls -l ~/.openclaw/memory/projects/<project>/.dream.lock

# 手动触发
openclaw run memory-system dream

# 删除锁文件（谨慎）
rm ~/.openclaw/memory/projects/<project>/.dream.lock
```

### 索引过长

**症状**:
```
⚠️ MEMORY.md 是 250 行 (限制：200)。只加载了部分内容。
```

**解决方案**:
```bash
# 执行 Dream（自动修剪）
openclaw run memory-system dream

# 手动编辑
nano ~/.openclaw/memory/projects/<project>/MEMORY.md

# 删除过时条目
# 缩短冗长行（>200 字符）
```

### 路径错误

**症状**:
```
Error: Invalid memory path
```

**解决方案**:
```bash
# 检查环境变量
echo $OPENCLAW_MEMORY_PATH

# 确保是绝对路径
export OPENCLAW_MEMORY_PATH=/absolute/path/to/memory

# 检查权限
ls -la ~/.openclaw/memory/
```

---

## 🤝 贡献指南

### 开发环境

```bash
# 克隆仓库
git clone https://github.com/your-org/openclaw-memory-system.git
cd openclaw-memory-system

# 安装依赖
npm install

# 运行测试
npm test

# 构建
npm run build
```

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 编写单元测试
- 更新文档

### 提交 PR

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

### 报告问题

请在 GitHub Issues 中报告问题，包含：
- 问题描述
- 复现步骤
- 预期行为
- 实际行为
- 环境信息（Node 版本、OpenClaw 版本）

---

## 📚 参考资料

- [Claude Code 源码分析](https://github.com/anthropics/claude-code-leak)
- [Claude Code 记忆系统深度分析](./docs/MEMORY_SYSTEM_ANALYSIS.md)
- [OpenClaw 文档](https://docs.openclaw.ai)
- [Model Context Protocol](https://modelcontextprotocol.io)

---

## 📄 许可

MIT License — 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- **Anthropic** — Claude Code 的灵感来源
- **OpenClaw Community** — 支持和反馈
- **Contributors** — 代码贡献者

---

<div align="center">

**Made with ❤️ by OpenClaw Community**

[📖 文档](#-目录) | [🐛 问题](https://github.com/your-org/openclaw-memory-system/issues) | [💬 讨论](https://github.com/your-org/openclaw-memory-system/discussions)

</div>
