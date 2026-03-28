import React, { useEffect, useState } from "react";
import { ReusableAdminForm } from "./ReusableAdminForm";
import { ReusableAdminTable } from "./ReusableAdminTable";
import type { AdminFormField } from "./ReusableAdminForm";
import type { AdminTableColumn } from "./ReusableAdminTable";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

const coachFields: AdminFormField[] = [
  { name: "first_name", label: "First Name", type: "text", required: true },
  { name: "last_name", label: "Last Name", type: "text", required: true },
  { name: "role", label: "Role", type: "text", required: false },
  { name: "photo_url", label: "Photo URL", type: "url", required: false },
  // teams will be handled dynamically
];

const coachColumns: AdminTableColumn[] = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "role", label: "Role" },
  { key: "photo_url", label: "Photo" },
  { key: "teams", label: "Teams" },
];

export const CoachAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.access) {
      setCoaches([]);
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
        const [coachesRes, teamsRes] = await Promise.all([
          api.get(API_URLS.coaches),
          api.get(API_URLS.teams),
        ]);
        setCoaches(coachesRes.data);
        setTeams(teamsRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const handleCreate = async (values: any) => {
    setError(null);
    const formData = new FormData();
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    if (values.role) formData.append("role", values.role);
    if (values.photo_url) formData.append("photo_url", values.photo_url);
    if (values.teams && Array.isArray(values.teams)) {
      values.teams.forEach((teamId: string | number) => {
        formData.append("teams", String(teamId));
      });
    }
    try {
      const res = await api.post(API_URLS.coaches, formData);
      setCoaches((prev) => [...prev, res.data]);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
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
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  const handleUpdate = async (values: any) => {
    if (editIndex === null) return;
    setError(null);
    const coachId = coaches[editIndex].id;
    const formData = new FormData();
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    if (values.role) formData.append("role", values.role);
    if (values.photo_url) formData.append("photo_url", values.photo_url);
    if (values.teams && Array.isArray(values.teams)) {
      values.teams.forEach((teamId: string | number) => {
        formData.append("teams", String(teamId));
      });
    }
    try {
      const res = await api.put(`${API_URLS.coaches}${coachId}/`, formData);
      const updated = [...coaches];
      updated[editIndex] = res.data;
      setCoaches(updated);
      setEditIndex(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  // Add teams as a multi-select field
  const coachFieldsWithTeams: AdminFormField[] = [
    ...coachFields,
    {
      name: "teams",
      label: "Teams",
      type: "select",
      required: false,
      options: teams.map((t: any) => ({ value: t.id, label: t.name })),
    },
  ];

  return (
    <div className="container-fluid py-3">
      <div className="row justify-content-center">
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body overflow-auto" style={{ maxHeight: 500 }}>
              <h4 className="mb-3">
                {editIndex === null ? "Create Coach" : "Edit Coach"}
              </h4>
              <ReusableAdminForm
                fields={coachFieldsWithTeams}
                onSubmit={editIndex === null ? handleCreate : handleUpdate}
                initialValues={editIndex !== null ? coaches[editIndex] : {}}
                submitLabel={editIndex === null ? "Create" : "Update"}
              />
              {error && <div className="alert alert-danger mt-2">{error}</div>}
            </div>
          </div>
        </div>
        <div className="col-md-8 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body overflow-auto" style={{ maxHeight: 500 }}>
              <h4 className="mb-3">Coaches</h4>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div style={{ minWidth: 300 }}>
                  <ReusableAdminTable
                    columns={coachColumns}
                    data={coaches}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    renderCell={(row, col) => {
                      if (col.key === "photo_url") {
                        return row.photo_url ? (
                          <img
                            src={row.photo_url}
                            alt="Coach"
                            style={{
                              maxWidth: 60,
                              maxHeight: 60,
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ color: "#888" }}>No photo</span>
                        );
                      }
                      if (col.key === "teams") {
                        return Array.isArray(row.teams)
                          ? row.teams.map((t: any) => t.name || t).join(", ")
                          : row.teams || (
                              <span style={{ color: "#888" }}>No teams</span>
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
