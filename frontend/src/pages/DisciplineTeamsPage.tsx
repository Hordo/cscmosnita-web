import React, { useEffect, useState } from "react";
import { Card } from "../components/Card";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
const API_BASE = import.meta.env.VITE_API_URL as string;

export const DisciplineTeamsPage: React.FC = () => {
  const { discipline } = useParams<{ discipline: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [teams, setTeams] = useState<any[]>([]);
  const [disciplineData, setDisciplineData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API_BASE}/api/teams/?discipline=${discipline}`).then(
        async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        },
      ),
      fetch(`${API_BASE}/api/disciplines/`).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
    ])
      .then(([teamsData, disciplinesData]) => {
        setTeams(teamsData);
        const found = disciplinesData.find(
          (d: any) =>
            d.slug === discipline ||
            d.name?.toLowerCase() === discipline?.toLowerCase(),
        );
        setDisciplineData(found ?? null);
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [discipline]);

  const isRo = i18n.language === "ro";
  const displayName = disciplineData
    ? isRo
      ? disciplineData.name
      : disciplineData.name_en || disciplineData.name
    : discipline
      ? discipline.charAt(0).toUpperCase() + discipline.slice(1)
      : "";
  const description = disciplineData
    ? isRo
      ? disciplineData.description
      : disciplineData.description_en || disciplineData.description
    : null;

  if (loading) return <div className="text-center mt-5">Loading teams...</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;

  return (
    <div className="container py-4">
      <h2 className="mb-2 text-center">{displayName} Teams</h2>
      {description && (
        <p
          className="text-center text-muted mb-4"
          style={{
            maxWidth: 700,
            margin: "0 auto 1.5rem",
            whiteSpace: "pre-line",
          }}
        >
          {description}
        </p>
      )}
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
