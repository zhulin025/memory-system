# OpenClaw 记忆系统 - 未来扩展路线图

**版本**: v1.0.0 (当前)  
**规划版本**: v1.1.0 → v1.2.0 → v2.0.0  
**最后更新**: 2026-04-04

---

## 📋 总览

| 扩展 | 优先级 | 预计工作量 | 目标版本 |
|------|--------|------------|----------|
| LLM 分析支持 | ⭐⭐⭐ 高 | 2-3 天 | v1.1.0 |
| 飞书消息集成 | ⭐⭐⭐ 高 | 3-4 天 | v1.1.0 |
| MCP 协议支持 | ⭐⭐ 中 | 4-5 天 | v1.2.0 |
| Web UI 可视化 | ⭐⭐ 中 | 5-7 天 | v1.2.0 |

---

## 1️⃣ LLM 分析支持（替代规则匹配）

### 当前状态

**v1.0.0 实现**: 使用规则匹配识别记忆信号

```typescript
// 当前实现 - 简单正则匹配
const memorySignals = [
  /记住 [,：]\s*(.+)/i,
  /记一下 [,：]\s*(.+)/i,
  /保存.*记忆/i,
  /别忘了 (.+)/i,
]

for (const signal of memorySignals) {
  const match = message.content.match(signal)
  if (match) {
    // 提取记忆内容
  }
}
```

**局限性**:
- ❌ 只能识别明确的记忆信号
- ❌ 无法理解上下文语义
- ❌ 无法判断信息是否值得保存
- ❌ 无法自动分类记忆类型（靠硬编码规则）

### 扩展方案

**v1.1.0 目标**: 使用 LLM 分析消息，智能识别记忆

```typescript
// 未来实现 - LLM 分析
import { analyzeForMemories } from './llmAnalyzer.js'

const result = await analyzeForMemories(messages, {
  model: 'claude-sonnet-4-5-20250929',
  threshold: 0.7,  // 置信度阈值
  maxMemories: 5   // 每次最多提取 5 个记忆
})

// 返回结构化的记忆候选
// {
//   memories: [
//     {
//       type: 'user',
//       title: '数据科学家背景',
//       content: '用户是数据科学家...',
//       confidence: 0.92,
//       reason: '用户明确描述了职业背景和专业领域'
//     }
//   ]
// }
```

### 具体功能

#### 1. 语义理解

```typescript
// 示例：识别隐式记忆信号

// 用户说：
"我在这家公司主要负责后端架构，团队有 20 个人"

// 规则匹配：❌ 无法识别（没有"记住"等关键词）
// LLM 分析：✅ 识别为 user 类型记忆
// - 职业：后端架构
// - 团队规模：20 人
// - 置信度：0.88
```

#### 2. 智能分类

```typescript
// 用户说：
"我们决定用 Kubernetes 而不是 Docker Swarm，因为 K8s 生态更好"

// LLM 分析：
{
  type: 'feedback',  // 技术选型决策
  title: '容器编排选择 K8s',
  content: '使用 Kubernetes 而非 Docker Swarm',
  why: 'K8s 生态系统更好',
  confidence: 0.91
}
```

#### 3. 去重判断

```typescript
// 检查新记忆是否与现有记忆重复
const isDuplicate = await llm.checkDuplicate(
  newMemory,
  existingMemories,
  { threshold: 0.85 }
)

// LLM 理解语义相似性，而非简单的字符串匹配
// "测试不用 mock" ≈ "集成测试必须用真实数据库"
```

#### 4. 质量评估

```typescript
// 判断信息是否值得保存
const shouldSave = await llm.evaluateImportance(content, {
  criteria: [
    'non-obvious',      // 非显而易见
    'actionable',       // 可指导行动
    'persistent',       // 持久性（非临时状态）
    'not-derivable'     // 无法从其他来源推导
  ]
})

// 示例评估：
// "我是后端工程师" → ✅ 值得保存（持久、非显而易见）
// "今天天气不错" → ❌ 不保存（临时、无关）
// "项目用 Go 语言" → ✅ 值得保存（持久、指导行动）
```

