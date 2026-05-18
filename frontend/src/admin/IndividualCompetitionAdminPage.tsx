import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "../styles/adminStyles.css";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

const MEDAL_OPTIONS = [
  { value: "gold", emoji: "🥇" },
  { value: "silver", emoji: "🥈" },
  { value: "bronze", emoji: "🥉" },
  { value: "none", emoji: "" },
];

const emptyComp = {
  name: "",
  team_id: "",
  date: "",
  location: "",
  season: "",
  description: "",
};

const emptyResult = {
  competition: "",
  player_id: "",
  athlete_name: "",
  event_category: "",
  place: "",
  medal: "none",
  notes: "",
};

const IndividualCompetitionAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isSuperAdmin } = useAuth();

  const [teams, setTeams] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [activeComp, setActiveComp] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Competition form state
  const [showCompModal, setShowCompModal] = useState(false);
  const [compForm, setCompForm] = useState(emptyComp);
  const [editCompId, setEditCompId] = useState<number | null>(null);
  const [compSaving, setCompSaving] = useState(false);

  // Result form state
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultForm, setResultForm] = useState(emptyResult);
  const [editResultId, setEditResultId] = useState<number | null>(null);
  const [resultSaving, setResultSaving] = useState(false);

  // Load teams + disciplines on mount, then auto-select discipline/team
  useEffect(() => {
    if (!user?.access) return;
    setAuthToken(user.access);
    Promise.all([api.get(API_URLS.teams), api.get(API_URLS.disciplines)])
      .then(([teamsRes, discRes]) => {
        const allTeams: any[] = teamsRes.data;
        const allDiscs: any[] = discRes.data;
        setTeams(allTeams);
        setDisciplines(allDiscs);

        // Determine which individual disciplines this user can access
        const indivDiscs = allDiscs.filter(
          (d: any) => d.discipline_type === "individual",
        );
        const adminIndivDiscIds = user.is_superuser
          ? null
          : (user.admin_roles ?? [])
              .filter((r: any) => r.discipline_type === "individual")
              .map((r: any) => r.discipline_id as number);
        const accessibleDiscs =
          adminIndivDiscIds === null
            ? indivDiscs
            : indivDiscs.filter((d: any) => adminIndivDiscIds.includes(d.id));

        // Auto-select when there is exactly one accessible individual discipline
        if (accessibleDiscs.length === 1) {
          const autoDisc = accessibleDiscs[0];
          setSelectedDisciplineId(String(autoDisc.id));
          // Also auto-select team if that discipline has exactly one team
          const discTeams = allTeams.filter(
            (tm: any) => tm.discipline === autoDisc.name,
          );
          if (discTeams.length === 1) {
            setSelectedTeamId(String(discTeams[0].id));
          }
        }
      })
      .catch(() => setError(t("ic.load_error")));
  }, [user?.access]);

  // Disciplines visible to this user (individual-sport only)
  const individualDisciplines = disciplines.filter(
    (d: any) => d.discipline_type === "individual",
  );
  const adminIndivDiscIds: number[] | null = isSuperAdmin()
    ? null
    : (user?.admin_roles ?? [])
        .filter((r: any) => r.discipline_type === "individual")
        .map((r: any) => r.discipline_id as number);
  const visibleDisciplines =
    adminIndivDiscIds === null
      ? individualDisciplines
      : individualDisciplines.filter((d: any) =>
          adminIndivDiscIds.includes(d.id),
        );

  // Teams filtered by selected discipline (fall back to all individual-discipline teams)
  const disciplinePool = selectedDisciplineId
    ? visibleDisciplines.filter(
        (d: any) => String(d.id) === selectedDisciplineId,
      )
    : visibleDisciplines;
  const poolNames = disciplinePool.map((d: any) => d.name as string);
  const visibleTeams =
    poolNames.length > 0
      ? teams.filter((tm: any) => poolNames.includes(tm.discipline))
      : teams;

  // Load competitions when team changes
  const loadCompetitions = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setLoading(true);
    setActiveComp(null);
    try {
      const res = await api.get(
        `${API_URLS.individualCompetitions}?team_id=${teamId}`,
      );
      setCompetitions(res.data);
    } catch {
      setError(t("ic.load_error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadCompetitions(selectedTeamId);
      api
        .get(`${API_URLS.players}?team_id=${selectedTeamId}`)
        .then((r) => setPlayers(r.data))
        .catch(() => setPlayers([]));
    } else {
      setCompetitions([]);
      setPlayers([]);
    }
  }, [selectedTeamId]);

  // Load full competition detail (with results)
  const loadCompDetail = useCallback(async (compId: number) => {
    const res = await api.get(`${API_URLS.individualCompetitions}${compId}/`);
    setActiveComp(res.data);
  }, []);

  // ── Competition CRUD ──────────────────────────────────────────────────────

  const openAddComp = () => {
    setCompForm({ ...emptyComp, team_id: selectedTeamId });
    setEditCompId(null);
    setShowCompModal(true);
  };

  const openEditComp = (comp: any) => {
    setCompForm({
      name: comp.name,
      team_id: String(comp.team),
      date: comp.date || "",
      location: comp.location || "",
      season: comp.season || "",
      description: comp.description || "",
    });
    setEditCompId(comp.id);
    setShowCompModal(true);
  };

  const saveComp = async () => {
    if (!compForm.name.trim() || !compForm.team_id) return;
    setCompSaving(true);
    const payload = {
      name: compForm.name,
      team_id: Number(compForm.team_id),
      date: compForm.date || null,
      location: compForm.location,
      season: compForm.season,
      description: compForm.description || null,
    };
    try {
      if (editCompId) {
        await api.put(
          `${API_URLS.individualCompetitions}${editCompId}/`,
          payload,
        );
      } else {
        await api.post(API_URLS.individualCompetitions, payload);
      }
      setShowCompModal(false);
      await loadCompetitions(selectedTeamId);
      if (activeComp) await loadCompDetail(editCompId ?? activeComp.id);
    } catch {
      setError(t("ic.save_error"));
    } finally {
      setCompSaving(false);
    }
  };

  const deleteComp = async (compId: number) => {
    if (!window.confirm(t("ic.confirm_delete_competition"))) return;
    await api.delete(`${API_URLS.individualCompetitions}${compId}/`);
    if (activeComp?.id === compId) setActiveComp(null);
    await loadCompetitions(selectedTeamId);
  };

  // ── Result CRUD ───────────────────────────────────────────────────────────

  const openAddResult = (competitionId: number) => {
    setResultForm({ ...emptyResult, competition: String(competitionId) });
    setEditResultId(null);
    setShowResultModal(true);
  };

  const openEditResult = (result: any) => {
    setResultForm({
      competition: String(result.competition),
      player_id: result.player_id ? String(result.player_id) : "",
      athlete_name: result.athlete_name,
      event_category: result.event_category || "",
      place:
        result.place !== null && result.place !== undefined
          ? String(result.place)
          : "",
      medal: result.medal,
      notes: result.notes || "",
    });
    setEditResultId(result.id);
    setShowResultModal(true);
  };

  const isResultValid =
    (!!resultForm.player_id && resultForm.player_id !== "__other__") ||
    (resultForm.player_id === "__other__" &&
      !!resultForm.athlete_name.trim()) ||
    (!resultForm.player_id && !!resultForm.athlete_name.trim());

  const saveResult = async () => {
    if (!isResultValid) return;
    setResultSaving(true);
    const payload: any = {
      competition: Number(resultForm.competition),
      event_category: resultForm.event_category,
      place: resultForm.place ? Number(resultForm.place) : null,
      medal: resultForm.medal,
      notes: resultForm.notes,
    };
    if (resultForm.player_id && resultForm.player_id !== "__other__") {
      payload.player_id = Number(resultForm.player_id);
    } else {
      payload.athlete_name = resultForm.athlete_name;
    }
    try {
      if (editResultId) {
        await api.put(`${API_URLS.individualResults}${editResultId}/`, payload);
      } else {
        await api.post(API_URLS.individualResults, payload);
      }
      setShowResultModal(false);
      await loadCompDetail(Number(resultForm.competition));
      // Refresh list to update medal counts
      await loadCompetitions(selectedTeamId);
    } catch {
      setError(t("ic.save_error"));
    } finally {
      setResultSaving(false);
    }
  };

  const deleteResult = async (resultId: number, competitionId: number) => {
    if (!window.confirm(t("ic.confirm_delete_result"))) return;
    await api.delete(`${API_URLS.individualResults}${resultId}/`);
    await loadCompDetail(competitionId);
    await loadCompetitions(selectedTeamId);
  };

  const medalEmoji = (medal: string) =>
    MEDAL_OPTIONS.find((m) => m.value === medal)?.emoji ?? "";

  return (
    <div className="container py-4">
      <h2 className="mb-1">{t("ic.title")}</h2>
      <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
        {t("ic.subtitle")}
      </p>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          {error}
          <button className="btn-close" onClick={() => setError(null)} />
        </div>
      )}

      {/* Discipline filter – only shown when more than one discipline is available */}
      {visibleDisciplines.length > 1 && (
        <div className="mb-3" style={{ maxWidth: 400 }}>
          <label className="form-label fw-semibold">
            {t("ic.select_discipline")}
          </label>
          <select
            className="form-select"
            value={selectedDisciplineId}
            onChange={(e) => {
              setSelectedDisciplineId(e.target.value);
              setSelectedTeamId("");
            }}
          >
            <option value="">— {t("ic.choose_discipline")} —</option>
            {visibleDisciplines.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Team selector */}
      <div className="mb-4" style={{ maxWidth: 400 }}>
        <label className="form-label fw-semibold">{t("ic.select_team")}</label>
        <select
          className="form-select"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
        >
          <option value="">— {t("ic.choose_team")} —</option>
          {visibleTeams.map((tm: any) => (
            <option key={tm.id} value={tm.id}>
              {tm.name}
              {tm.discipline ? ` (${tm.discipline})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Competitions section */}
      {selectedTeamId && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">{t("ic.competitions")}</h5>
            <button className="btn btn-primary btn-sm" onClick={openAddComp}>
              + {t("ic.add_competition")}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-3">{t("loading")}</div>
          ) : competitions.length === 0 ? (
            <div className="alert alert-info">{t("ic.no_competitions")}</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>{t("ic.col_name")}</th>
                    <th>{t("ic.col_season")}</th>
                    <th>{t("ic.col_date")}</th>
                    <th>{t("ic.col_location")}</th>
                    <th>{t("ic.medal_count")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.map((comp: any) => (
                    <React.Fragment key={comp.id}>
                      <tr
                        className={
                          activeComp?.id === comp.id ? "table-active" : ""
                        }
                      >
                        <td>
                          <strong>{comp.name}</strong>
                        </td>
                        <td>{comp.season || "—"}</td>
                        <td>{comp.date || "—"}</td>
                        <td>{comp.location || "—"}</td>
                        <td>
                          {comp.medal_count?.gold > 0 && (
                            <span className="me-2">
                              🥇 {comp.medal_count.gold}
                            </span>
                          )}
                          {comp.medal_count?.silver > 0 && (
                            <span className="me-2">
                              🥈 {comp.medal_count.silver}
                            </span>
                          )}
                          {comp.medal_count?.bronze > 0 && (
                            <span>🥉 {comp.medal_count.bronze}</span>
                          )}
                          {!comp.medal_count?.gold &&
                            !comp.medal_count?.silver &&
                            !comp.medal_count?.bronze && (
                              <span className="text-muted">—</span>
                            )}
                        </td>
                        <td className="text-end text-nowrap">
                          <button
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={async () => {
                              if (activeComp?.id === comp.id) {
                                setActiveComp(null);
                              } else {
                                await loadCompDetail(comp.id);
                              }
                            }}
                          >
                            {activeComp?.id === comp.id ? "▲" : "▼"}{" "}
                            {t("ic.manage_results")}
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm me-1"
                            onClick={() => openEditComp(comp)}
                            title={t("ic.edit_competition")}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => deleteComp(comp.id)}
                            title={t("ic.delete_competition")}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>

                      {/* Inline results panel */}
                      {activeComp?.id === comp.id && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div className="bg-light p-3 border-top border-bottom">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <strong>
                                  {t("ic.results")} — {comp.name}
                                </strong>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => openAddResult(comp.id)}
                                >
                                  + {t("ic.add_result")}
                                </button>
                              </div>
                              {activeComp.results?.length === 0 ? (
                                <p className="text-muted mb-0">
                                  {t("ic.no_results")}
                                </p>
                              ) : (
                                <table className="table table-sm mb-0 bg-white">
                                  <thead className="table-light">
                                    <tr>
                                      <th>{t("ic.place")}</th>
                                      <th>{t("ic.athlete_name")}</th>
                                      <th>{t("ic.event_category")}</th>
                                      <th>{t("ic.medal")}</th>
                                      <th>{t("ic.notes")}</th>
                                      <th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {activeComp.results.map((r: any) => (
                                      <tr key={r.id}>
                                        <td>{r.place ? `${r.place}.` : "—"}</td>
                                        <td>
                                          <strong>{r.athlete_name}</strong>
                                        </td>
                                        <td>{r.event_category || "—"}</td>
                                        <td>
                                          {medalEmoji(r.medal)}{" "}
                                          {r.medal !== "none"
                                            ? r.medal_display
                                            : "—"}
                                        </td>
                                        <td>{r.notes || "—"}</td>
                                        <td className="text-end text-nowrap">
                                          <button
                                            className="btn btn-outline-secondary btn-sm me-1"
                                            onClick={() => openEditResult(r)}
                                          >
                                            ✏️
                                          </button>
                                          <button
                                            className="btn btn-outline-danger btn-sm"
                                            onClick={() =>
                                              deleteResult(r.id, comp.id)
                                            }
                                          >
                                            🗑️
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Competition Modal ─────────────────────────────────────────────── */}
      {showCompModal && (
        <div
          className="modal show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) =>
            e.target === e.currentTarget && setShowCompModal(false)
          }
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editCompId
                    ? t("ic.edit_competition")
                    : t("ic.add_competition")}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowCompModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    {t("ic.competition_name")}{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-control"
                    value={compForm.name}
                    onChange={(e) =>
                      setCompForm({ ...compForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label">{t("ic.season")}</label>
                    <input
                      className="form-control"
                      placeholder="e.g. 2025-2026"
                      value={compForm.season}
                      onChange={(e) =>
                        setCompForm({ ...compForm, season: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label">{t("ic.date")}</label>
                    <input
                      type="date"
                      className="form-control"
                      value={compForm.date}
                      onChange={(e) =>
                        setCompForm({ ...compForm, date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t("ic.location")}</label>
                  <input
                    className="form-control"
                    value={compForm.location}
                    onChange={(e) =>
                      setCompForm({ ...compForm, location: e.target.value })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t("ic.description")}</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={compForm.description}
                    onChange={(e) =>
                      setCompForm({ ...compForm, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCompModal(false)}
                >
                  {t("ic.cancel")}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveComp}
                  disabled={compSaving || !compForm.name.trim()}
                >
                  {compSaving ? "…" : t("ic.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Result Modal ──────────────────────────────────────────────────── */}
      {showResultModal && (
        <div
          className="modal show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) =>
            e.target === e.currentTarget && setShowResultModal(false)
          }
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editResultId ? t("ic.edit_result") : t("ic.add_result")}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowResultModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    {t("ic.athlete_name")}{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={resultForm.player_id}
                    onChange={(e) =>
                      setResultForm({
                        ...resultForm,
                        player_id: e.target.value,
                        athlete_name: "",
                      })
                    }
                  >
                    <option value="">— {t("ic.select_player")} —</option>
                    {players.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </option>
                    ))}
                    <option value="__other__">
                      ✏️ {t("ic.athlete_other")}
                    </option>
                  </select>
                </div>
                {(resultForm.player_id === "__other__" ||
                  (!resultForm.player_id && resultForm.athlete_name)) && (
                  <div className="mb-3">
                    <label className="form-label">{t("ic.athlete_name")}</label>
                    <input
                      className="form-control"
                      placeholder={t("ic.athlete_name")}
                      value={resultForm.athlete_name}
                      onChange={(e) =>
                        setResultForm({
                          ...resultForm,
                          athlete_name: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">{t("ic.event_category")}</label>
                  <input
                    className="form-control"
                    placeholder={t("ic.event_category_placeholder")}
                    value={resultForm.event_category}
                    onChange={(e) =>
                      setResultForm({
                        ...resultForm,
                        event_category: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label">{t("ic.place")}</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={resultForm.place}
                      onChange={(e) =>
                        setResultForm({ ...resultForm, place: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label">{t("ic.medal")}</label>
                    <select
                      className="form-select"
                      value={resultForm.medal}
                      onChange={(e) =>
                        setResultForm({ ...resultForm, medal: e.target.value })
                      }
                    >
                      {MEDAL_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.emoji} {t(`ic.medal_${m.value}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t("ic.notes")}</label>
                  <input
                    className="form-control"
                    value={resultForm.notes}
                    onChange={(e) =>
                      setResultForm({ ...resultForm, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowResultModal(false)}
                >
                  {t("ic.cancel")}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveResult}
                  disabled={resultSaving || !isResultValid}
                >
                  {resultSaving ? "…" : t("ic.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualCompetitionAdminPage;
