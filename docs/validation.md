# Validation Guide / 校验指南

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

`src/bootstrap/configure-application.ts` wires validation:

`src/bootstrap/configure-application.ts` 接入校验：

```ts
app.useGlobalPipes(createValidationPipe());
```

`src/bootstrap/http/validation.pipe.ts` owns the shared defaults:

`src/bootstrap/http/validation.pipe.ts` 维护通用默认值：

```ts
whitelist: true;
forbidNonWhitelisted: true;
forbidUnknownValues: true;
transform: true;
stopAtFirstError: true;
```

Validation error shape / 校验错误格式：

```json
{
  "code": 400,
  "message": "Validation failed",
  "data": null,
  "errors": [{ "field": "name", "reason": "name should not be empty" }]
}
```

Success and failure share this envelope. Successful handlers return the business
payload in `data`, with `errors: null`. `code` matches the HTTP status.
`message` and `errors[].reason` are localized via `Accept-Language` (`en` /
`zh`, fallback `en`).

成功与失败共用同一信封。成功时业务载荷在 `data`，`errors` 为 `null`。`code`
与 HTTP 状态一致。`message` 与 `errors[].reason` 通过 `Accept-Language` 本地化
（`en` / `zh`，回退 `en`）。

Health probes opt out with `@SkipApiEnvelope()`. SSE streams and
`StreamableFile` download bodies bypass wrapping automatically; JSON failures
from download operations still use the envelope, and `204 No Content` responses
have no wire body.

健康检查通过 `@SkipApiEnvelope()` 跳过包装；SSE 与 `StreamableFile` 下载 body
会自动绕过包装，但下载操作的 JSON 错误仍使用 envelope；`204 No Content`
响应在线路上没有 body。

The same sanitized structure is returned in every environment. Rejected values,
DTO instances and validation targets are never included in the response.

所有环境都返回同一脱敏结构；被拒绝的值、DTO 实例和校验 target 不会出现在响应中。

## Key Files / 关键文件

- `src/bootstrap/http/validation.pipe.ts`: global pipe and error formatting. 全局 pipe 与错误格式。
- `src/bootstrap/http/validation.pipe.spec.ts`: validation helper tests. 校验工具测试。
- `src/modules/identity/dto/`: session, account and invitation request DTOs.
- `src/modules/assistant/dto/`: conversation and personal model request DTOs.
- `src/common/validation/input-validation.constants.ts`: shared stable constraints.

## Current Patterns / 当前模式

- Every accepted property has class-validator decorators.
- Optional updates use optional validated properties rather than creating empty DTO layers.
- Assistant model choices use `@ValidateNested()` with `@Type(() => ModelChoiceBody)`.
- Semantic text fields reject whitespace-only input and have business-specific limits.
- Current admin list pagination explicitly checks integer indices and a page size of 1–100 at the HTTP boundary.
- DTOs remain runtime classes, colocated with their owning module; framework-free TypeScript contracts use local `.types.ts` files.

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

1. Edit `src/bootstrap/http/validation.pipe.ts`.
   修改 `src/bootstrap/http/validation.pipe.ts`。
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
