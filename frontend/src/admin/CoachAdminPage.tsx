import React, { useEffect, useState } from "react";
import "../styles/adminStyles.css";
import { ReusableAdminForm } from "./ReusableAdminForm";
import { ReusableAdminTable } from "./ReusableAdminTable";

import { API_URLS } from "../config/api";
import api from "../config/axios";
import { useAuth } from "../context/AuthContext";

const coachFields = [
  { name: "first_name", label: "First Name", type: "text", required: true },
  { name: "last_name", label: "Last Name", type: "text", required: true },
  { name: "phone", label: "Phone", type: "text", required: false },
  { name: "photo", label: "Photo", type: "file", required: false },
];

const coachColumns = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "phone", label: "Phone" },
  { key: "photo_url", label: "Photo" },
  { key: "teams", label: "Teams" },
];

interface Coach {
  id: number;
  first_name: string;
  last_name: string;
  role?: string;
  photo_url?: string;
  teams?: { id: number; name: string }[];
}
interface Team {
  id: number;
  name: string;
  discipline?: string;
}

const CoachAdminPage: React.FC = () => {
  const { user, getAdminDisciplines, isSuperAdmin } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.access) {
      setCoaches([]);
      setTeams([]);
      setError(null);
      setLoading(false);
      return;
    }
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [coachesRes, teamsRes, disciplinesRes] = await Promise.all([
          api.get(API_URLS.coaches),
          api.get(API_URLS.teams),
          api.get(API_URLS.disciplines),
        ]);
        setCoaches(coachesRes.data);
        setTeams(teamsRes.data);
        setDisciplines(disciplinesRes.data);
      } catch (err) {
        const error = err as any;
        setError(
          error.response?.data?.detail || error.message || "Unknown error",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const handleCreate = async (values: any) => {
    setError(null);
    const payload: any = {
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone,
      teams_id: values.teams_id,
    };
    if (values.photo_url) payload.photo_url = values.photo_url;
    try {
      const res = await api.post(API_URLS.coaches, payload);
      setCoaches((prev: Coach[]) => [...prev, res.data]);
    } catch (err) {
      const error = err as any;
      setError(
        error.response?.data?.detail || error.message || "Unknown error",
      );
    }
  };

  const handleEdit = (row: any) => {
    setEditIndex(coaches.findIndex((c) => c.id === row.id));
  };

  const handleDelete = async (row: any) => {
    setError(null);
    try {
      await api.delete(`${API_URLS.coaches}${row.id}/`);
      setCoaches(coaches.filter((c) => c.id !== row.id));
      setEditIndex(null);
    } catch (err) {
      const error = err as any;
      setError(
        error.response?.data?.detail || error.message || "Unknown error",
      );
    }
  };

  const handleUpdate = async (values: any) => {
    if (editIndex === null) return;
    setError(null);
    const coachId = coaches[editIndex!].id;
    const payload: any = {
      first_name: values.first_name,
      last_name: values.last_name,
      phone: values.phone,
      teams_id: values.teams_id,
    };
    if (values.photo_url) payload.photo_url = values.photo_url;
    try {
      const res = await api.put(`${API_URLS.coaches}${coachId}/`, payload);
      const updated = [...coaches];
      updated[editIndex!] = res.data;
      setCoaches(updated);
      setEditIndex(null);
    } catch (err) {
      const error = err as any;
      setError(
        error.response?.data?.detail || error.message || "Unknown error",
      );
    }
  };

  const headAdminRoles = isSuperAdmin?.()
    ? []
    : getAdminDisciplines
      ? getAdminDisciplines("head_admin")
      : [];
  const headAdminSingleDiscipline =
    headAdminRoles.length === 1 ? headAdminRoles[0] : null;

  // Auto-set table filter for head admin
  useEffect(() => {
    if (headAdminSingleDiscipline && !filterDiscipline) {
      setFilterDiscipline(headAdminSingleDiscipline.discipline_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disciplines]);

  const coachFieldsWithTeams = [
    ...coachFields,
    {
      name: "discipline_id",
      label: "Discipline",
      type: "select",
      required: false,
      options: disciplines.map((d: any) => ({ value: d.name, label: d.name })),
      disabled: !!headAdminSingleDiscipline,
    },
    {
      name: "teams_id",
      label: "Teams",
      type: "select",
      required: false,
      // options can be a function: ReusableAdminForm will call it with current values
      options: (values: any) => {
        const available = values.discipline_id
          ? teams.filter((t: any) => t.discipline === values.discipline_id)
          : teams;
        return available.map((t: any) => ({ value: t.id, label: t.name }));
      },
      multiple: true,
    },
  ];

  const filteredTeamsForFilter = filterDiscipline
    ? teams.filter((t: any) => t.discipline === filterDiscipline)
    : teams;

  const filteredCoaches = coaches.filter((c: any) => {
    if (filterTeam)
      return (
        Array.isArray(c.teams) &&
        c.teams.some((t: any) => String(t.id) === filterTeam)
      );
    if (filterDiscipline) {
      const disciplineTeamIds = teams
        .filter((t: any) => t.discipline === filterDiscipline)
        .map((t: any) => t.id);
      return (
        Array.isArray(c.teams) &&
        c.teams.some((t: any) => disciplineTeamIds.includes(t.id))
      );
    }
    return true;
  });

  if (!user?.access) {
    return (
      <div className="alert alert-warning mt-4">
        You must be logged in as an admin to manage coaches.
      </div>
    );
  }

  return (
    <div className="container-fluid py-3 admin-min-height">
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      <div className="row justify-content-center">
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <h4 className="mb-3">
                {editIndex === null ? "Create Coach" : "Edit Coach"}
              </h4>
              <ReusableAdminForm
                fields={coachFieldsWithTeams}
                onSubmit={editIndex === null ? handleCreate : handleUpdate}
                initialValues={
                  editIndex !== null
                    ? (() => {
                        const coach = coaches[editIndex!];
                        const teamIds = Array.isArray(coach?.teams)
                          ? coach!.teams.map((t: any) => t.id)
                          : [];
                        const firstTeam = teams.find(
                          (t: any) => t.id === teamIds[0],
                        );
                        return {
                          ...coach,
                          discipline_id: firstTeam ? firstTeam.discipline : "",
                          teams_id: teamIds,
                        };
                      })()
                    : headAdminSingleDiscipline
                      ? {
                          discipline_id:
                            headAdminSingleDiscipline.discipline_name,
                        }
                      : {}
                }
                submitLabel={editIndex === null ? "Create" : "Update"}
              />
            </div>
          </div>
        </div>
        <div className="col-md-8 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <h4 className="mb-3">Coaches</h4>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div className="admin-min-width">
                  <div className="d-flex gap-2 mb-3 flex-wrap align-items-end">
                    <h4 className="mb-0 me-auto">All Coaches</h4>
                    <select
                      className="form-select form-select-sm w-auto"
                      value={filterDiscipline}
                      onChange={(e) => {
                        setFilterDiscipline(e.target.value);
                        setFilterTeam("");
                      }}
                    >
                      <option value="">All disciplines</option>
                      {disciplines.map((d: any) => (
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
                      <option value="">All teams</option>
                      {filteredTeamsForFilter.map((t: any) => (
                        <option key={t.id} value={String(t.id)}>
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
                        Clear
                      </button>
                    )}
                  </div>
                  <ReusableAdminTable
                    columns={coachColumns}
                    data={filteredCoaches}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    renderCell={(row, col) => {
                      if (col.key === "photo_url") {
                        return row.photo_url ? (
                          <img
                            src={row.photo_url}
                            alt="Coach"
                            className="admin-img-thumb"
                          />
                        ) : (
                          <span className="admin-no-photo">No photo</span>
                        );
                      }
                      if (col.key === "teams") {
                        return Array.isArray(row.teams)
                          ? row.teams.map((t: any) => t.name).join(", ")
                          : row.teams || (
                              <span className="admin-no-teams">No teams</span>
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

export default CoachAdminPage;
