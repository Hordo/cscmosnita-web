import React, { useEffect, useState } from "react";
import { ReusableAdminForm } from "./ReusableAdminForm";
import { ReusableAdminTable } from "./ReusableAdminTable";
import type { AdminFormField } from "./ReusableAdminForm";
import type { AdminTableColumn } from "./ReusableAdminTable";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

// Will be set dynamically after fetching teams
const basePlayerFields: AdminFormField[] = [
  { name: "first_name", label: "First Name", type: "text", required: true },
  { name: "last_name", label: "Last Name", type: "text", required: true },
  { name: "number", label: "Number", type: "number", required: false },
  {
    name: "position",
    label: "Position",
    type: "select",
    required: false,
    options: [
      { value: "", label: "Select..." },
      { value: "GK", label: "Goalkeeper" },
      { value: "DF", label: "Defender" },
      { value: "MF", label: "Midfielder" },
      { value: "FW", label: "Forward" },
    ],
  },
  { name: "photo_url", label: "Photo URL", type: "url", required: false },
  // team will be added after fetching teams
];

const playerColumns: AdminTableColumn[] = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "number", label: "Number" },
  { key: "position", label: "Position" },
  { key: "photo_url", label: "Photo" },
  { key: "team", label: "Team" },
];

export const PlayerAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch players and teams from API only if authenticated
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
        const [playersRes, teamsRes] = await Promise.all([
          api.get(API_URLS.players),
          api.get(API_URLS.teams),
        ]);
        setPlayers(playersRes.data);
        setTeams(teamsRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  // Create player
  const handleCreate = async (values: any) => {
    setError(null);
    const formData = new FormData();
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    if (values.number) formData.append("number", values.number);
    if (values.position) formData.append("position", values.position);
    if (values.photo_url) formData.append("photo_url", values.photo_url);
    if (values.team) formData.append("team", values.team);
    try {
      const res = await api.post(API_URLS.players, formData);
      setPlayers((prev) => [...prev, res.data]);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  // Edit player
  const handleEdit = (row: any) => {
    setEditIndex(players.findIndex((p) => p.id === row.id));
  };

  // Delete player
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

  // Update player
  const handleUpdate = async (values: any) => {
    if (editIndex === null) return;
    setError(null);
    const playerId = players[editIndex].id;
    const formData = new FormData();
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    formData.append("dob", values.dob);
    if (values.picture instanceof File) {
      formData.append("picture", values.picture);
    }
    try {
      const res = await api.put(`${API_URLS.players}${playerId}/`, formData);
      const updated = [...players];
      updated[editIndex] = res.data;
      setPlayers(updated);
      setEditIndex(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  if (!user?.access) {
    return (
      <div className="alert alert-warning mt-4">
        You must be logged in as an admin to manage players.
      </div>
    );
  }

  // Dynamically build playerFields with team options
  const playerFields: AdminFormField[] = [
    ...basePlayerFields,
    {
      name: "team",
      label: "Team",
      type: "select",
      required: true,
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
                {editIndex === null ? "Create Player" : "Edit Player"}
              </h4>
              <ReusableAdminForm
                fields={playerFields}
                onSubmit={editIndex === null ? handleCreate : handleUpdate}
                initialValues={editIndex !== null ? players[editIndex] : {}}
                submitLabel={editIndex === null ? "Create" : "Update"}
              />
              {error && <div className="alert alert-danger mt-2">{error}</div>}
            </div>
          </div>
        </div>
        <div className="col-md-8 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body overflow-auto" style={{ maxHeight: 500 }}>
              <h4 className="mb-3">Players</h4>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div style={{ minWidth: 300 }}>
                  <ReusableAdminTable
                    columns={playerColumns}
                    data={players}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    renderCell={(row, col) => {
                      if (col.key === "photo_url") {
                        return row.photo_url ? (
                          <img
                            src={row.photo_url}
                            alt="Player"
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
                      if (col.key === "team") {
                        return (
                          row.team?.name ||
                          row.team || (
                            <span style={{ color: "#888" }}>No team</span>
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
