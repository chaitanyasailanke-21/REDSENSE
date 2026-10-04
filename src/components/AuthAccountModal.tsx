import React, { useState } from 'react';
import { ShieldCheck, LogOut, Mail, Lock, User as UserIcon, AlertCircle, Cloud } from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  fbSignOut,
  ensureUserProfile,
  User,
} from '../firebase';

interface AuthAccountModalProps {
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  readingsCount: number;
  capturesCount: number;
}

export const AuthAccountModal: React.FC<AuthAccountModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  readingsCount,
  capturesCount,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmailProviderGuide, setShowEmailProviderGuide] = useState(false);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserProfile(result.user);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setShowEmailProviderGuide(false);

    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (cred.user.emailVerified) {
          await ensureUserProfile(cred.user);
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (fullName.trim()) {
          await updateProfile(cred.user, { displayName: fullName.trim() });
        }
        if (cred.user.emailVerified) {
          await ensureUserProfile(cred.user);
        }
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/operation-not-allowed') || msg.includes('auth/configuration-not-found')) {
        setShowEmailProviderGuide(true);
        setErrorMsg(
          'Email/Password provider is not yet enabled in your Firebase Console. Use Google Sign-In below (pre-configured) or follow the 3-step guide to enable Email/Password.'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await fbSignOut(auth);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <h3 className="text-base font-semibold text-slate-900">
              {currentUser ? 'Redsense Cloud Account' : mode === 'login' ? 'Sign In to Redsense Cloud' : 'Create Redsense Account'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>

        {currentUser ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-xl bg-slate-50 p-4 space-y-1.5">
              <div className="text-sm font-semibold text-slate-900">
                {currentUser.displayName || 'Authenticated Clinical User'}
              </div>
              <div className="text-xs text-slate-600 font-mono">{currentUser.email}</div>
              <div className="pt-2 text-xs text-emerald-700 flex items-center gap-1.5">
                <Cloud className="h-3.5 w-3.5" />
                <span>
                  Cloud Firestore Sync Active · {readingsCount} Readings · {capturesCount} Optical Captures
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Instant Google Cloud Sign-In (Pre-configured by ProvisionFirebase) */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Cloud className="h-4 w-4 text-sky-400" />
              <span>Continue with Google Cloud Account</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-200" />
              <span className="shrink mx-3 text-[11px] text-slate-400">
                or Email & Password
              </span>
              <div className="grow border-t border-slate-200" />
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
                {showEmailProviderGuide && (
                  <ol className="list-decimal pl-5 space-y-1 text-[11px] text-rose-900">
                    <li>Open the Firebase Console for project <code>gen-lang-client-0929582083</code>.</li>
                    <li>Navigate to <strong>Authentication → Sign-in method</strong>.</li>
                    <li>Enable the <strong>Email/Password</strong> provider and click Save.</li>
                  </ol>
                )}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Maya Lin"
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="patient@ezecheck.med"
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
              >
                {loading
                  ? 'Authenticating...'
                  : mode === 'login'
                  ? 'Sign In with Email'
                  : 'Create Account'}
              </button>
            </form>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setErrorMsg(null);
                }}
                className="text-xs font-medium text-sky-700 hover:underline cursor-pointer"
              >
                {mode === 'login'
                  ? 'Need an account? Register with Email'
                  : 'Already have an account? Sign In'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
