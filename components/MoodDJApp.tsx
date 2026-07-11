"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { ApiError, GeneratedPlaylistResponse, PushToSpotifyResponse } from "@/types";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { signOutUser } from "@/lib/firebase-auth";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import LanguageSelector from "@/components/LanguageSelector";
import { Settings } from "lucide-react";
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

function goToSpotifyLogin() {
  window.location.href = "/api/auth/spotify/login";
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

  const generate = async (pushToSpotify: boolean) => {
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
        body: JSON.stringify({ prompt, pushToSpotify }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError;
        const showConnect = data.code === "not_connected" || data.code === "session_expired";
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
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError;
        const showConnect = data.code === "not_connected" || data.code === "session_expired";
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
      <div className="mb-2 flex items-center justify-between gap-2">
        <AnimatedLogo size={32} withWordmark />
        <div className="flex items-center gap-2">
          <LanguageSelector className="hidden sm:block" />
          <a
            href="/settings"
            aria-label="Settings"
            className="rounded-full border border-white/10 bg-white/5 p-2.5 text-muted transition-colors hover:text-soft"
          >
            <Settings className="size-4" />
          </a>
          {authChecked && (
            <>
              {firebaseUser ? (
                <button
                  onClick={() => signOutUser()}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-soft"
                >
                  {firebaseUser.email} · Sign out
                </button>
              ) : (
                <a
                  href="/login"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-soft"
                >
                  {t.app.signIn}
                </a>
              )}
            </>
          )}
          {connected ? (
            <a
              href="/api/auth/spotify/logout"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-soft"
            >
              {t.app.spotifyConnected}
            </a>
          ) : (
            <button
              onClick={goToSpotifyLogin}
              className="rounded-full border border-spotify/30 bg-spotify/10 px-4 py-2 text-xs font-medium text-spotify-bright transition-colors hover:bg-spotify/20"
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
