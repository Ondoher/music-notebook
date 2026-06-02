# Accounts

## Purpose

Track the MVP account and authentication design for `music-notebook`.

This topic is the working home for:

- create-account and login behavior
- account Mongo record shape
- server account service and route progress
- password and token handling decisions
- open questions that affect document save and authenticated export

The account flow is the authentication foundation for document save. The first account slice is implemented and is now used by the document feature for save/open/rename flows.

## Current State

The first account slice is implemented:

1. create account
2. login
3. establish an authenticated session/token shape
4. let document routes identify the current user from bearer tokens

The slice should stay small, but it should continue avoiding API or database shapes that would need immediate undo.

## Current Server Wiring

The server now follows the same broad Polylith service pattern as the client:

- `server/index.js` imports services and features by side effect.
- `server/services/routers.js` owns route-service ordering.
- account routes register as a normal router through `routers.add(...)`.
- the catch-all app router remains last through `routers.setLast(...)`.

Account-related server files currently include:

- `server/features/accounts/index.js`
- `server/features/accounts/accounts-router.js`
- `server/features/accounts/accounts-service.js`
- `server/features/accounts/db/AccountsDb.js`
- `server/features/accounts/db/AccountSessionsDb.js`

The account router is activated and owns the first account/session API surface.

## Configuration And Mongo

Server-local configuration is loaded by:

- `server/services/config.js`

The config file path is selected from:

```js
process.env.MN_ENV ?? process.env.NODE_ENV ?? "dev"
```

That resolves to:

```text
config/mn/config.<env>.json
```

Local development config currently lives at:

- `config/mn/config.dev.json`

Current local Mongo defaults:

```json
{
	"accounts": {
		"saltSeed": "music-notebook-local-dev-salt-seed"
	},
	"mongo": {
		"uri": "mongodb://127.0.0.1:27017",
		"db": "music_notebook_dev",
		"collections": {
			"accounts": "accounts",
			"accountSessions": "account_sessions",
			"documents": "documents"
		}
	}
}
```

Production should use the same code path with server-local production config, likely:

```text
MN_ENV=prod
config/mn/config.prod.json
```

## Account Record

The initial account record is intentionally simple:

```js
{
	id: "uuid",
	username: "Alice",
	normalizedUsername: "alice",
	version: 1,
	passwordHash: "...",
	email: null,
	lastOpenDocumentId: null,
	createdAt: Date.now(),
	updatedAt: Date.now()
}
```

Field decisions:

- `id` is an app-owned UUID, not a Mongo-assigned `_id`.
- `username` preserves the accepted user-facing username.
- `normalizedUsername` supports case-insensitive lookup and unique indexing.
- `version` identifies the account password/verifier record format.
- `passwordHash` stores the account password verifier/hash value.
- `email` is optional and should be stored as `null` when absent.
- `lastOpenDocumentId` stores the most recent document id for startup/session restore.
- `createdAt` and `updatedAt` use native JavaScript epoch millisecond values from `Date.now()`.

The initial account version is `1`.

Use `version` when the password generation or verifier format changes so the
server can identify which account records have been upgraded and which still
need migration.

First required Mongo index:

- unique index on `normalizedUsername`

Email should not get a unique index until email has product behavior attached to it, such as password reset or login-by-email.

## Password Direction

MVP notes currently say passwords should not be sent to the server in plain text.

The first password flow uses a deterministic per-username salt:

```text
salt = sha256(normalizedUsername + ":" + accountSaltSeed)
```

The salt is not secret. Its purpose is to make dictionary and precomputed hash
lookups less useful by ensuring password hashing input differs per username.

Inputs:

- `normalizedUsername`: the trimmed, case-normalized username used for account lookup.
- `accountSaltSeed`: an arbitrary server-configured value.

Output:

- a deterministic hash string returned to the client and used as the password salt.

Because the salt is deterministic from the username, the same route can be used
before both account creation and login. The salt route should not check whether
the account exists. It should normalize the supplied username, compute the salt,
and return it. That avoids making the salt route a username-enumeration endpoint.

