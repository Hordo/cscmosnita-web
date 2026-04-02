import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const TeamTournamentsPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/tournaments?team_id=${teamId}`).then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ])
      .then(([tours, teams]) => {
        setTournaments(tours);
        const team = teams.find((t: any) => String(t.id) === String(teamId));
        if (team) setTeamName(team.name);
      })
      .catch((e) => setError(e.message))
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
        <h3 className="mb-0">
          🏆 {t("tournaments")} — {teamName}
        </h3>
      </div>

      {tournaments.length === 0 ? (
        <div className="alert alert-info">{t("no_tournaments")}</div>
      ) : (
        <div className="row g-3">
          {tournaments.map((tour) => (
            <div key={tour.id} className="col-md-4">
              <Link
                to={`/tournaments/${tour.id}`}
                className="text-decoration-none"
              >
                <div className="card h-100 border-0 shadow-sm card-hover">
                  <div className="card-body">
                    <h5 className="card-title mb-1">{tour.name}</h5>
                    {tour.season && (
                      <div className="text-muted small mb-1">{tour.season}</div>
                    )}
                    <div>
                      <span className="badge bg-primary me-1">
                        {tour.discipline_name}
                      </span>
                      {tour.has_group_stage && (
                        <span className="badge bg-success">Groups</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
