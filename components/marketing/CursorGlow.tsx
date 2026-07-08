"use client";

import { useEffect, useRef } from "react";

/**
 * A soft green light that follows the cursor across the whole page.
 * Pure vanilla JS (mousemove -> CSS custom properties), no state/re-renders.
 */
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 3;
    let x = targetX;
    let y = targetY;
    let raf = 0;

    function onMove(e: MouseEvent) {
      targetX = e.clientX;
      targetY = e.clientY;
    }

    function tick() {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      el!.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 -z-[5] size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.15] blur-[90px]"
      style={{ background: "radial-gradient(circle, #1ED760, transparent 70%)" }}
    />
  );
}
