/**
 * 记忆系统路径管理
 *
 * 负责解析和管理记忆目录路径
 */
/**
 * 获取记忆系统基础目录
 *
 * 优先级：
 * 1. OPENCLAW_MEMORY_PATH 环境变量
 * 2. 配置文件
 * 3. 默认 ~/.openclaw/memory/
 */
export declare function getMemoryBaseDir(): string;
/**
 * 获取项目记忆目录
 *
 * @param projectId 项目标识（通常是 git 根目录或工作目录）
 */
export declare function getProjectMemoryDir(projectId?: string): string;
/**
 * 获取记忆索引文件路径
 */
export declare function getIndexFilePath(projectId?: string): string;
/**
 * 获取记忆文件目录
 */
export declare function getMemoriesDir(projectId?: string): string;
/**
 * 获取单个记忆文件路径
 */
export declare function getMemoryFilePath(fileName: string, projectId?: string): string;
/**
 * 获取 Dream 锁文件路径
 */
export declare function getDreamLockPath(projectId?: string): string;
/**
 * 确保记忆目录存在
 */
export declare function ensureMemoryDir(projectId?: string): void;
/**
 * 验证路径安全性
 */
export declare function validateMemoryPath(raw: string | undefined): string | undefined;
/**
 * 从当前工作目录提取项目 ID
 */
export declare function getProjectIdFromCwd(cwd?: string): string;
//# sourceMappingURL=paths.d.ts.map