### 实现步骤

```typescript
// 1. 创建 LLM 分析器
class MemoryLLMAnalyzer {
  private model: string
  private apiKey: string
  
  async analyze(messages: Message[]): Promise<MemoryCandidate[]> {
    const prompt = this.buildPrompt(messages)
    const response = await this.callLLM(prompt)
    return this.parseResponse(response)
  }
  
  private buildPrompt(messages: Message[]): string {
    return `
分析以下对话，提取值得保存的记忆。

记忆类型:
- user: 用户角色、偏好、知识
- feedback: 工作方式指导
- project: 项目动态、决策
- reference: 外部系统指针

排除:
- 可从代码推导的信息
- 临时状态
- 已 documented 的内容

返回 JSON 格式:
{
  "memories": [
    {
      "type": "user|feedback|project|reference",
      "title": "简短标题",
      "content": "详细内容",
      "confidence": 0.0-1.0,
      "reason": "为什么值得保存"
    }
  ]
}

对话内容:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
`
  }
}

// 2. 集成到提取器
export async function extractMemories(
  messages: MemoryMessage[],
  options: { useLLM?: boolean } = {}
): Promise<ExtractResult> {
  if (options.useLLM) {
    const analyzer = new MemoryLLMAnalyzer()
    const candidates = await analyzer.analyze(messages)
    // 处理候选记忆...
  } else {
    // 使用规则匹配（向后兼容）
    const candidates = await analyzeWithRules(messages)
  }
}
```

### 配置选项

```typescript
// config.json
{
  "memory": {
    "llm": {
      "enabled": true,
      "provider": "anthropic",  // anthropic|openai|qwen
      "model": "claude-sonnet-4-5-20250929",
      "threshold": 0.7,         // 置信度阈值
      "maxMemories": 5,         // 每次最多提取数
      "apiKey": "${env:ANTHROPIC_API_KEY}"
    }
  }
}
```

### 成本估算

按每天 10 次提取，每次分析 20 条消息：
- Token 用量：~2,000 tokens/次
- 日用量：20,000 tokens
- 月用量：600,000 tokens
- 成本：~$0.6/月（Claude Sonnet）

---

## 2️⃣ 飞书消息集成

### 当前状态

**v1.0.0**: 独立 CLI 工具，需要手动调用

```bash
# 手动运行
echo '[{"role":"user","content":"..."}]' | \
  openclaw run memory-system extract
```

### 扩展方案

**v1.1.0 目标**: 自动监听飞书消息，实时提取记忆

### 具体功能

#### 1. 飞书 IM 消息监听

```typescript
// 监听飞书私聊和群聊消息
import { feishu_im_user_get_messages } from '@openclaw/feishu'

class FeishuMemoryListener {
  private userId: string
  private chatIds: string[]
  private lastMessageId: string
  
  async startListening(): Promise<void> {
    // 定时拉取消息
    setInterval(() => this.pollMessages(), 5000)
  }
  
  private async pollMessages(): Promise<void> {
    // 获取私聊消息
    const dmMessages = await feishu_im_user_get_messages({
      open_id: this.userId,
      page_size: 50
    })
    
    // 获取群聊消息
    for (const chatId of this.chatIds) {
      const chatMessages = await feishu_im_user_get_messages({
        chat_id: chatId,
        page_size: 50
      })
      this.processMessages(chatMessages)
    }
  }
  
  private async processMessages(messages: FeishuMessage[]): Promise<void> {
    // 过滤新消息
    const newMessages = messages.filter(m => m.message_id !== this.lastMessageId)
    
    // 转换为统一格式
    const normalized = newMessages.map(m => ({
      role: m.sender_id === this.userId ? 'assistant' : 'user',
      content: m.content.text,
      timestamp: m.create_time,
      messageId: m.message_id
    }))
    
    // 提取记忆
    if (normalized.length > 0) {
      await extractMemories(normalized)
    }
    
    this.lastMessageId = newMessages[0]?.message_id
  }
}
```

#### 2. 飞书日历事件集成

