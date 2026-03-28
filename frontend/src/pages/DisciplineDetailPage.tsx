import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/Card";

const disciplineDescriptions: Record<string, string> = {
  fotbal:
    "Fotbalul este un sport de echipă popular, jucat între două echipe a câte 11 jucători.",
  baschet:
    "Baschetul este un sport de echipă jucat între două echipe a câte cinci jucători.",
  handbal:
    "Handbalul este un sport de echipă rapid, jucat între două echipe a câte șapte jucători.",
};

export const DisciplineDetailPage: React.FC = () => {
  const { discipline } = useParams<{ discipline: string }>();
  const navigate = useNavigate();
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

  const disciplineName = discipline
    ? discipline.charAt(0).toUpperCase() + discipline.slice(1)
    : "";
  const description = disciplineDescriptions[discipline || ""] || "";

  return (
    <div className="container py-4">
      <h2 className="mb-3 text-center">{disciplineName}</h2>
      {description && <p className="lead text-center mb-4">{description}</p>}
      {loading ? (
        <div className="text-center">Loading teams...</div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <h4 className="mb-3">Echipe {disciplineName}</h4>
          <div className="row g-4">
            {teams.length === 0 ? (
              <div className="col-12 text-center">
                Nu există echipe pentru această disciplină.
              </div>
            ) : (
              teams.map((team) => (
                <div
                  className="col-12 col-md-6 col-lg-4"
                  key={team.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/teams/${team.id}`)}
                >
                  <Card
                    title={team.name}
                    subtitle={team.season ? `Sezon: ${team.season}` : undefined}
                    imageUrl={team.photo_url}
                    description={
                      (team.age_group
                        ? `Grupa de vârstă: ${team.age_group}`
                        : "") +
                      (team.coaches && team.coaches.length > 0
                        ? `${team.age_group ? "\n" : ""}Antrenor${team.coaches.length > 1 ? "i" : ""}: ${team.coaches.join(", ")}`
                        : "")
                    }
                  />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
