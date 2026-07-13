"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import Link from "next/link";

import Background from "@/components/Background";
import LogoMark from "@/components/LogoMark";
import LanguageSelector from "@/components/LanguageSelector";

import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithApple,
  friendlyAuthError,
  withAuthTimeout,
} from "@/lib/firebase-auth";

import { getCurrentUserPlan } from "@/lib/plan-onboarding";
import { fadeUp } from "@/lib/animations";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPrompt = searchParams.get("vibe") ?? "";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Where to send the user right after they authenticate. A returning user
   * who already picked (and activated, via the fake checkout) a plan must
   * never be sent back to /pricing — only someone who hasn't finished
   * onboarding yet should land there.
   */
  async function goAfterAuth() {
    const appTarget = initialPrompt ? `/app?vibe=${encodeURIComponent(initialPrompt)}` : "/app";
    const pricingTarget = initialPrompt ? `/pricing?vibe=${encodeURIComponent(initialPrompt)}` : "/pricing";

    try {
      const profile = await getCurrentUserPlan();
      router.replace(profile?.onboardingCompleted ? appTarget : pricingTarget);
    } catch (profileError) {
      console.error("[login] Could not read plan profile", profileError);
      // Fail toward /pricing rather than silently dropping a paying user
      // into the app with an unverified state.
      router.replace(pricingTarget);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setLoading("email");

    try {
      if (mode === "signup") {
        await withAuthTimeout(
          signUpWithEmail(email, password, name)
        );
      } else {
        await withAuthTimeout(
          signInWithEmail(email, password)
        );
      }

      await goAfterAuth();
    } catch (authError) {
      console.error("[login] email auth failed", authError);
      setError(friendlyAuthError(authError));
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading("google");

    try {
      await withAuthTimeout(signInWithGoogle());
      await goAfterAuth();
    } catch (authError) {
      console.error("[login] google auth failed", authError);
      setError(friendlyAuthError(authError));
    } finally {
      setLoading(null);
    }
  }

  async function handleApple() {
    setError(null);
    setLoading("apple");

    try {
      await withAuthTimeout(signInWithApple());
      await goAfterAuth();
    } catch (authError) {
      console.error("[login] apple auth failed", authError);
      setError(friendlyAuthError(authError));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative min-h-screen">
      <Background />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 flex w-full max-w-md items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5"
          >
            <LogoMark size={36} />

            <span className="text-lg font-semibold tracking-tight text-soft">
              Mood DJ
            </span>
          </Link>

          <LanguageSelector />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="glass-card w-full max-w-md rounded-4xl p-8 sm:p-10"
        >
          <div className="mb-8 flex rounded-full border border-white/10 bg-white/5 p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className={`flex-1 rounded-full py-2 font-medium transition-colors ${
                mode === "signin"
                  ? "bg-spotify text-black"
                  : "text-muted hover:text-soft"
              }`}
            >
              {t.login.signIn}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`flex-1 rounded-full py-2 font-medium transition-colors ${
                mode === "signup"
                  ? "bg-spotify text-black"
                  : "text-muted hover:text-soft"
              }`}
            >
              {t.login.signUp}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{
                opacity: 0,
                x: mode === "signup" ? 12 : -12,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.25,
              }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {mode === "signup" && (
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />

                  <input
                    required
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                    }}
                    placeholder={t.login.namePlaceholder}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-soft placeholder:text-muted focus:border-spotify/50 focus:outline-none focus:ring-2 focus:ring-spotify/30"
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />

                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                  placeholder={t.login.emailPlaceholder}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-soft placeholder:text-muted focus:border-spotify/50 focus:outline-none focus:ring-2 focus:ring-spotify/30"
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />

                <input
                  required
                  type="password"
                  minLength={6}
                  autoComplete={
                    mode === "signup"
                      ? "new-password"
                      : "current-password"
                  }
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                  placeholder={t.login.passwordPlaceholder}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-soft placeholder:text-muted focus:border-spotify/50 focus:outline-none focus:ring-2 focus:ring-spotify/30"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading !== null}
                className="spotify-glow flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-spotify font-semibold text-black transition-transform hover:scale-[1.02] hover:bg-spotify-bright disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === "email" && (
                  <Loader2 className="size-4 animate-spin" />
                )}

                {mode === "signup"
                  ? t.login.submitSignUp
                  : t.login.submitSignIn}
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="my-6 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-white/10" />

            {t.login.or}

            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading !== null}
              className="hover-lift flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "google" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}

              {t.login.google}
            </button>

            <button
              type="button"
              onClick={handleApple}
              disabled={loading !== null}
              className="hover-lift flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "apple" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <AppleIcon />
              )}

              {t.login.apple}
            </button>
          </div>
        </motion.div>

        <p className="mt-8 max-w-sm text-center text-xs text-muted">
          {t.login.consent}
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82z"
      />

      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z"
      />

      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38z"
      />

      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.365 1.43c0 1.14-.468 2.201-1.235 3.01-.845.885-2.16 1.578-3.27 1.487-.145-1.086.442-2.24 1.19-3.037.834-.885 2.27-1.548 3.315-1.46zm3.79 16.3c-.474 1.093-.702 1.583-1.315 2.554-.856 1.36-2.06 3.055-3.556 3.07-1.33.013-1.673-.86-3.478-.848-1.805.012-2.183.862-3.514.848-1.495-.015-2.635-1.535-3.492-2.897C2.104 17.36 1.55 12.9 3.13 10.19c1.033-1.79 2.878-2.925 4.876-2.945 1.42-.02 2.762.947 3.632.947.87 0 2.5-1.17 4.216-1 .718.03 2.735.29 4.032 2.18-.104.066-2.408 1.4-2.383 4.183.028 3.323 2.94 4.43 2.652 4.176z" />
    </svg>
  );
}