The account salt seed should live in server-local config. Local development can
use a simple non-secret value, while production can use a different server-local
value:

```json
{
	"accounts": {
		"saltSeed": "local-dev-arbitrary-value"
	}
}
```

The first account flow is:

1. client requests salt for a username
2. server returns the deterministic salt
3. client hashes the password using that salt
4. client sends username plus password hash for account creation or login
5. server stores or compares the submitted password hash

The first client-side password hash protocol is:

```text
passwordHash = sha256("1:" + salt + ":" + password)
```

The leading `1` is the client hash protocol version. It is intentionally
separate from the stored account `version` field so the client derivation format
and stored account migration state can evolve independently.

For implementation staging, the account API and database names should avoid baking in plain-text password assumptions where practical.

## Token And Session Direction

Authenticated requests should use a server-issued bearer token:

```text
Authorization: Bearer <token>
```

The first-pass tokens are random opaque tokens, not self-contained JWTs.

There are two token layers:

- a durable login-session token stored as a hashed Mongo session record and sent
  to the browser as an `HttpOnly` cookie
- a short-lived bearer token stored only in server memory and client memory

Login response:

```js
{
	success: true,
	token: "short-lived-bearer-token",
	account: {
		id: "...",
		username: "Alice",
		email: null
	}
}
```

The login response also sets the durable session cookie. The client receives
only the short-lived bearer token in the response body.

Session record:

```js
{
	tokenHash: "...",
	accountId: "...",
	createdAt: Date.now(),
	expiresAt: Date.now() + ttl,
	revokedAt: null,
	lastUsedAt: Date.now()
}
```

Token generation:

```js
token = crypto.randomBytes(32).toString("base64url")
tokenHash = sha256(token)
```

Token lifetimes:

- durable login-session token: 7 days
- in-memory bearer token: 15 minutes

Session behavior:

- allow multiple sessions per account
- logout revokes the current session
- future account settings may revoke all sessions
- expiration must be checked in application code even if a Mongo TTL index is added later

Session collection:

```text
account_sessions
```

Session indexes:

- unique index on `tokenHash`
- index on `accountId`
- index on `expiresAt`

The first implementation uses an ordinary `expiresAt` index and checks
expiration in service code. A Mongo TTL index can be added later if session
cleanup becomes necessary and the expiration behavior has settled.

Subsequent authenticated request flow:

1. read the `Authorization` header
2. require the `Bearer <token>` scheme
3. hash the raw token
4. look up the access token in server memory
5. reject missing or expired access tokens
6. verify the backing durable session is still present, unexpired, and unrevoked
7. make the authenticated account/session available to the route handler

## Login Failure Behavior

Login failures must not reveal why authentication failed.

The server should return one generic failure response for:

- missing account
- wrong password hash
- malformed but syntactically acceptable login attempt
- unavailable verifier data

The client-facing message should be equivalent to:

```text
Login failed.
```

The response should not say whether the username exists, whether the password was
wrong, or which field caused the failure.

Validation errors for structurally invalid requests can still use ordinary bad
request handling, but credential checks should collapse to the same generic
authentication failure.

## API Surface

Current account API routes:

```text
POST /api/accounts/salt
POST /api/accounts/create
POST /api/accounts/login
GET  /api/accounts/session
POST /api/accounts/logout
PATCH /api/accounts/last-open-document
```

Client-side route strings are app-base relative, such as
`api/accounts/session`. The deployed app namespace, such as `/mn`, is provided
by Polylith and the browser base path rather than being baked into the model.

## Persistent Login

Successful account creation and login create two token layers:

- a durable login-session token saved as an `HttpOnly` cookie
- a short-lived bearer token returned in the response and kept only in memory

The client:

1. installs returned bearer tokens on the shared `io` service as the `Authorization` bearer token
2. stores no bearer token in browser storage
3. calls `GET api/accounts/session` during `account-model.ready()`
4. lets the browser send the durable `HttpOnly` session cookie automatically
5. receives and applies a fresh short-lived bearer token when the server accepts the session cookie
6. clears local account state and bearer token if session restore fails

