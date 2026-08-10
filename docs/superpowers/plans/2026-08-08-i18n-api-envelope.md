# i18n + Unified API Envelope Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Add `nestjs-i18n` with `Accept-Language` (`en`/`zh`, fallback `en`) and a unified success/failure JSON envelope `{ code, message, data, errors }` where `code` matches HTTP status and `message`/`reason` are localizable.

**Architecture:** Platform `CommonI18nModule` owns locales, `ApiEnvelopeInterceptor`, and `ApiExceptionFilter`. Bootstrap validation keeps flattened `{ field, reason }` errors inside the envelope. Health/SSE/`StreamableFile` skip wrapping.

**Tech Stack:** NestJS 11, `nestjs-i18n` 10.x, existing ValidationPipe factory.

## Global Constraints

- Dependency direction: `bootstrap/features/examples -> platform -> contracts`
- Custom platform modules must not use `@Global()`; `I18nModule.forRoot` is a documented third-party root exception like `ConfigModule`
- Do not break Terminus `/health/*` probe payloads
- Preserve validation value redaction

## Tasks

- [x] Install `nestjs-i18n`; add locale JSON assets + nest-cli copy
- [x] Add envelope contract + interceptor/filter/skip decorator + i18n module
- [x] Wire AppModule; adapt validation factory + CSRF error JSON
- [x] Mark health to skip envelope; translate core keys
- [x] Unit tests + update broken e2e/unit expectations; docs
