import PageTransition from "@/components/PageTransition";

// template.tsx (not layout.tsx) — template re-mounts on route change,
// which is required for AnimatePresence to detect exit/enter animations.
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
