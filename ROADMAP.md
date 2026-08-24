# Roadmap

Tracks planned additions against the [Argo CD REST API](https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/).

Endpoint claims follow the [compatibility policy](COMPATIBILITY.md). The current minimum guaranteed
version and canonical contract are Argo CD `v3.5.1`; older versions are best-effort. A planned endpoint
must state its minimum version when it is not portable across the declared support baseline.

Legend: ✅ done · 🔜 planned · ❌ not planned

---

## v1.x — Existing services (gap fills)

### ApplicationService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/applications` | ✅ |
| `POST` | `/applications` | ✅ |
| `GET` | `/applications/{name}` | ✅ |
| `PUT` | `/applications/{name}` | ✅ |
| `DELETE` | `/applications/{name}` | ✅ |
| `PATCH` | `/applications/{name}` | ✅ |
| `POST` | `/applications/{name}/sync` | ✅ |
| `DELETE` | `/applications/{name}/sync` | ✅ `terminateSync()` |
| `GET` | `/applications/{name}/logs` | ✅ |
| `GET` | `/applications/{name}/resource-tree` | ✅ |
| `GET` | `/applications/{name}/managed-resources` | ✅ |
| `GET` | `/applications/{name}/manifests` | ✅ `manifests()` |
| `GET` | `/applications/{name}/server-side-diff` | ✅ `serverSideDiff()` / `plan()` |
| `GET` | `/applications/{name}/resource` | ✅ `getResource()` |
| `POST` | `/applications/{name}/resource` | ✅ `patchResource()` |
| `DELETE` | `/applications/{name}/resource` | ✅ `deleteResource()` |
| `GET` | `/applications/{name}/resource/actions` | ✅ `resourceActions()` |
| `POST` | `/applications/{name}/resource/actions/v2` | ✅ `runResourceAction()` |
| `GET` | `/applications/{name}/resource/links` | ✅ `resourceLinks()` |
| `POST` | `/applications/{name}/rollback` | ✅ |
| `GET` | `/applications/{name}/refresh` | ✅ `refresh()` |
| `GET` | `/applications/{name}/events` | ✅ `events()` |
| `POST` | `/applications/{name}/wait` | ✅ `wait()` |
| `GET` | `/applications/{name}/revisions/{revision}/metadata` | ✅ `revisionMetadata()` |
| `GET` | `/applications/{name}/revisions/{revision}/chartdetails` | ✅ `chartDetails()` |
| `DELETE` | `/applications/{name}/operation` | ✅ `terminateOperation()` |

### Application client helpers

| Helper | Purpose | Status |
| --- | --- | --- |
| `resourceAllocation()` | Effective declared CPU, memory, and ephemeral-storage allocation by Pod/node/app | ✅ |
| `insights()` | Consolidated health, drift, image, restart, event, and allocation warnings | ✅ |
| `snapshot()` | Point-in-time audit snapshot | ✅ |
| `compareApplicationSnapshots()` | Local before/after snapshot comparison | ✅ |
| `plan()` | Manifest render plus Argo CD server-side dry-run diff | ✅ |
| `syncMany()` | Bounded-concurrency fleet synchronization with per-app results | ✅ |
| `iterate()` | Async iteration over current application list response | ✅ |
| `watch()` | Abortable polling that emits changed application resource versions | ✅ |
| `fleetSummary()` | Health and sync counts across an application list | ✅ |

`iterate()` intentionally reflects the current Argo CD list response; it does not claim server-side
pagination. `watch()` uses explicit polling because the REST API does not expose a portable streaming
watch contract across supported Argo CD versions.

### ProjectService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/projects` | ✅ |
| `POST` | `/projects` | ✅ |
| `GET` | `/projects/{name}` | ✅ |
| `PUT` | `/projects/{name}` | ✅ |
| `DELETE` | `/projects/{name}` | ✅ |
| `GET` | `/projects/{name}/events` | ✅ `projects.events()` |
| `GET` | `/projects/{name}/repositories` | ✅ `projects.repositories()` |

### RepositoryService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/repositories` | ✅ |
| `POST` | `/repositories` | ✅ |
| `GET` | `/repositories/{repo}` | ✅ |
| `DELETE` | `/repositories/{repo}` | ✅ |
| `GET` | `/repositories/{repo}/apps` | ✅ `repositories.apps()` |
| `GET` | `/repositories/{repo}/refs` | ✅ |

### ClusterService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/clusters` | ✅ |
| `POST` | `/clusters` | ✅ |
| `GET` | `/clusters/{server}` | ✅ |
| `PUT` | `/clusters/{server}` | ✅ |
| `DELETE` | `/clusters/{server}` | ✅ |
| `POST` | `/clusters/{server}/invalidate-cache` | ✅ `clusters.invalidateCache()` |

### AccountService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/account` | ✅ |
| `GET` | `/account/{name}` | ✅ |
| `PUT` | `/account/password` | ✅ |
| `GET` | `/account/can-i/{resource}/{action}/{subresource}` | ✅ |
| `GET` | `/account/{name}/tokens` | ✅ `accounts.listTokens()` |
| `POST` | `/account/{name}/token` | ✅ `accounts.createToken()` |
| `DELETE` | `/account/{name}/token/{id}` | ✅ |

### SessionService
| Method | Endpoint | Status |
| --- | --- | --- |
| `POST` | `/session` | ✅ |
| `DELETE` | `/session` | ✅ `deleteSession()` |
| `GET` | `/session/userinfo` | ✅ `userInfo()` |

---

## v2.0 — New services

### ApplicationSetService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/applicationsets` | ✅ |
| `POST` | `/applicationsets` | ✅ |
| `GET` | `/applicationsets/{name}` | ✅ |
| `PUT` | `/applicationsets/{name}` | ✅ |
| `DELETE` | `/applicationsets/{name}` | ✅ |

### RepoCredsService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/repocreds` | ✅ `repoCreds.list()` |
| `POST` | `/repocreds` | ✅ `repoCreds.create()` |
| `DELETE` | `/repocreds/{url}` | ✅ `repoCreds.deleteByUrl()` |

### CertificateService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/certificates` | ✅ `certificates.list()` |
| `POST` | `/certificates` | ✅ `certificates.create()` |
| `DELETE` | `/certificates` | ✅ `certificates.delete()` |

### GPGKeyService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/gpgkeys` | ✅ `gpgKeys.list()` |
| `POST` | `/gpgkeys` | ✅ `gpgKeys.create()` |
| `DELETE` | `/gpgkeys/{keyid}` | ✅ `gpgKeys.deleteByKeyId()` |

### SettingsService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/settings` | ✅ `settings.get()` |

### VersionService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/version` | ✅ `version.get()` |

`ArgoCdClient.capabilities()` normalizes the server version and exposes cached, typed feature flags
derived from the compatibility policy. `{ refresh: true }` bypasses its cache.

---

## Out of scope

- `NotificationService` — config-only, limited real-world API usage
- `POST /settings` — server-level mutation, high blast radius
- `AdmissionService` — internal/advanced use
