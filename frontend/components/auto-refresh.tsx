"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;

function hasPauseTarget(selector: string | undefined): boolean {
  return Boolean(selector && document.querySelector(selector));
}

export function AutoRefresh({
  intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
  pauseWhenSelector,
}: {
  intervalMs?: number;
  pauseWhenSelector?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    let lastRefreshAt = Date.now();

    function canRefresh() {
      return !document.hidden && !hasPauseTarget(pauseWhenSelector);
    }

    function refresh() {
      if (!canRefresh()) {
        return;
      }
      lastRefreshAt = Date.now();
      startTransition(() => router.refresh());
    }

    function refreshIfStale() {
      if (Date.now() - lastRefreshAt >= intervalMs) {
        refresh();
      }
    }

    const intervalId = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refreshIfStale);
    window.addEventListener("focus", refreshIfStale);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.removeEventListener("focus", refreshIfStale);
    };
  }, [intervalMs, pauseWhenSelector, router, startTransition]);

  return null;
}
