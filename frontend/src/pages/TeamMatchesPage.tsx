import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface Match {
  id: number;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  youtube_link: string;
  date: string | null;
  team_id: number | null;
}

export const TeamMatchesPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamName, setTeamName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/matches?team_id=${teamId}`).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
      fetch("/api/teams").then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
    ])
      .then(([matchesData, teamsData]) => {
        setMatches(matchesData);
        const team = teamsData.find(
          (t: any) => String(t.id) === String(teamId),
        );
        if (team) setTeamName(team.name);
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) return <div className="text-center mt-5">{t("loading")}</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-4 gap-3">
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

      {matches.length === 0 ? (
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
                  <td>{match.date || "—"}</td>
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
