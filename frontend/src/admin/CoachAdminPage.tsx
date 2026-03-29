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
  { name: "role", label: "Role", type: "text", required: false },
  { name: "photo", label: "Photo", type: "file", required: false },
];

const coachColumns = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "role", label: "Role" },
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
}
const CoachAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
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
        const [coachesRes, teamsRes] = await Promise.all([
          api.get(API_URLS.coaches),
          api.get(API_URLS.teams),
        ]);
        setCoaches(coachesRes.data);
        setTeams(teamsRes.data);
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
      role: values.role,
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
      role: values.role,
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

  const coachFieldsWithTeams = [
    ...coachFields,
    {
      name: "teams_id",
      label: "Teams",
      type: "select",
      required: false,
      options: teams.map((t) => ({ value: t.id, label: t.name })),
      multiple: true,
    },
  ];

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
                    ? {
                        ...coaches[editIndex],
                        teams_id: Array.isArray(coaches[editIndex]?.teams)
                          ? coaches[editIndex].teams.map((t: any) => t.id)
                          : [],
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
