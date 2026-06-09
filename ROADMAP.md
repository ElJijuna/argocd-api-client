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
| `PUT` | `/applications/{name}` | 🔜 |
| `DELETE` | `/applications/{name}` | ✅ |
| `PATCH` | `/applications/{name}` | ✅ |
| `POST` | `/applications/{name}/sync` | ✅ |
| `DELETE` | `/applications/{name}/sync` | 🔜 |
| `GET` | `/applications/{name}/logs` | 🔜 |
| `GET` | `/applications/{name}/resource-tree` | 🔜 |
| `GET` | `/applications/{name}/managed-resources` | 🔜 |
| `DELETE` | `/applications/{name}/managed-resources` | 🔜 |
| `POST` | `/applications/{name}/rollback` | 🔜 |
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
| `GET` | `/projects/{name}/events` | 🔜 |
| `GET` | `/projects/{name}/repositories` | 🔜 |

### RepositoryService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/repositories` | ✅ |
| `POST` | `/repositories` | ✅ |
| `GET` | `/repositories/{repo}` | ✅ |
| `DELETE` | `/repositories/{repo}` | ✅ |
| `GET` | `/repositories/{repo}/apps` | 🔜 |
| `GET` | `/repositories/{repo}/refs` | 🔜 |

### ClusterService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/clusters` | ✅ |
| `POST` | `/clusters` | ✅ |
| `GET` | `/clusters/{server}` | ✅ |
| `PUT` | `/clusters/{server}` | 🔜 |
| `DELETE` | `/clusters/{server}` | ✅ |
| `GET` | `/clusters/{server}/invalidate-cache` | 🔜 |

### AccountService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/account` | ✅ |
| `GET` | `/account/{name}` | ✅ |
| `PUT` | `/account/password` | ✅ |
| `GET` | `/account/can-i/{resource}/{action}/{subresource}` | ✅ |
| `GET` | `/account/{name}/tokens` | 🔜 |
| `POST` | `/account/{name}/token` | 🔜 |
| `DELETE` | `/account/{name}/token/{id}` | ✅ |

### SessionService
| Method | Endpoint | Status |
| --- | --- | --- |
| `POST` | `/session` | ✅ |
| `DELETE` | `/session` | 🔜 |
| `GET` | `/session/userinfo` | 🔜 |

---

## v2.0 — New services

### ApplicationSetService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/applicationsets` | 🔜 |
| `POST` | `/applicationsets` | 🔜 |
| `GET` | `/applicationsets/{name}` | 🔜 |
| `PUT` | `/applicationsets/{name}` | 🔜 |
| `DELETE` | `/applicationsets/{name}` | 🔜 |

### RepoCredsService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/repocreds` | 🔜 |
| `POST` | `/repocreds` | 🔜 |
| `DELETE` | `/repocreds/{url}` | 🔜 |

### CertificateService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/certificates` | 🔜 |
| `POST` | `/certificates` | 🔜 |
| `DELETE` | `/certificates/{dn}` | 🔜 |

### GPGKeyService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/gpgkeys` | 🔜 |
| `POST` | `/gpgkeys` | 🔜 |
| `DELETE` | `/gpgkeys/{keyid}` | 🔜 |

### SettingsService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/settings` | 🔜 |

### VersionService
| Method | Endpoint | Status |
| --- | --- | --- |
| `GET` | `/version` | 🔜 |

---

## Out of scope

- `NotificationService` — config-only, limited real-world API usage
- `POST /settings` — server-level mutation, high blast radius
- `AdmissionService` — internal/advanced use
