import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/adminStyles.css";
import { ReusableAdminForm } from "./ReusableAdminForm";
import type { AdminFormField } from "./ReusableAdminForm";
import { ReusableAdminTable } from "./ReusableAdminTable";
import type { AdminTableColumn } from "./ReusableAdminTable";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

export const PlayerAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, getCoachTeamIds, getAdminDisciplines, isSuperAdmin } =
    useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.access) {
      setPlayers([]);
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
        const [playersRes, teamsRes, disciplinesRes] = await Promise.all([
          api.get(API_URLS.players),
          api.get(API_URLS.teams),
          api.get(API_URLS.disciplines),
        ]);
        setPlayers(playersRes.data);
        setTeams(teamsRes.data);
        setDisciplines(disciplinesRes.data);
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

  // Auto-apply list filters for restricted coaches once teams load
  useEffect(() => {
    if (!isCoachRestricted || teams.length === 0) return;
    if (!filterDiscipline && coachSingleDiscipline)
      setFilterDiscipline(coachSingleDiscipline);
    if (!filterTeam && coachSingleTeam) {
      const team = teams.find((t: any) => String(t.id) === coachSingleTeam);
      if (team) setFilterTeam(team.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  // Auto-apply filter for head admin once disciplines load
  useEffect(() => {
    if (headAdminSingleDiscipline && !filterDiscipline) {
      setFilterDiscipline(headAdminSingleDiscipline.discipline_name);
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

  const disciplineTeams = filterDiscipline
    ? teams
        .filter((t: any) => t.discipline === filterDiscipline)
        .filter((t: any) =>
          accessibleTeamIds === null ? true : accessibleTeamIds.includes(t.id),
        )
    : teams.filter((t: any) =>
        accessibleTeamIds === null ? true : accessibleTeamIds.includes(t.id),
      );

  const filteredPlayers = players.filter((p: any) => {
    if (accessibleTeamIds !== null) {
      const team = teams.find((t: any) => t.name === p.team);
      if (!team || !accessibleTeamIds.includes(team.id)) return false;
    }
    if (filterDiscipline) {
      const team = teams.find((t: any) => t.name === p.team);
      if (!team || team.discipline !== filterDiscipline) return false;
    }
    if (filterTeam && p.team !== filterTeam) return false;
    return true;
  });

  const basePlayerFields: AdminFormField[] = [
    {
      name: "first_name",
      label: t("pl.first_name"),
      type: "text",
      required: true,
    },
    {
      name: "last_name",
      label: t("pl.last_name"),
      type: "text",
      required: true,
    },
    { name: "number", label: t("pl.number"), type: "number", required: false },
    { name: "photo", label: t("pl.photo"), type: "file", required: false },
  ];

  const playerColumns: AdminTableColumn[] = [
    { key: "first_name", label: t("pl.first_name") },
    { key: "last_name", label: t("pl.last_name") },
    { key: "number", label: t("pl.number") },
    { key: "photo_url", label: t("pl.photo") },
    { key: "team", label: t("pl.team") },
  ];

  const playerFields: AdminFormField[] = [
    ...basePlayerFields,
    {
      name: "discipline_id",
      label: t("pl.discipline"),
      type: "select",
      required: false,
      options: accessibleDisciplines.map((d: any) => ({
        value: d.name,
        label: d.name,
      })),
      disabled:
        (isCoachRestricted && !!coachSingleDiscipline) ||
        !!headAdminSingleDiscipline,
    },
    {
      name: "team_id",
      label: t("pl.team"),
      type: "select",
      required: true,
      // provide dynamic options depending on selected discipline in the form
      options: (values: any) => {
        const available = values.discipline_id
          ? teams
              .filter((t: any) => t.discipline === values.discipline_id)
              .filter((t: any) =>
                accessibleTeamIds === null
                  ? true
                  : accessibleTeamIds.includes(t.id),
              )
          : teams.filter((t: any) =>
              accessibleTeamIds === null
                ? true
                : accessibleTeamIds.includes(t.id),
            );
        return available.map((t: any) => ({
          value: String(t.id),
          label: t.name,
        }));
      },
      disabled: isCoachRestricted && !!coachSingleTeam,
    },
  ];

  const handleCreate = async (values: any) => {
    setError(null);
    const payload: any = {
      first_name: values.first_name,
      last_name: values.last_name,
      number: values.number,
      team_id: values.team_id,
    };
    if (values.photo_url) payload.photo_url = values.photo_url;
    try {
      const res = await api.post(API_URLS.players, payload);
      setPlayers((prev) => [...prev, res.data]);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  const handleEdit = (row: any) => {
    setEditIndex(players.findIndex((p) => p.id === row.id));
  };

  const handleDelete = async (row: any) => {
    setError(null);
    try {
      await api.delete(`${API_URLS.players}${row.id}/`);
      setPlayers(players.filter((p) => p.id !== row.id));
      setEditIndex(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  const handleUpdate = async (values: any) => {
    if (editIndex === null) return;
    setError(null);
    const playerId = players[editIndex].id;
    const payload: any = {
      first_name: values.first_name,
      last_name: values.last_name,
      number: values.number,
      team_id: values.team_id,
    };
    if (values.photo_url) payload.photo_url = values.photo_url;
    try {
      const res = await api.put(`${API_URLS.players}${playerId}/`, payload);
      const updated = [...players];
      updated[editIndex] = res.data;
      setPlayers(updated);
      setEditIndex(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  if (!user?.access) {
    return <div className="alert alert-warning mt-4">{t("pl.no_auth")}</div>;
  }

  return (
    <div className="container-fluid py-3 admin-min-height">
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      <div className="row justify-content-center">
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <h4 className="mb-3">
                {editIndex === null ? t("pl.create_title") : t("pl.edit_title")}
              </h4>
              <ReusableAdminForm
                fields={playerFields}
                onSubmit={editIndex === null ? handleCreate : handleUpdate}
                initialValues={
                  editIndex !== null
                    ? (() => {
                        const p = players[editIndex!];
                        const t = teams.find((team) => team.name === p.team);
                        return {
                          ...p,
                          discipline_id: t ? t.discipline : "",
                          team_id: t ? String(t.id) : "",
                        };
                      })()
                    : isCoachRestricted
                      ? {
                          discipline_id: coachSingleDiscipline,
                          team_id: coachSingleTeam,
                        }
                      : headAdminSingleDiscipline
                        ? {
                            discipline_id:
                              headAdminSingleDiscipline.discipline_name,
                          }
                        : {}
                }
                submitLabel={
                  editIndex === null ? t("pl.btn_create") : t("pl.btn_update")
                }
              />
            </div>
          </div>
        </div>
        <div className="col-md-8 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <h4 className="mb-0 me-auto">{t("pl.page_title")}</h4>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={filterDiscipline}
                  onChange={(e) => {
                    setFilterDiscipline(e.target.value);
                    setFilterTeam("");
                  }}
                >
                  <option value="">{t("pl.all_disciplines")}</option>
                  {accessibleDisciplines.map((d: any) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  disabled={!filterDiscipline}
                >
                  <option value="">{t("pl.all_teams")}</option>
                  {disciplineTeams.map((t: any) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {(filterDiscipline || filterTeam) && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setFilterDiscipline("");
                      setFilterTeam("");
                    }}
                  >
                    {t("pl.clear")}
                  </button>
                )}
              </div>
              {loading ? (
                <div>{t("loading")}</div>
              ) : (
                <div className="admin-min-width">
                  <ReusableAdminTable
                    columns={playerColumns}
                    data={filteredPlayers}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    renderCell={(row, col) => {
                      if (col.key === "photo_url") {
                        return row.photo_url ? (
                          <img
                            src={row.photo_url}
                            alt="Player"
                            className="admin-img-thumb"
                          />
                        ) : (
                          <span className="admin-no-photo">
                            {t("pl.no_photo")}
                          </span>
                        );
                      }
                      if (col.key === "team") {
                        return (
                          row.team || (
                            <span className="admin-no-teams">
                              {t("pl.no_team")}
                            </span>
                          )
                        );
                      }
                      return row[col.key];
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerAdminPage;
