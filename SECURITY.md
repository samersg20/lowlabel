# Security Notes

## Multi-Tenant Isolation

Tenant context is derived from the authenticated session (`session.user.tenantId`) issued by Auth.js (JWT strategy). All tenant-scoped reads and writes must go through the tenant data-access layer in `lib/tenant-db.ts`, which enforces:
- `tenantId` is always required.
- All queries are filtered by `tenantId`.
- All creates force `tenantId`.
- All updates/deletes validate ownership with `{ id, tenantId }`.

Endpoints now return `401` when unauthenticated and `403` when a tenant context is missing. No endpoint defaults to a tenant. `tenantId` is non-nullable for tenant-owned models.
