/**
 * Web UI 服务器
 * 
 * 提供 REST API 和静态文件服务
 */

import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { MemorySystemConfig, ExtractResult, DreamResult } from './types.js'
import { getProjectIdFromCwd, getProjectMemoryDir, ensureMemoryDir } from './paths.js'
import { extractMemories } from './extractor.js'
import { shouldTriggerDream, runDream } from './dream.js'
import { readIndex, addIndexEntry, removeIndexEntry } from './index.js'
import { readFile as readMemoryFile } from 'fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ============================================================================
// 类型定义
// ============================================================================

export interface WebUIConfig {
  port: number
  host: string
  auth?: {
    enabled: boolean
    token: string
  }
  ssl?: {
    enabled: boolean
    cert: string
    key: string
  }
}

// ============================================================================
// 服务器类
// ============================================================================

export class MemoryWebUI {
  private app: express.Application
  private server: any
  private wss: WebSocketServer
  private config: WebUIConfig
  private clients: Set<WebSocket> = new Set()
  
  constructor(config: WebUIConfig) {
    this.config = config
    this.app = express()
    
    // 中间件
    this.app.use(express.json())
    this.app.use(express.static(join(__dirname, '../webui/dist')))
    
    // 认证中间件
    if (config.auth?.enabled) {
      this.app.use(this.authMiddleware.bind(this))
    }
    
    // 路由
    this.setupRoutes()
    
    // WebSocket
    this.server = createServer(this.app)
    this.wss = new WebSocketServer({ server: this.server })
    this.setupWebSocket()
  }
  
