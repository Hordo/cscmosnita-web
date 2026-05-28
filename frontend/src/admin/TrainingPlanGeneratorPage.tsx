import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import "../styles/adminStyles.css";
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
  const [teamId, setTeamId] = useState<number | "">("");
  const [ageLabel, setAgeLabel] = useState("");
  const [focusAreas, setFocusAreas] = useState<FocusKey[]>([]);
  const [expectedPlayers, setExpectedPlayers] = useState(15);
  const [playerVariance, setPlayerVariance] = useState(3);
  const [coachNotes, setCoachNotes] = useState("");
  // Training duration in minutes (default 90)
  const [duration, setDuration] = useState(60);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<TrainingPlan | null>(null);
  const [copied, setCopied] = useState(false);

  // History state
  const [history, setHistory] = useState<TrainingPlan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(
    null,
  );

  // ── Load teams on mount ──────────────────────────────────────────────────
  useEffect(() => {
    api.get(API_URLS.teams).then((res) => {
      setTeams(res.data ?? []);
    });
  }, []);

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

  // ── Load history whenever teamId changes ────────────────────────────────
  useEffect(() => {
    setLoadingHistory(true);
    setHistory([]);
    const params: Record<string, string> = {};
    if (teamId !== "") params.team_id = String(teamId);
    api
      .get(API_URLS.aiTrainingPlans, { params })
      .then((res) => {
        setHistory(res.data ?? []);
      })
      .catch(() => {
        setHistory([]);
      })
      .finally(() => setLoadingHistory(false));
  }, [teamId]);

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
      setHistory((prev) => [plan, ...prev]);
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
      setHistory((prev) => [saved_plan, ...prev]);
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
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // ─── Render ─────────────────────────────────────────────────────────────────
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

      <div className="tp-layout">
        {/* ── LEFT: Form / Result ──────────────────────────────────────────── */}
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
              teams={teams}
              teamId={teamId}
              setTeamId={setTeamId}
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
            />
          )}
        </div>

        {/* ── RIGHT: History ────────────────────────────────────────────────── */}
        <div>
          <HistoryPanel
            history={history}
            loading={loadingHistory}
            expandedId={expandedHistoryId}
            setExpandedId={setExpandedHistoryId}
            formatDate={formatDate}
            t={t}
          />
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
}: {
  teams: Team[];
  teamId: number | "";
  setTeamId: (v: number | "") => void;
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
        disabled={generating}
        style={{
          width: "100%",
          padding: "0.75rem",
          background: generating ? "#999" : "#1a73e8",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: "1rem",
          fontWeight: 600,
          cursor: generating ? "not-allowed" : "pointer",
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

function HistoryPanel({
  history,
  loading,
  expandedId,
  setExpandedId,
  formatDate,
  t,
}: {
  history: TrainingPlan[];
  loading: boolean;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  formatDate: (iso: string) => string;
  t: (k: string) => string;
}) {
  return (
    <div className="tp-history-panel">
      <h3
        style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}
      >
        🕑 {t("tp.history")}
      </h3>

      {loading ? (
        <p style={{ color: "#888", fontSize: "0.875rem" }}>Loading…</p>
      ) : history.length === 0 ? (
        <p style={{ color: "#888", fontSize: "0.875rem" }}>
          {t("tp.no_history")}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {history.map((plan, idx) => (
            <div
              key={plan.id}
              style={{
                borderRadius: 8,
                border: "1px solid #e8e8e8",
                overflow: "hidden",
              }}
            >
              {/* Header row */}
              <button
                type="button"
                onClick={() =>
                  setExpandedId(expandedId === plan.id ? null : plan.id)
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
                  {plan.focus_areas.map((f) => t(`tp.focus_${f}`)).join(", ") ||
                    "—"}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#888" }}>
                  {plan.age_label} · {plan.expected_players} players
                </span>
              </button>

              {/* Expanded view */}
              {expandedId === plan.id && (
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
          ))}
        </div>
      )}
    </div>
  );
}
