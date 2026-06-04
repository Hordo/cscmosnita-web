import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import ReactMarkdown from "react-markdown";
import "../styles/adminStyles.css";

const mdLinkNewTab = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ node: _node, children, ...props }: any) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

interface Team {
  id: number;
  name: string;
  year: number | null;
  discipline?: string | null;
}

interface TrainingPlan {
  id: number | null;
  team_id: number | null;
  team_name: string | null;
  age_label: string;
  focus_areas: string[];
  expected_players: number;
  player_range_min: number;
  player_range_max: number;
  coach_notes: string;
  generated_plan: string;
  followup_notes: string;
  created_by: string | null;
  created_at: string;
}

export default function TrainingSessionsHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all");
  const [teamId, setTeamId] = useState<number | "">("");
  const [history, setHistory] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.get(API_URLS.teams).then((res) => {
      setTeams(res.data ?? []);
    });
  }, []);

  // Build discipline options: dedupe by lower-cased value but preserve original labels
  const disciplineOptions = Array.from(
    new Map(
      teams
        .map((team) => team.discipline?.trim())
        .filter((d): d is string => Boolean(d))
        .map((d) => [d.toLowerCase(), d.trim()]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b));

  const filteredTeams =
    selectedDiscipline === "all"
      ? teams
      : teams.filter(
          (team) =>
            (team.discipline?.trim().toLowerCase() ?? "") ===
            selectedDiscipline.trim().toLowerCase(),
        );

  useEffect(() => {
    if (teamId === "" || selectedDiscipline === "all") {
      return;
    }

    const selectedTeam = teams.find((team) => team.id === teamId);
    if (
      !selectedTeam ||
      (selectedTeam.discipline?.trim().toLowerCase() ?? "") !==
        selectedDiscipline.trim().toLowerCase()
    ) {
      setTeamId("");
    }
  }, [selectedDiscipline, teamId, teams]);

  useEffect(() => {
    setLoading(true);
    setHistory([]);
    const params: Record<string, string> = {};
    if (teamId !== "") params.team_id = String(teamId);
    if (selectedDiscipline !== "all") params.discipline = selectedDiscipline;
    api
      .get(API_URLS.aiTrainingPlans, { params })
      .then((res) => {
        setHistory(res.data ?? []);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [teamId, selectedDiscipline]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div
      className="admin-page"
      style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}
    >
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 4 }}>
          🕑 {t("tp.history")}
        </h1>
        <p style={{ color: "#666", margin: 0 }}>{t("tp.history_subtitle")}</p>
      </div>

      {/* Back to generator */}
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => navigate("/admin/training-planner")}
          style={{
            padding: "7px 16px",
            borderRadius: 7,
            border: "1px solid #1a73e8",
            background: "#f8faff",
            color: "#1a73e8",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.95rem",
          }}
        >
          🤖 {t("tp.back_to_planner")}
        </button>
      </div>
      <div
        className="admin-form-card"
        style={{
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: 10,
          padding: "1.5rem",
          marginBottom: 24,
        }}
      >
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          {t("tp.discipline")}
        </label>
        <select
          className="form-control"
          value={selectedDiscipline}
          onChange={(e) => setSelectedDiscipline(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: 6,
            border: "1px solid #ccc",
            marginBottom: 12,
          }}
        >
          <option value="all">{t("tp.all_disciplines")}</option>
          {disciplineOptions.map((discipline) => (
            <option key={discipline} value={discipline}>
              {discipline}
            </option>
          ))}
        </select>

        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          {t("tp.team")}
        </label>
        <select
          className="form-control"
          value={teamId}
          onChange={(e) =>
            setTeamId(e.target.value === "" ? "" : Number(e.target.value))
          }
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        >
          <option value="">{t("tp.choose_team")}</option>
          {filteredTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
              {team.year ? ` (born ${team.year})` : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="tp-history-panel">
        {loading ? (
          <p style={{ color: "#888", fontSize: "0.875rem" }}>Loading…</p>
        ) : history.length === 0 ? (
          <p style={{ color: "#888", fontSize: "0.875rem" }}>
            {t("tp.no_history")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((plan, idx) => {
              const stableKey =
                plan.id != null ? String(plan.id) : `${plan.created_at}-${idx}`;
              return (
                <div
                  key={stableKey}
                  style={{
                    borderRadius: 8,
                    border: "1px solid #e8e8e8",
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expandedId === stableKey ? null : stableKey)
                    }
                    style={{
                      width: "100%",
                      background: "#f7f9ff",
                      border: "none",
                      cursor: "pointer",
                      padding: "8px 12px",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#555" }}>
                      {t("tp.history_session")} #{history.length - idx} —{" "}
                      {formatDate(plan.created_at)}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#1a73e8",
                        fontWeight: 600,
                      }}
                    >
                      {plan.focus_areas
                        .map((f) => t(`tp.focus_${f}`))
                        .join(", ") || "—"}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#888" }}>
                      {plan.age_label} · {plan.expected_players}{" "}
                      {t("tp.history_players").toLowerCase()}
                    </span>
                  </button>
                  {expandedId === stableKey && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderTop: "1px solid #e8e8e8",
                        fontSize: "0.82rem",
                        lineHeight: 1.65,
                        maxHeight: 320,
                        overflowY: "auto",
                        background: "#fff",
                      }}
                    >
                      <ReactMarkdown components={mdLinkNewTab}>
                        {plan.generated_plan}
                      </ReactMarkdown>
                      <button
                        type="button"
                        onClick={() => setExpandedId(null)}
                        style={{
                          marginTop: 8,
                          padding: "4px 12px",
                          borderRadius: 5,
                          border: "1px solid #ccc",
                          background: "#f5f5f5",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        {t("tp.history_close")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
