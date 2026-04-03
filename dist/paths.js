/**
 * 记忆系统路径管理
 *
 * 负责解析和管理记忆目录路径
 */
import { homedir } from 'os';
import { join, normalize, isAbsolute } from 'path';
import { existsSync, mkdirSync } from 'fs';
// ============================================================================
// 常量
// ============================================================================
const MEMORY_DIR_NAME = 'memory';
const INDEX_FILE_NAME = 'MEMORY.md';
const LOCK_FILE_NAME = '.dream.lock';
// ============================================================================
// 路径解析
// ============================================================================
/**
 * 获取记忆系统基础目录
 *
 * 优先级：
 * 1. OPENCLAW_MEMORY_PATH 环境变量
 * 2. 配置文件
 * 3. 默认 ~/.openclaw/memory/
 */
export function getMemoryBaseDir() {
    // 1. 环境变量覆盖
    if (process.env.OPENCLAW_MEMORY_PATH) {
        return process.env.OPENCLAW_MEMORY_PATH;
    }
    // 2. 默认路径
    return join(homedir(), '.openclaw', MEMORY_DIR_NAME);
}
/**
 * 获取项目记忆目录
 *
 * @param projectId 项目标识（通常是 git 根目录或工作目录）
 */
export function getProjectMemoryDir(projectId) {
    const baseDir = getMemoryBaseDir();
    if (!projectId) {
        return baseDir;
    }
    // Sanitize projectId（避免特殊字符）
    const sanitized = sanitizeProjectId(projectId);
    return join(baseDir, 'projects', sanitized);
}
/**
 * Sanitize 项目 ID（避免文件系统问题）
 */
function sanitizeProjectId(id) {
    return id
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 100); // 限制长度
}
/**
 * 获取记忆索引文件路径
 */
export function getIndexFilePath(projectId) {
    return join(getProjectMemoryDir(projectId), INDEX_FILE_NAME);
}
/**
 * 获取记忆文件目录
 */
export function getMemoriesDir(projectId) {
    return getProjectMemoryDir(projectId);
}
/**
 * 获取单个记忆文件路径
 */
export function getMemoryFilePath(fileName, projectId) {
    return join(getMemoriesDir(projectId), fileName);
}
/**
 * 获取 Dream 锁文件路径
 */
export function getDreamLockPath(projectId) {
    return join(getProjectMemoryDir(projectId), LOCK_FILE_NAME);
}
// ============================================================================
// 目录管理
// ============================================================================
/**
 * 确保记忆目录存在
 */
export function ensureMemoryDir(projectId) {
    const dir = getProjectMemoryDir(projectId);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}
/**
 * 验证路径安全性
 */
export function validateMemoryPath(raw) {
    if (!raw)
        return undefined;
    const normalized = normalize(raw).replace(/[/\\]+$/, '');
    // 安全检查
    if (!isAbsolute(normalized) ||
        normalized.length < 3 ||
        /^[A-Za-z]:$/.test(normalized) ||
        normalized.startsWith('\\\\') ||
        normalized.startsWith('//') ||
        normalized.includes('\0')) {
        return undefined;
    }
    return normalized;
}
// ============================================================================
// 项目 ID 提取
// ============================================================================
/**
 * 从当前工作目录提取项目 ID
 */
export function getProjectIdFromCwd(cwd = process.cwd()) {
    // 尝试找 git 根目录
    try {
        const { execSync } = require('child_process');
        const gitRoot = execSync('git rev-parse --show-toplevel', {
            cwd,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        return gitRoot;
    }
    catch {
        // 不是 git 仓库，使用 cwd
        return cwd;
    }
}
//# sourceMappingURL=paths.js.map