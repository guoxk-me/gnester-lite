# Validation Guide / 校验指南

This template enables request validation globally in `src/main.ts`.

本模板在 `src/main.ts` 全局启用请求校验。

## Global Pipe / 全局管道

The shared validation setup lives in `src/common/validation/validation.pipe.ts`.

通用校验配置位于 `src/common/validation/validation.pipe.ts`。

Defaults / 默认配置：

- `whitelist: true`: strips properties without validation decorators.
  删除没有校验装饰器的字段。
- `forbidNonWhitelisted: true`: rejects unknown properties instead of silently ignoring them.
  遇到未知字段直接拒绝请求，而不是静默忽略。
- `forbidUnknownValues: true`: rejects unknown objects instead of attempting unsafe validation.
  拒绝未知对象，避免对不明确的输入执行不安全校验。
- `transform: true`: transforms plain request payloads into DTO instances.
  将普通请求对象转换为 DTO 实例。
- `stopAtFirstError: true`: returns concise field errors.
  每个字段遇到第一个错误就停止，错误更简洁。
- `validationError.target: false` and `validationError.value: false`: avoids leaking raw request values in validation responses.
  避免在校验响应中泄露原始请求对象和值。
- `disableErrorMessages` is enabled in production.
  生产环境隐藏详细校验错误。

## DTO Patterns / DTO 模式

Use concrete classes for DTOs. Do not rely on interfaces or type-only imports for request validation, because runtime metadata is required.

DTO 请使用具体 class。不要依赖 interface 或 type-only import 做请求校验，因为校验依赖运行时元数据。

Common examples / 常见示例：

- `CreateDemoDto`: body validation with string, required, and max-length decorators.
  使用字符串、必填和最大长度装饰器校验 body。
- `UpdateDemoDto`: update DTO derived from `PartialType(CreateDemoDto)`.
  使用 `PartialType(CreateDemoDto)` 派生更新 DTO。
- `UpdateDemoDescriptionDto`: field-specific DTO derived from `PickType(CreateDemoDto, ['description'])`.
  使用 `PickType(CreateDemoDto, ['description'])` 派生只允许更新描述的 DTO。
- `DemoNameOnlyDto`: reduced DTO derived from `OmitType(CreateDemoDto, ['description'])`.
  使用 `OmitType(CreateDemoDto, ['description'])` 派生只保留名称的 DTO。
- `CreateDemoWithAuditDto`: composed DTO derived from `IntersectionType(CreateDemoDto, DemoAuditDto)`.
  使用 `IntersectionType(CreateDemoDto, DemoAuditDto)` 组合创建字段与审计字段。
- `ListDemoQueryDto`: query DTO with numeric transform, ranges, defaults, and enum validation.
  query DTO 中演示数字转换、范围、默认值和枚举校验。
- `BulkCreateDemoDto`: nested array validation with `@ValidateNested()` and `@Type()`.
  使用 `@ValidateNested()` 和 `@Type()` 做嵌套数组校验。
- `FindDemoParamsDto`: path param DTO validation with `@IsNumberString()`.
  使用 `@IsNumberString()` 演示路径参数 DTO 校验。

## Explicit Parsing / 显式解析

Use Nest built-in pipes when a route only needs primitive parsing:

当路由只需要解析基础类型时，使用 Nest 内置 pipe：

- `ParseIntPipe` for numeric params.
  数字参数。
- `ParseBoolPipe` for boolean query values.
  布尔 query 值。
- `ParseArrayPipe` for comma-separated arrays or array body payloads.
  逗号分隔数组或数组 body。
- `ParseUUIDPipe` for UUID path params.
  UUID 路径参数。

See `src/features/demo-database/demo-database.controller.ts` for working examples.

可参考 `src/features/demo-database/demo-database.controller.ts` 中的完整示例。
