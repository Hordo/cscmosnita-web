import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL as string;
// How many ms to wait before showing the banner
const SHOW_BANNER_AFTER_MS = 2000;
// Interval between retry pings while the server is sleeping
const RETRY_INTERVAL_MS = 5000;

type Status = "idle" | "waking" | "awake";

export default function ServerWakeupBanner() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [visible, setVisible] = useState(false);

  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didWake = useRef(false);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (retryRef.current) clearInterval(retryRef.current);
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
  };

  const ping = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      const res = await fetch(`${API_BASE}/api/disciplines/`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    startRef.current = Date.now();

    // Schedule the banner to appear if the server hasn't responded yet
    showTimerRef.current = setTimeout(() => {
      setStatus("waking");
      setVisible(true);
      // Start elapsed-seconds counter
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    }, SHOW_BANNER_AFTER_MS);

    // Keep pinging until the server responds
    const attemptPing = async () => {
      const ok = await ping();
      if (ok && !didWake.current) {
        didWake.current = true;
        clearTimers();
        // If banner was shown, briefly show "awake" then fade out
        setStatus("awake");
        setVisible(true);
        setTimeout(() => setVisible(false), 3000);
      }
    };

    // First ping immediately
    attemptPing();
    // Then retry on interval
    retryRef.current = setInterval(attemptPing, RETRY_INTERVAL_MS);

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  if (status === "awake") {
    return (
      <div
        style={bannerStyle}
        className="alert alert-success d-flex align-items-center gap-2 mb-0 shadow"
        role="alert"
      >
        <span style={{ fontSize: "1.2rem" }}>✅</span>
        <span>{t("server.awake")}</span>
      </div>
    );
  }

  return (
    <div
      style={bannerStyle}
      className="alert alert-warning d-flex align-items-center gap-3 mb-0 shadow"
      role="status"
    >
      <div
        className="spinner-border spinner-border-sm text-warning"
        style={{ flexShrink: 0, color: "#856404" }}
        aria-hidden="true"
      />
      <div>
        <strong>{t("server.waking_title")}</strong>
        <div style={{ fontSize: "0.85rem" }}>
          {t("server.waking_sub")}
          {elapsed > 0 && (
            <span style={{ marginLeft: 6, opacity: 0.75 }}>({elapsed}s)</span>
          )}
        </div>
      </div>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  borderRadius: 0,
  padding: "0.75rem 1.25rem",
};
