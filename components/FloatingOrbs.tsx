"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * Blurred green orbs that drift slowly behind the content, with a light
 * scroll parallax (each orb moves at a slightly different speed). Transform
 * only — no layout or paint work — and static under reduced motion.
 */
export default function FloatingOrbs() {
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();

  const ySlow = useTransform(scrollY, [0, 1200], [0, -60]);
  const yMedium = useTransform(scrollY, [0, 1200], [0, -110]);
  const yFast = useTransform(scrollY, [0, 1200], [0, 80]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.span
        className="floating-orb"
        style={{
          top: "-6rem",
          left: "-4rem",
          width: "28rem",
          height: "28rem",
          background: "rgba(29, 185, 84, 0.22)",
          animationDelay: "0s",
          y: reduceMotion ? 0 : ySlow,
        }}
      />
      <motion.span
        className="floating-orb"
        style={{
          top: "20%",
          right: "-6rem",
          width: "24rem",
          height: "24rem",
          background: "rgba(30, 215, 96, 0.16)",
          animationDelay: "-4s",
          y: reduceMotion ? 0 : yMedium,
        }}
      />
      <motion.span
        className="floating-orb"
        style={{
          bottom: "-8rem",
          left: "30%",
          width: "30rem",
          height: "30rem",
          background: "rgba(16, 185, 129, 0.12)",
          animationDelay: "-8s",
          y: reduceMotion ? 0 : yFast,
        }}
      />
    </div>
  );
}
