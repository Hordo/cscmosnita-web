import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card } from "../components/Card";
import userPlaceholder from "../assets/user-placeholder.svg";
import { useTranslation } from "react-i18next";
const API_BASE = import.meta.env.VITE_API_URL as string;

export const TeamViewerPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId?: string }>();
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [weekEvents, setWeekEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const eventsUrl = teamId
      ? `${API_BASE}/api/calendar/events/?team=${teamId}&upcoming=1`
      : `${API_BASE}/api/calendar/events/?upcoming=1`;

    Promise.all([
      fetch(`${API_BASE}/api/teams/`).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
      fetch(`${API_BASE}/api/players/`).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
      fetch(`${API_BASE}/api/coaches/`).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }),
      fetch(eventsUrl).then(async (res) => {
        if (!res.ok) return [];
        const data = await res.json();
        // Normalise event_type to string (Django returns it as an object)
        return Array.isArray(data)
          ? data.map((e: any) => ({
              ...e,
              event_type: e.event_type_name ?? e.event_type,
            }))
          : [];
      }),
    ])
      .then(([teamsData, playersData, coachesData, eventsData]) => {
        setTeams(teamsData);
        setPlayers(playersData);
        setCoaches(coachesData);
        setWeekEvents(eventsData);
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [teamId]);

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
  // Find coaches for this team — Django returns teams as [{id, name}] objects
  const teamCoaches = coaches.filter(
    (c) =>
      c.teams && c.teams.some((t: any) => Number(t.id) === Number(team.id)),
  );
  const disciplineName = team.discipline || "";

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
      <div className="mb-4 d-flex gap-2 flex-wrap">
        <Link
          to={`/teams/${team.id}/matches`}
          className="btn btn-outline-primary"
        >
          🏆 {t("view_matches")}
        </Link>
        <Link
          to={`/teams/${team.id}/tournaments`}
          className="btn btn-outline-success"
        >
          🥇 {t("view_tournaments")}
        </Link>
        <Link
          to={`/teams/${team.id}/gallery`}
          className="btn btn-outline-secondary"
        >
          📸 {t("gallery")}
        </Link>
      </div>

      {/* This week's schedule */}
      <div className="card mb-4">
        <div className="card-header fw-semibold">📅 {t("upcoming_events")}</div>
        <div className="card-body p-0">
          {weekEvents.length === 0 ? (
            <p className="text-muted m-3">{t("no_upcoming_events")}</p>
          ) : (
            <ul className="list-group list-group-flush">
              {weekEvents.map((ev) => {
                const start = new Date(ev.start_datetime);
                const end = new Date(ev.end_datetime);
                const dayLabel = start.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const timeLabel = ev.all_day
                  ? t("all_day")
                  : `${start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
                const typeColor: Record<string, string> = {
                  training: "success",
                  match: "danger",
                  meeting: "primary",
                  other: "secondary",
                };
                const color = typeColor[ev.event_type] ?? "secondary";
                return (
                  <li
                    key={ev.id}
                    className="list-group-item d-flex align-items-start gap-3 py-2"
                  >
                    <div
                      className="text-muted"
                      style={{ minWidth: 90, fontSize: "0.82rem" }}
                    >
                      <div className="fw-semibold">{dayLabel}</div>
                      <div>{timeLabel}</div>
                    </div>
                    <div className="flex-grow-1">
                      <span className={`badge bg-${color} me-2`}>
                        {ev.event_type}
                      </span>
                      <span className="fw-semibold">{ev.title}</span>
                      {ev.location && (
                        <div
                          className="text-muted"
                          style={{ fontSize: "0.8rem" }}
                        >
                          📍 {ev.location}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
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
                number={player.number || undefined}
                imageUrl={player.photo_url || undefined}
                className="player-card"
                badgesOnImage
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
