import React, { useEffect, useState } from "react";
import { Card } from "../components/Card";
// import api from "../config/axios";
import "../styles/adminStyles.css";

// TeamViewerPage: Shows all teams and their players using Card component
export const TeamViewerPage: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
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
    ])
      .then(([teamsData, playersData]) => {
        setTeams(teamsData);
        setPlayers(playersData);
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center mt-5">Loading teams...</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">Teams</h2>
      <div className="row g-4">
        {teams.map((team) => (
          <div className="col-12 col-md-6 col-lg-4" key={team.id}>
            <Card
              title={team.name}
              subtitle={team.season ? `Season: ${team.season}` : undefined}
              imageUrl={team.photo_url}
              description={
                team.age_group ? `Age Group: ${team.age_group}` : undefined
              }
              className="mb-3"
            />
            <div className="row g-2 mt-2">
              {players
                .filter((p) => p.team === team.name)
                .map((player) => (
                  <div className="col-6" key={player.id}>
                    <Card
                      title={`${player.first_name} ${player.last_name}`}
                      subtitle={player.position || undefined}
                      imageUrl={player.photo_url}
                      description={
                        player.number ? `#${player.number}` : undefined
                      }
                      className="player-card"
                    />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
