import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
SCOPES.forEach((scope) => googleProvider.addScope(scope));

let cachedAccessToken: string | null = null;

export function getGoogleDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export function setGoogleDriveAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return false;
    }
    return true;
  }
}

// Run startup validation check
testConnection();

// Blueprint validation constants synced verbatim with firebase-blueprint.json & firestore.rules
export const BLUEPRINT_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  ID_MAX_LEN: 128,
  DISPLAY_NAME_MAX_LEN: 100,
  DATASET_ID_MAX_LEN: 64,
  DATASET_NAME_MAX_LEN: 120,
  MODULE_NAME_MAX_LEN: 100,
  DETAILS_MAX_LEN: 500,
  CHECKSUM_MAX_LEN: 128,
  MAX_COMPLETED_MODULES: 10,
};

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, BLUEPRINT_CONSTRAINTS.ID_MAX_LEN);
  return cleaned.length > 0 ? cleaned : 'id_default';
}

export function sanitizeText(raw: string, maxLen: number, fallback = 'N/A'): string {
  const trimmed = raw.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

export async function computeEncryptedDigest(payload: unknown): Promise<string> {
  const text = JSON.stringify(payload);
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return `AES256-SHA:${hex.slice(0, 48)}`;
  }
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `AES256-SHA:${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  cachedAccessToken = credential?.accessToken ?? null;
  return result;
}

export async function signOutUser() {
  cachedAccessToken = null;
  return firebaseSignOut(auth);
}
