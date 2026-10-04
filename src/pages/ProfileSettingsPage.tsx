import React, { useState } from 'react';
import {
  ShieldCheck,
  Cloud,
  LogOut,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { User } from '../firebase';
import { RedsenseHardwareConfig } from '../models/redsenseTypes';
import { firebaseService } from '../services/firebaseService';
import { FlutterCodeStudio } from '../components/FlutterCodeStudio';

interface ProfileSettingsPageProps {
  mode: 'profile' | 'settings';
  currentUser: User | null;
  syncStatus: 'Offline' | 'Syncing' | 'Synced';
  config: RedsenseHardwareConfig;
  onUpdateConfig: (next: RedsenseHardwareConfig) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({
  mode,
  currentUser,
  syncStatus,
  config,
  onUpdateConfig,
  darkMode,
  onToggleDarkMode,
}) => {
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'reset'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [optionalAge, setOptionalAge] = useState('');
  const [optionalSex, setOptionalSex] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setFeedback(null);
    try {
      await firebaseService.signInWithGoogle();
      setFeedback('Authenticated with Google Cloud Account.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);

    if (authTab === 'register' && password !== confirmPassword) {
      setErrorMsg('Password and Confirm Password must match.');
      return;
    }

    setLoading(true);
    try {
      if (authTab === 'login') {
        await firebaseService.loginWithEmail(email, password);
        setFeedback('Logged in successfully.');
      } else if (authTab === 'register') {
        await firebaseService.registerWithEmail(fullName, email, password);
        setFeedback('Account registered successfully.');
      } else {
        await firebaseService.sendPasswordReset(email);
        setFeedback('Password reset link sent to your email address.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/operation-not-allowed')) {
        setErrorMsg(
          'Email/Password provider is not yet enabled in your Firebase Console. Use "Continue with Google Cloud Account" above or enable Email/Password in Firebase Console → Authentication.'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {mode === 'profile'
              ? 'Participant Profile & Cloud Authentication'
              : 'REDSENSE System Settings, Architecture & Flutter Codebase'}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Manage authentication, offline/cloud sync status, hardware IP endpoints, medical disclaimers, and the Flutter cross-platform source tree.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-600">
            Cloud Status: <strong>{syncStatus}</strong>
          </span>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{darkMode ? 'Light Theme' : 'Dark Theme'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Authentication & Profile */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-600" />
            <h3 className="text-base font-semibold text-slate-900">
              Firebase Authentication &amp; Profile
            </h3>
          </div>

          {currentUser ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 space-y-1.5 text-xs">
                <div className="text-sm font-bold text-slate-900">
                  {currentUser.displayName || 'Authenticated Researcher / Participant'}
                </div>
                <div className="font-mono text-slate-600">{currentUser.email}</div>
                <div className="font-mono text-slate-400">UID: {currentUser.uid}</div>
                <div className="pt-2 text-emerald-700 font-semibold flex items-center gap-1.5">
                  <Cloud className="h-3.5 w-3.5" />
                  <span>Sync Status: {syncStatus}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => firebaseService.logout()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Cloud className="h-4 w-4 text-sky-400" />
                <span>Continue with Google Cloud Account</span>
              </button>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(
                  [
                    { id: 'login', label: 'Login' },
                    { id: 'register', label: 'Register' },
                    { id: 'reset', label: 'Forgot Password' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setAuthTab(t.id);
                      setErrorMsg(null);
                      setFeedback(null);
                    }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      authTab === t.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {feedback && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-3 text-xs">
                {authTab === 'register' && (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Chaitanya Sai"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@redsense.org"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                  />
                </div>

                {authTab !== 'reset' && (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                    />
                  </div>
                )}

                {authTab === 'register' && (
                  <>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Age (Optional)
                        </label>
                        <input
                          type="number"
                          value={optionalAge}
                          onChange={(e) => setOptionalAge(e.target.value)}
                          placeholder="24"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Sex (Optional)
                        </label>
                        <input
                          type="text"
                          value={optionalSex}
                          onChange={(e) => setOptionalSex(e.target.value)}
                          placeholder="Optional"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                        />
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-sky-600 px-4 py-2.5 font-semibold text-white hover:bg-sky-700 transition-colors cursor-pointer"
                >
                  {authTab === 'login'
                    ? 'Login'
                    : authTab === 'register'
                    ? 'Create Research Account'
                    : 'Send Password Reset Email'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Hardware Settings, Privacy & Medical Disclaimer */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Hardware &amp; Network Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ESP32 Host IP / WebSocket
                </label>
                <input
                  type="text"
                  value={config.esp32HostIp}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, esp32HostIp: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  ESP32-CAM IP Address
                </label>
                <input
                  type="text"
                  value={config.esp32CamIp}
                  onChange={(e) =>
                    onUpdateConfig({ ...config, esp32CamIp: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              About REDSENSE, Privacy &amp; Medical Disclaimer
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>REDSENSE</strong> (Developed by Chaitanya Sai) is a low-cost, non-invasive anemia screening research platform integrating ESP32, MAX30102 optical pulse oximetry, ESP32-CAM nailbed &amp; conjunctival imaging, and AS7341 415nm–940nm spectral measurements.
            </p>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 leading-relaxed">
              <strong>MEDICAL DISCLAIMER:</strong> REDSENSE is a research and screening prototype, NOT a medical diagnostic device. It never diagnoses anemia. All outputs are screening indicators only (<em>&ldquo;Elevated anemia risk indicated&rdquo;</em>, <em>&ldquo;Lower anemia risk indicated&rdquo;</em>, <em>&ldquo;Insufficient data&rdquo;</em>). Laboratory hemoglobin/CBC testing and evaluation by a qualified healthcare professional are required for clinical confirmation.
            </div>
          </div>
        </div>
      </div>

      {/* Complete Flutter Cross-Platform Project & README Studio */}
      <FlutterCodeStudio />
    </div>
  );
};
