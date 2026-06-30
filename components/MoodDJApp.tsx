"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GeneratedPlaylistResponse, ApiError } from "@/types";
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
  const [connected, setConnected] = useState(initialConnected);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<GeneratedPlaylistResponse | null>(null);
  const [error, setError] = useState<{ message: string; showConnect: boolean }>({
    message: authError ? "Your Spotify connection failed. Please connect again." : "",
    showConnect: Boolean(authError),
  });

  const generate = async () => {
    if (!prompt.trim()) {
      setStatus("error");
      setError({ message: "Describe a vibe before generating your playlist.", showConnect: false });
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as ApiError;
        const showConnect = data.code === "not_connected" || data.code === "session_expired";
        if (showConnect) setConnected(false);
        setError({
          message: data.error || "Something went wrong. Please try again.",
          showConnect,
        });
        setStatus("error");
        return;
      }

      const data = (await res.json()) as GeneratedPlaylistResponse;
      setResult(data);
      setStatus("result");
    } catch {
      setError({ message: "Network error. Please check your connection and try again.", showConnect: false });
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setResult(null);
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      {/* Top bar with logout when connected */}
      <div className="mb-2 flex items-center justify-between">
        <AnimatedLogo size={32} withWordmark />
        {connected ? (
          <a
            href="/api/auth/spotify/logout"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-soft"
          >
            Connected · Logout
          </a>
        ) : (
          <button
            onClick={goToSpotifyLogin}
            className="rounded-full border border-spotify/30 bg-spotify/10 px-4 py-2 text-xs font-medium text-spotify-bright transition-colors hover:bg-spotify/20"
          >
            Connect Spotify
          </button>
        )}
      </div>

      <div className="mt-10 sm:mt-16">
        <Hero />
      </div>

      <div className="mt-10 w-full">
        <MoodInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={generate}
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
              <PlaylistResult data={result} onReset={reset} />
            </motion.div>
          )}
          {status === "error" && error.message && (
            <motion.div key="error" exit={{ opacity: 0 }}>
              <ErrorCard
                message={error.message}
                showConnect={error.showConnect}
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
