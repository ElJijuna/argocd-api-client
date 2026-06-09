# argocd-api-client

<p align="center">
  <img src="https://argo-cd.readthedocs.io/en/stable/assets/logo.png" alt="Argo CD logo" width="160" />
</p>

<p align="center">
  <a href="https://github.com/ElJijuna/argocd-api-client/actions/workflows/release.yml"><img src="https://github.com/ElJijuna/argocd-api-client/actions/workflows/release.yml/badge.svg" alt="Release" /></a>
  <a href="https://www.npmjs.com/package/argocd-api-client"><img src="https://img.shields.io/npm/v/argocd-api-client" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/argocd-api-client"><img src="https://img.shields.io/npm/dm/argocd-api-client" alt="npm downloads" /></a>
  <a href="https://bundlephobia.com/package/argocd-api-client"><img src="https://img.shields.io/bundlephobia/minzip/argocd-api-client" alt="Bundle size" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-6.x-blue?logo=typescript&amp;logoColor=white" alt="TypeScript" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/node/v/argocd-api-client" alt="Node.js" /></a>
  <a href="https://semantic-release.gitbook.io/semantic-release/"><img src="https://img.shields.io/badge/semantic--release-enabled-e10079?logo=semantic-release" alt="semantic-release" /></a>
</p>

TypeScript client for the official Argo CD REST API. Works in Node.js 18+ and browsers via `fetch`.

Argo CD exposes Swagger docs at `/swagger-ui` on each Argo CD server. Argo CD authenticates API requests with JWTs; pass the JWT in the `Authorization` header as `Bearer <jwt>`.

## Install

```bash
npm install argocd-api-client
```

## Quick Start

```typescript
import { ArgoCdClient } from 'argocd-api-client';

const argocd = new ArgoCdClient({
  baseUrl: 'https://argocd.example.com',
  token: process.env.ARGOCD_TOKEN,
});

const apps = await argocd.applications.list({ project: ['default'] });
console.log(apps.items.map((app) => app.metadata?.name));
```

## Login

```typescript
const argocd = await ArgoCdClient.fromCredentials({
  baseUrl: 'https://argocd.example.com',
  username: 'admin',
  password: 'password',
});
```

The client stores the credentials internally and automatically refreshes the session on 401 responses.

## Resources

```typescript
await argocd.applications.list();
await argocd.applications.get('guestbook', { project: 'default' });
await argocd.applications.sync('guestbook', { revision: 'main' });

await argocd.projects.list();
await argocd.repositories.list();
await argocd.clusters.list();
await argocd.accounts.list();
```

## Abort Requests

Every request method accepts an optional `AbortSignal` as its final argument.

```typescript
const controller = new AbortController();

const apps = await argocd.applications.list(
  { project: ['default'] },
  controller.signal,
);

controller.abort();
```

## Events

Use `.on('request', callback)` to observe every HTTP request made by the client — useful for logging, metrics, and error tracking.

```typescript
argocd.on('request', (event) => {
  console.log(`[${event.method}] ${event.url} → ${event.statusCode} (${event.durationMs}ms)`);
  if (event.error) console.error('Request failed:', event.error.message);
});
```

The `RequestEvent` object includes:

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` | Full URL requested |
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | HTTP method |
| `startedAt` | `Date` | When the request started |
| `finishedAt` | `Date` | When the request finished |
| `durationMs` | `number` | Duration in milliseconds |
| `statusCode` | `number \| undefined` | HTTP status code (absent on network errors) |
| `error` | `Error \| undefined` | Set on any failed request |

Multiple listeners are supported and called in registration order. `.on()` returns `this` for chaining:

```typescript
argocd
  .on('request', (e) => metrics.record(e.durationMs))
  .on('request', (e) => { if (e.error) sentry.capture(e.error); });
```

> Token auto-refresh on 401 is transparent: only one event is emitted per logical operation, reflecting the final outcome.

## Express Integration

Install Express and (optionally) its types:

```bash
npm install express
npm install -D @types/express
```

Create a shared client instance and expose Argo CD resources through your own API:

```typescript
// src/argocd.ts
import { ArgoCdClient } from 'argocd-api-client';

export const argocd = new ArgoCdClient({
  baseUrl: process.env.ARGOCD_BASE_URL!,
  token: process.env.ARGOCD_TOKEN,
});
```

```typescript
// src/routes/apps.ts
import { Router } from 'express';
import { argocd } from '../argocd';

const router = Router();

