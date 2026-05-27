import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePushNotifications } from "../hooks/usePushNotifications";
const API_BASE = import.meta.env.VITE_API_URL as string;

const PREFS_KEY = "push_preferences";

interface Discipline {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
  discipline: string; // discipline name string
}

interface Prefs {
  discipline_ids: number[];
  team_ids: number[];
  follow_all: boolean;
}

function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return {
      discipline_ids: Array.isArray(saved.discipline_ids)
        ? saved.discipline_ids
        : [],
      team_ids: Array.isArray(saved.team_ids) ? saved.team_ids : [],
      follow_all: saved.follow_all !== false, // default true
    };
  } catch {
    return { discipline_ids: [], team_ids: [], follow_all: true };
  }
}

function savePrefs(prefs: Prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

const NotificationPreferencesPage: React.FC = () => {
  const { t } = useTranslation();
  const { state, subscribe, unsubscribe, updatePrefs, fetchPrefs } =
    usePushNotifications();

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [prefs, setPrefs] = useState<Prefs>({
    discipline_ids: [],
    team_ids: [],
    follow_all: true,
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());

    Promise.all([
      fetch(`${API_BASE}/api/disciplines/`),
      fetch(`${API_BASE}/api/teams/`),
    ])
      .then(([dr, tr]) => Promise.all([dr.json(), tr.json()]))
      .then(([dData, tData]) => {
        setDisciplines(dData);
        setTeams(tData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // When already subscribed, sync preferences from the server back to local state.
  // This handles: page refresh, cleared localStorage, new browser on same device.
  useEffect(() => {
    if (state !== "subscribed") return;
    fetchPrefs().then((serverPrefs) => {
      if (!serverPrefs) return;
      const follow_all =
        serverPrefs.discipline_ids.length === 0 &&
        serverPrefs.team_ids.length === 0;
      const synced: Prefs = {
        discipline_ids: serverPrefs.discipline_ids,
        team_ids: serverPrefs.team_ids,
        follow_all,
      };
      setPrefs(synced);
      savePrefs(synced);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const toggleDisc = (id: number) => {
    setPrefs((prev) => {
      const has = prev.discipline_ids.includes(id);
      const discipline_ids = has
        ? prev.discipline_ids.filter((d) => d !== id)
        : [...prev.discipline_ids, id];
      // If unchecking a discipline, remove its teams too
      const discName = disciplines.find((d) => d.id === id)?.name;
      const team_ids = has
        ? prev.team_ids.filter((tid) => {
            const t = teams.find((t) => t.id === tid);
            return t?.discipline !== discName;
          })
        : prev.team_ids;
      return { ...prev, discipline_ids, team_ids };
    });
    setSaved(false);
  };

  const toggleTeam = (id: number) => {
    setPrefs((prev) => {
      const has = prev.team_ids.includes(id);
      return {
        ...prev,
        team_ids: has
          ? prev.team_ids.filter((t) => t !== id)
          : [...prev.team_ids, id],
      };
    });
    setSaved(false);
  };

  const effectiveDisciplineIds = prefs.follow_all ? [] : prefs.discipline_ids;
  const effectiveTeamIds = prefs.follow_all ? [] : prefs.team_ids;

  const handleSave = () => {
    try {
      savePrefs(prefs);
    } catch {
      // localStorage may be unavailable (private mode, quota exceeded)
    }
    if (state === "subscribed") {
      updatePrefs(effectiveDisciplineIds, effectiveTeamIds).catch(() => {});
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSubscribe = async () => {
    savePrefs(prefs);
    await subscribe();
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 700 }}>
      <h2 className="mb-1">
        {t("notifPrefs.title", "Notification Preferences")}
      </h2>
      <p className="text-muted mb-4">
        {t(
          "notifPrefs.subtitle",
          "Choose which disciplines and teams you want to receive notifications for.",
        )}
      </p>

      {/* Push toggle */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body d-flex align-items-center justify-content-between gap-3">
          <div>
            <h5 className="mb-1">
              {t("notifPrefs.pushTitle", "Push Notifications")}
            </h5>
            <p className="text-muted mb-0 small">
              {state === "subscribed"
                ? t(
                    "notifPrefs.pushOn",
                    "You are receiving push notifications.",
                  )
                : state === "denied"
                  ? t(
                      "notifPrefs.pushDenied",
                      "Notifications are blocked in your browser.",
                    )
                  : state === "unsupported"
                    ? t(
                        "notifPrefs.pushUnsupported",
                        "Your browser does not support push notifications.",
                      )
                    : t(
                        "notifPrefs.pushOff",
                        "Enable to receive match and training alerts.",
                      )}
            </p>
          </div>
          {state === "subscribed" ? (
            <button className="btn btn-outline-danger" onClick={unsubscribe}>
              🔕 {t("notifPrefs.unsubscribe", "Unsubscribe")}
            </button>
          ) : state === "unsupported" || state === "denied" ? null : (
            <button
              className="btn btn-primary"
              onClick={handleSubscribe}
              disabled={state === "loading"}
            >
              🔔 {t("notifPrefs.subscribe", "Subscribe")}
            </button>
          )}
        </div>
      </div>

      {/* Follow all toggle */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="followAll"
              checked={prefs.follow_all}
              onChange={() => {
                setPrefs((prev) => ({
                  ...prev,
                  follow_all: !prev.follow_all,
                }));
                setSaved(false);
              }}
            />
            <label className="form-check-label fw-semibold" htmlFor="followAll">
              {t(
                "notifPrefs.followAll",
                "Follow everything (all disciplines & teams)",
              )}
            </label>
          </div>
          <p className="text-muted small mb-0 mt-1">
            {t(
              "notifPrefs.followAllDesc",
              "When enabled you receive notifications for all events. Disable to pick specific disciplines or teams.",
            )}
          </p>
        </div>
      </div>

      {/* Disciplines & Teams */}
      {!prefs.follow_all && (
        <div className="mb-4">
          {disciplines.map((disc) => {
            const discSelected = prefs.discipline_ids.includes(disc.id);
            const discTeams = teams.filter((t) => t.discipline === disc.name);
            return (
              <div key={disc.id} className="card mb-2 shadow-sm">
                <div className="card-header bg-light d-flex align-items-center gap-2 py-2">
                  <div className="form-check mb-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`disc-${disc.id}`}
                      checked={discSelected}
                      onChange={() => toggleDisc(disc.id)}
                    />
                    <label
                      className="form-check-label fw-semibold"
                      htmlFor={`disc-${disc.id}`}
                    >
                      {disc.name}
                    </label>
                  </div>
                  <span className="badge bg-secondary ms-auto">
                    {discTeams.length} {t("notifPrefs.teams", "teams")}
                  </span>
                </div>
                {discSelected && discTeams.length > 0 && (
                  <div className="card-body py-2">
                    <p className="small text-muted mb-2">
                      {t(
                        "notifPrefs.selectTeams",
                        "Select specific teams (or leave blank for all teams in this discipline):",
                      )}
                    </p>
                    <div className="row g-2">
                      {discTeams.map((team) => (
                        <div key={team.id} className="col-sm-6">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`team-${team.id}`}
                              checked={prefs.team_ids.includes(team.id)}
                              onChange={() => toggleTeam(team.id)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`team-${team.id}`}
                            >
                              {team.name}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="d-flex align-items-center gap-3">
        <button className="btn btn-primary px-4" onClick={handleSave}>
          {t("notifPrefs.save", "Save Preferences")}
        </button>
        {saved && (
          <span className="text-success fw-semibold">
            ✓ {t("notifPrefs.saved", "Saved")}
          </span>
        )}
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
