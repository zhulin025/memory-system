/**
 * LLM 分析器 - 智能识别记忆
 * 
 * 使用大模型分析对话内容，提取值得保存的记忆
 */

import type { MemoryType } from './types.js'

export interface MemoryCandidate {
  type: MemoryType
  title: string
  content: string
  tags?: string[]
  confidence: number  // 0.0-1.0
  reason: string      // 为什么值得保存
}

export interface LLMAnalyzerConfig {
  provider: 'anthropic' | 'openai' | 'qwen'
  model: string
  apiKey: string
  baseUrl?: string
  threshold: number      // 置信度阈值 (默认 0.7)
  maxMemories: number    // 每次最多提取数 (默认 5)
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

/**
 * LLM 分析器类
 */
export class MemoryLLMAnalyzer {
  private config: LLMAnalyzerConfig
  
  constructor(config: LLMAnalyzerConfig) {
    this.config = config
  }
  
  /**
   * 分析消息列表，提取记忆候选
   */
  async analyze(messages: Message[]): Promise<MemoryCandidate[]> {
    const prompt = this.buildPrompt(messages)
    const response = await this.callLLM(prompt)
    return this.parseResponse(response)
  }
  
  /**
   * 构建分析 Prompt
   */
  private buildPrompt(messages: Message[]): string {
    const conversationText = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n')
    
    return `你是一个记忆提取助手。分析以下对话，提取值得保存的记忆。

## 记忆类型

1. **user** - 用户角色、偏好、知识
   - 用户的职业、角色、技能
   - 用户的偏好和工作方式
   - 用户的知识背景

2. **feedback** - 工作方式指导
   - 用户纠正你的方法
   - 用户确认有效的做法
   - 包含规则、原因、适用场景

3. **project** - 项目动态、决策
   - 项目目标、时间线
   - 技术选型决策
   - 团队协作信息

4. **reference** - 外部系统指针
   - 工具、系统 URL
   - 文档、资源链接
   - 联系人信息

## 排除内容

不要保存以下内容：
- 可从代码推导的信息（架构、代码模式）
- git 历史已有的变更
- 临时状态（今天、明天等相对时间）
- 已 documented 的内容
- 寒暄、闲聊

## 输出格式

返回 JSON 格式：
{
  "memories": [
    {
      "type": "user|feedback|project|reference",
      "title": "简短标题（≤50 字）",
      "content": "详细内容",
      "tags": ["标签 1", "标签 2"],
      "confidence": 0.0-1.0,
      "reason": "为什么值得保存（1-2 句话）"
    }
  ]
}

## 对话内容

${conversationText}

## 分析要求

1. 只提取真正值得保存的记忆
2. 置信度低于 0.7 的不要提取
3. 最多提取 ${this.config.maxMemories} 个记忆
4. 相对时间转绝对时间（如"周四"转为具体日期）
5. 包含 why 和 how（特别是 feedback 类型）

请分析并返回 JSON：`
  }
  
  /**
   * 调用 LLM
   */
  private async callLLM(prompt: string): Promise<string> {
    const { provider, model, apiKey, baseUrl } = this.config
    
    try {
      if (provider === 'anthropic') {
        return await this.callAnthropic(prompt, apiKey, model, baseUrl)
      } else if (provider === 'openai') {
        return await this.callOpenAI(prompt, apiKey, model, baseUrl)
      } else if (provider === 'qwen') {
        return await this.callQwen(prompt, apiKey, model, baseUrl)
      } else {
        throw new Error(`不支持的 provider: ${provider}`)
      }
    } catch (error) {
      console.error('[LLMAnalyzer] 调用失败:', error)
      return '[]'
    }
  }
  
  /**
   * 调用 Anthropic API
   */
  private async callAnthropic(
    prompt: string,
    apiKey: string,
    model: string,
    baseUrl?: string
  ): Promise<string> {
    const url = baseUrl || 'https://api.anthropic.com/v1/messages'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API 错误：${response.status} - ${error}`)
    }
    
    const data: any = await response.json()
    return data.content[0]?.text || '[]'
  }
  
  /**
   * 调用 OpenAI API
   */
  private async callOpenAI(
    prompt: string,
    apiKey: string,
    model: string,
    baseUrl?: string
  ): Promise<string> {
    const url = baseUrl || 'https://api.openai.com/v1/chat/completions'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API 错误：${response.status} - ${error}`)
    }
    
