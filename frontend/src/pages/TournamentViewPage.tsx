import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const STAGE_LABEL: Record<string, string> = {
  group: "Group Stage",
  r32: "Round of 32",
  r16: "Round of 16",
  r8: "Quarterfinal",
  semi: "Semifinal",
  third: "3rd Place",
  final: "Final",
};

const MatchRow: React.FC<{ m: any }> = ({ m }) => (
  <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
    <div className="text-end" style={{ flex: 1 }}>
      <span className="fw-semibold">{m.home_team_name}</span>
    </div>
    <div className="text-center mx-3" style={{ minWidth: 80 }}>
      {m.home_score !== null && m.away_score !== null ? (
        <span className="badge bg-dark fs-6 px-3">
          {m.home_score} – {m.away_score}
        </span>
      ) : (
        <span className="text-muted">vs</span>
      )}
      {m.youtube_link && (
        <div className="mt-1">
          <a
            href={m.youtube_link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline-danger py-0"
            style={{ fontSize: "0.75rem" }}
          >
            ▶ Video
          </a>
        </div>
      )}
    </div>
    <div style={{ flex: 1 }}>
      <span className="fw-semibold">{m.away_team_name}</span>
    </div>
  </div>
);

export const TournamentViewPage: React.FC = () => {
  const { t } = useTranslation();
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const [tour, setTour] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    fetch(`/api/tournament-detail?id=${tournamentId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setTour(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return <div className="text-center mt-5">{t("loading")}</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;
  if (!tour) return null;

  // Group knockout matches by stage
  const knockoutByStage: Record<string, any[]> = {};
  for (const m of tour.knockout_matches || []) {
    if (!knockoutByStage[m.stage]) knockoutByStage[m.stage] = [];
    knockoutByStage[m.stage].push(m);
  }
  const stageOrder = ["r32", "r16", "r8", "semi", "third", "final"];

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-2 gap-3">
        <Link
          to={`/teams/${tour.team || ""}/tournaments`}
          className="btn btn-outline-secondary btn-sm"
        >
          ← {t("back")}
        </Link>
        <h3 className="mb-0">🏆 {tour.name}</h3>
      </div>
      <div className="mb-4">
        {tour.season && (
          <span className="badge bg-secondary me-2">{tour.season}</span>
        )}
        {tour.date && (
          <span className="badge bg-info text-dark me-2">
            📅 {new Date(tour.date).toLocaleDateString()}
          </span>
        )}
        {tour.discipline_name && (
          <span className="badge bg-primary me-2">{tour.discipline_name}</span>
        )}
        {tour.team_name && (
          <span className="badge bg-light text-dark border">
            {tour.team_name}
          </span>
        )}
      </div>

      {/* Group Stage */}
      {tour.has_group_stage && tour.groups?.length > 0 && (
        <div className="mb-5">
          <h5 className="border-bottom pb-2 mb-3">{t("group_stage")}</h5>
          {tour.groups.map((group: any) => (
            <div key={group.id} className="mb-4">
              <h6 className="fw-bold mb-2">{group.name}</h6>

              {/* Standings */}
              {group.group_teams?.length > 0 && (
                <div className="table-responsive mb-3">
                  <table
                    className="table table-sm table-bordered"
                    style={{ fontSize: "0.87rem" }}
                  >
                    <thead className="table-light">
                      <tr>
                        <th>Team</th>
                        <th>P</th>
                        <th>W</th>
                        <th>D</th>
                        <th>L</th>
                        <th>GF</th>
                        <th>GA</th>
                        <th>GD</th>
                        <th>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.group_teams.map((gt: any) => (
                        <tr key={gt.id}>
                          <td className="fw-semibold">{gt.team_name}</td>
                          <td>{gt.played}</td>
                          <td>{gt.won}</td>
                          <td>{gt.drawn}</td>
                          <td>{gt.lost}</td>
                          <td>{gt.goals_for}</td>
                          <td>{gt.goals_against}</td>
                          <td>{gt.goals_for - gt.goals_against}</td>
                          <td className="fw-bold">{gt.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Group Matches */}
              {group.matches?.length > 0 && (
                <div className="card border-0 bg-light p-2">
                  {group.matches.map((m: any) => (
                    <MatchRow key={m.id} m={m} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Knockout Stages */}
      {stageOrder.map((stage) => {
        const stageMatches = knockoutByStage[stage];
        if (!stageMatches?.length) return null;
        return (
          <div key={stage} className="mb-4">
            <h5 className="border-bottom pb-2 mb-3">{STAGE_LABEL[stage]}</h5>
            <div className="card border-0 bg-light p-2">
              {stageMatches.map((m: any) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </div>
          </div>
        );
      })}

      {tour.groups?.length === 0 &&
        Object.keys(knockoutByStage).length === 0 && (
          <div className="alert alert-info">{t("no_matches_yet")}</div>
        )}
    </div>
  );
};
