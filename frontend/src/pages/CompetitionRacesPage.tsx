import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL as string;

const placeEmoji = (place: number | null | undefined) => {
  if (place === 1) return "🥇";
  if (place === 2) return "🥈";
  if (place === 3) return "🥉";
  return null;
};

const UNIT_ABBREV: Record<string, string> = {
  seconds: "s",
  centimeters: "cm",
  meters: "m",
  points: "pts",
};

function RaceCard({ race, t }: { race: any; t: (k: string) => string }) {
  const podium = (race.participants ?? [])
    .filter((p: any) => p.place === 1 || p.place === 2 || p.place === 3)
    .sort((a: any, b: any) => a.place - b.place);
  const others = (race.participants ?? []).filter((p: any) => !p.place);

  return (
    <div className="card border-secondary">
      <div className="card-body py-2">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <strong>{race.name}</strong>
          {race.video_link && (
            <a
              href={race.video_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-danger btn-sm"
            >
              ▶ Video
            </a>
          )}
        </div>
        {podium.length === 0 && others.length === 0 ? (
          <p className="text-muted mb-0 small">{t("ic.no_participants")}</p>
        ) : (
          <div>
            {podium.map((p: any) => (
              <div
                key={p.id}
                className="d-flex align-items-center justify-content-between mb-1"
              >
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: "1.1rem" }}>
                    {placeEmoji(p.place)}
                  </span>
                  <span className="fw-semibold">{p.athlete_name}</span>
                </div>
                {race.unit &&
                  race.unit !== "none" &&
                  p.result_value != null && (
                    <span className="text-muted small ms-3 text-nowrap">
                      {p.result_value} {UNIT_ABBREV[race.unit] ?? race.unit}
                    </span>
                  )}
              </div>
            ))}
            {others.length > 0 && (
              <div className="mt-1">
                {others.map((p: any) => (
                  <div
                    key={p.id}
                    className="d-flex align-items-center justify-content-between small"
                  >
                    <span className="text-muted">{p.athlete_name}</span>
                    {race.unit &&
                      race.unit !== "none" &&
                      p.result_value != null && (
                        <span className="text-muted ms-3 text-nowrap">
                          {p.result_value} {UNIT_ABBREV[race.unit] ?? race.unit}
                        </span>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const CompetitionRacesPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId, compId } = useParams<{ teamId: string; compId: string }>();
  const [competition, setCompetition] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!compId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/individual-competitions/${compId}/`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load competition");
        return r.json();
      })
      .then((data) => setCompetition(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [compId]);

  if (loading) return <div className="text-center mt-5">{t("loading")}</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;
  if (!competition) return null;

  const races: any[] = competition.races ?? [];

  return (
    <div className="container py-4">
      {/* Back link + competition header */}
      <div className="d-flex align-items-start mb-4 gap-3 flex-wrap">
        <Link
          to={`/teams/${teamId}/competitions`}
          className="btn btn-outline-secondary btn-sm mt-1"
        >
          ← {t("ic.back_to_competitions")}
        </Link>
        <div>
          <h3 className="mb-1">🏅 {competition.name}</h3>
          <div className="text-muted" style={{ fontSize: "0.88rem" }}>
            {competition.season && (
              <span className="me-3">📅 {competition.season}</span>
            )}
            {competition.date && (
              <span className="me-3">{competition.date}</span>
            )}
            {competition.location && <span>📍 {competition.location}</span>}
          </div>
        </div>
      </div>

      {competition.description && (
        <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
          {competition.description}
        </p>
      )}

      <h5 className="mb-3">
        {t("ic.races")}
        {races.length > 0 && (
          <span className="badge bg-secondary ms-2">{races.length}</span>
        )}
      </h5>

      {races.length === 0 ? (
        <div className="alert alert-info">{t("ic.no_races")}</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {races.map((race: any) => (
            <RaceCard key={race.id} race={race} t={t} />
          ))}
        </div>
      )}
    </div>
  );
};
