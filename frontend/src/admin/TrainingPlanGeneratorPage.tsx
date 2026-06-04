import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import "../styles/adminStyles.css";

import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

const mdLinkNewTab = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  a: ({ node: _node, children, ...props }: any) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const FOCUS_OPTIONS = [
  "passing",
  "finishing",
  "positioning",
  "defending",
  "pressing",
  "dribbling",
  "set_pieces",
  "goalkeeping",
  "physical",
  "fun_games",
  "transition",
] as const;

type FocusKey = (typeof FOCUS_OPTIONS)[number];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrainingPlanGeneratorPage() {
  const { t, i18n } = useTranslation();

  // Form state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("all");
  const [teamId, setTeamId] = useState<number | "">("");
  const [ageLabel, setAgeLabel] = useState("");
  const [focusAreas, setFocusAreas] = useState<FocusKey[]>([]);
  const [expectedPlayers, setExpectedPlayers] = useState(15);
  const [playerVariance, setPlayerVariance] = useState(3);
  const [coachNotes, setCoachNotes] = useState("");
  // Training duration in minutes (default 60)
  const [duration, setDuration] = useState(60);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<TrainingPlan | null>(null);
  const [copied, setCopied] = useState(false);
  // New: restrict one training per team per day
  const [alreadyGeneratedToday, setAlreadyGeneratedToday] = useState(false);

  // ── Load teams on mount ──────────────────────────────────────────────────
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
      setAgeLabel("");
    }
  }, [selectedDiscipline, teamId, teams]);

  // ── Check if a plan was already generated today for this team ────────────
  useEffect(() => {
    if (teamId === "") {
      setAlreadyGeneratedToday(false);
      return;
    }
    api
      .get(API_URLS.aiTrainingPlans, { params: { team_id: String(teamId) } })
      .then((res) => {
        const plans: TrainingPlan[] = res.data ?? [];
        const today = new Date();
        const hasToday = plans.some((p) => {
          try {
            const d = new Date(p.created_at);
            return (
              d.getFullYear() === today.getFullYear() &&
              d.getMonth() === today.getMonth() &&
              d.getDate() === today.getDate()
            );
          } catch (e) {
            return false;
          }
        });
        setAlreadyGeneratedToday(hasToday);
      })
      .catch(() => setAlreadyGeneratedToday(false));
  }, [teamId]);

  // ── Auto-fill age label when team is selected ────────────────────────────
  useEffect(() => {
    if (teamId === "") {
      return;
    }
    const team = teams.find((t) => t.id === teamId);
    if (team?.year) {
      const age = new Date().getFullYear() - team.year;
      setAgeLabel(`U${age} (born ${team.year})`);
    }
  }, [teamId, teams]);

  // ── Toggle focus area ────────────────────────────────────────────────────
  const toggleFocus = (key: FocusKey) => {
    setFocusAreas((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );
  };

  // ── Validate ─────────────────────────────────────────────────────────────
  const validate = (): string | null => {
    if (!ageLabel.trim()) return t("tp.error_age");
    if (focusAreas.length === 0) return t("tp.error_focus");
    if (expectedPlayers < 1) return t("tp.error_players");
    return null;
  };

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (alreadyGeneratedToday) {
      setError(
        t("tp.already_generated_today") ||
          "Try again tomorrow or use previous trainings.",
      );
      return;
    }
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setGenerating(true);
    setGeneratedPlan(null);

    try {
      const payload = {
        team_id: teamId === "" ? null : teamId,
        age_label: ageLabel.trim(),
        focus_areas: focusAreas,
        expected_players: expectedPlayers,
        player_range_min: Math.max(1, expectedPlayers - playerVariance),
        player_range_max: expectedPlayers + playerVariance,
        coach_notes: coachNotes.trim(),
        language: i18n.language,
        duration_minutes: duration,
      };
      const res = await api.post(API_URLS.aiGenerateTraining, payload);
      const savePayload = {
        team_id: teamId === "" ? null : teamId,
        age_label: ageLabel.trim(),
        focus_areas: focusAreas,
        expected_players: expectedPlayers,
        player_range_min: Math.max(1, expectedPlayers - playerVariance),
        player_range_max: expectedPlayers + playerVariance,
        coach_notes: coachNotes.trim(),
        generated_plan: res.data.generated_plan,
        followup_notes: res.data.followup_notes,
      };
      const saveRes = await api.post(API_URLS.aiSaveTraining, savePayload);
      // Mark that we have a generated plan for this team today to prevent duplicates
      setAlreadyGeneratedToday(true);
      const plan: TrainingPlan = {
        id: saveRes.data.id,
        team_id: teamId === "" ? null : (teamId as number),
        team_name: teams.find((t) => t.id === teamId)?.name ?? null,
        age_label: ageLabel,
        focus_areas: focusAreas,
        expected_players: expectedPlayers,
        player_range_min: Math.max(1, expectedPlayers - playerVariance),
        player_range_max: expectedPlayers + playerVariance,
        coach_notes: coachNotes,
        generated_plan: res.data.generated_plan,
        followup_notes: res.data.followup_notes,
        created_by: null,
        created_at: saveRes.data.created_at,
      };
      setGeneratedPlan(plan);
      setSaved(true);
      // No-op: history state removed
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "An unexpected error occurred.";
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!generatedPlan) return;
    navigator.clipboard.writeText(generatedPlan.generated_plan).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Save session (coach confirms they used it) ─────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveSession = async () => {
    if (!generatedPlan || saving || saved) return;
    setSaving(true);
    try {
      const payload = {
        team_id: generatedPlan.team_id,
        age_label: generatedPlan.age_label,
        focus_areas: generatedPlan.focus_areas,
        expected_players: generatedPlan.expected_players,
        player_range_min: generatedPlan.player_range_min,
        player_range_max: generatedPlan.player_range_max,
        coach_notes: generatedPlan.coach_notes,
        generated_plan: generatedPlan.generated_plan,
        followup_notes: generatedPlan.followup_notes,
      };
      const res = await api.post(API_URLS.aiSaveTraining, payload);
      const saved_plan: TrainingPlan = {
        ...generatedPlan,
        id: res.data.id,
        created_at: res.data.created_at,
      };
      setGeneratedPlan(saved_plan);
      // No-op: history state removed
      setSaved(true);
    } catch (err: any) {
      // save failed silently
    } finally {
      setSaving(false);
    }
  };

  // ── New session ───────────────────────────────────────────────────────────
  const handleNewSession = () => {
    setGeneratedPlan(null);
    setFocusAreas([]);
    setCoachNotes("");
    setError(null);
    setSaved(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  // ─── Render ─────────────────────────────────────────────────────────────────
  const navigate = useNavigate();
  return (
    <div
      className="admin-page"
      style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 4 }}>
          🤖 {t("tp.title")}
        </h1>
        <p style={{ color: "#666", margin: 0 }}>{t("tp.subtitle")}</p>
      </div>

      {/* Link to history page */}
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => navigate("/admin/training-planner/history")}
          style={{
            padding: "7px 16px",
            borderRadius: 7,
            border: "1px solid #1a73e8",
            background: "#f8faff",
            color: "#1a73e8",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.95rem",
            marginBottom: 0,
          }}
        >
          🕑 {t("tp.history")}
        </button>
      </div>

      <div className="tp-layout">
        <div>
          {generatedPlan ? (
            <GeneratedPlanView
              plan={generatedPlan}
              onCopy={handleCopy}
              copied={copied}
              onNewSession={handleNewSession}
              onSaveSession={handleSaveSession}
              saving={saving}
              saved={saved}
              t={t}
            />
          ) : (
            <GeneratorForm
              teams={filteredTeams}
              teamId={teamId}
              setTeamId={setTeamId}
              selectedDiscipline={selectedDiscipline}
              setSelectedDiscipline={setSelectedDiscipline}
              disciplineOptions={disciplineOptions}
              ageLabel={ageLabel}
              setAgeLabel={setAgeLabel}
              focusAreas={focusAreas}
              toggleFocus={toggleFocus}
              expectedPlayers={expectedPlayers}
              setExpectedPlayers={setExpectedPlayers}
              playerVariance={playerVariance}
              setPlayerVariance={setPlayerVariance}
              coachNotes={coachNotes}
              setCoachNotes={setCoachNotes}
              duration={duration}
              setDuration={setDuration}
              generating={generating}
              error={error}
              onGenerate={handleGenerate}
              t={t}
              alreadyGeneratedToday={alreadyGeneratedToday}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function GeneratorForm({
  teams,
  teamId,
  setTeamId,
  selectedDiscipline,
  setSelectedDiscipline,
  disciplineOptions,
  ageLabel,
  setAgeLabel,
  focusAreas,
  toggleFocus,
  expectedPlayers,
  setExpectedPlayers,
  playerVariance,
  setPlayerVariance,
  coachNotes,
  setCoachNotes,
  duration,
  setDuration,
  generating,
  error,
  onGenerate,
  t,
  alreadyGeneratedToday,
}: {
  teams: Team[];
  teamId: number | "";
  setTeamId: (v: number | "") => void;
  selectedDiscipline: string;
  setSelectedDiscipline: (v: string) => void;
  disciplineOptions: string[];
  ageLabel: string;
  setAgeLabel: (v: string) => void;
  focusAreas: FocusKey[];
  toggleFocus: (k: FocusKey) => void;
  expectedPlayers: number;
  setExpectedPlayers: (v: number) => void;
  playerVariance: number;
  setPlayerVariance: (v: number) => void;
  coachNotes: string;
  setCoachNotes: (v: string) => void;
  duration: number;
  setDuration: (v: number) => void;
  generating: boolean;
  error: string | null;
  onGenerate: () => void;
  t: (k: string) => string;
  alreadyGeneratedToday: boolean;
}) {
  return (
    <div
      className="admin-form-card"
      style={{
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: 10,
        padding: "1.5rem",
      }}
    >
      {/* Discipline selector */}
      <div className="form-group" style={{ marginBottom: "1.25rem" }}>
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
          }}
        >
          <option value="all">{t("tp.all_disciplines")}</option>
          {disciplineOptions.map((discipline) => (
            <option key={discipline} value={discipline}>
              {discipline}
            </option>
          ))}
        </select>
      </div>

      {/* Team selector */}
      <div className="form-group" style={{ marginBottom: "1.25rem" }}>
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
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
              {team.year ? ` (born ${team.year})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Age label */}
      <div className="form-group" style={{ marginBottom: "1.25rem" }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          {t("tp.age_label")} <span style={{ color: "red" }}>*</span>
        </label>
        <input
          type="text"
          className="form-control"
          value={ageLabel}
          onChange={(e) => setAgeLabel(e.target.value)}
          placeholder={t("tp.age_label_placeholder")}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
      </div>

      {/* Focus areas */}
      <div className="form-group" style={{ marginBottom: "1.25rem" }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
          {t("tp.focus_areas")} <span style={{ color: "red" }}>*</span>
        </label>
        <p style={{ fontSize: "0.83rem", color: "#777", margin: "0 0 10px" }}>
          {t("tp.focus_hint")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {FOCUS_OPTIONS.map((key) => {
            const active = focusAreas.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFocus(key)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: active ? "2px solid #1a73e8" : "1px solid #ccc",
                  background: active ? "#e8f0fe" : "#f8f8f8",
                  color: active ? "#1a73e8" : "#555",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  transition: "all 0.15s",
                }}
              >
                {t(`tp.focus_${key}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Players */}
      <div className="tp-players-grid">
        <div className="form-group">
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
            {t("tp.expected_players")}
          </label>
          <input
            type="number"
            className="form-control"
            min={1}
            max={40}
            value={expectedPlayers}
            onChange={(e) => setExpectedPlayers(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
        </div>
        <div className="form-group">
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
            {t("tp.player_variance")}
          </label>
          <input
            type="number"
            className="form-control"
            min={0}
            max={10}
            value={playerVariance}
            onChange={(e) => setPlayerVariance(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
          />
          <small style={{ color: "#888", fontSize: "0.78rem" }}>
            {t("tp.player_variance_hint")} (
            {Math.max(1, expectedPlayers - playerVariance)}–
            {expectedPlayers + playerVariance})
          </small>
        </div>
      </div>

      {/* Duration */}
      <div className="form-group" style={{ marginBottom: "1.25rem" }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          {t("tp.duration")}
        </label>
        <select
          className="form-control"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        >
          {Array.from({ length: 10 }, (_, i) => 30 * (i + 1)).map((mins) => (
            <option key={mins} value={mins}>
              {Math.floor(mins / 60) > 0 ? `${Math.floor(mins / 60)}h ` : ""}
              {mins % 60 !== 0 ? `${mins % 60}min` : ""}
              {mins % 60 === 0 ? "" : ""}
            </option>
          ))}
        </select>
        <small style={{ color: "#888", fontSize: "0.78rem" }}>
          {t("tp.duration_hint") ||
            "Select total training duration (30 min to 5 hours)"}
        </small>
      </div>

      {/* Coach notes */}
      <div className="form-group" style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
          {t("tp.coach_notes")}
        </label>
        <textarea
          className="form-control"
          rows={3}
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          placeholder={t("tp.coach_notes_placeholder")}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: 6,
            border: "1px solid #ccc",
            resize: "vertical",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: "#fdecea",
            border: "1px solid #f5c2c7",
            borderRadius: 6,
            padding: "0.75rem 1rem",
            color: "#842029",
            marginBottom: "1rem",
            fontSize: "0.9rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating || alreadyGeneratedToday}
        style={{
          width: "100%",
          padding: "0.75rem",
          background: generating || alreadyGeneratedToday ? "#999" : "#1a73e8",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: "1rem",
          fontWeight: 600,
          cursor:
            generating || alreadyGeneratedToday ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {generating ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 16,
                border: "2px solid #fff",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
            {t("tp.generating")}
          </>
        ) : alreadyGeneratedToday ? (
          <>
            ⏳{" "}
            {t("tp.already_generated_today") ||
              "Try again tomorrow or use previous trainings."}
          </>
        ) : (
          <>✨ {t("tp.generate")}</>
        )}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function GeneratedPlanView({
  plan,
  onCopy,
  copied,
  onNewSession,
  onSaveSession,
  saving,
  saved,
  t,
}: {
  plan: TrainingPlan;
  onCopy: () => void;
  copied: boolean;
  onNewSession: () => void;
  onSaveSession: () => void;
  saving: boolean;
  saved: boolean;
  t: (k: string) => string;
}) {
  // Split out the follow-up section for display
  const followupMarker = "## Follow-up for next session";
  const markerIdx = plan.generated_plan
    .toLowerCase()
    .indexOf(followupMarker.toLowerCase());
  const mainPlan =
    markerIdx !== -1
      ? plan.generated_plan.slice(0, markerIdx).trim()
      : plan.generated_plan;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: 10,
        padding: "1.5rem",
      }}
    >
      {/* Actions toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={onNewSession}
          style={{
            padding: "7px 16px",
            borderRadius: 7,
            border: "1px solid #ccc",
            background: "#f8f8f8",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          ← {t("tp.new_session")}
        </button>
        <button
          type="button"
          onClick={onCopy}
          style={{
            padding: "7px 16px",
            borderRadius: 7,
            border: "1px solid #1a73e8",
            background: copied ? "#e8f0fe" : "#fff",
            color: "#1a73e8",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          {copied ? `✓ ${t("tp.copied")}` : `📋 ${t("tp.copy")}`}
        </button>{" "}
        {/* Save / Mark as used */}
        <button
          type="button"
          onClick={onSaveSession}
          disabled={saving || saved}
          style={{
            padding: "7px 16px",
            borderRadius: 7,
            border: saved ? "1px solid #27ae60" : "1px solid #27ae60",
            background: saved ? "#eafaf1" : "#27ae60",
            color: saved ? "#27ae60" : "#fff",
            cursor: saving || saved ? "default" : "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saved
            ? `\u2705 ${t("tp.session_saved")}`
            : saving
              ? t("tp.saving")
              : `\uD83D\uDCBE ${t("tp.mark_as_used")}`}
        </button>{" "}
      </div>

      {/* Meta info */}
      <div
        style={{
          background: "#f0f4ff",
          borderRadius: 8,
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
          fontSize: "0.875rem",
          color: "#444",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem 1.5rem",
        }}
      >
        <span>
          <strong>{t("tp.age_label")}:</strong> {plan.age_label}
        </span>
        <span>
          <strong>{t("tp.focus_areas")}:</strong>{" "}
          {plan.focus_areas.map((f) => t(`tp.focus_${f}`)).join(", ")}
        </span>
        <span>
          <strong>{t("tp.expected_players")}:</strong> {plan.expected_players} (
          {plan.player_range_min}–{plan.player_range_max})
        </span>
      </div>

      {/* Main plan (markdown) */}
      <h3
        style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}
      >
        📋 {t("tp.generated_plan")}
      </h3>
      <div
        style={{
          background: "#fafafa",
          borderRadius: 8,
          padding: "1rem 1.25rem",
          lineHeight: 1.7,
          fontSize: "0.95rem",
        }}
        className="markdown-body"
      >
        <ReactMarkdown components={mdLinkNewTab}>{mainPlan}</ReactMarkdown>
      </div>

      {/* Follow-up notes */}
      {plan.followup_notes && (
        <div style={{ marginTop: "1.25rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
              color: "#e67e22",
            }}
          >
            🔁 {t("tp.followup")}
          </h3>
          <div
            style={{
              background: "#fff8f0",
              border: "1px solid #f5cba7",
              borderRadius: 8,
              padding: "0.75rem 1rem",
              fontSize: "0.9rem",
              lineHeight: 1.65,
            }}
          >
            <ReactMarkdown components={mdLinkNewTab}>
              {plan.followup_notes}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
