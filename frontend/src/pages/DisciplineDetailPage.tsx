import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { useTranslation } from "react-i18next";
const API_BASE = import.meta.env.VITE_API_URL as string;

export const DisciplineDetailPage: React.FC = () => {
  const { discipline } = useParams<{ discipline: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbDisciplines, setDbDisciplines] = useState<any[]>([]);

  // Find best matching discipline from DB — exact match only
  const matchedDiscipline =
    dbDisciplines.find(
      (d: any) =>
        d.name
          ?.toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "") ===
        (discipline || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, ""),
    ) ?? null;

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(
        `${API_BASE}/api/teams/?discipline=${encodeURIComponent(discipline || "")}`,
      ).then((res) => res.json()),
      fetch(`${API_BASE}/api/disciplines/`).then((res) => res.json()),
    ])
      .then(([teamsData, discData]) => {
        setTeams(Array.isArray(teamsData) ? teamsData : []);
        setDbDisciplines(Array.isArray(discData) ? discData : []);
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [discipline]);

  const isRo = i18n.language === "ro";
  const disciplineName = matchedDiscipline
    ? isRo
      ? matchedDiscipline.name
      : matchedDiscipline.name_en || matchedDiscipline.name
    : discipline
      ? discipline.charAt(0).toUpperCase() + discipline.slice(1)
      : "";
  const description = matchedDiscipline
    ? isRo
      ? matchedDiscipline.description
      : matchedDiscipline.description_en || matchedDiscipline.description
    : "";

  return (
    <div className="container py-4">
      <h2 className="mb-3 text-center">{disciplineName}</h2>
      {description && (
        <p className="lead text-center mb-4" style={{ whiteSpace: "pre-line" }}>
          {description}
        </p>
      )}
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
                  <Card title={team.name} imageUrl={team.photo_url} />
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
