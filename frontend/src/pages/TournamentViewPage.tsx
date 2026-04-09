import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const STAGE_ORDER = ["r32", "r16", "r8", "semi", "third", "final"];

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

function computePlacement(
  tour: any,
  t: TFunc,
): { label: string; color: string } | null {
  const teamName: string = tour.team_name;
  const knockouts: any[] = tour.knockout_matches || [];

  if (knockouts.length > 0) {
    const finalMatch = knockouts.find((m) => m.stage === "final");
    if (
      finalMatch &&
      finalMatch.home_score !== null &&
      finalMatch.away_score !== null
    ) {
      if (finalMatch.home_score > finalMatch.away_score)
        return { label: t("placement.1st"), color: "warning text-dark" };
      if (finalMatch.home_score < finalMatch.away_score)
        return { label: t("placement.2nd"), color: "secondary" };
      return { label: t("placement.draw_final"), color: "secondary" };
    }
    const thirdMatch = knockouts.find((m) => m.stage === "third");
    if (
      thirdMatch &&
      thirdMatch.home_score !== null &&
      thirdMatch.away_score !== null
    ) {
      if (thirdMatch.home_score > thirdMatch.away_score)
        return { label: t("placement.3rd"), color: "warning text-dark" };
      return { label: t("placement.4th"), color: "light text-dark border" };
    }
    for (const stage of [...STAGE_ORDER].reverse()) {
      const m = knockouts.find(
        (x) => x.stage === stage && x.home_score !== null,
      );
      if (m)
        return {
          label: t("placement.reached", { stage: t(`stage.${stage}`) }),
          color: "info text-dark",
        };
    }
    for (const stage of [...STAGE_ORDER].reverse()) {
      if (knockouts.some((x) => x.stage === stage))
        return {
          label: t("placement.reached", { stage: t(`stage.${stage}`) }),
          color: "info text-dark",
        };
    }
  }

  for (const group of tour.groups || []) {
    const idx = (group.group_teams || []).findIndex(
      (gt: any) => gt.team_name === teamName,
    );
    if (idx >= 0)
      return {
        label: t("placement.group", { name: group.name, pos: idx + 1 }),
        color: idx === 0 ? "success" : "secondary",
      };
  }
  return null;
}

const MatchRow: React.FC<{ m: any; videoLabel: string }> = ({
  m,
  videoLabel,
}) => (
  <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
    <div className="text-end" style={{ flex: 1 }}>
      <span className="fw-semibold">{m.home_team_name}</span>
    </div>
    <div className="text-center mx-3" style={{ minWidth: 80 }}>
      {m.home_score !== null && m.away_score !== null ? (
        <span className="badge bg-dark fs-6 px-3">
          {m.home_score} – {m.away_score}
          {m.ended_after_penalties ? " (p)" : ""}
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
            ▶ {videoLabel}
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

  const myTeam: string = tour.team_name || "";

  // Group knockout matches by stage
  const knockoutByStage: Record<string, any[]> = {};
  for (const m of tour.knockout_matches || []) {
    if (!knockoutByStage[m.stage]) knockoutByStage[m.stage] = [];
    knockoutByStage[m.stage].push(m);
  }

  const placement = computePlacement(tour, t);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-2 gap-3">
        <Link
          to={`/teams/${tour.team_id || ""}/tournaments`}
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
        {placement && (
          <span className={`badge bg-${placement.color} ms-2 fs-6`}>
            {placement.label}
          </span>
        )}
      </div>

      {/* Group Stage */}
      {tour.has_group_stage && tour.groups?.length > 0 && (
        <div className="mb-5">
          <h5 className="border-bottom pb-2 mb-3">{t("stage.group")}</h5>
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
                        <th>{t("tour.col_team")}</th>
                        <th>{t("tour.col_p")}</th>
                        <th>{t("tour.col_w")}</th>
                        <th>{t("tour.col_d")}</th>
                        <th>{t("tour.col_l")}</th>
                        <th>{t("tour.col_gf")}</th>
                        <th>{t("tour.col_ga")}</th>
                        <th>{t("tour.col_gd")}</th>
                        <th>{t("tour.col_pts")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.group_teams.map((gt: any) => {
                        const isMyTeam = gt.team_name === myTeam;
                        return (
                          <tr
                            key={gt.id}
                            className={isMyTeam ? "table-primary" : ""}
                          >
                            <td className="fw-semibold">
                              {isMyTeam ? (
                                <strong>{gt.team_name}</strong>
                              ) : (
                                gt.team_name
                              )}
                            </td>
                            <td>{gt.played}</td>
                            <td>
                              {isMyTeam ? (
                                gt.won
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>
                            <td>
                              {isMyTeam ? (
                                gt.drawn
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>
                            <td>
                              {isMyTeam ? (
                                gt.lost
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>
                            <td>
                              {isMyTeam ? (
                                gt.goals_for
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>
                            <td>
                              {isMyTeam ? (
                                gt.goals_against
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>
                            <td>
                              {isMyTeam ? (
                                gt.goals_for - gt.goals_against
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>
                            <td className="fw-bold">{gt.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Group Matches — only my team's games */}
              {group.matches?.filter(
                (m: any) =>
                  m.home_team_name === myTeam || m.away_team_name === myTeam,
              ).length > 0 && (
                <div className="card border-0 bg-light p-2">
                  {group.matches
                    .filter(
                      (m: any) =>
                        m.home_team_name === myTeam ||
                        m.away_team_name === myTeam,
                    )
                    .map((m: any) => (
                      <MatchRow key={m.id} m={m} videoLabel={t("video")} />
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Knockout Stages */}
      {STAGE_ORDER.map((stage) => {
        const stageMatches = knockoutByStage[stage];
        if (!stageMatches?.length) return null;
        return (
          <div key={stage} className="mb-4">
            <h5 className="border-bottom pb-2 mb-3">{t(`stage.${stage}`)}</h5>
            <div className="card border-0 bg-light p-2">
              {stageMatches.map((m: any) => (
                <MatchRow key={m.id} m={m} videoLabel={t("video")} />
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