// GET /apps?project=default
router.get('/', async (req, res, next) => {
  try {
    const project = req.query.project
      ? [String(req.query.project)]
      : undefined;

    const apps = await argocd.applications.list(
      { project },
      req.signal, // forward the request's AbortSignal
    );

    res.json(apps.items?.map((app) => ({
      name: app.metadata?.name,
      namespace: app.metadata?.namespace,
      health: app.status?.health?.status,
      sync: app.status?.sync?.status,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /apps/:name/sync
router.post('/:name/sync', async (req, res, next) => {
  try {
    const result = await argocd.applications.sync(req.params.name, {
      revision: req.body.revision ?? 'HEAD',
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
```

```typescript
// src/index.ts
import express from 'express';
import appsRouter from './routes/apps';

const app = express();
app.use(express.json());
app.use('/apps', appsRouter);

app.listen(3000, () => console.log('Listening on :3000'));
```

### Environment variables

```env
ARGOCD_BASE_URL=https://argocd.example.com
ARGOCD_TOKEN=<jwt>
```

If you don't have a static token, use `fromCredentials` to authenticate and get a ready-to-use client in one call:

```typescript
import { ArgoCdClient } from 'argocd-api-client';

export const argocd = await ArgoCdClient.fromCredentials({
  baseUrl: process.env.ARGOCD_BASE_URL!,
  username: process.env.ARGOCD_USER!,
  password: process.env.ARGOCD_PASS!,
});
```

### Token refresh

Clients created with `fromCredentials` store the credentials internally and handle token expiry automatically:

```typescript
// Automatic — a 401 response triggers a session refresh and retries the request once
await argocd.applications.list();

// Manual — force a refresh before the token expires
await argocd.refreshSession();
```

Clients created with `new ArgoCdClient({ token })` do not store credentials; calling `refreshSession()` on them throws an error.

### Express + createSession

This pattern exposes a `POST /auth/login` endpoint that exchanges credentials for an Argo CD JWT, then uses that token on every subsequent request via a middleware-created client.

```typescript
// src/routes/auth.ts
import { Router } from 'express';
import { ArgoCdClient } from 'argocd-api-client';

const router = Router();

// POST /auth/login  { "username": "admin", "password": "..." }
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body as {
      username: string;
      password: string;
    };

    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required' });
      return;
    }

    const client = new ArgoCdClient({ baseUrl: process.env.ARGOCD_BASE_URL! });
    const { token } = await client.createSession({ username, password });

    res.json({ token });
  } catch (err) {
    next(err);
  }
});

export default router;
```

```typescript
// src/middleware/argocd.ts
import { RequestHandler } from 'express';
import { ArgoCdClient } from 'argocd-api-client';

declare global {
  namespace Express {
    interface Request {
      argocd: ArgoCdClient;
    }
  }
}

export const argocdMiddleware: RequestHandler = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  req.argocd = new ArgoCdClient({
    baseUrl: process.env.ARGOCD_BASE_URL!,
    token: auth.slice(7),
  });

  next();
};
```

```typescript
// src/routes/apps.ts
import { Router } from 'express';
import { argocdMiddleware } from '../middleware/argocd';

const router = Router();
router.use(argocdMiddleware);

// GET /apps
router.get('/', async (req, res, next) => {
  try {
    const apps = await req.argocd.applications.list({}, req.signal);
    res.json(apps.items?.map((app) => ({
      name: app.metadata?.name,
      health: app.status?.health?.status,
      sync: app.status?.sync?.status,
    })));
  } catch (err) {
    next(err);
  }
});

export default router;
```

```typescript
// src/index.ts
import express from 'express';
import authRouter from './routes/auth';
import appsRouter from './routes/apps';

const app = express();
app.use(express.json());
app.use('/auth', authRouter);
app.use('/apps', appsRouter); // protected by argocdMiddleware

app.listen(3000, () => console.log('Listening on :3000'));
```

**Flow:**

```bash
# 1. Obtain a token
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"secret"}'
# → { "token": "<jwt>" }

# 2. Use the token in subsequent requests
curl http://localhost:3000/apps \
  -H 'Authorization: Bearer <jwt>'
```

## Benchmarks

```bash
npm run bench
```

The benchmark suite uses mocked `fetch` responses, so it never calls a real Argo CD server. It covers client construction, resource access, GET/POST/DELETE request paths, query params, error handling, `AbortSignal`, and memory pressure.

## API Coverage

Initial client covers common official REST resources:

- `SessionService`: `POST /api/v1/session`
- `ApplicationService`: list/get/create/delete/patch/sync
- `ProjectService`: list/get/create/update/delete
- `RepositoryService`: list/get/create/delete
- `ClusterService`: list/get/create/delete
- `AccountService`: list/get/can-i/update-password/delete-token

Types intentionally keep Argo CD/Kubernetes payloads extensible with `Record<string, unknown>` for areas where server versions vary.
