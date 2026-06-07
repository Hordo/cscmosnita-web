import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/adminStyles.css";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

const KNOCKOUT_STAGE_VALUES = ["r32", "r16", "r8", "semi", "third", "final"];

const TournamentGameAdminPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group management
  const [newGroupName, setNewGroupName] = useState("");
  const [newTeamNames, setNewTeamNames] = useState<Record<number, string>>({});

  // Group match score edits
  const [groupMatchEdits, setGroupMatchEdits] = useState<
    Record<number, { home: string; away: string }>
  >({});

  // Knockout match form
  const [knockoutForm, setKnockoutForm] = useState({
    stage: "r16",
    away_team_name: "",
    home_score: "",
    away_score: "",
    youtube_link: "",
    ended_after_penalties: false,
  });
  const [editMatchId, setEditMatchId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.access) setAuthToken(user.access);
  }, [user?.access]);

  const loadTournament = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`${API_URLS.tournaments}${id}/`);
      setTournament(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  // Sync group match edit inputs whenever tournament data reloads
  useEffect(() => {
    if (!tournament) return;
    const edits: Record<number, { home: string; away: string }> = {};
    tournament.groups?.forEach((g: any) => {
      g.matches?.forEach((m: any) => {
        edits[m.id] = {
          home: m.home_score ?? "",
          away: m.away_score ?? "",
        };
      });
    });
    setGroupMatchEdits(edits);
    if (!editMatchId) {
      setKnockoutForm((prev) => ({ ...prev }));
    }
  }, [tournament]);

  // ── Group operations ─────────────────────────────────────────────────────

  const addGroup = async () => {
    if (!newGroupName.trim() || !tournament) return;
    const res = await api.post(API_URLS.tournamentGroups, {
      tournament: tournament.id,
      name: newGroupName.trim(),
    });
    await api.post(`${API_URLS.tournamentGroups}${res.data.id}/add_teams/`, {
      team_names: [],
    });
    setNewGroupName("");
    loadTournament();
  };

  const addTeamsToGroup = async (groupId: number) => {
    const raw = newTeamNames[groupId] || "";
    const names = raw
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    await api.post(`${API_URLS.tournamentGroups}${groupId}/add_teams/`, {
      team_names: names,
    });
    setNewTeamNames((prev) => ({ ...prev, [groupId]: "" }));
    loadTournament();
  };

  const saveGroupMatchScore = async (matchId: number) => {
    const edits = groupMatchEdits[matchId];
    if (!edits) return;
    await api.patch(`${API_URLS.tournamentMatches}${matchId}/`, {
      home_score: edits.home === "" ? null : Number(edits.home),
      away_score: edits.away === "" ? null : Number(edits.away),
    });
    loadTournament();
  };

  const deleteGroup = async (groupId: number) => {
    if (!confirm(t("tour.confirm_delete_group"))) return;
    await api.delete(`${API_URLS.tournamentGroups}${groupId}/`);
    loadTournament();
  };

  const toggleShowDetails = async (groupTeamId: number, value: boolean) => {
    await api.patch(`${API_URLS.groupTeams}${groupTeamId}/`, {
      show_group_details: value,
    });
    loadTournament();
  };

  const toggleMatchVisibility = async (matchId: number, value: boolean) => {
    await api.patch(`${API_URLS.tournamentMatches}${matchId}/`, {
      visible_on_tournament_page: value,
    });
    loadTournament();
  };

  // ── Knockout operations ──────────────────────────────────────────────────

  const saveKnockoutMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournament) return;
    const payload: any = {
      tournament: tournament.id,
      stage: knockoutForm.stage,
      home_team_name: tournament.team_name,
      away_team_name: knockoutForm.away_team_name,
      youtube_link: knockoutForm.youtube_link,
      ended_after_penalties: !!knockoutForm.ended_after_penalties,
    };
    if (knockoutForm.home_score !== "")
      payload.home_score = Number(knockoutForm.home_score);
    if (knockoutForm.away_score !== "")
      payload.away_score = Number(knockoutForm.away_score);

    if (editMatchId) {
      await api.patch(`${API_URLS.tournamentMatches}${editMatchId}/`, payload);
    } else {
      payload.match_order = tournament.knockout_matches.length;
      await api.post(API_URLS.tournamentMatches, payload);
    }
    setKnockoutForm({
      stage: "r16",
      away_team_name: "",
      home_score: "",
      away_score: "",
      youtube_link: "",
      ended_after_penalties: false,
    });
    setEditMatchId(null);
    loadTournament();
  };

  const deleteMatch = async (matchId: number) => {
    if (!confirm(t("tour.confirm_delete_match"))) return;
    await api.delete(`${API_URLS.tournamentMatches}${matchId}/`);
    loadTournament();
  };

  const editKnockoutMatch = (m: any) => {
    setKnockoutForm({
      stage: m.stage,
      away_team_name: m.away_team_name,
      home_score: m.home_score ?? "",
      away_score: m.away_score ?? "",
      youtube_link: m.youtube_link || "",
      ended_after_penalties: !!m.ended_after_penalties,
    });
    setEditMatchId(m.id);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  if (loading)
    return <div className="text-center mt-5 py-5">{t("loading")}</div>;
  if (error) return <div className="alert alert-danger m-3">{error}</div>;
  if (!tournament) return null;

  return (
    <div className="admin-page container-fluid py-3 px-2 px-md-4">
      {/* ── Header ── */}
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => navigate("/admin/tournaments")}
        >
          ← {t("tour.btn_back", "Înapoi")}
        </button>
        <h4 className="mb-0 fw-bold">
          ⚙️ {tournament.name}
          {tournament.season && (
            <span className="text-muted fw-normal fs-6 ms-2">
              ({tournament.season})
            </span>
          )}
        </h4>
        <span className="badge bg-secondary ms-auto">
          {tournament.team_name}
        </span>
      </div>

      {/* ── Group Stage ── */}
      {tournament.has_group_stage && (
        <section className="mb-4">
          <h5 className="border-bottom pb-2 mb-3">
            {t("tour.section_groups")}
          </h5>

          {/* Add group */}
          <div className="d-flex gap-2 mb-3">
            <input
              className="form-control form-control-sm"
              placeholder={t("tour.ph_group_name")}
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGroup()}
            />
            <button
              className="btn btn-sm btn-primary text-nowrap"
              onClick={addGroup}
            >
              {t("tour.btn_add_group")}
            </button>
          </div>

          {tournament.groups.map((group: any) => (
            <div key={group.id} className="card border shadow-sm mb-3">
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <strong>{group.name}</strong>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => deleteGroup(group.id)}
                >
                  {t("tour.btn_delete_group")}
                </button>
              </div>
              <div className="card-body pb-2 pt-2 px-2 px-md-3">
                {/* Add teams */}
                <div className="d-flex gap-2 mb-3">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t("tour.ph_team_names")}
                    value={newTeamNames[group.id] || ""}
                    onChange={(e) =>
                      setNewTeamNames((prev) => ({
                        ...prev,
                        [group.id]: e.target.value,
                      }))
                    }
                  />
                  <button
                    className="btn btn-sm btn-success text-nowrap"
                    onClick={() => addTeamsToGroup(group.id)}
                  >
                    {t("tour.btn_add_teams")}
                  </button>
                </div>

                {/* Standings table */}
                {group.group_teams.length > 0 && (
                  <div className="mb-3">
                    <p className="small text-muted text-uppercase mb-1 fw-semibold">
                      {t("tour.standings")}
                    </p>
                    <div className="table-responsive">
                      <table
                        className="table table-sm table-bordered mb-0"
                        style={{ fontSize: "0.8rem", minWidth: 420 }}
                      >
                        <thead className="table-light">
                          <tr>
                            <th style={{ minWidth: 100 }}>
                              {t("tour.col_team")}
                            </th>
                            <th className="text-center">{t("tour.col_p")}</th>
                            <th className="text-center">{t("tour.col_w")}</th>
                            <th className="text-center">{t("tour.col_d")}</th>
                            <th className="text-center">{t("tour.col_l")}</th>
                            <th className="text-center">{t("tour.col_gf")}</th>
                            <th className="text-center">{t("tour.col_ga")}</th>
                            <th className="text-center">{t("tour.col_pts")}</th>
                            <th className="text-center">
                              {t("tour.col_show_details")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...group.group_teams]
                            .sort(
                              (a: any, b: any) =>
                                b.points - a.points ||
                                b.goals_for -
                                  b.goals_against -
                                  (a.goals_for - a.goals_against),
                            )
                            .map((gt: any) => (
                              <tr
                                key={gt.id}
                                className={
                                  gt.team_name === tournament.team_name
                                    ? "table-primary fw-semibold"
                                    : ""
                                }
                              >
                                <td>{gt.team_name}</td>
                                {[
                                  "played",
                                  "won",
                                  "drawn",
                                  "lost",
                                  "goals_for",
                                  "goals_against",
                                  "points",
                                ].map((field) => (
                                  <td key={field} className="text-center">
                                    {gt[field]}
                                  </td>
                                ))}
                                <td className="text-center">
                                  <div className="form-check form-switch d-flex justify-content-center">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      role="switch"
                                      checked={!!gt.show_group_details}
                                      onChange={(e) =>
                                        toggleShowDetails(
                                          gt.id,
                                          e.target.checked,
                                        )
                                      }
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Group matches — mobile-friendly cards */}
                {group.matches.length > 0 && (
                  <div>
                    <p className="small text-muted text-uppercase mb-2 fw-semibold">
                      {t("matches")}
                    </p>

                    {/* Desktop table */}
                    <div className="d-none d-md-block table-responsive">
                      <table
                        className="table table-sm table-bordered mb-0"
                        style={{ fontSize: "0.82rem" }}
                      >
                        <thead className="table-light">
                          <tr>
                            <th>{t("tour.col_home")}</th>
                            <th>{t("tour.col_score")}</th>
                            <th>{t("tour.col_away")}</th>
                            <th>{t("tour.col_video")}</th>
                            <th className="text-center">
                              {t("tour.col_visible")}
                            </th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.matches.map((m: any) => (
                            <tr key={m.id}>
                              <td
                                className={
                                  m.home_team_name === tournament.team_name
                                    ? "fw-semibold"
                                    : ""
                                }
                              >
                                {m.home_team_name}
                              </td>
                              <td>
                                <div className="d-flex gap-1 align-items-center">
                                  <input
                                    type="number"
                                    className="form-control form-control-sm p-0 text-center"
                                    style={{ width: 44 }}
                                    value={groupMatchEdits[m.id]?.home ?? ""}
                                    onChange={(e) =>
                                      setGroupMatchEdits((prev) => ({
                                        ...prev,
                                        [m.id]: {
                                          ...prev[m.id],
                                          home: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <span>–</span>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm p-0 text-center"
                                    style={{ width: 44 }}
                                    value={groupMatchEdits[m.id]?.away ?? ""}
                                    onChange={(e) =>
                                      setGroupMatchEdits((prev) => ({
                                        ...prev,
                                        [m.id]: {
                                          ...prev[m.id],
                                          away: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <button
                                    className="btn btn-sm btn-success py-0 px-1"
                                    title="Save score"
                                    onClick={() => saveGroupMatchScore(m.id)}
                                  >
                                    💾
                                  </button>
                                </div>
                              </td>
                              <td
                                className={
                                  m.away_team_name === tournament.team_name
                                    ? "fw-semibold"
                                    : ""
                                }
                              >
                                {m.away_team_name}
                              </td>
                              <td>
                                <input
                                  className="form-control form-control-sm p-0"
                                  style={{ width: 120 }}
                                  placeholder="YouTube URL"
                                  defaultValue={m.youtube_link || ""}
                                  onBlur={(e) =>
                                    api
                                      .patch(
                                        `${API_URLS.tournamentMatches}${m.id}/`,
                                        { youtube_link: e.target.value },
                                      )
                                      .then(() => loadTournament())
                                  }
                                />
                              </td>
                              <td className="text-center">
                                <div className="form-check form-switch d-flex justify-content-center">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    checked={
                                      m.visible_on_tournament_page !== false
                                    }
                                    onChange={(e) =>
                                      toggleMatchVisibility(
                                        m.id,
                                        e.target.checked,
                                      )
                                    }
                                  />
                                </div>
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => deleteMatch(m.id)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="d-md-none d-flex flex-column gap-2">
                      {group.matches.map((m: any) => (
                        <div key={m.id} className="border rounded p-2">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span
                              className={
                                m.home_team_name === tournament.team_name
                                  ? "fw-semibold"
                                  : ""
                              }
                            >
                              {m.home_team_name}
                            </span>
                            <div className="d-flex align-items-center gap-1">
                              <input
                                type="number"
                                className="form-control form-control-sm text-center p-0"
                                style={{ width: 48 }}
                                value={groupMatchEdits[m.id]?.home ?? ""}
                                onChange={(e) =>
                                  setGroupMatchEdits((prev) => ({
                                    ...prev,
                                    [m.id]: {
                                      ...prev[m.id],
                                      home: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <span className="px-1">–</span>
                              <input
                                type="number"
                                className="form-control form-control-sm text-center p-0"
                                style={{ width: 48 }}
                                value={groupMatchEdits[m.id]?.away ?? ""}
                                onChange={(e) =>
                                  setGroupMatchEdits((prev) => ({
                                    ...prev,
                                    [m.id]: {
                                      ...prev[m.id],
                                      away: e.target.value,
                                    },
                                  }))
                                }
                              />
                            </div>
                            <span
                              className={
                                m.away_team_name === tournament.team_name
                                  ? "fw-semibold"
                                  : ""
                              }
                            >
                              {m.away_team_name}
                            </span>
                          </div>
                          <div className="d-flex gap-2 align-items-center flex-wrap">
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => saveGroupMatchScore(m.id)}
                            >
                              💾 {t("tour.btn_update")}
                            </button>
                            <input
                              className="form-control form-control-sm flex-grow-1"
                              placeholder="YouTube URL"
                              defaultValue={m.youtube_link || ""}
                              onBlur={(e) =>
                                api
                                  .patch(
                                    `${API_URLS.tournamentMatches}${m.id}/`,
                                    { youtube_link: e.target.value },
                                  )
                                  .then(() => loadTournament())
                              }
                            />
                            <div className="form-check form-switch mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                checked={m.visible_on_tournament_page !== false}
                                onChange={(e) =>
                                  toggleMatchVisibility(m.id, e.target.checked)
                                }
                              />
                              <label className="form-check-label small">
                                {t("tour.col_visible")}
                              </label>
                            </div>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => deleteMatch(m.id)}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Knockout Stage ── */}
      <section className="mb-4">
        <h5 className="border-bottom pb-2 mb-3">
          {t("tour.section_knockout")}
        </h5>

        {KNOCKOUT_STAGE_VALUES.map((stageVal) => {
          const stageMatches = tournament.knockout_matches.filter(
            (m: any) => m.stage === stageVal,
          );
          if (stageMatches.length === 0) return null;
          return (
            <div key={stageVal} className="mb-3">
              <p className="small text-muted text-uppercase mb-2 fw-semibold">
                {t(`stage.${stageVal}`)}
              </p>

              {/* Desktop table */}
              <div className="d-none d-md-block table-responsive">
                <table
                  className="table table-sm table-bordered mb-0"
                  style={{ fontSize: "0.82rem" }}
                >
                  <thead className="table-light">
                    <tr>
                      <th>{t("tour.col_home")}</th>
                      <th>{t("tour.col_score")}</th>
                      <th>{t("tour.col_away")}</th>
                      <th>{t("tour.col_video")}</th>
                      <th className="text-center">{t("tour.col_visible")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageMatches.map((m: any) => (
                      <tr key={m.id}>
                        <td>{m.home_team_name}</td>
                        <td>
                          {m.home_score ?? "–"} – {m.away_score ?? "–"}
                          {m.ended_after_penalties && (
                            <span className="ms-1 badge bg-warning text-dark small">
                              pen.
                            </span>
                          )}
                        </td>
                        <td>{m.away_team_name}</td>
                        <td>
                          {m.youtube_link ? (
                            <a
                              href={m.youtube_link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              ▶
                            </a>
                          ) : (
                            "–"
                          )}
                        </td>
                        <td className="text-center">
                          <div className="form-check form-switch d-flex justify-content-center">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              checked={m.visible_on_tournament_page !== false}
                              onChange={(e) =>
                                toggleMatchVisibility(m.id, e.target.checked)
                              }
                            />
                          </div>
                        </td>
                        <td className="d-flex gap-1">
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => editKnockoutMatch(m)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => deleteMatch(m.id)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="d-md-none d-flex flex-column gap-2">
                {stageMatches.map((m: any) => (
                  <div key={m.id} className="border rounded p-2">
                    <div className="d-flex justify-content-between align-items-center mb-1 fw-semibold">
                      <span>{m.home_team_name}</span>
                      <span className="px-2">
                        {m.home_score ?? "–"} – {m.away_score ?? "–"}
                        {m.ended_after_penalties && (
                          <span className="ms-1 badge bg-warning text-dark small">
                            pen.
                          </span>
                        )}
                      </span>
                      <span>{m.away_team_name}</span>
                    </div>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      {m.youtube_link && (
                        <a
                          href={m.youtube_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-secondary"
                        >
                          ▶ Video
                        </a>
                      )}
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          checked={m.visible_on_tournament_page !== false}
                          onChange={(e) =>
                            toggleMatchVisibility(m.id, e.target.checked)
                          }
                        />
                        <label className="form-check-label small">
                          {t("tour.col_visible")}
                        </label>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-secondary ms-auto"
                        onClick={() => editKnockoutMatch(m)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteMatch(m.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Add / Edit knockout match form */}
        <div className="card border shadow-sm mt-3">
          <div className="card-header py-2">
            <h6 className="mb-0">
              {editMatchId
                ? `✏️ ${t("tour.form_edit_match")}`
                : `➕ ${t("tour.form_add_match")}`}
            </h6>
          </div>
          <div className="card-body p-3">
            <form onSubmit={saveKnockoutMatch}>
              <div className="row g-2">
                <div className="col-6 col-md-2">
                  <label className="form-label small mb-1">
                    {t("stage.r16", "Etapă")}
                  </label>
                  <select
                    className="form-select form-select-sm"
                    value={knockoutForm.stage}
                    onChange={(e) =>
                      setKnockoutForm({
                        ...knockoutForm,
                        stage: e.target.value,
                      })
                    }
                  >
                    {KNOCKOUT_STAGE_VALUES.map((s) => (
                      <option key={s} value={s}>
                        {t(`stage.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small mb-1">
                    {t("tour.col_home")}
                  </label>
                  <input
                    className="form-control form-control-sm bg-light"
                    value={tournament.team_name ?? ""}
                    readOnly
                    title="Home team is always your team"
                  />
                </div>
                <div className="col-6 col-md-auto">
                  <label className="form-label small mb-1">
                    {t("tour.col_score")}
                  </label>
                  <div className="d-flex align-items-center gap-1">
                    <input
                      type="number"
                      className="form-control form-control-sm text-center"
                      style={{ width: 56 }}
                      placeholder="–"
                      value={knockoutForm.home_score}
                      onChange={(e) =>
                        setKnockoutForm({
                          ...knockoutForm,
                          home_score: e.target.value,
                        })
                      }
                    />
                    <span>:</span>
                    <input
                      type="number"
                      className="form-control form-control-sm text-center"
                      style={{ width: 56 }}
                      placeholder="–"
                      value={knockoutForm.away_score}
                      onChange={(e) =>
                        setKnockoutForm({
                          ...knockoutForm,
                          away_score: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label small mb-1">
                    {t("tour.col_away")}
                  </label>
                  <input
                    className="form-control form-control-sm"
                    placeholder={t("tour.ph_away_team")}
                    value={knockoutForm.away_team_name}
                    onChange={(e) =>
                      setKnockoutForm({
                        ...knockoutForm,
                        away_team_name: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label small mb-1">
                    {t("tour.ph_youtube")}
                  </label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="https://youtube.com/..."
                    value={knockoutForm.youtube_link}
                    onChange={(e) =>
                      setKnockoutForm({
                        ...knockoutForm,
                        youtube_link: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="col-12 col-md-auto d-flex align-items-end">
                  <div className="form-check mb-1">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="endedAfterPenalties"
                      checked={knockoutForm.ended_after_penalties}
                      onChange={(e) =>
                        setKnockoutForm({
                          ...knockoutForm,
                          ended_after_penalties: e.target.checked,
                        })
                      }
                    />
                    <label
                      className="form-check-label small"
                      htmlFor="endedAfterPenalties"
                    >
                      Ended after penalties
                    </label>
                  </div>
                </div>
                <div className="col-12 d-flex gap-2 mt-1">
                  <button className="btn btn-primary btn-sm" type="submit">
                    {editMatchId ? t("tour.btn_update") : t("tour.btn_add")}
                  </button>
                  {editMatchId && (
                    <button
                      className="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => {
                        setEditMatchId(null);
                        setKnockoutForm({
                          stage: "r16",
                          away_team_name: "",
                          home_score: "",
                          away_score: "",
                          youtube_link: "",
                          ended_after_penalties: false,
                        });
                      }}
                    >
                      ✕ {t("tour.btn_close")}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TournamentGameAdminPage;
