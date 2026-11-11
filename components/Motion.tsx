"use client";

import { MotionConfig } from "framer-motion";

/**
 * Wraps the whole site so every framer-motion animation respects the
 * "Reduce motion" setting: movement (slides, the password shake, the nav
 * underline) is skipped, and only fades remain.
 */
export default function Motion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