  /**
   * 认证中间件
   */
  private authMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (token !== this.config.auth?.token) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    
    next()
  }
  
  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // 健康检查
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })
    
    // 获取记忆列表
    this.app.get('/api/memories', async (req, res) => {
      try {
        const projectId = req.query.projectId as string | undefined
        const type = req.query.type as string | undefined
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
        
        const memories = await readIndex(projectId)
        
        // 筛选
        let filtered = memories
        if (type) {
          filtered = memories.filter(m => m.type === type)
        }
        
        // 限制数量
        if (limit) {
          filtered = filtered.slice(0, limit)
        }
        
        res.json({ memories: filtered })
      } catch (error) {
        console.error('[WebUI] 获取记忆列表失败:', error)
        res.status(500).json({ error: 'Failed to fetch memories' })
      }
    })
    
    // 获取单个记忆内容
    this.app.get('/api/memories/:file', async (req, res) => {
      try {
        const { file } = req.params
        const projectId = req.query.projectId as string | undefined
        
        const memoryDir = getProjectMemoryDir(projectId)
        const filePath = join(memoryDir, file)
        
        if (!existsSync(filePath)) {
          res.status(404).json({ error: 'Memory not found' })
          return
        }
        
        const content = await readFile(filePath, 'utf8')
        res.json({ file, content })
      } catch (error) {
        console.error('[WebUI] 获取记忆内容失败:', error)
        res.status(500).json({ error: 'Failed to fetch memory content' })
      }
    })
    
    // 保存记忆
    this.app.post('/api/memories', async (req, res) => {
      try {
        const { type, title, content, tags, projectId } = req.body
        
        if (!type || !title || !content) {
          res.status(400).json({ error: 'Missing required fields' })
          return
        }
        
        // 添加到索引
        await addIndexEntry({
          title,
          file: `${type}_${title.replace(/\s+/g, '_')}_${Date.now()}.md`,
          type,
          oneLine: content.slice(0, 150)
        }, projectId)
        
        // TODO: 写入文件
        
        this.broadcast({ type: 'memory:saved', data: { type, title } })
        res.json({ success: true })
      } catch (error) {
        console.error('[WebUI] 保存记忆失败:', error)
        res.status(500).json({ error: 'Failed to save memory' })
      }
    })
    
    // 更新记忆
    this.app.put('/api/memories/:file', async (req, res) => {
      try {
        const { file } = req.params
        const { content, projectId } = req.body
        
        const memoryDir = getProjectMemoryDir(projectId)
        const filePath = join(memoryDir, file)
        
        await writeFile(filePath, content, 'utf8')
        
        this.broadcast({ type: 'memory:updated', data: { file } })
        res.json({ success: true })
      } catch (error) {
        console.error('[WebUI] 更新记忆失败:', error)
        res.status(500).json({ error: 'Failed to update memory' })
      }
    })
    
    // 删除记忆
    this.app.delete('/api/memories/:file', async (req, res) => {
      try {
        const { file } = req.params
        const projectId = req.query.projectId as string | undefined
        
        await removeIndexEntry(file, projectId)
        
        // TODO: 删除文件
        
        this.broadcast({ type: 'memory:deleted', data: { file } })
        res.json({ success: true })
      } catch (error) {
        console.error('[WebUI] 删除记忆失败:', error)
        res.status(500).json({ error: 'Failed to delete memory' })
      }
    })
    
    // 搜索记忆
    this.app.get('/api/search', async (req, res) => {
      try {
        const { q, type, projectId } = req.query
        
        const memories = await readIndex(projectId)
        
        // 简单搜索（后续可升级为全文搜索）
        const filtered = memories.filter(m => {
          const searchText = `${m.title} ${m.oneLine}`.toLowerCase()
          const matchQuery = !q || searchText.includes(String(q).toLowerCase())
          const matchType = !type || m.type === type
          return matchQuery && matchType
        })
        
        res.json({ memories: filtered })
      } catch (error) {
        console.error('[WebUI] 搜索失败:', error)
        res.status(500).json({ error: 'Failed to search' })
      }
    })
    
    // 统计数据
    this.app.get('/api/stats', async (req, res) => {
      try {
        const projectId = req.query.projectId as string | undefined
        const memories = await readIndex(projectId)
        
        const stats = {
          total: memories.length,
          byType: {
            user: memories.filter(m => m.type === 'user').length,
            feedback: memories.filter(m => m.type === 'feedback').length,
            project: memories.filter(m => m.type === 'project').length,
            reference: memories.filter(m => m.type === 'reference').length
          },
          tags: this.extractTags(memories)
        }
        
        res.json(stats)
      } catch (error) {
        console.error('[WebUI] 获取统计失败:', error)
        res.status(500).json({ error: 'Failed to fetch stats' })
      }
    })
    
    // Dream 状态
    this.app.get('/api/dream/status', async (req, res) => {
      try {
        const projectId = req.query.projectId as string | undefined
        const status = await shouldTriggerDream(projectId)
        
        res.json({
          hoursSince: status.hoursSince || 0,
          sessionsSince: status.sessionsSince || 0,
          shouldTrigger: status.should,
          reason: status.reason
        })
      } catch (error) {
        console.error('[WebUI] 获取 Dream 状态失败:', error)
        res.status(500).json({ error: 'Failed to fetch dream status' })
      }
    })
    
    // 执行 Dream
    this.app.post('/api/dream/run', async (req, res) => {
      try {
        const { force, projectId } = req.body
        
        const result = await runDream(projectId)
        
        this.broadcast({ type: 'dream:completed', data: result })
        res.json({ success: true, result })
      } catch (error) {
        console.error('[WebUI] 执行 Dream 失败:', error)
        res.status(500).json({ error: 'Failed to run dream' })
      }
    })
    
    // 测试提取
    this.app.post('/api/test/extract', async (req, res) => {
      try {
        const { messages, projectId, useLLM, llmApiKey } = req.body
        
        const result = await extractMemories(messages, projectId, {
          useLLM,
          llmApiKey
        })
        
        res.json({ success: true, result })
      } catch (error) {
        console.error('[WebUI] 测试提取失败:', error)
        res.status(500).json({ error: 'Failed to test extraction' })
      }
    })
  }
  
  /**
   * 提取标签统计
   */
  private extractTags(memories: Array<{ tags?: string[] }>): Record<string, number> {
    const tagCounts: Record<string, number> = {}
    
    for (const memory of memories) {
      if (memory.tags) {
        for (const tag of memory.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        }
      }
    }
    
    return tagCounts
  }
  
  /**
   * 设置 WebSocket
   */
  private setupWebSocket(): void {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws)
      console.log('[WebUI] WebSocket 客户端连接')
      
      ws.on('close', () => {
        this.clients.delete(ws)
        console.log('[WebUI] WebSocket 客户端断开')
      })
      
      ws.on('error', (error) => {
        console.error('[WebUI] WebSocket 错误:', error)
        this.clients.delete(ws)
      })
    })
  }
  
  /**
   * 广播消息
   */
  private broadcast(message: any): void {
    const data = JSON.stringify(message)
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }
  
  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, (error: any) => {
        if (error) {
          reject(error)
          return
        }
        
        console.log(`[WebUI] 服务器启动：http://${this.config.host}:${this.config.port}`)
        resolve()
      })
    })
  }
  
  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('[WebUI] 服务器已停止')
        resolve()
      })
      
      // 关闭所有 WebSocket 连接
      for (const client of this.clients) {
        client.close()
      }
    })
  }
}

/**
 * 创建 Web UI 服务器
 */
export function createWebUI(config: WebUIConfig): MemoryWebUI {
  return new MemoryWebUI(config)
}
