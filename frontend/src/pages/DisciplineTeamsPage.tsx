import React, { useEffect, useState } from "react";
import { Card } from "../components/Card";
// import api from "../config/axios";
import { useParams } from "react-router-dom";

export const DisciplineTeamsPage: React.FC = () => {
  const { discipline } = useParams<{ discipline: string }>();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/teams?discipline=${discipline}`)
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
          </div>
        ))}
      </div>
    </div>
  );
};
