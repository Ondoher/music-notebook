# Spec

This folder contains shared Jasmine test infrastructure.

Current structure:

- `helpers/` shared test helpers and reporters
- `support/` Jasmine support configuration

Notes:

- Most server tests should live close to the code they cover, often in feature-local `_tests` folders.
- The server test lane runs with `npm run test:server`.
- Prefer server tests for backend services, route handlers, persistence wrappers, and account/auth logic that does not require browser rendering.
