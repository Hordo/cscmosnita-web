import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/adminStyles.css";
import { ReusableAdminTable } from "./ReusableAdminTable";
import type { AdminTableColumn } from "./ReusableAdminTable";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

const FormGroup: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="mb-2">
    <label className="form-label">{label}</label>
    {children}
  </div>
);

const matchColumns: AdminTableColumn[] = [
  { key: "season", label: "Season" },
  { key: "home_team_name", label: "Home Team" },
  { key: "home_score", label: "Home Score" },
  { key: "away_score", label: "Away Score" },
  { key: "away_team_name", label: "Away Team" },
  { key: "date", label: "Date" },
];

const emptyForm = {
  discipline_id: "",
  team_id: "",
  season: "",
  home_score: "",
  away_score: "",
  away_team_name: "",
  date: "",
  youtube_link: "",
};

const MatchAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, getCoachTeamIds, getAdminDisciplines, isSuperAdmin } =
    useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterSeason, setFilterSeason] = useState("");

  useEffect(() => {
    if (!user?.access) {
      setMatches([]);
      setDisciplines([]);
      setTeams([]);
      setError(null);
      setLoading(false);
      setAuthToken();
      return;
    }
    setAuthToken(user.access);
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [matchesRes, disciplinesRes, teamsRes] = await Promise.all([
          api.get(API_URLS.matches),
          api.get(API_URLS.disciplines),
          api.get(API_URLS.teams),
        ]);
        setMatches(matchesRes.data);
        setDisciplines(disciplinesRes.data);
        setTeams(teamsRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const headAdminRoles = isSuperAdmin?.()
    ? []
    : getAdminDisciplines
      ? getAdminDisciplines("head_admin")
      : [];
  const headAdminSingleDiscipline =
    headAdminRoles.length === 1 ? headAdminRoles[0] : null;

  // Auto-populate form defaults for restricted coaches when teams load
  useEffect(() => {
    if (!isCoachRestricted || teams.length === 0) return;
    setForm((prev) => ({
      ...prev,
      discipline_id: prev.discipline_id || coachSingleDiscipline,
      team_id: prev.team_id || coachSingleTeam,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  // Auto-populate form discipline for head admin
  useEffect(() => {
    if (!headAdminSingleDiscipline || disciplines.length === 0) return;
    setForm((prev) => ({
      ...prev,
      discipline_id:
        prev.discipline_id || headAdminSingleDiscipline.discipline_name || "",
    }));
    if (!filterDiscipline) {
      setFilterDiscipline(headAdminSingleDiscipline.discipline_name ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disciplines]);

  const accessibleTeamIds = getCoachTeamIds ? getCoachTeamIds() : null;

  let accessibleDisciplines = disciplines;
  if (!isSuperAdmin?.()) {
    const adminRoles = getAdminDisciplines
      ? getAdminDisciplines("coach_admin")
      : [];
    const allowedDisciplineIds = adminRoles.map((r: any) => r.discipline_id);
    accessibleDisciplines = disciplines.filter((d: any) =>
      allowedDisciplineIds.includes(d.id),
    );
  }

  const filteredTeams = form.discipline_id
    ? teams
        .filter((t: any) => t.discipline === form.discipline_id)
        .filter((t: any) =>
          accessibleTeamIds === null ? true : accessibleTeamIds.includes(t.id),
        )
    : [];

  const filterTeamOptions = filterDiscipline
    ? teams
        .filter((t: any) => t.discipline === filterDiscipline)
        .filter((t: any) =>
          accessibleTeamIds === null ? true : accessibleTeamIds.includes(t.id),
        )
    : teams.filter((t: any) =>
        accessibleTeamIds === null ? true : accessibleTeamIds.includes(t.id),
      );

  const allSeasons = Array.from(
    new Set(
      matches
        .filter(
          (m: any) =>
            accessibleTeamIds === null || accessibleTeamIds.includes(m.team),
        )
        .map((m: any) => m.season)
        .filter(Boolean),
    ),
  ).sort((a: any, b: any) => b.localeCompare(a)) as string[];

  const filteredMatches = matches.filter((m: any) => {
    if (accessibleTeamIds !== null && !accessibleTeamIds.includes(m.team))
      return false;
    if (filterSeason && m.season !== filterSeason) return false;
    if (filterTeam) return String(m.team) === filterTeam;
    if (filterDiscipline) {
      const disciplineTeamIds = teams
        .filter((t: any) => t.discipline === filterDiscipline)
        .map((t: any) => t.id);
      return disciplineTeamIds.includes(m.team);
    }
    return true;
  });

  const selectedTeam = teams.find((t: any) => String(t.id) === form.team_id);

  // Coach restriction: preselect & lock fields
  const isCoachRestricted =
    accessibleTeamIds !== null && accessibleTeamIds.length > 0;
  const coachAccessibleTeams = isCoachRestricted
    ? teams.filter((t: any) => accessibleTeamIds!.includes(t.id))
    : [];
  const coachSingleDiscipline =
    isCoachRestricted &&
    coachAccessibleTeams.length > 0 &&
    coachAccessibleTeams.every(
      (t: any) => t.discipline === coachAccessibleTeams[0].discipline,
    )
      ? (coachAccessibleTeams[0].discipline as string)
      : "";
  const coachSingleTeam =
    isCoachRestricted && coachAccessibleTeams.length === 1
      ? String(coachAccessibleTeams[0].id)
      : "";

  const coachResetForm = isCoachRestricted
    ? {
        ...emptyForm,
        discipline_id: coachSingleDiscipline,
        team_id: coachSingleTeam,
      }
    : emptyForm;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "discipline_id") {
      setForm((prev) => ({ ...prev, discipline_id: value, team_id: "" }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const buildPayload = () => ({
    team_id: form.team_id || null,
    home_team_name: selectedTeam?.name || "",
    away_team_name: form.away_team_name,
    season: form.season || "",
    home_score: form.home_score !== "" ? Number(form.home_score) : null,
    away_score: form.away_score !== "" ? Number(form.away_score) : null,
    date: form.date || null,
    youtube_link: form.youtube_link || "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.team_id) return setError(t("ch.err_select_team"));
    if (!form.away_team_name.trim()) return setError(t("ch.err_away_required"));
    setError(null);
    try {
      const res = await api.post(API_URLS.matches, buildPayload());
      setMatches((prev) => [...prev, res.data]);
      setForm(coachResetForm);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          err.message ||
          "Unknown error",
      );
    }
  };

  const handleEdit = (row: any) => {
    const match = matches.find((m) => m.id === row.id);
    if (!match) return;
    const team = teams.find((t: any) => t.id === match.team);
    setEditId(match.id);
    setForm({
      discipline_id: team ? team.discipline : "",
      team_id: match.team ? String(match.team) : "",
      season: match.season || "",
      home_score: match.home_score != null ? String(match.home_score) : "",
      away_score: match.away_score != null ? String(match.away_score) : "",
      away_team_name: match.away_team_name || "",
      date: match.date || "",
      youtube_link: match.youtube_link || "",
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.team_id) return setError(t("ch.err_select_team"));
    if (!form.away_team_name.trim()) return setError(t("ch.err_away_required"));
    setError(null);
    try {
      const res = await api.put(
        `${API_URLS.matches}${editId}/`,
        buildPayload(),
      );
      setMatches((prev) => prev.map((m) => (m.id === editId ? res.data : m)));
      setEditId(null);
      setForm(coachResetForm);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          err.message ||
          "Unknown error",
      );
    }
  };

  const handleDelete = async (row: any) => {
    setError(null);
    try {
      await api.delete(`${API_URLS.matches}${row.id}/`);
      setMatches(matches.filter((m) => m.id !== row.id));
      if (editId === row.id) {
        setEditId(null);
        setForm(coachResetForm);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setForm(coachResetForm);
  };

  if (!user?.access) {
    return <div className="alert alert-warning mt-4">{t("ch.no_auth")}</div>;
  }

  return (
    <div className="container-fluid py-3 admin-min-height">
      {loading && <div className="text-center mb-3">{t("loading")}</div>}
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      <div className="row justify-content-center">
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <h4 className="mb-3">
                {editId === null ? t("ch.create_title") : t("ch.edit_title")}
              </h4>
              <form onSubmit={editId === null ? handleCreate : handleUpdate}>
                {/* Step 1: Discipline */}
                <FormGroup label={t("ch.label_discipline")}>
                  <select
                    className="form-select"
                    name="discipline_id"
                    value={form.discipline_id}
                    onChange={handleChange}
                    required
                    disabled={
                      (isCoachRestricted && !!coachSingleDiscipline) ||
                      !!headAdminSingleDiscipline
                    }
                  >
                    <option value="">{t("ch.select_discipline")}</option>
                    {accessibleDisciplines.map((d: any) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                {/* Step 2: Our Team (home team) */}
                <FormGroup label={t("ch.label_team")}>
                  <select
                    className="form-select"
                    name="team_id"
                    value={form.team_id}
                    onChange={handleChange}
                    required
                    disabled={
                      !form.discipline_id ||
                      (isCoachRestricted && !!coachSingleTeam)
                    }
                  >
                    <option value="">
                      {form.discipline_id
                        ? t("ch.select_team")
                        : t("ch.select_discipline_first")}
                    </option>
                    {filteredTeams.map((t: any) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </FormGroup>

                {/* Season */}
                <FormGroup label={t("ch.label_season")}>
                  <input
                    type="text"
                    className="form-control"
                    name="season"
                    value={form.season}
                    onChange={handleChange}
                    placeholder="2025-2026"
                  />
                </FormGroup>

                {/* Scores */}
                <div className="row mb-2">
                  <div className="col">
                    <label className="form-label">
                      {selectedTeam
                        ? `${selectedTeam.name}`
                        : t("ch.label_home_score")}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      name="home_score"
                      value={form.home_score}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                  <div className="col">
                    <label className="form-label">
                      {t("ch.label_away_score")}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      name="away_score"
                      value={form.away_score}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                </div>

                {/* Opponent */}
                <FormGroup label={t("ch.label_away_team")}>
                  <input
                    type="text"
                    className="form-control"
                    name="away_team_name"
                    value={form.away_team_name}
                    onChange={handleChange}
                    required
                    placeholder={t("ch.placeholder_away_team")}
                  />
                </FormGroup>

                {/* Date */}
                <FormGroup label={t("ch.label_date")}>
                  <input
                    type="date"
                    className="form-control"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                  />
                </FormGroup>

                {/* YouTube link */}
                <div className="mb-3">
                  <label className="form-label">{t("ch.label_youtube")}</label>
                  <input
                    type="url"
                    className="form-control"
                    name="youtube_link"
                    value={form.youtube_link}
                    onChange={handleChange}
                    placeholder={t("ch.placeholder_youtube")}
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100">
                  {editId === null ? t("ch.btn_create") : t("ch.btn_update")}
                </button>
              </form>
              {editId !== null && (
                <button
                  className="btn btn-secondary mt-2 w-100"
                  onClick={handleCancelEdit}
                >
                  {t("ch.cancel_edit")}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-8 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <div className="d-flex gap-2 mb-3 flex-wrap align-items-end">
                <h4 className="mb-0 me-auto">{t("ch.page_title")}</h4>
                <select
                  className="form-select form-select-sm w-auto"
                  value={filterDiscipline}
                  onChange={(e) => {
                    setFilterDiscipline(e.target.value);
                    setFilterTeam("");
                  }}
                >
                  <option value="">{t("ch.all_disciplines")}</option>
                  {accessibleDisciplines.map((d: any) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm w-auto"
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  disabled={!filterDiscipline}
                >
                  <option value="">{t("ch.all_teams")}</option>
                  {filterTeamOptions.map((t: any) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm w-auto"
                  value={filterSeason}
                  onChange={(e) => setFilterSeason(e.target.value)}
                >
                  <option value="">{t("ch.all_seasons")}</option>
                  {allSeasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {(filterDiscipline || filterTeam || filterSeason) && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setFilterDiscipline("");
                      setFilterTeam("");
                      setFilterSeason("");
                    }}
                  >
                    {t("ch.clear")}
                  </button>
                )}
              </div>
              <ReusableAdminTable
                columns={matchColumns}
                data={filteredMatches}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchAdminPage;
