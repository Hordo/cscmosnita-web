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
  const { user } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDisciplines().then(setDisciplines);
  }, []);

  const teamColumns: AdminTableColumn[] = [
    { key: "name", label: "Team Name" },
    { key: "age_group", label: "Age Group" },
    { key: "season", label: "Season" },
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
    { name: "age_group", label: "Age Group", type: "text", required: false },
    { name: "season", label: "Season", type: "text", required: false },
    {
      name: "discipline_id",
      label: "Discipline",
      type: "select",
      required: false,
      options: disciplines.map((d: any) => ({ value: d.id, label: d.name })),
    },
    { name: "photo", label: "Photo", type: "file", required: false },
  ];

  const handleCreate = async (values: any) => {
    setError(null);
    const formData = new FormData();
    formData.append("name", values.name);
    if (values.age_group) formData.append("age_group", values.age_group);
    if (values.season) formData.append("season", values.season);
    if (values.discipline_id)
      formData.append("discipline_id", values.discipline_id);
    if (values.photo instanceof File) formData.append("photo", values.photo);
    try {
      const res = await api.post(API_URLS.teams, formData);
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
    const formData = new FormData();
    formData.append("name", values.name);
    if (values.age_group) formData.append("age_group", values.age_group);
    if (values.season) formData.append("season", values.season);
    if (values.discipline_id)
      formData.append("discipline_id", values.discipline_id);
    if (values.photo instanceof File) formData.append("photo", values.photo);
    try {
      const res = await api.put(`${API_URLS.teams}${teamId}/`, formData);
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
              <ReusableAdminForm
                fields={teamFields}
                onSubmit={editIndex === null ? handleCreate : handleUpdate}
                initialValues={editIndex !== null ? teams[editIndex] : {}}
                submitLabel={editIndex === null ? "Create" : "Update"}
              />
            </div>
          </div>
        </div>
        <div className="col-md-8 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <h4 className="mb-3">Teams</h4>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div className="admin-min-width">
                  <ReusableAdminTable
                    columns={teamColumns}
                    data={teams}
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
