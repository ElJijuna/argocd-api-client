# Roadmap

Tracks planned additions against the [Argo CD REST API](https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/).

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
| `DELETE` | `/applications/{name}/sync` | 🔜 |
| `GET` | `/applications/{name}/logs` | ✅ |
| `GET` | `/applications/{name}/resource-tree` | ✅ |
| `GET` | `/applications/{name}/managed-resources` | ✅ |
| `DELETE` | `/applications/{name}/managed-resources` | 🔜 |
| `POST` | `/applications/{name}/rollback` | ✅ |
| `GET` | `/applications/{name}/refresh` | ✅ `refresh()` |
| `GET` | `/applications/{name}/events` | ✅ `events()` |
| `POST` | `/applications/{name}/wait` | 🔜 |
| `POST` | `/applications/{name}/revisions/{revision}/metadata` | 🔜 |

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
| `GET` | `/repositories/{repo}/apps` | 🔜 |
| `GET` | `/repositories/{repo}/refs` | ✅ |

### ClusterService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/clusters` | ✅ |
| `POST` | `/clusters` | ✅ |
| `GET` | `/clusters/{server}` | ✅ |
| `PUT` | `/clusters/{server}` | ✅ |
| `DELETE` | `/clusters/{server}` | ✅ |
| `GET` | `/clusters/{server}/invalidate-cache` | ✅ `clusters.invalidateCache()` |

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

---

## Out of scope

- `NotificationService` — config-only, limited real-world API usage
- `POST /settings` — server-level mutation, high blast radius
- `AdmissionService` — internal/advanced use
