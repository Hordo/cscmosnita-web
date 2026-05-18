import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL as string;

const MEDAL_EMOJI: Record<string, string> = {
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

// ── Single competition card with expandable results ───────────────────────────

function CompetitionCard({ comp, t }: { comp: any; t: (k: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleResults = async () => {
    if (results !== null) {
      setExpanded((v) => !v);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/individual-competitions/${comp.id}/`,
      );
      const data = await res.json();
      setResults(data.results ?? []);
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        {/* Header row */}
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <h5 className="mb-1">{comp.name}</h5>
            <div className="text-muted" style={{ fontSize: "0.88rem" }}>
              {comp.season && <span className="me-3">📅 {comp.season}</span>}
              {comp.date && <span className="me-3">{comp.date}</span>}
              {comp.location && <span>📍 {comp.location}</span>}
            </div>
          </div>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            {comp.medal_count?.gold > 0 && (
              <span className="fw-semibold">🥇 {comp.medal_count.gold}</span>
            )}
            {comp.medal_count?.silver > 0 && (
              <span className="fw-semibold">🥈 {comp.medal_count.silver}</span>
            )}
            {comp.medal_count?.bronze > 0 && (
              <span className="fw-semibold">🥉 {comp.medal_count.bronze}</span>
            )}
            <button
              className="btn btn-outline-primary btn-sm"
              onClick={toggleResults}
              disabled={loading}
            >
              {loading
                ? "…"
                : expanded
                  ? `▲ ${t("ic.hide_results")}`
                  : `▼ ${t("ic.view_results")}`}
            </button>
          </div>
        </div>

        {/* Description */}
        {comp.description && (
          <p className="text-muted mt-2 mb-2" style={{ fontSize: "0.9rem" }}>
            {comp.description}
          </p>
        )}

        {/* Results table */}
        {expanded && results !== null && (
          <div className="mt-3">
            {results.length === 0 ? (
              <p className="text-muted mb-0">{t("ic.no_results")}</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: 60 }}>{t("ic.place")}</th>
                      <th>{t("ic.athlete_name")}</th>
                      <th>{t("ic.event_category")}</th>
                      <th style={{ width: 100 }}>{t("ic.medal")}</th>
                      <th>{t("ic.notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r: any) => (
                      <tr key={r.id}>
                        <td className="text-center">
                          {r.place ? <strong>{r.place}.</strong> : "—"}
                        </td>
                        <td>
                          <strong>{r.athlete_name}</strong>
                        </td>
                        <td>{r.event_category || "—"}</td>
                        <td>
                          {MEDAL_EMOJI[r.medal] && (
                            <span className="me-1">{MEDAL_EMOJI[r.medal]}</span>
                          )}
                          {r.medal !== "none" ? r.medal_display : "—"}
                        </td>
                        <td className="text-muted">{r.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export const IndividualCompetitionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/individual-competitions/?team_id=${teamId}`).then(
        (r) => r.json(),
      ),
      fetch(`${API_BASE}/api/teams/`).then((r) => r.json()),
    ])
      .then(([comps, teams]) => {
        if (!Array.isArray(comps))
          throw new Error("Failed to load competitions");
        setCompetitions(comps);
        const team = (Array.isArray(teams) ? teams : []).find(
          (tm: any) => String(tm.id) === String(teamId),
        );
        if (team) setTeamName(team.name);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) return <div className="text-center mt-5">{t("loading")}</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;

  // Derive season list from competition data
  const seasons = [
    ...new Set(competitions.map((c: any) => c.season).filter(Boolean)),
  ]
    .sort()
    .reverse();

  const displayed = activeSeason
    ? competitions.filter((c: any) => c.season === activeSeason)
    : competitions;

  return (
    <div className="container py-4">
      {/* Back + title */}
      <div className="d-flex align-items-center mb-4 gap-3">
        <Link
          to={`/teams/${teamId}`}
          className="btn btn-outline-secondary btn-sm"
        >
          ← {t("back_to_team")}
        </Link>
        <h3 className="mb-0">
          🏅 {t("ic.title")} — {teamName}
        </h3>
      </div>

      {/* Season filter */}
      {seasons.length > 1 && (
        <div className="mb-4 d-flex gap-2 flex-wrap">
          <button
            className={`btn btn-sm ${!activeSeason ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setActiveSeason(null)}
          >
            {t("ic.all_seasons")}
          </button>
          {seasons.map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${activeSeason === s ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => setActiveSeason(s as string)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Competition cards */}
      {displayed.length === 0 ? (
        <div className="alert alert-info">{t("ic.no_competitions")}</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {displayed.map((comp: any) => (
            <CompetitionCard key={comp.id} comp={comp} t={t} />
          ))}
        </div>
      )}
    </div>
  );
};