```typescript
// 从日历事件提取项目记忆
import { feishu_calendar_event } from '@openclaw/feishu'

async function extractFromCalendar(): Promise<void> {
  // 获取今天的日程
  const events = await feishu_calendar_event({
    action: 'list',
    start_time: '2026-04-04T00:00:00+08:00',
    end_time: '2026-04-04T23:59:59+08:00'
  })
  
  for (const event of events) {
    // 提取项目相关信息
    const projectInfo = {
      title: event.summary,
      attendees: event.attendees,
      time: event.start_time,
      description: event.description
    }
    
    // 保存为 project 类型记忆
    await saveMemory({
      type: 'project',
      title: `日程：${event.summary}`,
      content: JSON.stringify(projectInfo, null, 2),
      tags: ['calendar', 'meeting']
    })
  }
}
```

#### 3. 飞书任务集成

```typescript
// 从飞书任务提取项目记忆
import { feishu_task_task } from '@openclaw/feishu'

async function extractFromTasks(): Promise<void> {
  // 获取我的任务
  const tasks = await feishu_task_task({
    action: 'list',
    page_size: 50
  })
  
  for (const task of tasks) {
    // 提取任务信息
    const taskInfo = {
      title: task.summary,
      description: task.description,
      due_date: task.due?.timestamp,
      members: task.members,
      status: task.completed ? 'completed' : 'pending'
    }
    
    // 保存为 project 类型记忆
    await saveMemory({
      type: 'project',
      title: `任务：${task.summary}`,
      content: JSON.stringify(taskInfo, null, 2),
      tags: ['task', 'todo']
    })
  }
}
```

#### 4. 飞书多维表格集成

```typescript
// 从多维表格同步参考记忆
import { feishu_bitable_app_table_record } from '@openclaw/feishu'

async function syncFromBitable(appToken: string, tableId: string): Promise<void> {
  // 读取多维表格记录
  const records = await feishu_bitable_app_table_record({
    action: 'list',
    app_token: appToken,
    table_id: tableId
  })
  
  for (const record of records) {
    // 假设表格结构：名称 | 类型 | URL | 描述
    const reference = {
      name: record.fields['名称'],
      type: record.fields['类型'],
      url: record.fields['URL'],
      description: record.fields['描述']
    }
    
    // 保存为 reference 类型记忆
    await saveMemory({
      type: 'reference',
      title: reference.name,
      content: JSON.stringify(reference, null, 2),
      tags: ['bitable', 'reference']
    })
  }
}
```

### 配置选项

```typescript
// config.json
{
  "memory": {
    "feishu": {
      "enabled": true,
      "pollInterval": 5000,        // 消息轮询间隔（毫秒）
      "listenChats": ["oc_xxx"],   // 监听的群聊 ID 列表
      "listenUsers": ["ou_xxx"],   // 监听的用户 ID 列表
      "calendar": {
        "enabled": true,
        "extractFromEvents": true
      },
      "tasks": {
        "enabled": true,
        "extractFromTasks": true
      },
      "bitable": {
        "enabled": false,
        "tables": [
          {
            "appToken": "bascnxxx",
            "tableId": "tblxxx",
            "name": "外部资源"
          }
        ]
      }
    }
  }
}
```

### 隐私和安全

```typescript
// 敏感信息过滤
class PrivacyFilter {
  private sensitivePatterns = [
    /密码 [：:]\s*\S+/i,
    /token[：:]\s*\S+/i,
    /secret[：:]\s*\S+/i,
    /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/,  // 信用卡号
  ]
  
  filter(content: string): string {
    let filtered = content
    for (const pattern of this.sensitivePatterns) {
      filtered = filtered.replace(pattern, '[已过滤]')
    }
    return filtered
  }
}

// 使用
const filtered = new PrivacyFilter().filter(message.content)
if (filtered !== message.content) {
  console.log('[Privacy] 过滤敏感信息，不保存记忆')
  return  // 不保存包含敏感信息的记忆
}
```

---

## 3️⃣ MCP 协议支持

### 当前状态

