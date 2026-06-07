import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/adminStyles.css";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

const emptyTournament = {
  name: "",
  season: "",
  date: "",
  discipline_id: "",
  team_id: "",
  has_group_stage: true,
  calculate_place_from_groups: false,
};

const TournamentAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isSuperAdmin, getAdminDisciplines, getCoachTeamIds } =
    useAuth();

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [form, setForm] = useState(emptyTournament);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (!editId && !user?.is_superuser) {
          const roles = user?.admin_roles ?? [];
          const uniqueDiscIds = [
            ...new Set(roles.map((r: any) => r.discipline_id)),
          ] as number[];
          if (uniqueDiscIds.length === 1) {
            setForm((prev) => ({
              ...prev,
              discipline_id: String(uniqueDiscIds[0]),
            }));
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const adminRoles = getAdminDisciplines();
  const allowedDisciplineIds: number[] | null = isSuperAdmin()
    ? null
    : [
        ...new Set(
          adminRoles
            .map((r) => r.discipline_id)
            .filter((id): id is number => id !== null),
        ),
      ];
  const visibleDisciplines =
    allowedDisciplineIds === null
      ? disciplines
      : disciplines.filter((d) => allowedDisciplineIds.includes(d.id));

  const headAdminRoles = isSuperAdmin()
    ? []
    : getAdminDisciplines("head_admin");
  const headAdminSingleDiscipline =
    headAdminRoles.length === 1 ? headAdminRoles[0] : null;

  const filteredTeams = (() => {
    let result = form.discipline_id
      ? teams.filter(
          (t) =>
            t.discipline ===
            disciplines.find((d) => String(d.id) === form.discipline_id)?.name,
        )
      : teams;
    if (form.discipline_id) {
      const allowedTeamIds = getCoachTeamIds(Number(form.discipline_id));
      if (allowedTeamIds !== null)
        result = result.filter((t) => allowedTeamIds.includes(t.id));
    }
    return result;
  })();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.team_id) return;
    const payload: any = {
      name: form.name,
      season: form.season,
      has_group_stage: form.has_group_stage,
      calculate_place_from_groups: !!form.calculate_place_from_groups,
      team: Number(form.team_id),
    };
    if (form.date) payload.date = form.date;
    if (form.discipline_id) payload.discipline = Number(form.discipline_id);
    try {
      if (editId) await api.patch(`${API_URLS.tournaments}${editId}/`, payload);
      else await api.post(API_URLS.tournaments, payload);
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
      calculate_place_from_groups: !!t.calculate_place_from_groups,
    });
    setEditId(t.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("tour.confirm_delete"))) return;
    await api.delete(`${API_URLS.tournaments}${id}/`);
    setTournaments((prev) => prev.filter((t) => t.id !== id));
  };

  const handleManage = (t: any) => navigate(`/admin/tournaments/${t.id}`);

  if (loading) return <div className="text-center mt-5">{t("loading")}</div>;

  return (
    <div className="admin-page container-fluid py-4">
      <h2 className="mb-4">🏆 {t("tour.page_title")}</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="admin-form-card mb-4">
        <h5 className="mb-3">
          {editId ? t("tour.form_edit") : t("tour.form_new")}
        </h5>
        <form onSubmit={handleSave} className="row g-2">
          <div className="col-md-4">
            <label className="form-label">{t("tour.label_name")}</label>
            <input
              className="form-control"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Cupa Moșnița 2025"
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">{t("tour.label_season")}</label>
            <input
              className="form-control"
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              placeholder="2025"
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">{t("date")}</label>
            <input
              type="date"
              className="form-control"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label">{t("discipline")}</label>
            <select
              className="form-select"
              value={form.discipline_id}
              onChange={(e) =>
                setForm({ ...form, discipline_id: e.target.value, team_id: "" })
              }
              disabled={!isSuperAdmin() && !!headAdminSingleDiscipline}
            >
              <option value="">{t("tour.label_all_disciplines")}</option>
              {visibleDisciplines.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">
              {t("tour.label_our_team")} <span className="text-danger">*</span>
            </label>
            <select
              className="form-select"
              value={form.team_id}
              onChange={(e) => setForm({ ...form, team_id: e.target.value })}
              required
            >
              <option value="">{t("ec.select_team")}</option>
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
                {t("tour.label_groups")}
              </label>
            </div>
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <div className="form-check mt-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="calcFromGroups"
                checked={!!form.calculate_place_from_groups}
                onChange={(e) =>
                  setForm({
                    ...form,
                    calculate_place_from_groups: e.target.checked,
                  })
                }
              />
              <label className="form-check-label" htmlFor="calcFromGroups">
                {t("tour.label_calc_from_groups")}
              </label>
            </div>
          </div>
          <div className="col-md-1 d-flex align-items-end gap-2">
            <button className="btn btn-primary btn-sm w-100" type="submit">
              {editId ? t("tour.btn_update") : t("tour.btn_create")}
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

      <div className="admin-table-wrapper mb-4">
        <table className="table table-hover admin-table">
          <thead>
            <tr>
              <th>{t("tour.col_name")}</th>
              <th>{t("tour.col_season")}</th>
              <th>{t("tour.col_team")}</th>
              <th>{t("tour.col_discipline")}</th>
              <th>{t("tour.col_groups")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((tour) => (
              <tr key={tour.id}>
                <td>{tour.name}</td>
                <td>{tour.season}</td>
                <td>{tour.team_name}</td>
                <td>{tour.discipline_name}</td>
                <td>{tour.has_group_stage ? "✓" : "–"}</td>
                <td className="d-flex gap-1">
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleManage(tour)}
                  >
                    {t("tour.btn_manage")}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleEdit(tour)}
                  >
                    {t("tour.btn_edit")}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(tour.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {tournaments.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-muted">
                  {t("tour.none_yet")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TournamentAdminPage;
