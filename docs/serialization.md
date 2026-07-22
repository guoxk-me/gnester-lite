# Serialization Guide / 序列化指南

> CN: 文档文件，说明 serialization 的用途；EN: Documentation file explains the purpose of serialization.

This document is for AI agents and developers who need to change response serialization safely.

本文档面向需要安全修改响应序列化的 AI agent 和开发者。

## Mental Model / 序列化模型

Serialization controls outbound data before it becomes an HTTP response.

序列化控制数据变成 HTTP 响应前的出站形状。

Rule / 判断规则：

```text
Input validation? -> DTO + ValidationPipe
入参校验？-> DTO + ValidationPipe

Response shaping or hiding fields? -> class-transformer + ClassSerializerInterceptor
响应改形或隐藏字段？-> class-transformer + ClassSerializerInterceptor
```

## Demo Scope / Demo 范围

The demo lives in `src/features/demo-serialization`.

Demo 位于 `src/features/demo-serialization`。

It shows common response cases:

它覆盖常见响应场景：

- Hide sensitive fields with `@Exclude()`.
  用 `@Exclude()` 隐藏敏感字段。
- Expose computed fields with `@Expose()`.
  用 `@Expose()` 暴露计算字段。
- Rename output fields with getter-based aliases.
  用 getter 别名调整输出字段名。
- Transform relation objects with `@Transform()`.
  用 `@Transform()` 改写关联对象。
- Show admin-only fields with `groups`.
  用 `groups` 暴露管理员字段。
- Apply DTO rules to plain objects with `@SerializeOptions({ type })`.
  用 `@SerializeOptions({ type })` 让普通对象也套用 DTO 规则。
- Exclude internal metadata with `excludePrefixes: ['_']`.
  用 `excludePrefixes: ['_']` 排除内部元数据。

## Key Files / 关键文件

- `src/features/demo-serialization/demo-serialization.module.ts`: feature module.
  功能模块。
- `src/features/demo-serialization/demo-serialization.controller.ts`: routes and serialization options.
  路由与序列化配置。
- `src/features/demo-serialization/demo-serialization.service.ts`: sample data.
  示例数据。
- `src/features/demo-serialization/dto/demo-serialization-user.dto.ts`: field-level serialization rules.
  字段级序列化规则。
- `src/features/demo-serialization/dto/demo-serialization-page.dto.ts`: nested array serialization.
  嵌套数组序列化。
- `src/features/demo-serialization/demo-serialization.controller.spec.ts`: executable contracts.
  可执行契约测试。
- `src/app.module.ts`: imports `DemoSerializationModule`.
  接入 `DemoSerializationModule`。

## Routes / 路由

- `GET /demo-serialization/profile`: normal public response.
  普通公开响应。
- `GET /demo-serialization/profile/admin`: includes `groups: ['admin']` fields.
  包含 `groups: ['admin']` 字段。
- `GET /demo-serialization/profile/plain`: plain object transformed by response DTO.
  普通对象按响应 DTO 转换。
- `GET /demo-serialization/page/plain`: nested plain array transformed by response DTO.
  嵌套普通数组按响应 DTO 转换。

## How To Change / 如何修改

Add a hidden field / 新增隐藏字段：

1. Add the field to the DTO.
   添加字段到 DTO。
2. Mark it with `@Exclude()` or leave it unexposed under class-level `@Exclude()`.
   使用 `@Exclude()`，或在类级 `@Exclude()` 下不加 `@Expose()`。
3. Add or update a test that proves the field is absent.
   添加或更新测试，证明字段不会输出。

Add a public field / 新增公开字段：

1. Add the field to the DTO.
   添加字段到 DTO。
2. Mark it with `@Expose()`.
   使用 `@Expose()`。
3. Add expected output in the contract test.
   在契约测试里加入期望输出。

Add a plain-object endpoint / 新增普通对象接口：

1. Return a plain object from the service.
   从 service 返回普通对象。
2. Add `@SerializeOptions({ type: YourResponseDto })` on the route.
   在路由上添加 `@SerializeOptions({ type: YourResponseDto })`。
3. Use `@Type(() => ChildDto)` for nested arrays or objects.
   嵌套数组或对象使用 `@Type(() => ChildDto)`。

## Guardrails / 注意事项

- Prefer response DTOs over returning database entities directly.
  优先返回响应 DTO，不要直接暴露数据库实体。
- Do not rely on TypeScript `readonly` or `private` to hide runtime fields.
  不要依赖 TypeScript 的 `readonly` 或 `private` 隐藏运行时字段。
- `ValidationPipe.transform` handles input; it does not serialize responses.
  `ValidationPipe.transform` 处理入参，不负责响应序列化。
- Streams and files should not use this demo pattern.
  流和文件响应不要套用此 demo 模式。

## Verify / 验证

```bash
pnpm run test -- src/features/demo-serialization/demo-serialization.controller.spec.ts
pnpm run test
pnpm run build
```
