/**
 * OpenClaw 记忆系统类型定义
 */
// ============================================================================
// 记忆类型
// ============================================================================
export const MEMORY_TYPES = [
    'user',
    'feedback',
    'project',
    'reference',
];
/**
 * 解析记忆类型
 */
export function parseMemoryType(raw) {
    if (typeof raw !== 'string')
        return undefined;
    return MEMORY_TYPES.find(t => t === raw);
}
//# sourceMappingURL=types.js.map