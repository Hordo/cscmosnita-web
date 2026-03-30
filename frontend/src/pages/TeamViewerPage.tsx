import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import userPlaceholder from "../assets/user-placeholder.svg";
import "../styles/adminStyles.css";
import { useTranslation } from "react-i18next";

export const TeamViewerPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId?: string }>();
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/teams").then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
      fetch("/api/players").then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
      fetch("/api/coaces").then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
      fetch("/api/disciplines").then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
    ])
      .then(([teamsData, playersData, coachesData, disciplinesData]) => {
        setTeams(teamsData);
        setPlayers(playersData);
        setCoaches(coachesData);
        setDisciplines(disciplinesData);
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center mt-5">{t("loading")}</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;

  let filteredTeams = teams;
  if (teamId) {
    filteredTeams = teams.filter((t) => String(t.id) === String(teamId));
  }

  if (filteredTeams.length === 0) {
    return (
      <div className="alert alert-warning mt-4">{t("team_not_found")}</div>
    );
  }

  const team = filteredTeams[0];
  // Accept both string and number for team_id
  const teamPlayers = players.filter(
    (p) => String(p.team_id) === String(team.id),
  );
  // Find coaches for this team (if Coach.teams is available as array of team ids)
  const teamCoaches = coaches.filter(
    (c) => c.teams && c.teams.includes(team.id),
  );
  const disciplineName = team.discipline_id
    ? disciplines.find((d) => String(d.id) === String(team.discipline_id))
        ?.name || ""
    : "";

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-4">
        <div style={{ width: 120, height: 120, marginRight: 24 }}>
          <img
            src={team.photo_url || userPlaceholder}
            alt={team.name}
            className="card-img-top"
            style={{
              objectFit: "cover",
              maxHeight: 120,
              borderRadius: 16,
              background: "#e3e9f7",
            }}
          />
        </div>
        <h2 className="mb-0 text-center flex-grow-1">{team.name}</h2>
      </div>
      <div className="row mb-4">
        {teamCoaches.map((coach) => (
          <div className="col-12 col-md-6 col-lg-4" key={coach.id}>
            <Card
              title={`${coach.first_name} ${coach.last_name}`}
              role={coach.role || undefined}
              number={coach.number || undefined}
              imageUrl={coach.photo_url || undefined}
              className="coach-card"
            />
          </div>
        ))}
        <div className="col-md-8">
          <div className="card p-3 mb-3">
            <h5>{t("team_info")}</h5>
            <ul className="list-unstyled mb-0">
              {team.age_group && (
                <li>
                  <strong>{t("age_group")}:</strong> {team.age_group}
                </li>
              )}
              {disciplineName && (
                <li>
                  <strong>{t("discipline")}:</strong> {disciplineName}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <h4 className="mb-3">{t("players")}</h4>
      <div className="row g-4">
        {teamPlayers.length === 0 ? (
          <div className="col-12 text-center">{t("no_players")}</div>
        ) : (
          teamPlayers.map((player) => (
            <div className="col-12 col-md-6 col-lg-4" key={player.id}>
              <Card
                title={`${player.first_name} ${player.last_name}`}
                role={player.position || undefined}
                number={player.number || undefined}
                imageUrl={player.photo_url || undefined}
                className="player-card"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
