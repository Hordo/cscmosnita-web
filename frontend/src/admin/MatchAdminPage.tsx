import React, { useEffect, useState } from "react";
import "../styles/adminStyles.css";
import { ReusableAdminForm } from "./ReusableAdminForm";
import type { AdminFormField } from "./ReusableAdminForm";
import { ReusableAdminTable } from "./ReusableAdminTable";
import type { AdminTableColumn } from "./ReusableAdminTable";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

const matchColumns: AdminTableColumn[] = [
  { key: "home_team_name", label: "Home Team" },
  { key: "home_score", label: "Home Score" },
  { key: "away_score", label: "Away Score" },
  { key: "away_team_name", label: "Away Team" },
  { key: "date", label: "Date" },
  { key: "team_name", label: "Our Team" },
];

const MatchAdminPage: React.FC = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.access) {
      setMatches([]);
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
        const [matchesRes, teamsRes] = await Promise.all([
          api.get(API_URLS.matches),
          api.get(API_URLS.teams),
        ]);
        setMatches(matchesRes.data);
        setTeams(teamsRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const matchFields: AdminFormField[] = [
    {
      name: "team_id",
      label: "Our Team (optional)",
      type: "select",
      required: false,
      options: [
        { value: "", label: "— None —" },
        ...teams.map((t: any) => ({ value: String(t.id), label: t.name })),
      ],
    },
    { name: "date", label: "Date", type: "date", required: false },
    {
      name: "home_team_name",
      label: "Home Team",
      type: "text",
      required: true,
    },
    {
      name: "home_score",
      label: "Home Score",
      type: "number",
      required: false,
    },
    {
      name: "away_score",
      label: "Away Score",
      type: "number",
      required: false,
    },
    {
      name: "away_team_name",
      label: "Away Team",
      type: "text",
      required: true,
    },
    {
      name: "youtube_link",
      label: "YouTube Link",
      type: "text",
      required: false,
    },
  ];

  const buildPayload = (values: any) => ({
    team_id: values.team_id || null,
    date: values.date || null,
    home_team_name: values.home_team_name,
    away_team_name: values.away_team_name,
    home_score:
      values.home_score !== "" && values.home_score !== undefined
        ? Number(values.home_score)
        : null,
    away_score:
      values.away_score !== "" && values.away_score !== undefined
        ? Number(values.away_score)
        : null,
    youtube_link: values.youtube_link || "",
  });

  const handleCreate = async (values: any) => {
    setError(null);
    try {
      const res = await api.post(API_URLS.matches, buildPayload(values));
      setMatches((prev) => [...prev, res.data]);
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
    setEditIndex(matches.findIndex((m) => m.id === row.id));
  };

  const handleDelete = async (row: any) => {
    setError(null);
    try {
      await api.delete(`${API_URLS.matches}${row.id}/`);
      setMatches(matches.filter((m) => m.id !== row.id));
      setEditIndex(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  const handleUpdate = async (values: any) => {
    if (editIndex === null) return;
    setError(null);
    const matchId = matches[editIndex].id;
    try {
      const res = await api.put(
        `${API_URLS.matches}${matchId}/`,
        buildPayload(values),
      );
      const updated = [...matches];
      updated[editIndex] = res.data;
      setMatches(updated);
      setEditIndex(null);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          err.message ||
          "Unknown error",
      );
    }
  };

  const editInitialValues =
    editIndex !== null
      ? {
          ...matches[editIndex],
          team_id: matches[editIndex].team
            ? String(matches[editIndex].team)
            : "",
        }
      : {};

  if (!user?.access) {
    return (
      <div className="alert alert-warning mt-4">
        You must be logged in as an admin to manage matches.
      </div>
    );
  }

  return (
    <div className="container-fluid py-3 admin-min-height">
      {loading && <div className="text-center mb-3">Loading...</div>}
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      <div className="row justify-content-center">
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <h4 className="mb-3">
                {editIndex === null ? "Create Match" : "Edit Match"}
              </h4>
              <ReusableAdminForm
                fields={matchFields}
                onSubmit={editIndex === null ? handleCreate : handleUpdate}
                initialValues={editInitialValues}
                submitLabel={editIndex === null ? "Create" : "Update"}
              />
              {editIndex !== null && (
                <button
                  className="btn btn-secondary mt-2 w-100"
                  onClick={() => setEditIndex(null)}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="col-md-8 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <h4 className="mb-3">All Matches</h4>
              <ReusableAdminTable
                columns={matchColumns}
                data={matches}
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
