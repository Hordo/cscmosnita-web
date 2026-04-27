import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
const API_BASE = import.meta.env.VITE_API_URL as string;

interface Match {
  id: number;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  youtube_link: string;
  date: string | null;
  season: string;
  team_id: number | null;
}

export const TeamMatchesPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [activeSeason, setActiveSeason] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch team name once
  useEffect(() => {
    if (!teamId) return;
    fetch(`${API_BASE}/api/teams/`)
      .then((r) => r.json())
      .then((teams: any[]) => {
        const team = teams.find((t: any) => String(t.id) === String(teamId));
        if (team) setTeamName(team.name);
      })
      .catch(() => {});
  }, [teamId]);

  // Fetch matches whenever teamId or activeSeason changes
  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    const url = activeSeason
      ? `${API_BASE}/api/matches/?team_id=${teamId}&season=${encodeURIComponent(activeSeason)}`
      : `${API_BASE}/api/matches/?team_id=${teamId}`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        // New API returns { matches, seasons, activeSeason }
        if (data && Array.isArray(data.matches)) {
          setMatches(data.matches);
          setSeasons(data.seasons ?? []);
          // Only set activeSeason from server on first load (when activeSeason is null)
          if (activeSeason === null) {
            setActiveSeason(data.activeSeason ?? null);
          }
        } else {
          // Fallback: old flat array
          setMatches(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [teamId, activeSeason]);

  const seasonIndex = activeSeason ? seasons.indexOf(activeSeason) : -1;
  const prevSeason =
    seasonIndex < seasons.length - 1 ? seasons[seasonIndex + 1] : null;
  const nextSeason = seasonIndex > 0 ? seasons[seasonIndex - 1] : null;

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-4 gap-3 flex-wrap">
        <Link
          to={`/teams/${teamId}`}
          className="btn btn-outline-secondary btn-sm"
        >
          ← {t("back_to_team")}
        </Link>
        <h2 className="mb-0">
          {t("matches")} {teamName ? `— ${teamName}` : ""}
        </h2>
      </div>

      {/* Season navigation */}
      {seasons.length > 0 && (
        <div className="d-flex align-items-center gap-2 mb-4">
          <button
            className="btn btn-outline-primary btn-sm"
            disabled={!prevSeason}
            onClick={() => prevSeason && setActiveSeason(prevSeason)}
          >
            ← {prevSeason ?? ""}
          </button>
          <span className="fw-bold fs-5 px-3">
            {activeSeason ?? t("all_seasons")}
          </span>
          <button
            className="btn btn-outline-primary btn-sm"
            disabled={!nextSeason}
            onClick={() => nextSeason && setActiveSeason(nextSeason)}
          >
            {nextSeason ?? ""} →
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center mt-5">{t("loading")}</div>
      ) : error ? (
        <div className="alert alert-danger mt-3">{error}</div>
      ) : matches.length === 0 ? (
        <div className="alert alert-info">{t("no_matches")}</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>{t("date")}</th>
                <th className="text-end">{t("home_team")}</th>
                <th className="text-center">{t("score")}</th>
                <th>{t("away_team")}</th>
                <th className="text-center">{t("video")}</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id}>
                  <td>
                    {match.date
                      ? new Date(match.date).toISOString().slice(0, 10)
                      : "—"}
                  </td>
                  <td className="text-end fw-semibold">
                    {match.home_team_name}
                  </td>
                  <td className="text-center">
                    {match.home_score !== null && match.away_score !== null ? (
                      <span className="badge bg-dark fs-6 px-3">
                        {match.home_score} – {match.away_score}
                      </span>
                    ) : (
                      <span className="text-muted">vs</span>
                    )}
                  </td>
                  <td className="fw-semibold">{match.away_team_name}</td>
                  <td className="text-center">
                    {match.youtube_link ? (
                      <a
                        href={match.youtube_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-danger"
                        title={t("watch_video")}
                      >
                        ▶ YouTube
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
