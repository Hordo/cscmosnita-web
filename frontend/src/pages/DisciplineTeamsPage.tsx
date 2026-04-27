import React, { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { useParams, useNavigate } from "react-router-dom";
const API_BASE = import.meta.env.VITE_API_URL as string;

export const DisciplineTeamsPage: React.FC = () => {
  const { discipline } = useParams<{ discipline: string }>();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/teams/?discipline=${discipline}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => setTeams(data))
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [discipline]);

  if (loading) return <div className="text-center mt-5">Loading teams...</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-center">
        {discipline
          ? discipline.charAt(0).toUpperCase() + discipline.slice(1)
          : ""}{" "}
        Teams
      </h2>
      <div className="row g-4">
        {teams.map((team) => (
          <div
            className="col-12 col-md-6 col-lg-4"
            key={team.id}
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/teams/${team.id}`)}
          >
            <Card
              title={team.name}
              imageUrl={team.photo_url}
              className="mb-3"
            />
          </div>
        ))}
      </div>
    </div>
  );
};
