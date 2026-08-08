# Production Features

This directory is reserved for supported production business capabilities such
as identity, users, orders, or payments.

Each feature owns its controllers, services, DTOs, entities, repositories,
feature-specific migrations, local adapters, and tests. Features may depend on
platform capabilities and framework-free contracts, but must not depend on
`src/examples` or `src/bootstrap`.

Teaching and integration demos belong in `src/examples`.