Logout calls `POST api/accounts/logout`, then clears local account state and
the in-memory bearer token. The server revokes the durable session, clears the
cookie, and removes in-memory access tokens backed by that session.

If an authenticated request receives `401`, the shared `io` service asks
`account-model` to refresh the access token once through the durable session
cookie. If refresh succeeds, `io` retries the original request once with the new
bearer token. If refresh fails, the original request remains failed and local
account state is cleared.

This gives the app cross-run login persistence without keeping the reusable
login credential available to client JavaScript.

## Client UI Direction

Account creation and login are owned by the `accounts` feature.

The initial UI is exposed in the top-right account status area, not as the
primary document command surface. When logged out, it shows login and sign-up
actions. When logged in, it shows the username and a small account menu.

The accounts controller owns dialog flow and exposes `account-ui` so other
features can open login or create-account dialogs without importing account UI
components. For example, the document feature uses this to offer login/create
actions from the "save requires login" message.

The account dialog host renders under the normal app React root through the app
shell, not through a detached React root. Detached React roots should stay a
special case for Quill embeds and similar adapter boundaries.

The account dialogs use:

- `BaseDialog` for the shared dialog shell
- concrete account text fields backed by the base input layer
- shared `PasswordInput` for password visibility and optional complexity rules
- `account-model` for salt lookup, client-side password hashing, create-account, and login requests

Possible future challenge-shaped routes:

```text
POST /api/accounts/register-challenge
POST /api/accounts/login-challenge
```

Route naming may change once the password protocol is chosen.

## Progress

Done:

- server route aggregation exists
- catch-all router stays last
- accounts router is activated with salt, create, login, session, and logout routes
- server config service exists
- local Mongo config exists
- `mongodb` driver dependency is installed on the known-working `6.x` line
- accounts service can lazily create an account DB wrapper from config
- account record shape has an initial decision
- deterministic salt algorithm is documented and configured
- salt route exists
- create-account route exists
- login route exists with generic credential-failure behavior
- cookie-backed login sessions and in-memory bearer tokens exist and are documented
- account session DB wrapper exists
- shared client `io` service exists with bearer-token header behavior
- shared client `io` service refreshes expired bearer tokens once on `401`
- client `account-model` can request salt, derive password hashes, create accounts, login, restore sessions, logout, and apply returned bearer tokens
- shared password input and password-complexity components exist
- account feature exists with create-account, login, and logout commands
- account status lives in the top-right shell area
- `account-ui` service lets other features open login/create-account dialogs
- create-account and login dialogs exist under the normal app root
- create-account success uses the shared info dialog path
- logout emits an asynchronous cancellable `logout-intent` before clearing the session
- document feature listens to logout intents and can prompt `[Save] [Do not save] [Cancel]` for unsaved work
- account records store `lastOpenDocumentId`
- account model can update `lastOpenDocumentId`

Next:

- harden logout-intent listener behavior as more features need pre-logout cleanup
- decide whether token/auth middleware should be promoted to a shared server service for reuse outside document routes
- add duplicate username route/service tests if not already covered by the DB-wrapper integration path

## Open Questions

- Should the first client-side password hash add iteration settings, or stay as the current single SHA-256 pass until the server-side verifier strategy changes?
- Should the server apply an additional slow hash to the client-submitted password hash before storage?
- What should trigger account `version` upgrades after a password/verifier format change?
- What username characters, length, and normalization rules should be accepted?
- Should usernames be case-preserving but case-insensitive?
- Should email be validated syntactically when supplied, or only trimmed and stored for later?
- Should `lastUsedAt` update on every authenticated request or only after a throttle window?
- Should session cleanup use a Mongo TTL index immediately or wait until token behavior stabilizes?
- Should a later hardening pass make session cookies `Secure` by default in all deployed environments?
- What login rate limit should MVP enforce?
- How should username enumeration prevention be handled?
- Should failed login responses include a stable machine-readable code such as `login_failed`, or only `success: false`?
- How should anonymous in-progress documents attach to a new account after successful account creation?
- Should anonymous work survive browser refresh before account creation?
- Should `lastOpenDocumentId` validate document ownership before storing, or stay optimistic until open fails?
