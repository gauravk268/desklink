/**
 * Screen WakeLock hook — prevents the phone display from sleeping
 * while the kiosk dashboard is visible.
 *
 * Silent no-op on browsers that don't support the WakeLock API.
 * Re-acquires the lock whenever the tab becomes visible again
 * (Android Chrome releases it on visibility change).
 */

import { useEffect, useRef } from "react";

export function useWakeLock(): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    let active = true;

    async function acquire() {
      if (!active) return;
      try {
        if ("wakeLock" in navigator) {
          sentinelRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // NotAllowedError (background tab) or not supported — ignore.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };
  }, []);
}
