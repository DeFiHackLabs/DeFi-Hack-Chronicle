"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * @file PageTransition — animated route transitions using framer-motion.
 *
 * IMPORTANT: This component is used in app/template.tsx (NOT layout.tsx).
 * Layouts persist across navigations — AnimatePresence would never
 * detect a child change. Templates re-mount on every route, so
 * key={pathname} triggers the exit/enter animation reliably.
 *
 * Animation: fade + vertical slide (12px up on enter, 12px down on exit).
 * Duration: 0.3s. mode="wait" ensures the old page exits fully before
 * the new page enters (no overlap flash).
 */

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        // Keyed on pathname: changing route re-mounts this div, triggering the animation
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
