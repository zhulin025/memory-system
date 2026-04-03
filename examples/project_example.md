---
type: project
title: "示例项目记忆"
created: 2026-04-04T10:00:00Z
updated: 2026-04-04T10:00:00Z
tags: [example, release]
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
