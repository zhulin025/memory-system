/**
 * Dream 记忆整理机制
 *
 * 定期整理、合并、修剪记忆
 */
import { stat, utimes, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getDreamLockPath, getMemoriesDir, getIndexFilePath } from './paths.js';
import { readIndex, updateIndex } from './index.js';
// ============================================================================
// 常量
// ============================================================================
const DEFAULT_MIN_HOURS = 24;
const DEFAULT_MIN_SESSIONS = 5;
// ============================================================================
// Dream 触发器
// ============================================================================
/**
 * 检查是否应该触发 Dream
 */
export async function shouldTriggerDream(projectId, options = {}) {
    const minHours = options.minHours ?? DEFAULT_MIN_HOURS;
    const minSessions = options.minSessions ?? DEFAULT_MIN_SESSIONS;
    // 1. 检查时间门控
    const hoursSince = await getHoursSinceLastDream(projectId);
    if (hoursSince < minHours) {
        return {
            should: false,
            reason: `距离上次 Dream 仅 ${hoursSince.toFixed(1)} 小时，需要 ≥${minHours} 小时`
        };
    }
    // 2. 检查会话门控（简化实现：检查记忆文件数量）
    const sessionsSince = await countSessionsSinceLastDream(projectId);
    if (sessionsSince < minSessions) {
        return {
            should: false,
            reason: `仅有 ${sessionsSince} 个新会话，需要 ≥${minSessions} 个`
        };
    }
    // 3. 检查锁
    const hasLock = await tryAcquireDreamLock(projectId);
    if (!hasLock) {
        return {
            should: false,
            reason: '无法获取锁（可能其他进程正在 Dream）'
        };
    }
    return {
        should: true,
        hoursSince,
        sessionsSince
    };
}
/**
 * 获取距离上次 Dream 的小时数
 */
async function getHoursSinceLastDream(projectId) {
    const lockPath = getDreamLockPath(projectId);
    if (!existsSync(lockPath)) {
        return 999; // 从未 Dream 过
    }
    try {
        const fileStats = await stat(lockPath);
        const mtime = fileStats.mtimeMs;
        const hoursSince = (Date.now() - mtime) / (1000 * 60 * 60);
        return hoursSince;
    }
    catch {
        return 999;
    }
}
/**
 * 计算自上次 Dream 以来的会话数量
 *
 * 简化实现：统计新增的记忆文件数量
 */
async function countSessionsSinceLastDream(projectId) {
    const lockPath = getDreamLockPath(projectId);
    if (!existsSync(lockPath)) {
        // 从未 Dream 过，统计所有记忆文件
        const dir = getMemoriesDir(projectId);
        if (!existsSync(dir)) {
            return 0;
        }
        const { readdir } = await import('fs/promises');
        const files = await readdir(dir);
        return files.filter(f => f.endsWith('.md')).length;
    }
    try {
        const stats = await stat(lockPath);
        const lockTime = stats.mtimeMs;
        // 统计 lockTime 之后修改的记忆文件
        const dir = getMemoriesDir(projectId);
        const { readdir } = await import('fs/promises');
        const files = await readdir(dir);
        let count = 0;
        for (const file of files) {
            if (!file.endsWith('.md'))
                continue;
            const filePath = `${dir}/${file}`;
            const fileStats = await stat(filePath);
            if (fileStats.mtimeMs > lockTime) {
                count++;
            }
        }
        return count;
    }
    catch {
        return 0;
    }
}
// ============================================================================
// 锁机制
// ============================================================================
/**
 * 尝试获取 Dream 锁
 */
export async function tryAcquireDreamLock(projectId) {
    const lockPath = getDreamLockPath(projectId);
    try {
        if (existsSync(lockPath)) {
            const fileStats = await stat(lockPath);
            const mtime = fileStats.mtimeMs;
            const hoursSince = (Date.now() - mtime) / (1000 * 60 * 60);
            if (hoursSince < DEFAULT_MIN_HOURS) {
                // 锁未过期
                return false;
            }
        }
        // 更新锁文件 mtime
        const now = new Date();
        if (existsSync(lockPath)) {
            await utimes(lockPath, now, now);
        }
        else {
            await writeFile(lockPath, '', 'utf8');
        }
        return true;
    }
    catch (e) {
        console.error('Failed to acquire dream lock:', e);
        return false;
    }
}
/**
 * 释放 Dream 锁（回滚 mtime）
 */
export async function releaseDreamLock(projectId, priorMtime) {
    if (priorMtime === undefined)
        return;
    const lockPath = getDreamLockPath(projectId);
    try {
        const priorDate = new Date(priorMtime);
        await utimes(lockPath, priorDate, priorDate);
    }
    catch (e) {
        console.error('Failed to release dream lock:', e);
    }
}
// ============================================================================
// Dream 执行
// ============================================================================
/**
 * 执行 Dream 整理
 */
export async function runDream(projectId) {
    const result = {
        memoriesConsolidated: 0,
        memoriesPruned: 0,
        indexUpdated: false,
        filesTouched: []
    };
    try {
        // 1. 读取现有索引
        const entries = await readIndex(projectId);
        // 2. 检查每个记忆文件是否存在
        const validEntries = [];
        const { existsSync } = await import('fs');
        for (const entry of entries) {
            const filePath = `${getMemoriesDir(projectId)}/${entry.file}`;
            if (existsSync(filePath)) {
                validEntries.push(entry);
            }
            else {
                // 文件不存在，从索引移除
                result.memoriesPruned++;
            }
        }
        // 3. 更新索引（移除不存在的文件）
        if (result.memoriesPruned > 0) {
            await updateIndex(validEntries, projectId);
            result.indexUpdated = true;
        }
        // 4. 检查索引是否超出限制
        const indexPath = getIndexFilePath(projectId);
        if (existsSync(indexPath)) {
            const { readFile } = await import('fs/promises');
            const content = await readFile(indexPath, 'utf8');
            const lines = content.split('\n');
            if (lines.length > 200) {
                // 索引过长，需要修剪
                const truncated = lines.slice(0, 200).join('\n');
                await writeFile(indexPath, truncated, 'utf8');
                result.memoriesPruned += lines.length - 200;
                result.indexUpdated = true;
            }
        }
        // 5. 记录触摸的文件
        result.filesTouched = validEntries.map(e => e.file);
        result.memoriesConsolidated = validEntries.length;
        return result;
    }
    catch (e) {
        console.error('Dream failed:', e);
        throw e;
    }
}
// ============================================================================
// Dream Prompt 构建
// ============================================================================
/**
 * 构建 Dream Prompt
 */
export function buildDreamPrompt(memoryRoot, maxIndexLines = 200, maxIndexBytes = 25000) {
    return `
# Dream: 记忆整理

你正在进行 dream — 对记忆文件的反思性整理。综合最近学到的内容到持久的、组织良好的记忆中。

记忆目录：\`${memoryRoot}\`

---

## Phase 1 — Orient

- \`ls\` 记忆目录查看现有文件
- 读取 \`MEMORY.md\` 理解当前索引
- 浏览现有主题文件（避免重复）

## Phase 2 — Gather recent signal

寻找值得持久化的新信息：

1. **Daily logs** — append-only 流
2. **现有记忆漂移** — 与当前状态矛盾的事实
3. **Transcript 搜索** — 精准 grep 特定关键词

不要穷举阅读。只查找你怀疑重要的内容。

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
`.trim();
}
//# sourceMappingURL=dream.js.map