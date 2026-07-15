"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * App Router template: remounts on every navigation, giving each page a
 * subtle fade + rise enter transition. Transform/opacity only, and skipped
 * entirely for users who prefer reduced motion.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
