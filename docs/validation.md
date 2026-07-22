# Validation Guide / 校验指南

> CN: 文档文件，说明 validation 的用途；EN: Documentation file explains the purpose of validation.

This document is for AI agents and developers who need to change request validation safely.

本文档面向需要安全修改请求校验的 AI agent 和开发者。

## Mental Model / 校验模型

- Global `ValidationPipe` defines default validation behavior.
  全局 `ValidationPipe` 定义默认校验行为。
- DTO classes define accepted request shapes.
  DTO class 定义允许接收的数据结构。
- Built-in parse pipes handle simple primitive params.
  内置 parse pipe 处理简单基础类型参数。

Rule / 判断规则：

```text
Body/query object? -> DTO class
body/query 对象？-> DTO class

Single primitive param? -> Parse*Pipe
单个基础参数？-> Parse*Pipe

Reuse another DTO? -> mapped types
复用已有 DTO？-> mapped types
```

## Load Flow / 加载流程

`src/main.ts` wires validation:

`src/main.ts` 接入校验：

```ts
app.useGlobalPipes(createValidationPipe(nodeEnv));
```

`src/common/validation/validation.pipe.ts` owns the shared defaults:

`src/common/validation/validation.pipe.ts` 维护通用默认值：

```ts
whitelist: true
forbidNonWhitelisted: true
forbidUnknownValues: true
transform: true
stopAtFirstError: true
```

Validation error shape / 校验错误格式：

```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [{ "field": "name", "reason": "name should not be empty" }]
}
```

Note: only validation errors use this shape. Other HTTP errors still use Nest defaults unless a global exception filter is added.

注意：当前只有校验错误使用该格式。其他 HTTP 异常仍使用 Nest 默认格式，除非新增全局异常过滤器。

## Key Files / 关键文件

- `src/common/validation/validation.pipe.ts`: global pipe and error formatting. 全局 pipe 与错误格式。
- `src/common/validation/validation.pipe.spec.ts`: validation helper tests. 校验工具测试。
- `src/features/demo-database/dto/*.dto.ts`: DTO examples. DTO 示例。
- `src/features/demo-database/demo-database.controller.ts`: DTO and pipe usage. DTO 与 pipe 用法。
- `docs/demo.md`: demo API examples. demo 接口示例。

## Current Patterns / 当前模式

- Body DTO: `CreateDemoDto`.
- Update DTO: `PartialType(CreateDemoDto)`.
- Mapped types: `PickType()`, `OmitType()`, `IntersectionType()` in `demo-mapped-types.dto.ts`.
- Query DTO: `ListDemoQueryDto` with `@Type(() => Number)`.
- Nested array DTO: `BulkCreateDemoDto` with `@ValidateNested()` and `@Type()`.
- Param DTO: `FindDemoParamsDto` with `@IsNumberString()`.
- Primitive pipes: `ParseIntPipe`, `ParseBoolPipe`, `ParseArrayPipe`, `ParseUUIDPipe`.

## How To Change / 如何修改

Add body/query validation / 新增 body/query 校验：

1. Create or update a DTO under the feature `dto/` folder.
   在 feature 的 `dto/` 目录新增或修改 DTO。
2. Add `class-validator` decorators to every accepted property.
   给每个允许字段添加 `class-validator` 装饰器。
3. Use the DTO in `@Body()` or `@Query()`.
   在 `@Body()` 或 `@Query()` 中使用该 DTO。

Add numeric query fields / 新增数字 query 字段：

1. Add `@Type(() => Number)` before `@IsInt()`, `@Min()`, or `@Max()`.
   在 `@IsInt()`、`@Min()` 或 `@Max()` 前添加 `@Type(() => Number)`。

Add nested DTOs / 新增嵌套 DTO：

1. Add `@ValidateNested()` or `@ValidateNested({ each: true })`.
   添加 `@ValidateNested()` 或 `@ValidateNested({ each: true })`。
2. Add `@Type(() => ChildDto)`.
   添加 `@Type(() => ChildDto)`。

Change global behavior / 修改全局行为：

1. Edit `src/common/validation/validation.pipe.ts`.
   修改 `src/common/validation/validation.pipe.ts`。
2. Update `validation.pipe.spec.ts` if error formatting changes.
   如果错误格式变化，同步更新 `validation.pipe.spec.ts`。
3. Do not loosen `whitelist` or `forbidNonWhitelisted` unless required by the API contract.
   除非接口契约需要，不要放宽 `whitelist` 或 `forbidNonWhitelisted`。

## Verify / 验证

```bash
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
```
