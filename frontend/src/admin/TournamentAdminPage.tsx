import React, { useEffect, useState, useCallback } from "react";
import "../styles/adminStyles.css";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

const STAGES = [
  { value: "group", label: "Group Stage" },
  { value: "r32", label: "Round of 32" },
  { value: "r16", label: "Round of 16" },
  { value: "r8", label: "Quarterfinal" },
  { value: "semi", label: "Semifinal" },
  { value: "third", label: "3rd Place" },
  { value: "final", label: "Final" },
];

const emptyTournament = {
  name: "",
  season: "",
  date: "",
  discipline_id: "",
  team_id: "",
  has_group_stage: true,
};

const TournamentAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [form, setForm] = useState(emptyTournament);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Selected tournament for in-page management
  const [activeTournament, setActiveTournament] = useState<any | null>(null);
  const [tourLoading, setTourLoading] = useState(false);

  // Group management state
  const [newGroupName, setNewGroupName] = useState("");
  const [newTeamNames, setNewTeamNames] = useState<Record<number, string>>({});

  // Knockout match form
  const [knockoutForm, setKnockoutForm] = useState({
    stage: "r16",
    home_team_name: "",
    away_team_name: "",
    home_score: "",
    away_score: "",
    youtube_link: "",
  });
  const [editMatchId, setEditMatchId] = useState<number | null>(null);

  // Local state for group match score edits (controlled inputs)
  const [groupMatchEdits, setGroupMatchEdits] = useState<
    Record<number, { home: string; away: string }>
  >({});

  // Populate groupMatchEdits whenever activeTournament changes
  useEffect(() => {
    if (!activeTournament) return;
    const edits: Record<number, { home: string; away: string }> = {};
    activeTournament.groups?.forEach((g: any) => {
      g.matches?.forEach((m: any) => {
        edits[m.id] = {
          home: m.home_score ?? "",
          away: m.away_score ?? "",
        };
      });
    });
    setGroupMatchEdits(edits);
    // When opening a new (non-edit) knockout form, pre-fill home team
    if (!editMatchId) {
      setKnockoutForm((prev) => ({
        ...prev,
        home_team_name: activeTournament.team_name ?? "",
      }));
    }
  }, [activeTournament]);

  useEffect(() => {
    if (!user?.access) return;
    setAuthToken(user.access);
    setLoading(true);
    Promise.all([
      api.get(API_URLS.tournaments),
      api.get(API_URLS.disciplines),
      api.get(API_URLS.teams),
    ])
      .then(([t, d, tm]) => {
        setTournaments(t.data);
        setDisciplines(d.data);
        setTeams(tm.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const filteredTeams = form.discipline_id
    ? teams.filter(
        (t) =>
          t.discipline ===
          disciplines.find((d) => String(d.id) === form.discipline_id)?.name,
      )
    : teams;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.team_id) return;
    const payload: any = {
      name: form.name,
      season: form.season,
      has_group_stage: form.has_group_stage,
      team: Number(form.team_id),
    };
    if (form.date) payload.date = form.date;
    if (form.discipline_id) payload.discipline = Number(form.discipline_id);
    try {
      if (editId) {
        await api.patch(`${API_URLS.tournaments}${editId}/`, payload);
      } else {
        await api.post(API_URLS.tournaments, payload);
      }
      const res = await api.get(API_URLS.tournaments);
      setTournaments(res.data);
      setForm(emptyTournament);
      setEditId(null);
    } catch (e: any) {
      setError(e.response?.data ? JSON.stringify(e.response.data) : e.message);
    }
  };

  const handleEdit = (t: any) => {
    const disc = disciplines.find((d) => d.name === t.discipline_name);
    setForm({
      name: t.name,
      season: t.season || "",
      date: t.date || "",
      discipline_id: disc ? String(disc.id) : "",
      team_id: String(t.team),
      has_group_stage: t.has_group_stage,
    });
    setEditId(t.id);
    setActiveTournament(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this tournament and all its data?")) return;
    await api.delete(`${API_URLS.tournaments}${id}/`);
    setTournaments((prev) => prev.filter((t) => t.id !== id));
    if (activeTournament?.id === id) setActiveTournament(null);
  };

  const loadTournament = useCallback(async (id: number) => {
    setTourLoading(true);
    try {
      const res = await api.get(`${API_URLS.tournaments}${id}/`);
      setActiveTournament(res.data);
    } finally {
      setTourLoading(false);
    }
  }, []);

  const handleManage = (t: any) => {
    setEditId(null);
    loadTournament(t.id);
  };

  // ── Group operations ──────────────────────────────────────────────────────

  const addGroup = async () => {
    if (!newGroupName.trim() || !activeTournament) return;
    const res = await api.post(API_URLS.tournamentGroups, {
      tournament: activeTournament.id,
      name: newGroupName.trim(),
    });
    // Auto-add club's team to every new group
    await api.post(`${API_URLS.tournamentGroups}${res.data.id}/add_teams/`, {
      team_names: [],
    });
    setNewGroupName("");
    loadTournament(activeTournament.id);
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
    loadTournament(activeTournament.id);
  };

  const saveGroupMatchScore = async (matchId: number) => {
    const edits = groupMatchEdits[matchId];
    if (!edits) return;
    await api.patch(`${API_URLS.tournamentMatches}${matchId}/`, {
      home_score: edits.home === "" ? null : Number(edits.home),
      away_score: edits.away === "" ? null : Number(edits.away),
    });
    // Backend auto-recalculates standings; just reload
    loadTournament(activeTournament.id);
  };

  const deleteGroup = async (groupId: number) => {
    if (!confirm("Delete this group and all its matches?")) return;
    await api.delete(`${API_URLS.tournamentGroups}${groupId}/`);
    loadTournament(activeTournament.id);
  };

  // ── Match operations ──────────────────────────────────────────────────────

  const saveKnockoutMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      tournament: activeTournament.id,
      stage: knockoutForm.stage,
      home_team_name: activeTournament.team_name,
      away_team_name: knockoutForm.away_team_name,
      youtube_link: knockoutForm.youtube_link,
    };
    if (knockoutForm.home_score !== "")
      payload.home_score = Number(knockoutForm.home_score);
    if (knockoutForm.away_score !== "")
      payload.away_score = Number(knockoutForm.away_score);

    if (editMatchId) {
      await api.patch(`${API_URLS.tournamentMatches}${editMatchId}/`, payload);
    } else {
      payload.match_order = activeTournament.knockout_matches.length;
      await api.post(API_URLS.tournamentMatches, payload);
    }
    setKnockoutForm({
      stage: "r16",
      home_team_name: activeTournament.team_name ?? "",
      away_team_name: "",
      home_score: "",
      away_score: "",
      youtube_link: "",
    });
    setEditMatchId(null);
    loadTournament(activeTournament.id);
  };

  const deleteMatch = async (matchId: number) => {
    if (!confirm("Delete this match?")) return;
    await api.delete(`${API_URLS.tournamentMatches}${matchId}/`);
    loadTournament(activeTournament.id);
  };

  const editKnockoutMatch = (m: any) => {
    setKnockoutForm({
      stage: m.stage,
      home_team_name: m.home_team_name,
      away_team_name: m.away_team_name,
      home_score: m.home_score ?? "",
      away_score: m.away_score ?? "",
      youtube_link: m.youtube_link || "",
    });
    setEditMatchId(m.id);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div className="admin-page container-fluid py-4">
      <h2 className="mb-4">🏆 Manage Tournaments</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── Tournament form ── */}
      <div className="admin-form-card mb-4">
        <h5 className="mb-3">
          {editId ? "Edit Tournament" : "New Tournament"}
        </h5>
        <form onSubmit={handleSave} className="row g-2">
          <div className="col-md-4">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Cupa Moșnița 2025"
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Season</label>
            <input
              className="form-control"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              placeholder="2025"
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">Discipline</label>
            <select
              className="form-select"
              value={form.discipline_id}
              onChange={(e) =>
                setForm({ ...form, discipline_id: e.target.value, team_id: "" })
              }
            >
              <option value="">All disciplines</option>
              {disciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">
              Our Team <span className="text-danger">*</span>
            </label>
            <select
              className="form-select"
              value={form.team_id}
              onChange={(e) => setForm({ ...form, team_id: e.target.value })}
              required
            >
              <option value="">Select team</option>
              {filteredTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-1 d-flex align-items-end">
            <div className="form-check mt-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="hasGroup"
                checked={form.has_group_stage}
                onChange={(e) =>
                  setForm({ ...form, has_group_stage: e.target.checked })
                }
              />
              <label className="form-check-label" htmlFor="hasGroup">
                Groups
              </label>
            </div>
          </div>
          <div className="col-md-1 d-flex align-items-end gap-2">
            <button className="btn btn-primary btn-sm w-100" type="submit">
              {editId ? "Update" : "Create"}
            </button>
            {editId && (
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForm(emptyTournament);
                }}
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Tournament list ── */}
      <div className="admin-table-wrapper mb-4">
        <table className="table table-hover admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Season</th>
              <th>Team</th>
              <th>Discipline</th>
              <th>Groups?</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((t) => (
              <tr
                key={t.id}
                className={activeTournament?.id === t.id ? "table-active" : ""}
              >
                <td>{t.name}</td>
                <td>{t.season}</td>
                <td>{t.team_name}</td>
                <td>{t.discipline_name}</td>
                <td>{t.has_group_stage ? "Yes" : "No"}</td>
                <td className="d-flex gap-1">
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleManage(t)}
                  >
                    Manage
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleEdit(t)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(t.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {tournaments.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted">
                  No tournaments yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Tournament management panel ── */}
      {activeTournament && (
        <div className="card border-0 shadow-sm">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              ⚙️ {activeTournament.name}{" "}
              {activeTournament.season && `(${activeTournament.season})`}
            </h5>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setActiveTournament(null)}
            >
              Close
            </button>
          </div>
          <div className="card-body">
            {tourLoading && <div className="text-center py-3">Loading...</div>}

            {/* ── Group Stage ── */}
            {activeTournament.has_group_stage && (
              <div className="mb-4">
                <h6 className="border-bottom pb-2 mb-3">Group Stage</h6>

                {/* Add group */}
                <div className="d-flex gap-2 mb-3" style={{ maxWidth: 400 }}>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Group name (e.g. Group A)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                  <button className="btn btn-sm btn-primary" onClick={addGroup}>
                    Add Group
                  </button>
                </div>

                {activeTournament.groups.map((group: any) => (
                  <div key={group.id} className="border rounded p-3 mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong>{group.name}</strong>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => deleteGroup(group.id)}
                      >
                        Delete Group
                      </button>
                    </div>

                    {/* Add teams input */}
                    <div
                      className="d-flex gap-2 mb-3"
                      style={{ maxWidth: 500 }}
                    >
                      <input
                        className="form-control form-control-sm"
                        placeholder="Team names (comma separated, e.g. CSC Moșnița, FC Timișoara)"
                        value={newTeamNames[group.id] || ""}
                        onChange={(e) =>
                          setNewTeamNames((prev) => ({
                            ...prev,
                            [group.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => addTeamsToGroup(group.id)}
                      >
                        Add Teams
                      </button>
                    </div>

                    {/* Standings table */}
                    {group.group_teams.length > 0 && (
                      <div className="mb-3">
                        <h6 className="small text-muted text-uppercase mb-1">
                          Standings
                        </h6>
                        <div className="table-responsive">
                          <table
                            className="table table-sm table-bordered mb-0"
                            style={{ fontSize: "0.84rem" }}
                          >
                            <thead className="table-light">
                              <tr>
                                <th>Team</th>
                                <th>P</th>
                                <th>W</th>
                                <th>D</th>
                                <th>L</th>
                                <th>GF</th>
                                <th>GA</th>
                                <th>Pts</th>
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
                                      gt.team_name ===
                                      activeTournament.team_name
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
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Group matches */}
                    {group.matches.length > 0 && (
                      <div>
                        <h6 className="small text-muted text-uppercase mb-1">
                          Matches
                        </h6>
                        <div className="table-responsive">
                          <table
                            className="table table-sm table-bordered mb-0"
                            style={{ fontSize: "0.84rem" }}
                          >
                            <thead className="table-light">
                              <tr>
                                <th>Home</th>
                                <th>Score</th>
                                <th>Away</th>
                                <th>Video</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.matches.map((m: any) => (
                                <tr key={m.id}>
                                  <td
                                    className={
                                      m.home_team_name ===
                                      activeTournament.team_name
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
                                        value={
                                          groupMatchEdits[m.id]?.home ?? ""
                                        }
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
                                        value={
                                          groupMatchEdits[m.id]?.away ?? ""
                                        }
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
                                        onClick={() =>
                                          saveGroupMatchScore(m.id)
                                        }
                                      >
                                        💾
                                      </button>
                                    </div>
                                  </td>
                                  <td
                                    className={
                                      m.away_team_name ===
                                      activeTournament.team_name
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
                                          .then(() =>
                                            loadTournament(activeTournament.id),
                                          )
                                      }
                                    />
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Knockout Stage ── */}
            <div className="mb-3">
              <h6 className="border-bottom pb-2 mb-3">
                Knockout Stage Matches
              </h6>

              {/* Existing knockout matches grouped by stage */}
              {STAGES.filter((s) => s.value !== "group").map((stageInfo) => {
                const stageMatches = activeTournament.knockout_matches.filter(
                  (m: any) => m.stage === stageInfo.value,
                );
                if (stageMatches.length === 0) return null;
                return (
                  <div key={stageInfo.value} className="mb-3">
                    <h6 className="small text-muted text-uppercase mb-1">
                      {stageInfo.label}
                    </h6>
                    <div className="table-responsive">
                      <table
                        className="table table-sm table-bordered mb-0"
                        style={{ fontSize: "0.84rem" }}
                      >
                        <thead className="table-light">
                          <tr>
                            <th>Home</th>
                            <th>Score</th>
                            <th>Away</th>
                            <th>Video</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {stageMatches.map((m: any) => (
                            <tr key={m.id}>
                              <td>{m.home_team_name}</td>
                              <td>
                                {m.home_score ?? "–"} – {m.away_score ?? "–"}
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
                  </div>
                );
              })}

              {/* Add / Edit knockout match form */}
              <div className="border rounded p-3 mt-2">
                <h6 className="mb-2">
                  {editMatchId ? "✏️ Edit Match" : "➕ Add Knockout Match"}
                </h6>
                <form onSubmit={saveKnockoutMatch} className="row g-2">
                  <div className="col-md-2">
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
                      {STAGES.filter((s) => s.value !== "group").map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-2">
                    <input
                      className="form-control form-control-sm bg-light"
                      value={activeTournament.team_name ?? ""}
                      readOnly
                      title="Home team is always your team"
                    />
                  </div>
                  <div className="col-auto d-flex align-items-center gap-1">
                    <input
                      type="number"
                      className="form-control form-control-sm p-1 text-center"
                      style={{ width: 52 }}
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
                      className="form-control form-control-sm p-1 text-center"
                      style={{ width: 52 }}
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
                  <div className="col-md-2">
                    <input
                      className="form-control form-control-sm"
                      placeholder="Away team"
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
                  <div className="col-md-2">
                    <input
                      className="form-control form-control-sm"
                      placeholder="YouTube URL (optional)"
                      value={knockoutForm.youtube_link}
                      onChange={(e) =>
                        setKnockoutForm({
                          ...knockoutForm,
                          youtube_link: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-auto d-flex gap-1">
                    <button className="btn btn-sm btn-primary" type="submit">
                      {editMatchId ? "Update" : "Add"}
                    </button>
                    {editMatchId && (
                      <button
                        className="btn btn-sm btn-secondary"
                        type="button"
                        onClick={() => {
                          setEditMatchId(null);
                          setKnockoutForm({
                            stage: "r16",
                            home_team_name: "",
                            away_team_name: "",
                            home_score: "",
                            away_score: "",
                            youtube_link: "",
                          });
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentAdminPage;
