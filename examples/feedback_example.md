---
type: feedback
title: "示例反馈记忆"
created: 2026-04-04T10:00:00Z
updated: 2026-04-04T10:00:00Z
tags: [example, testing]
---

## 规则

集成测试必须直接连接真实数据库，不允许 mock。

## Why

上季度 mock 测试通过但生产迁移失败，因为 mock 和实际 DB 行为不一致。
具体是：mock 的 SQL 返回结果没有考虑字符集转换，导致生产环境出现乱码。

## How to apply

1. 所有后端服务的集成测试必须使用 testcontainers 启动真实数据库实例
2. 单元测试可以用 mock，但涉及数据库交互的必须用真实 DB
3. CI 流程中已经配置了 testcontainers，无需额外设置

## 例外情况

- 纯业务逻辑的单元测试可以用 mock
- 性能测试可以用简化的数据模型