    const data: any = await response.json()
    return data.choices[0]?.message?.content || '[]'
  }
  
  /**
   * 调用 Qwen API (DashScope)
   */
  private async callQwen(
    prompt: string,
    apiKey: string,
    model: string,
    baseUrl?: string
  ): Promise<string> {
    const url = baseUrl || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [{
            role: 'user',
            content: prompt
          }]
        }
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Qwen API 错误：${response.status} - ${error}`)
    }
    
    const data: any = await response.json()
    return data.output?.text || '[]'
  }
  
  /**
   * 解析 LLM 响应
   */
  private parseResponse(response: string): MemoryCandidate[] {
    try {
      // 尝试提取 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('[LLMAnalyzer] 未找到 JSON 响应')
        return []
      }
      
      const parsed = JSON.parse(jsonMatch[0])
      const memories = parsed.memories || []
      
      // 过滤低置信度的记忆
      return memories
        .filter((m: any) => {
          const confidence = typeof m.confidence === 'number' ? m.confidence : 0
          return confidence >= this.config.threshold
        })
        .map((m: any) => ({
          type: this.validateType(m.type),
          title: String(m.title || '').slice(0, 50),
          content: String(m.content || ''),
          tags: Array.isArray(m.tags) ? m.tags : [],
          confidence: typeof m.confidence === 'number' ? m.confidence : 0.7,
          reason: String(m.reason || '用户明确要求保存')
        }))
        .slice(0, this.config.maxMemories)
    } catch (error) {
      console.error('[LLMAnalyzer] 解析响应失败:', error)
      console.error('原始响应:', response)
      return []
    }
  }
  
  /**
   * 验证记忆类型
   */
  private validateType(type: any): MemoryType {
    const validTypes: MemoryType[] = ['user', 'feedback', 'project', 'reference']
    if (validTypes.includes(type)) {
      return type
    }
    return 'user'  // 默认
  }
  
  /**
   * 评估记忆重要性（独立调用）
   */
  async evaluateImportance(
    content: string,
    context?: string
  ): Promise<{
    shouldSave: boolean
    confidence: number
    reason: string
  }> {
    const prompt = `评估以下内容是否值得保存为记忆：

内容：${content}
${context ? '上下文：' + context : ''}

评估标准：
1. non-obvious: 非显而易见
2. actionable: 可指导行动
3. persistent: 持久性（非临时状态）
4. not-derivable: 无法从其他来源推导

返回 JSON：
{
  "shouldSave": true|false,
  "confidence": 0.0-1.0,
  "reason": "评估理由"
}`
    
    const response = await this.callLLM(prompt)
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return { shouldSave: false, confidence: 0, reason: '解析失败' }
      }
      
      const parsed = JSON.parse(jsonMatch[0])
      return {
        shouldSave: Boolean(parsed.shouldSave),
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        reason: String(parsed.reason || '')
      }
    } catch {
      return { shouldSave: false, confidence: 0, reason: '解析失败' }
    }
  }
  
  /**
   * 检查重复
   */
  async checkDuplicate(
    newMemory: MemoryCandidate,
    existingMemories: Array<{ title: string; content: string }>
  ): Promise<{
    isDuplicate: boolean
    similarTo?: { title: string; similarity: number }
  }> {
    const prompt = `检查以下新记忆是否与现有记忆重复：

新记忆：
标题：${newMemory.title}
内容：${newMemory.content}

现有记忆：
${existingMemories.map(m => `- 标题：${m.title}\n  内容：${m.content}`).join('\n')}

判断标准：
- 语义相似（不只是文字匹配）
- 表达相同的事实或指导

返回 JSON：
{
  "isDuplicate": true|false,
  "similarTo": {
    "title": "相似的标题",
    "similarity": 0.0-1.0
  }|null
}`
    
    const response = await this.callLLM(prompt)
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return { isDuplicate: false }
      }
      
      const parsed = JSON.parse(jsonMatch[0])
      return {
        isDuplicate: Boolean(parsed.isDuplicate),
        similarTo: parsed.similarTo || undefined
      }
    } catch {
      return { isDuplicate: false }
    }
  }
}

/**
 * 创建 LLM 分析器实例
 */
export function createLLMAnalyzer(config: LLMAnalyzerConfig): MemoryLLMAnalyzer {
  return new MemoryLLMAnalyzer(config)
}
