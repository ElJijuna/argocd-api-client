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
