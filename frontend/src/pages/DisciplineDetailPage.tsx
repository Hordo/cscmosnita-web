import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
const API_BASE = import.meta.env.VITE_API_URL as string;

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
  const [dbDisciplines, setDbDisciplines] = useState<any[]>([]);

  // Helper: similarity (very basic, for Romanian diacritics and case-insensitive)
  function similarity(a: string, b: string) {
    a = a
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    b = b
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    let matches = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
  }

  // Find best matching discipline from DB
  const matchedDiscipline = dbDisciplines.reduce((best, d) => {
    if (!discipline) return best;
    const sim = similarity(discipline, d.name);
    if (!best || sim > best.sim) return { ...d, sim };
    return best;
  }, null);

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

  const disciplineName =
    matchedDiscipline?.name ||
    (discipline
      ? discipline.charAt(0).toUpperCase() + discipline.slice(1)
      : "");
  const description =
    (matchedDiscipline &&
      disciplineDescriptions[matchedDiscipline.name.toLowerCase()]) ||
    "";

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
