"use client";

import { motion } from "framer-motion";

/**
 * @file LoadingScreen — full-page loading state with animated spinner.
 *
 * Intended to be rendered inside a layout or suspense boundary where
 * AnimatePresence wraps it for smooth entry/exit transitions.
 *
 * Animation timeline:
 *   1. Container fades in (0.3s)
 *   2. Spinner starts continuous rotation (1.2s per turn)
 *   3. Text fades + slides up after 0.2s delay (staggered reveal)
 */

export default function LoadingScreen() {
  return (
    <motion.div
      // Container: fades in when mounted, fades out when unmounted
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0f0f1a",
        color: "#a0a0b8",
        gap: 24,
      }}
    >
      {/* Spinner: border-circle with a single colored segment (top border), rotates 360° infinitely */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "3px solid #2a2a45",
          borderTopColor: "#ff2e63",
        }}
      />

      {/* Brand message: fades in and slides up, delayed 0.2s for staggered feel */}
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: 14, fontWeight: 500, letterSpacing: 1 }}
      >
        Loading DeFi Hack Chronicle...
      </motion.span>
    </motion.div>
  );
}
