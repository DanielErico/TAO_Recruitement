"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * NavigationProgress
 * A lightweight top loading bar that shows whenever the user navigates
 * to a new route in the Next.js App Router.
 *
 * How it works:
 * - Listens for mousedown / touchstart on any <a> link to START the bar
 * - Listens for pathname changes to COMPLETE the bar
 * - Uses pure CSS transitions — no external deps
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const incRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathname = useRef(pathname);

  // Clear all timers
  const clear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (incRef.current) clearInterval(incRef.current);
  };

  // Start the bar (called on link click)
  const start = () => {
    clear();
    setVisible(true);
    setProgress(10);

    // Slowly increment toward 85% — we never reach 100% until navigation completes
    let current = 10;
    incRef.current = setInterval(() => {
      current += Math.random() * 8;
      if (current > 85) {
        current = 85;
        clearInterval(incRef.current!);
      }
      setProgress(current);
    }, 400);
  };

  // Complete the bar (called when pathname changes)
  const complete = () => {
    clear();
    setProgress(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 400);
  };

  // Detect link clicks anywhere on the page
  useEffect(() => {
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Only trigger for same-origin internal navigation
      const isSameOrigin =
        href.startsWith("/") ||
        href.startsWith(window.location.origin);
      const isDownload = target.hasAttribute("download");
      const isNewTab = target.target === "_blank";
      const isModified =
        (e as MouseEvent).metaKey ||
        (e as MouseEvent).ctrlKey ||
        (e as MouseEvent).shiftKey;

      if (isSameOrigin && !isDownload && !isNewTab && !isModified) {
        start();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  // Complete when pathname changes
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      complete();
    }
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
    >
      <div
        className="h-full bg-[var(--color-brand)] shadow-[0_0_8px_var(--color-brand)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "200ms" : "400ms",
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