**v1.0.0**: 无 MCP 支持，独立运行

### 扩展方案

**v1.2.0 目标**: 通过 MCP 协议暴露记忆服务，供其他 AI 工具使用

### 具体功能

#### 1. MCP Server 实现

```typescript
// mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { MemorySystem } from './main.js'

const server = new Server({
  name: 'openclaw-memory',
  version: '1.2.0'
}, {
  capabilities: {
    resources: {},
    tools: {}
  }
})

// 定义资源（记忆文件）
server.setRequestHandler('resources/list', async () => {
  const memories = await MemorySystem.listMemories()
  return {
    resources: memories.map(mem => ({
      uri: `memory://${mem.type}/${mem.file}`,
      name: mem.title,
      description: mem.oneLine,
      mimeType: 'text/markdown'
    }))
  }
})

// 读取记忆内容
server.setRequestHandler('resources/read', async (request) => {
  const uri = new URL(request.params.uri)
  const memory = await MemorySystem.readMemory(uri.pathname)
  return {
    contents: [{
      uri: request.params.uri,
      mimeType: 'text/markdown',
      text: memory.content
    }]
  }
})

// 定义工具
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'save_memory',
        description: '保存一条记忆',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['user', 'feedback', 'project', 'reference'] },
            title: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } }
          },
          required: ['type', 'title', 'content']
        }
      },
      {
        name: 'search_memories',
        description: '搜索记忆',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            type: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } }
          }
        }
      },
      {
        name: 'run_dream',
        description: '执行 Dream 整理',
        inputSchema: {
          type: 'object',
          properties: {
            force: { type: 'boolean' }
          }
        }
      }
    ]
  }
})

// 执行工具
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params
  
  switch (name) {
    case 'save_memory':
      await MemorySystem.saveMemory(args)
      return { content: [{ type: 'text', text: '记忆已保存' }] }
    
    case 'search_memories':
      const results = await MemorySystem.searchMemories(args)
      return { content: [{ type: 'text', text: JSON.stringify(results) }] }
    
    case 'run_dream':
      await MemorySystem.dream({ force: args?.force })
      return { content: [{ type: 'text', text: 'Dream 整理完成' }] }
  }
})

server.connect()
```

#### 2. 跨工具集成

```typescript
// Claude Code 可以通过 MCP 调用记忆系统
// claude-code-config.json
{
  "mcpServers": {
    "openclaw-memory": {
      "command": "node",
      "args": ["/path/to/memory-system/dist/mcp-server.js"]
    }
  }
}

// Claude Code 中可以调用：
// - 读取记忆：resource://memory://user/profile.md
// - 保存记忆：tool:save_memory({type: 'user', title: '...', content: '...'})
// - 搜索记忆：tool:search_memories({query: '数据库测试'})
```

#### 3. 记忆同步

```typescript
// 多个 AI 工具共享记忆
class MemorySync {
  private mcpClients: MCPConnection[]
  
  async broadcast(memory: Memory): Promise<void> {
    // 通知所有连接的客户端
    for (const client of this.mcpClients) {
      await client.notify('memory/updated', { memory })
    }
  }
  
  async syncFromRemote(): Promise<void> {
    // 从远程同步记忆
    const remoteMemories = await this.fetchFromCloud()
    const localMemories = await MemorySystem.listMemories()
    
    // 合并（远程优先）
    const merged = this.mergeMemories(localMemories, remoteMemories)
    await MemorySystem.bulkUpdate(merged)
  }
}
```

### MCP 工具列表

| 工具名 | 描述 | 输入参数 |
|--------|------|----------|
| `save_memory` | 保存记忆 | type, title, content, tags |
| `update_memory` | 更新记忆 | file, content |
| `delete_memory` | 删除记忆 | file |
| `search_memories` | 搜索记忆 | query, type, tags |
| `list_memories` | 列出所有记忆 | type?, limit? |
| `read_memory` | 读取记忆内容 | file |
| `run_dream` | 执行 Dream 整理 | force? |
| `get_status` | 获取系统状态 | - |

### MCP 资源列表

| 资源 URI | 描述 |
|----------|------|
| `memory://index` | MEMORY.md 索引 |
| `memory://user/*` | 所有 user 类型记忆 |
| `memory://feedback/*` | 所有 feedback 类型记忆 |
| `memory://project/*` | 所有 project 类型记忆 |
| `memory://reference/*` | 所有 reference 类型记忆 |
| `memory://<type>/<file>` | 单个记忆文件 |

