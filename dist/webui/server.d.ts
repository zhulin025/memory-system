/**
 * Web UI 服务器
 *
 * 提供 REST API 和静态文件服务
 */
export interface WebUIConfig {
    port: number;
    host: string;
    auth?: {
        enabled: boolean;
        token: string;
    };
    ssl?: {
        enabled: boolean;
        cert: string;
        key: string;
    };
}
export declare class MemoryWebUI {
    private app;
    private server;
    private wss;
    private config;
    private clients;
    constructor(config: WebUIConfig);
    /**
     * 认证中间件
     */
    private authMiddleware;
    /**
     * 设置路由
     */
    private setupRoutes;
    /**
     * 提取标签统计
     */
    private extractTags;
    /**
     * 设置 WebSocket
     */
    private setupWebSocket;
    /**
     * 广播消息
     */
    private broadcast;
    /**
     * 启动服务器
     */
    start(): Promise<void>;
    /**
     * 停止服务器
     */
    stop(): Promise<void>;
}
/**
 * 创建 Web UI 服务器
 */
export declare function createWebUI(config: WebUIConfig): MemoryWebUI;
//# sourceMappingURL=server.d.ts.map