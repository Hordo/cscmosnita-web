import React, { useEffect, useState } from "react";
import "../styles/adminStyles.css";
import { ReusableAdminForm } from "./ReusableAdminForm";
import { ReusableAdminTable } from "./ReusableAdminTable";
import type { AdminFormField } from "./ReusableAdminForm";
import type { AdminTableColumn } from "./ReusableAdminTable";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { fetchDisciplines } from "../utils/fetchDisciplines";
import { useAuth } from "../context/AuthContext";

export const TeamAdminPage: React.FC = () => {
  const { user, getAdminDisciplines, isSuperAdmin } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDisciplines().then(setDisciplines);
  }, []);

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
      setFilterDiscipline(headAdminSingleDiscipline.discipline_name ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disciplines]);

  const teamColumns: AdminTableColumn[] = [
    { key: "name", label: "Team Name" },
    { key: "name_en", label: "Team Name (EN)" },
    { key: "year", label: "Year" },
    { key: "discipline", label: "Discipline" },
  ];

  useEffect(() => {
    if (!user?.access) {
      setTeams([]);
      setError(null);
      setLoading(false);
      setAuthToken();
      return;
    }
    setAuthToken(user.access);
    const fetchTeams = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(API_URLS.teams);
        setTeams(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, [user]);

  const teamFields: AdminFormField[] = [
    { name: "name", label: "Team Name", type: "text", required: true },
    { name: "name_en", label: "Team Name (EN)", type: "text", required: false },
    { name: "year", label: "Year", type: "number", required: false },
    {
      name: "discipline_id",
      label: "Discipline",
      type: "select",
      required: false,
      options: disciplines.map((d: any) => ({ value: d.id, label: d.name })),
      disabled: !!headAdminSingleDiscipline,
    },
    { name: "photo", label: "Photo", type: "file", required: false },
  ];

  const handleCreate = async (values: any) => {
    setError(null);
    const payload: any = {
      name: values.name,
      name_en: values.name_en,
      year: values.year,
      discipline_id: values.discipline_id,
    };
    if (values.photo_url) payload.photo_url = values.photo_url;
    try {
      const res = await api.post(API_URLS.teams, payload);
      setTeams((prev) => [...prev, res.data]);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  const handleEdit = (row: any) => {
    setEditIndex(teams.findIndex((t) => t.id === row.id));
  };

  const handleDelete = async (row: any) => {
    setError(null);
    try {
      await api.delete(`${API_URLS.teams}${row.id}/`);
      setTeams(teams.filter((t) => t.id !== row.id));
      setEditIndex(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  const handleUpdate = async (values: any) => {
    if (editIndex === null) return;
    setError(null);
    const teamId = teams[editIndex].id;
    const payload: any = {
      name: values.name,
      name_en: values.name_en,
      year: values.year,
      discipline_id: values.discipline_id,
    };
    if (values.photo_url) payload.photo_url = values.photo_url;
    try {
      const res = await api.put(`${API_URLS.teams}${teamId}/`, payload);
      const updated = [...teams];
      updated[editIndex] = res.data;
      setTeams(updated);
      setEditIndex(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  if (!user?.access) {
    return (
      <div className="alert alert-warning mt-4">
        You must be logged in as an admin to manage teams.
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
                {editIndex === null ? "Create Team" : "Edit Team"}
              </h4>
              {(() => {
                // Build initial values for the form and map discipline name -> discipline_id
                const initialForForm =
                  editIndex !== null && teams[editIndex]
                    ? (() => {
                        const t = teams[editIndex];
                        const disc = disciplines.find(
                          (d: any) => d.name === t.discipline,
                        );
                        return { ...t, discipline_id: disc ? disc.id : "" };
                      })()
                    : headAdminSingleDiscipline
                      ? {
                          discipline_id:
                            headAdminSingleDiscipline.discipline_id,
                        }
                      : {};
                return (
                  <ReusableAdminForm
                    fields={teamFields}
                    onSubmit={editIndex === null ? handleCreate : handleUpdate}
                    initialValues={initialForForm}
                    submitLabel={editIndex === null ? "Create" : "Update"}
                  />
                );
              })()}
            </div>
          </div>
        </div>
        <div className="col-md-8 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <h4 className="mb-3">Teams</h4>
              <div className="d-flex gap-2 mb-3 flex-wrap align-items-end">
                <select
                  className="form-select form-select-sm w-auto"
                  value={filterDiscipline}
                  onChange={(e) => setFilterDiscipline(e.target.value)}
                >
                  <option value="">All disciplines</option>
                  {disciplines.map((d: any) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {filterDiscipline && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setFilterDiscipline("")}
                  >
                    Clear
                  </button>
                )}
              </div>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div className="admin-min-width">
                  <ReusableAdminTable
                    columns={teamColumns}
                    data={
                      filterDiscipline
                        ? teams.filter(
                            (t: any) => t.discipline === filterDiscipline,
                          )
                        : teams
                    }
                    onEdit={handleEdit}
                    onDelete={handleDelete}
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

export default TeamAdminPage;
