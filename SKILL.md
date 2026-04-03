# OpenClaw 记忆系统 Skill

🦞 完整复刻 Claude Code 的记忆机制，包括自动记忆提取和 Dream 定期整理。

---

## 📦 安装

```bash
# 克隆或复制到技能目录
cp -r ~/.openclaw/skills/memory-system ~/.openclaw/skills/my-memory

# 安装依赖
cd ~/.openclaw/skills/my-memory
npm install
```

---

## 🚀 快速开始

### 1. 初始化

```bash
# 在项目中初始化
openclaw run memory-system init
```

这会在 `~/.openclaw/memory/projects/<project>/` 创建记忆目录。

### 2. 自动记忆提取

在对话中，助手会自动识别并保存记忆：

**用户**: "记住，我是数据科学家，主要做机器学习"  
**助手**: "[保存 user 记忆：用户是数据科学家，专注机器学习]"

**用户**: "测试不要 mock 数据库，我们吃过亏"  
**助手**: "[保存 feedback 记忆：测试必须用真实数据库]"

### 3. Dream 整理

Dream 会自动触发（24 小时 + 5 个会话后），也可以手动执行：

```bash
openclaw run memory-system dream
```

---

## 📖 命令

| 命令 | 描述 |
|------|------|
| `init` | 初始化记忆系统 |
| `extract` | 从对话提取记忆 |
| `dream` | 执行 Dream 整理 |
| `status` | 检查 Dream 状态 |
| `list` | 列出所有记忆 |
| `help` | 显示帮助 |

---

## 🏷️ 记忆类型

### 1. user - 用户记忆

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
```

### 2. feedback - 反馈记忆

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

## How to apply

所有后端服务的集成测试必须使用 testcontainers 启动真实数据库实例。
```

### 3. project - 项目记忆

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

2026-04-10 起冻结非关键合并。

## Why

移动团队在 cutting release branch，需要稳定。

## How to apply

标记所有非紧急 PR 为 post-release，只允许 critical bug fix。
```

### 4. reference - 参考记忆

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

Pipeline 相关的 bug 统一记录在 Linear 项目 "INGEST"。
URL: https://linear.app/company/INGEST
```

---

## ⚙️ 配置

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
    "autoExtractEnabled": true,
    "extractTurnInterval": 1,
    "dreamEnabled": true,
    "dreamMinHours": 24,
    "dreamMinSessions": 5,
    "maxIndexLines": 200,
    "maxIndexBytes": 25000
  }
}
```

---

## 📁 目录结构

```
~/.openclaw/memory/projects/<project>/
├── MEMORY.md              # 索引（≤200 行）
├── user_xxx.md            # 用户记忆
├── feedback_xxx.md        # 反馈记忆
├── project_xxx.md         # 项目记忆
├── reference_xxx.md       # 参考记忆
└── .dream.lock            # Dream 锁文件
```

### MEMORY.md 格式

```markdown
- [数据科学家背景](user_data_science_123.md) — 用户是数据科学家，专注 ML
- [测试不用 mock](feedback_testing_db_456.md) — 集成测试必须用真实数据库
- [合并冻结](project_freeze_789.md) — 2026-04-10 起冻结非关键合并
- [Pipeline Bug 追踪](reference_linear_012.md) — Linear 项目 INGEST
```

---

## 🔧 编程接口

### TypeScript

```typescript
import { 
  init, 
  extract, 
  dream, 
  listMemories,
  configure 
} from '~/.openclaw/skills/memory-system/src/main.js'

// 初始化
init()

// 配置
configure({
  dreamMinHours: 12,  // 12 小时触发 Dream
  dreamMinSessions: 3  // 3 个会话触发
})

// 提取记忆
const messages = [
  { role: 'user', content: '记住我是后端工程师' },
  { role: 'assistant', content: '[保存 user 记忆：用户是后端工程师]' }
]
const result = await extract(messages)

// Dream 整理
const dreamResult = await dream()

// 列出记忆
const memories = await listMemories()
```

### Shell

```bash
# 提取记忆
echo '[{"role":"user","content":"记住..."}]' | \
  openclaw run memory-system extract

# Dream
openclaw run memory-system dream

# 状态
openclaw run memory-system status
```

---

## 🌙 Dream 机制

### 触发条件

Dream 在以下条件**同时满足**时触发：

1. **时间门控**: 距离上次 Dream ≥ 24 小时
2. **会话门控**: 新增会话 ≥ 5 个
3. **锁机制**: 无其他 Dream 进程运行

### 4 阶段流程

```
Phase 1: Orient     → 浏览现有记忆
Phase 2: Gather     → 收集新信号
Phase 3: Consolidate → 合并/更新记忆
Phase 4: Prune      → 修剪索引
```

### 手动触发

```bash
# 立即执行 Dream
openclaw run memory-system dream

# 检查是否应该触发
openclaw run memory-system status
```

---

## 🎯 最佳实践

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

### 3. 文件命名

```
<type>_<slug>_<timestamp>.md

示例:
- user_data_science_1712203200000.md
- feedback_testing_db_1712203300000.md
```

---

## 🐛 故障排查

### 记忆未保存

1. 检查 `autoExtractEnabled` 配置
2. 确认消息格式正确
3. 查看日志输出

### Dream 未触发

```bash
# 检查状态
openclaw run memory-system status

# 查看锁文件
ls -l ~/.openclaw/memory/projects/<project>/.dream.lock

# 手动触发
openclaw run memory-system dream
```

### 索引过长

Dream 会自动修剪，也可以手动：

```bash
# 编辑 MEMORY.md
nano ~/.openclaw/memory/projects/<project>/MEMORY.md

# 删除过时条目
```

---

## 📚 参考资料

- [Claude Code 记忆系统分析](https://github.com/anthropics/claude-code-leak)
- [OpenClaw 文档](https://docs.openclaw.ai)

---

**版本**: 1.0.0  
**作者**: OpenClaw Community  
**许可**: MIT
