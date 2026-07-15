"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type {
  ApiError,
  GeneratedPlaylistResponse,
  GenerationOptions,
  PushToSpotifyResponse,
} from "@/types";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { signOutUser } from "@/lib/firebase-auth";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import LanguageSelector from "@/components/LanguageSelector";
import { Settings, Gift, History } from "lucide-react";
import Hero from "./Hero";
import MoodInput from "./MoodInput";
import LoadingExperience from "./LoadingExperience";
import PlaylistResult from "./PlaylistResult";
import ErrorCard from "./ErrorCard";
import InstallOnIphone from "./InstallOnIphone";
import AnimatedLogo from "./AnimatedLogo";

type Status = "idle" | "loading" | "result" | "error";

type MoodDJAppProps = {
  initialConnected: boolean;
  authError?: string;
};

/** True when the API says the fix is reconnecting Spotify (not just retrying). */
function needsSpotifyReconnect(data: ApiError): boolean {
  return (
    data.reconnectRequired === true ||
    data.code === "not_connected" ||
    data.code === "session_expired" ||
    data.code === "spotify_reauth_required" ||
    data.code === "spotify_insufficient_scope" ||
    data.code === "spotify_not_registered"
  );
}

export default function MoodDJApp({ initialConnected, authError }: MoodDJAppProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const { user: firebaseUser, checked: authChecked } = useFirebaseUser();
  const [connected, setConnected] = useState(initialConnected);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<GeneratedPlaylistResponse | null>(null);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<{
    message: string;
    showConnect: boolean;
    showLogin: boolean;
    showUpgrade: boolean;
  }>({
    message: authError ? "Your Spotify connection failed. Please connect again." : "",
    showConnect: Boolean(authError),
    showLogin: false,
    showUpgrade: false,
  });

  const goToSpotifyLogin = async () => {
    if (!firebaseUser) {
      router.push("/login");
      return;
    }
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch("/api/auth/spotify/login", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = (await res.json()) as { authorizeUrl?: string; error?: string };
      if (!res.ok || !data.authorizeUrl) throw new Error(data.error || "Spotify login failed");
      window.location.assign(data.authorizeUrl);
    } catch {
      setError({
        message: "Could not start Spotify connection. Please try again.",
        showConnect: true,
        showLogin: false,
        showUpgrade: false,
      });
      setStatus("error");
    }
  };

  const disconnectSpotify = async () => {
    if (!firebaseUser) return;
    const idToken = await firebaseUser.getIdToken();
    await fetch("/api/auth/spotify/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
    });
    setConnected(false);
  };

  useEffect(() => {
    if (!firebaseUser) {
      setConnected(false);
      return;
    }
    firebaseUser.getIdToken().then((idToken) =>
      fetch("/api/auth/spotify/status", {
        headers: { Authorization: `Bearer ${idToken}` },
      })
        .then((res) => res.json())
        .then((data) => setConnected(data.connected === true))
        .catch(() => setConnected(false))
    );
  }, [firebaseUser]);

  // If the user just verified their email (e.g. clicked the link in a
  // separate tab), claim the one-time referee welcome bonus. Safe to call on
  // every load — the server re-checks emailVerified and is idempotent.
  useEffect(() => {
    if (!firebaseUser) return;
    let cancelled = false;
    (async () => {
      try {
        await firebaseUser.reload();
        if (cancelled || !firebaseUser.emailVerified) return;
        const idToken = await firebaseUser.getIdToken();
        await fetch("/api/referral/claim-verified-bonus", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });
      } catch {
        /* best-effort — retried on next load */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  const generate = async (pushToSpotify: boolean, options: GenerationOptions) => {
    if (!prompt.trim()) {
      setStatus("error");
      setError({
        message: "Describe a vibe before generating your playlist.",
        showConnect: false,
        showLogin: false,
        showUpgrade: false,
      });
      return;
    }
    if (!firebaseUser) {
      router.push(`/login?vibe=${encodeURIComponent(prompt.trim())}`);
      return;
    }

    setStatus("loading");
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ prompt, pushToSpotify, options }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError;
        const showConnect = needsSpotifyReconnect(data);
        const showLogin = data.code === "not_authenticated";
        const showUpgrade = data.code === "quota_exceeded" || data.code === "upgrade_required";
        if (showConnect) setConnected(false);
        setError({ message: data.error || "Something went wrong. Please try again.", showConnect, showLogin, showUpgrade });
        setStatus("error");
        return;
      }

      const data = (await res.json()) as GeneratedPlaylistResponse;
      setResult(data);
      setStatus("result");
    } catch {
      setError({
        message: "Network error. Please check your connection and try again.",
        showConnect: false,
        showLogin: false,
        showUpgrade: false,
      });
      setStatus("error");
    }
  };

  const pushCurrentPlaylist = async (existingPlaylistId?: string) => {
    if (!result || result.pushedToSpotify) return;
    if (!firebaseUser) {
      router.push("/login");
      return;
    }
    setPushing(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch("/api/push-to-spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          playlistName: result.playlistName,
          playlistDescription: result.playlistDescription,
          trackUris: result.tracks.map((t) => t.uri),
          existingPlaylistId,
          coverImageUrl: result.coverImageUrl,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError;
        const showConnect = needsSpotifyReconnect(data);
        const showLogin = data.code === "not_authenticated";
        const showUpgrade = data.code === "upgrade_required";
        if (showConnect) setConnected(false);
        setError({
          message: data.error || "Could not push this playlist to Spotify.",
          showConnect,
          showLogin,
          showUpgrade,
        });
        setStatus("error");
        return;
      }

      const data = (await res.json()) as PushToSpotifyResponse;
      setResult({ ...result, pushedToSpotify: true, ...data });
    } catch {
      setError({
        message: "Network error. Please check your connection and try again.",
        showConnect: false,
        showLogin: false,
        showUpgrade: false,
      });
      setStatus("error");
    } finally {
      setPushing(false);
    }
  };

  const reset = () => {
    setStatus("idle");
    setResult(null);
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      {/* Top bar: Mood DJ account + Spotify connection */}
      <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <AnimatedLogo size={32} withWordmark />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <LanguageSelector className="hidden sm:block" />
          <a
            href="/historique"
            aria-label="Playlist history"
            title="Playlist history"
            className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2.5 text-muted transition-colors hover:text-soft"
          >
            <History className="size-4" />
          </a>
          <a
            href="/parrainage"
            aria-label="Referral program"
            title="Referral program"
            className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2.5 text-muted transition-colors hover:text-soft"
          >
            <Gift className="size-4" />
          </a>
          <a
            href="/settings"
            aria-label="Settings"
            title="Settings"
            className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2.5 text-muted transition-colors hover:text-soft"
          >
            <Settings className="size-4" />
          </a>
          {authChecked && (
            <>
              {firebaseUser ? (
                <button
                  onClick={async () => {
                    await disconnectSpotify().catch(() => {});
                    await signOutUser();
                  }}
                  title={firebaseUser.email ?? undefined}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-soft"
                >
                  Sign out
                </button>
              ) : (
                <a
                  href="/login"
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-soft"
                >
                  {t.app.signIn}
                </a>
              )}
            </>
          )}
          {connected ? (
            <button
              type="button"
              onClick={disconnectSpotify}
              className="shrink-0 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-soft"
            >
              {t.app.spotifyConnected}
            </button>
          ) : (
            <button
              onClick={goToSpotifyLogin}
              className="shrink-0 rounded-full border border-spotify/30 bg-spotify/10 px-4 py-2 text-xs font-medium text-spotify-bright transition-colors hover:bg-spotify/20"
            >
              {t.app.connectSpotify}
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 sm:mt-16">
        <Hero />
      </div>

      <div className="mt-10 w-full">
        <MoodInput
          value={prompt}
          onChange={setPrompt}
          onGenerate={generate}
          onConnect={goToSpotifyLogin}
          loading={status === "loading"}
          connected={connected}
        />
      </div>

      <div className="mt-8 w-full">
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div key="loading" exit={{ opacity: 0 }}>
              <LoadingExperience />
            </motion.div>
          )}
          {status === "result" && result && (
            <motion.div key="result">
              <PlaylistResult
                data={result}
                connected={connected}
                pushing={pushing}
                onPush={pushCurrentPlaylist}
                onConnect={goToSpotifyLogin}
                onReset={reset}
              />
            </motion.div>
          )}
          {status === "error" && error.message && (
            <motion.div key="error" exit={{ opacity: 0 }}>
              <ErrorCard
                message={error.message}
                showConnect={error.showConnect}
                showLogin={error.showLogin}
                showUpgrade={error.showUpgrade}
                onRetry={reset}
                onConnect={goToSpotifyLogin}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1" />
      <InstallOnIphone />
    </main>
  );
}