---

## 4️⃣ Web UI 可视化

### 当前状态

**v1.0.0**: 无 UI，只能通过 CLI 和代码访问

### 扩展方案

**v1.2.0 目标**: 提供 Web 界面，可视化管理记忆

### 技术栈

```
前端:
- React + TypeScript
- Tailwind CSS
- React Query（数据获取）
- Monaco Editor（记忆编辑）

后端:
- Express.js
- WebSocket（实时更新）
- 调用 memory-system API

部署:
- 本地运行（默认）
- 可选 Docker 容器
```

### 具体功能

#### 1. 记忆列表视图

```typescript
// 功能：
- 按类型筛选（user/feedback/project/reference）
- 按标签筛选
- 搜索框（全文搜索）
- 排序（创建时间/更新时间/标题）
- 分页

// UI 组件：
<MemoryList>
  <FilterBar 
    types={['user', 'feedback', 'project', 'reference']}
    tags={['testing', 'database', 'release']}
    searchQuery={searchQuery}
  />
  <MemoryGrid>
    {memories.map(memory => (
      <MemoryCard 
        key={memory.file}
        memory={memory}
        onClick={() => navigate(`/memory/${memory.file}`)}
      />
    ))}
  </MemoryGrid>
  <Pagination 
    currentPage={page} 
    totalPages={totalPages} 
  />
</MemoryList>
```

#### 2. 记忆编辑视图

```typescript
// 功能：
- Markdown 编辑器（支持 frontmatter）
- 实时预览
- 标签管理
- 版本历史（可选）
- 删除确认

// UI 组件：
<MemoryEditor file={file}>
  <FrontmatterEditor 
    value={frontmatter}
    onChange={setFrontmatter}
    fields={['type', 'title', 'tags']}
  />
  <SplitPane>
    <MonacoEditor 
      value={content}
      onChange={setContent}
      language="markdown"
    />
    <MarkdownPreview content={content} />
  </SplitPane>
  <ActionButtons>
    <SaveButton onClick={handleSave} />
    <DeleteButton onClick={handleDelete} />
  </ActionButtons>
</MemoryEditor>
```

#### 3. Dream 状态视图

```typescript
// 功能：
- 显示上次 Dream 时间
- 显示触发条件状态
- 手动触发 Dream
- Dream 历史记录

// UI 组件：
<DreamStatus>
  <StatusCard>
    <h3>上次 Dream</h3>
    <p>{formatDistance(lastDreamTime)}</p>
    <p>{hoursSince.toFixed(1)} 小时前</p>
  </StatusCard>
  
  <TriggerConditions>
    <Condition 
      name="时间门控" 
      met={hoursSince >= 24}
      value={`${hoursSince.toFixed(1)} / 24 小时`}
    />
    <Condition 
      name="会话门控" 
      met={sessionsSince >= 5}
      value={`${sessionsSince} / 5 会话`}
    />
  </TriggerConditions>
  
  <RunDreamButton 
    disabled={!canTrigger}
    onClick={runDream}
  />
  
  <DreamHistory>
    {dreamLogs.map(log => (
      <DreamLogEntry log={log} />
    ))}
  </DreamHistory>
</DreamStatus>
```

#### 4. 统计分析

```typescript
// 功能：
- 记忆数量统计（按类型）
- 记忆增长趋势
- 标签云
- Dream 历史统计

// UI 组件：
<Dashboard>
  <StatsCards>
    <StatCard 
      title="总记忆数" 
      value={totalMemories}
      trend="+5 本周"
    />
    <StatCard 
      title="User 记忆" 
      value={userMemories}
    />
    <StatCard 
      title="Feedback 记忆" 
      value={feedbackMemories}
    />
  </StatsCards>
  
  <GrowthChart 
    data={growthData}
    period="30d"
  />
  
  <TagCloud tags={tagCounts} />
  
  <DreamStats 
    totalDreams={totalDreams}
    avgMemoriesPerDream={avgMemories}
    lastDreamTime={lastDreamTime}
  />
</Dashboard>
```

