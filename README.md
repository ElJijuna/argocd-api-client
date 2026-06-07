# argocd-api-client

<p align="center">
  <img src="https://argo-cd.readthedocs.io/en/stable/assets/logo.png" alt="Argo CD logo" width="160" />
</p>

TypeScript client for the official Argo CD REST API. Works in Node.js 18+ and browsers via `fetch`.

Argo CD exposes Swagger docs at `/swagger-ui` on each Argo CD server, and authenticated REST calls use `Authorization: Bearer <token>`.

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
const argocd = new ArgoCdClient({ baseUrl: 'https://argocd.example.com' });
const session = await argocd.createSession({
  username: 'admin',
  password: 'password',
});

const authenticated = new ArgoCdClient({
  baseUrl: 'https://argocd.example.com',
  token: session.token,
});
```

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

## API Coverage

Initial client covers common official REST resources:

- `SessionService`: `POST /api/v1/session`
- `ApplicationService`: list/get/create/delete/patch/sync
- `ProjectService`: list/get/create/update/delete
- `RepositoryService`: list/get/create/delete
- `ClusterService`: list/get/create/delete
- `AccountService`: list/get/can-i/update-password/delete-token

Types intentionally keep Argo CD/Kubernetes payloads extensible with `Record<string, unknown>` for areas where server versions vary.
