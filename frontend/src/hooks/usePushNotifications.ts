import { useState, useEffect } from "react";
const API_BASE = import.meta.env.VITE_API_URL as string;

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as
  | string
  | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

export type PushState =
  | "unsupported"
  | "denied"
  | "subscribed"
  | "unsubscribed"
  | "loading";

const PREFS_KEY = "push_preferences";

function loadStoredPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    // follow_all=true (default) means no filter — send empty arrays to server
    const followAll = saved.follow_all !== false;
    if (followAll) return { discipline_ids: [], team_ids: [] };
    return {
      discipline_ids: Array.isArray(saved.discipline_ids)
        ? saved.discipline_ids
        : [],
      team_ids: Array.isArray(saved.team_ids) ? saved.team_ids : [],
    };
  } catch {
    return { discipline_ids: [], team_ids: [] };
  }
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "unsubscribed");
    });
  }, []);

  const subscribe = async () => {
    if (!VAPID_PUBLIC_KEY) {
      console.warn("VITE_VAPID_PUBLIC_KEY is not set");
      return;
    }
    setState("loading");
    let browserSub: PushSubscription | null = null;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      browserSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const prefs = loadStoredPrefs();
      const res = await fetch(`${API_BASE}/api/push/?action=subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...browserSub.toJSON(), ...prefs }),
      });
      if (!res.ok) {
        // Server failed to save — roll back browser subscription so state stays consistent
        await browserSub.unsubscribe();
        setState("unsubscribed");
        return;
      }
      setState("subscribed");
    } catch (err) {
      console.error("Push subscribe failed:", err);
      if (browserSub) {
        try {
          await browserSub.unsubscribe();
        } catch {
          /* ignore */
        }
      }
      setState("unsubscribed");
    }
  };

  const fetchPrefs = async (): Promise<{
    discipline_ids: number[];
    team_ids: number[];
  } | null> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return null;
      const res = await fetch(`${API_BASE}/api/push/?action=get-prefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      if (!res.ok) {
        if (res.status === 404) {
          // Orphaned browser subscription (DB record missing) — re-register silently
          const prefs = loadStoredPrefs();
          fetch(`${API_BASE}/api/push/?action=subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...sub.toJSON(), ...prefs }),
          }).catch(() => {
            /* best-effort */
          });
        }
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  };

  const updatePrefs = async (discipline_ids: number[], team_ids: number[]) => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const res = await fetch(`${API_BASE}/api/push/?action=update-prefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          discipline_ids,
          team_ids,
        }),
      });
      if (!res.ok && res.status === 404) {
        // Orphaned — re-register with current prefs
        fetch(`${API_BASE}/api/push/?action=subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...sub.toJSON(), discipline_ids, team_ids }),
        }).catch(() => {
          /* best-effort */
        });
      }
    } catch (err) {
      console.error("Push update prefs failed:", err);
    }
  };

  const unsubscribe = async () => {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${API_BASE}/api/push/`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
      setState("subscribed");
    }
  };

  return { state, subscribe, unsubscribe, updatePrefs, fetchPrefs };
}