### 配置选项

```typescript
// config.json
{
  "memory": {
    "webui": {
      "enabled": true,
      "port": 3000,
      "host": "localhost",
      "auth": {
        "enabled": false,
        "token": "${env:MEMORY_UI_TOKEN}"
      },
      "ssl": {
        "enabled": false,
        "cert": "/path/to/cert.pem",
        "key": "/path/to/key.pem"
      }
    }
  }
}
```

### 安全考虑

```typescript
// 1. 本地绑定（默认）
const server = express()
server.listen(3000, 'localhost')  // 只允许本地访问

// 2. Token 认证（可选）
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token !== process.env.MEMORY_UI_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

// 3. CORS 限制
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))

// 4. 速率限制
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 100  // 每个 IP 最多 100 次请求
}))
```

---

## 📅 实施时间表

### v1.1.0（2-3 周）

**Week 1**: LLM 分析支持
- [ ] 实现 MemoryLLMAnalyzer 类
- [ ] 添加 LLM 配置选项
- [ ] 编写测试用例
- [ ] 更新文档

**Week 2-3**: 飞书消息集成
- [ ] 实现 FeishuMemoryListener
- [ ] 集成飞书 IM 消息
- [ ] 集成飞书日历
- [ ] 集成飞书任务
- [ ] 隐私过滤器
- [ ] 测试和文档

### v1.2.0（3-4 周）

**Week 1-2**: MCP 协议支持
- [ ] 实现 MCP Server
- [ ] 定义工具和资源
- [ ] 与 Claude Code 集成测试
- [ ] 文档和示例

**Week 3-4**: Web UI 可视化
- [ ] 搭建 React 项目
- [ ] 实现记忆列表视图
- [ ] 实现记忆编辑视图
- [ ] 实现 Dream 状态视图
- [ ] 实现统计分析
- [ ] 安全和部署配置

---

## 🎯 优先级建议

### 立即可做（高优先级）

1. **LLM 分析支持** - 显著提升记忆质量
2. **飞书消息集成** - 自动化记忆提取

### 中期规划（中优先级）

3. **MCP 协议支持** - 扩展生态系统
4. **Web UI 基础功能** - 列表 + 编辑

### 长期规划（低优先级）

5. **Web UI 高级功能** - 统计 + 分析
6. **团队记忆支持** - private/team 分离
7. **云端同步** - 多设备同步

---

## 💡 创新想法

### 1. 记忆推荐

```typescript
// 基于当前对话上下文，推荐相关记忆
const recommendations = await MemorySystem.recommend({
  context: currentMessages,
  limit: 3
})

// 示例：
// 用户在讨论数据库测试
// → 推荐："测试不用 mock" feedback 记忆
```

### 2. 记忆过期提醒

```typescript
// project 类型记忆自动标记为"可能过期"
const staleMemories = await MemorySystem.findStale({
  type: 'project',
  olderThan: '30d'
})

// 提醒用户确认是否仍然有效
for (const memory of staleMemories) {
  await notifyUser({
    type: 'memory_review',
    memory: memory,
    message: '这条项目记忆可能已过时，请确认是否仍然有效'
  })
}
```

### 3. 记忆关系图

```typescript
// 可视化记忆之间的关系
const graph = await MemorySystem.buildGraph()

// 节点：记忆
// 边：共同标签、引用关系、语义相似性

// UI: 力导向图展示
<MemoryGraph nodes={graph.nodes} edges={graph.edges} />
```

---

**总结**: 未来扩展围绕**智能化**（LLM 分析）、**自动化**（飞书集成）、**生态化**（MCP 协议）、**可视化**（Web UI）四个方向，将记忆系统从工具升级为平台。
