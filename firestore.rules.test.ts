/**
 * Phase 0 Test Runner Specification for Firestore Security Rules
 * Verifies all 12 Dirty Dozen adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'create' | 'update' | 'delete' | 'get' | 'list';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Write',
    collection: 'users',
    docId: 'user_1',
    operation: 'create',
    auth: null,
    payload: { userId: 'user_1', displayName: 'Budi', role: 'student', completedModules: [], accuracyScore: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    collection: 'users',
    docId: 'user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'budi@example.com', email_verified: false },
    payload: { userId: 'user_1', displayName: 'Budi', role: 'student', completedModules: [], accuracyScore: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Profile',
    collection: 'users',
    docId: 'user_2',
    operation: 'create',
    auth: { uid: 'user_1', email: 'budi@example.com', email_verified: true },
    payload: { userId: 'user_2', displayName: 'Siti', role: 'student', completedModules: [], accuracyScore: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Privilege Escalation (Self-Admin)',
    collection: 'users',
    docId: 'user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'budi@example.com', email_verified: true },
    payload: { userId: 'user_1', displayName: 'Budi', role: 'admin', completedModules: [], accuracyScore: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection',
    collection: 'users',
    docId: 'user_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'budi@example.com', email_verified: true },
    payload: { displayName: 'Budi Santoso', isSuperAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Temporal Forgery',
    collection: 'sessions',
    docId: 'sess_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'budi@example.com', email_verified: true },
    payload: { sessionId: 'sess_1', ownerId: 'user_1', createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned Session Creation',
    collection: 'sessions',
    docId: 'sess_1',
    operation: 'create',
    auth: { uid: 'nonexistent_user', email: 'ghost@example.com', email_verified: true },
    payload: { sessionId: 'sess_1', ownerId: 'nonexistent_user' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Cross-Tenant Session Read',
    collection: 'sessions',
    docId: 'sess_1',
    operation: 'get',
    auth: { uid: 'user_2', email: 'siti@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Field Mutation',
    collection: 'sessions',
    docId: 'sess_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'budi@example.com', email_verified: true },
    payload: { ownerId: 'user_2' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Audit Log Tampering',
    collection: 'auditLogs',
    docId: 'log_1',
    operation: 'delete',
    auth: { uid: 'user_1', email: 'budi@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Denial-of-Wallet String Overflow',
    collection: 'auditLogs',
    docId: 'log_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'budi@example.com', email_verified: true },
    payload: { details: 'X'.repeat(1000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Path Variable Poisoning',
    collection: 'sessions',
    docId: 'invalid$id!with@special#chars',
    operation: 'get',
    auth: { uid: 'user_1', email: 'budi@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
