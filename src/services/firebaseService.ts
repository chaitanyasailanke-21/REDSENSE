import { sendPasswordResetEmail } from 'firebase/auth';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fbSignOut,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  ensureUserProfile,
  handleFirestoreError,
  OperationType,
  User,
} from '../firebase';
import { ScreeningSessionRecord } from '../models/redsenseTypes';

export class FirebaseService {
  async signInWithGoogle(): Promise<User> {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user.emailVerified) {
      await ensureUserProfile(res.user, 'REDSENSE-ESP32-001');
    }
    return res.user;
  }

  async loginWithEmail(email: string, password: string): Promise<User> {
    const res = await signInWithEmailAndPassword(auth, email.trim(), password);
    if (res.user.emailVerified) {
      await ensureUserProfile(res.user, 'REDSENSE-ESP32-001');
    }
    return res.user;
  }

  async registerWithEmail(
    fullName: string,
    email: string,
    password: string
  ): Promise<User> {
    const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (fullName.trim()) {
      await updateProfile(res.user, { displayName: fullName.trim() });
    }
    if (res.user.emailVerified) {
      await ensureUserProfile(res.user, 'REDSENSE-ESP32-001');
    }
    return res.user;
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  async logout(): Promise<void> {
    await fbSignOut(auth);
  }

  async syncScreeningSessionToCloud(
    user: User | null,
    session: ScreeningSessionRecord
  ): Promise<'Synced' | 'Offline'> {
    if (!user || !user.emailVerified) {
      return 'Offline';
    }
    const path = `screening_sessions/${session.id}`;
    try {
      await ensureUserProfile(user, session.deviceId);
      await setDoc(doc(db, 'screening_sessions', session.id), {
        ownerId: user.uid,
        deviceId: session.deviceId.slice(0, 64),
        heartRate: session.heartRate,
        spo2: session.spo2,
        signalQuality: session.signalQuality,
        irRaw: session.irRaw,
        redRaw: session.redRaw,
        screeningOutcome: session.screeningOutcome,
        confidence: session.confidence,
        modelVersion: session.modelVersion.slice(0, 64),
        isDemo: session.isDemo,
        notes: (session.notes || '').slice(0, 1000),
        recordedAtMs: session.timestamp,
        createdAt: serverTimestamp(),
      });
      return 'Synced';
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  }

  async deleteSessionFromCloud(user: User | null, sessionId: string): Promise<void> {
    if (!user || !user.emailVerified || sessionId.startsWith('scr_seed_')) return;
    const path = `screening_sessions/${sessionId}`;
    try {
      await deleteDoc(doc(db, 'screening_sessions', sessionId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }
}

export const firebaseService = new FirebaseService();
