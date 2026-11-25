# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Authentication & Verification Gate**: Every read or write operation requires an authenticated user (`request.auth != null`) and every write requires a verified email (`request.auth.token.email_verified == true`).
2. **Identity & Ownership Integrity**:
   - A `UserProfile` document at `/users/{userId}` can only be created or updated by `request.auth.uid == userId` (or a verified admin), and `incoming().userId == userId`.
   - Self-assigned privilege escalation is forbidden: non-admin users creating or updating `/users/{userId}` can only hold `role in ['student', 'technician']` and cannot modify `role` on update.
   - A `SegmentationSession` document at `/sessions/{sessionId}` must have `ownerId == request.auth.uid` and `exists(/databases/$(database)/documents/users/$(request.auth.uid))`.
   - An `AuditLogEntry` document at `/auditLogs/{logId}` must have `actorUid == request.auth.uid`, is append-only (immutable: no updates or deletes allowed), and can only be read/listed by `resource.data.actorUid == request.auth.uid || isAdmin()`.
3. **Strict Schema & Boundary Enforcement**:
   - Every string field enforces strict `.size()` bounds and regex pattern validation for IDs (`^[a-zA-Z0-9_\-]+$`).
   - Every list field (`completedModules`) is strictly bounded (`size() <= 10`) and element-type validated.
   - All timestamps (`createdAt`, `updatedAt`) must strictly equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Creating `/users/user_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Creating `/users/user_1` with `email_verified == false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Profile**: User `user_1` creating `/users/user_2` -> `PERMISSION_DENIED`.
4. **Privilege Escalation (Self-Admin)**: User `user_1` creating `/users/user_1` with `role: "admin"` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: Updating `/users/user_1` with an extra key `isSuperAdmin: true` -> `PERMISSION_DENIED`.
6. **Temporal Forgery**: Creating `/sessions/sess_1` with a past client timestamp (`createdAt != request.time`) -> `PERMISSION_DENIED`.
7. **Orphaned Session Creation**: Creating `/sessions/sess_1` when `/users/$(request.auth.uid)` does not exist -> `PERMISSION_DENIED`.
8. **Cross-Tenant Session Read/List**: User `user_2` reading or listing `/sessions/sess_1` owned by `user_1` -> `PERMISSION_DENIED`.
9. **Immutable Field Mutation**: Updating `ownerId` or `createdAt` on `/sessions/sess_1` -> `PERMISSION_DENIED`.
10. **Audit Log Tampering**: Updating or deleting `/auditLogs/log_1` -> `PERMISSION_DENIED`.
11. **Denial-of-Wallet String Overflow**: Creating `/auditLogs/log_1` with `details` > 500 chars -> `PERMISSION_DENIED`.
12. **Path Variable Poisoning**: Accessing `/sessions/invalid$id!with@special#chars` -> `PERMISSION_DENIED`.
