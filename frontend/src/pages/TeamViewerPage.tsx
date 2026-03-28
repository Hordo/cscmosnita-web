import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import "../styles/adminStyles.css";

export const TeamViewerPage: React.FC = () => {
  const { teamId } = useParams<{ teamId?: string }>();
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
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
    ])
      .then(([teamsData, playersData, coachesData]) => {
        setTeams(teamsData);
        setPlayers(playersData);
        setCoaches(coachesData);
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center mt-5">Loading...</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;

  let filteredTeams = teams;
  if (teamId) {
    filteredTeams = teams.filter((t) => String(t.id) === String(teamId));
  }

  if (filteredTeams.length === 0) {
    return <div className="alert alert-warning mt-4">Team not found.</div>;
  }

  const team = filteredTeams[0];
  const teamPlayers = players.filter((p) => p.team === team.id);
  // Find coaches for this team (if Coach.teams is available as array of team ids)
  const teamCoaches = coaches.filter(
    (c) => c.teams && c.teams.includes(team.id),
  );

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">{team.name}</h2>
      <div className="row mb-4">
        <div className="col-md-4">
          {teamCoaches.length > 0 && (
            <Card
              title={`${teamCoaches[0].first_name} ${teamCoaches[0].last_name}`}
              subtitle={teamCoaches[0].role || undefined}
              imageUrl={teamCoaches[0].photo}
              description={"Coach"}
              className="mb-3"
            />
          )}
        </div>
        <div className="col-md-8">
          <div className="card p-3 mb-3">
            <h5>Team Info</h5>
            <ul className="list-unstyled mb-0">
              <li>
                <strong>Season:</strong> {team.season}
              </li>
              <li>
                <strong>Age Group:</strong> {team.age_group}
              </li>
              <li>
                <strong>Discipline:</strong> {team.discipline}
              </li>
            </ul>
          </div>
        </div>
      </div>
      <h4 className="mb-3">Players</h4>
      <div className="row g-4">
        {teamPlayers.length === 0 ? (
          <div className="col-12 text-center">No players for this team.</div>
        ) : (
          teamPlayers.map((player) => (
            <div className="col-12 col-md-6 col-lg-4" key={player.id}>
              <Card
                title={`${player.first_name} ${player.last_name}`}
                subtitle={player.position || undefined}
                imageUrl={player.photo}
                description={player.number ? `#${player.number}` : undefined}
                className="player-card"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
