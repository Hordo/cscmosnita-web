import React, { useEffect, useState } from "react";
import "../styles/adminStyles.css";
import { ReusableAdminForm } from "./ReusableAdminForm";
import type { AdminFormField } from "./ReusableAdminForm";
import { ReusableAdminTable } from "./ReusableAdminTable";
import type { AdminTableColumn } from "./ReusableAdminTable";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

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
  { name: "photo", label: "Photo", type: "file", required: false },
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

  const playerFields: AdminFormField[] = [
    ...basePlayerFields,
    {
      name: "team_id",
      label: "Team",
      type: "select",
      required: true,
      options: teams.map((t: any) => ({ value: String(t.id), label: t.name })),
    },
  ];

  const handleCreate = async (values: any) => {
    setError(null);
    const payload: any = {
      first_name: values.first_name,
      last_name: values.last_name,
      number: values.number,
      position: values.position,
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
      position: values.position,
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
    return (
      <div className="alert alert-warning mt-4">
        You must be logged in as an admin to manage players.
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
                {editIndex === null ? "Create Player" : "Edit Player"}
              </h4>
              <ReusableAdminForm
                fields={playerFields}
                onSubmit={editIndex === null ? handleCreate : handleUpdate}
                initialValues={
                  editIndex !== null
                    ? {
                        ...players[editIndex],
                        team_id: (() => {
                          const t = teams.find(
                            (team) => team.name === players[editIndex].team,
                          );
                          return t ? String(t.id) : "";
                        })(),
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
              <h4 className="mb-3">Players</h4>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div className="admin-min-width">
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
                            className="admin-img-thumb"
                          />
                        ) : (
                          <span className="admin-no-photo">No photo</span>
                        );
                      }
                      if (col.key === "team") {
                        return (
                          row.team || (
                            <span className="admin-no-teams">No team</span>
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
